<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveLedger;
use App\Models\HrLeavePolicy;
use App\Models\HrLeaveType;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Leave balances live in a ledger: the year's allocation and carry forward credit it, an approved application
 * debits it, cancelling an approved one credits it back. Leave years run January to December.
 */
class LeaveService
{
    /** Editable starting set for a store that has none. */
    private const DEFAULTS = [
        ['code' => 'CL', 'name' => 'Casual Leave', 'is_paid' => true, 'carry_forward' => false, 'max_carry_days' => 0, 'days' => 12],
        ['code' => 'SL', 'name' => 'Sick Leave', 'is_paid' => true, 'carry_forward' => false, 'max_carry_days' => 0, 'days' => 6],
        ['code' => 'EL', 'name' => 'Earned Leave', 'is_paid' => true, 'carry_forward' => true, 'max_carry_days' => 30, 'days' => 15],
        ['code' => 'LOP', 'name' => 'Loss of Pay', 'is_paid' => false, 'carry_forward' => false, 'max_carry_days' => 0, 'days' => 0],
    ];

    /** Creates the default leave types and the "Standard" policy the first time a store uses leave. */
    public function ensureDefaults(?int $storeId): void
    {
        if (! $storeId || HrLeaveType::withoutGlobalScopes()->where('store_id', $storeId)->exists()) {
            return;
        }
        DB::transaction(function () use ($storeId) {
            $policy = HrLeavePolicy::withoutGlobalScopes()->create(['store_id' => $storeId, 'name' => 'Standard', 'is_default' => true]);
            foreach (self::DEFAULTS as $default) {
                $type = HrLeaveType::withoutGlobalScopes()->create(['store_id' => $storeId] + collect($default)->except('days')->all());
                if ($default['days'] > 0) {
                    $policy->items()->create(['leave_type_id' => $type->id, 'days_per_year' => $default['days']]);
                }
            }
        });
    }

    public function policyFor(Employee $employee): ?HrLeavePolicy
    {
        $query = HrLeavePolicy::withoutGlobalScopes()->with('items')->where('store_id', $employee->store_id);

        return ($employee->leave_policy_id ? (clone $query)->find($employee->leave_policy_id) : null)
            ?? $query->orderByDesc('is_default')->orderBy('id')->first();
    }

    /** @return Collection<int, array> per leave type: allocated, used, balance, pending, available */
    public function balances(Employee $employee, int $year): Collection
    {
        $this->ensureDefaults($employee->store_id);
        $ledger = HrLeaveLedger::withoutGlobalScopes()->where('employee_id', $employee->id)->where('year', $year)->get()->groupBy('leave_type_id');
        $pending = HrLeaveApplication::withoutGlobalScopes()->where('employee_id', $employee->id)->where('status', 'PENDING')
            ->whereYear('from_date', $year)->get()->groupBy('leave_type_id');

        return HrLeaveType::withoutGlobalScopes()->where('store_id', $employee->store_id)->where('is_active', true)->orderBy('id')->get()
            ->map(function (HrLeaveType $type) use ($ledger, $pending) {
                $rows = $ledger->get($type->id, collect());
                $credit = round($rows->where('days', '>', 0)->sum('days'), 1);
                $balance = round($rows->sum('days'), 1);
                $waiting = round(($pending->get($type->id) ?? collect())->sum('days'), 1);

                return [
                    'leave_type_id' => $type->id, 'code' => $type->code, 'name' => $type->name, 'is_paid' => $type->is_paid,
                    'allow_half_day' => $type->allow_half_day,
                    'allocated' => $credit, 'used' => round($credit - $balance, 1), 'balance' => $balance, 'pending' => $waiting,
                    'available' => $type->is_paid ? round($balance - $waiting, 1) : null,
                ];
            });
    }

    /**
     * Credits the year's leave for every active employee of the store (or one employee): the policy days, pro-rata
     * for someone who joined during the year, plus carry forward from last year. Safe to run again.
     */
    public function allocateYear(int $storeId, int $year, ?Employee $only = null, ?int $userId = null): int
    {
        $this->ensureDefaults($storeId);
        $created = 0;
        $employees = $only ? collect([$only]) : Employee::withoutGlobalScopes()->where('store_id', $storeId)->where('is_active', true)->get();
        foreach ($employees as $employee) {
            $policy = $this->policyFor($employee);
            $joined = $employee->joining_date ? Carbon::parse($employee->joining_date) : null;
            if ($joined && $joined->year > $year) {
                continue;
            }
            // Joined during the year: the months left including the joining month, rounded to half days.
            $share = $joined && $joined->year === $year ? (13 - $joined->month) / 12 : 1;
            foreach ($policy?->items ?? [] as $item) {
                $created += $this->credit($employee, $item->leave_type_id, $year, 'ALLOCATION', round($item->days_per_year * $share * 2) / 2, "Leave for {$year}", $userId);
            }
            foreach (HrLeaveType::withoutGlobalScopes()->where('store_id', $employee->store_id)->where('carry_forward', true)->get() as $type) {
                $left = (float) HrLeaveLedger::withoutGlobalScopes()->where('employee_id', $employee->id)->where('leave_type_id', $type->id)->where('year', $year - 1)->sum('days');
                $created += $this->credit($employee, $type->id, $year, 'CARRY_FORWARD', min(max($left, 0), $type->max_carry_days), 'Carried forward from '.($year - 1), $userId);
            }
        }

        return $created;
    }

    /** Working days in the range (holidays and the weekly off are not counted); a half day is 0.5. */
    public function countDays(Employee $employee, string $from, string $to, bool $halfDay): float
    {
        $attendance = app(AttendanceService::class);
        $days = 0;
        for ($date = Carbon::parse($from); $date->toDateString() <= $to; $date->addDay()) {
            $day = $date->toDateString();
            if (! $attendance->holiday($employee->store_id, $day) && ! $attendance->isWeekOff($employee, $day)) {
                $days++;
            }
        }

        return $halfDay ? min($days, 1) / 2 : (float) $days;
    }

    public function apply(Employee $employee, array $data, ?User $by): HrLeaveApplication
    {
        $type = HrLeaveType::withoutGlobalScopes()->where('store_id', $employee->store_id)->where('is_active', true)->find($data['leave_type_id']);
        if (! $type) {
            throw ValidationException::withMessages(['leave_type_id' => 'Select a leave type of this store.']);
        }
        $from = $data['from_date'];
        $to = $data['to_date'] ?? $from;
        $halfDay = (bool) ($data['half_day'] ?? false);
        if ($to < $from) {
            throw ValidationException::withMessages(['to_date' => 'The end date is before the start date.']);
        }
        if (substr($from, 0, 4) !== substr($to, 0, 4)) {
            throw ValidationException::withMessages(['to_date' => 'Apply separately for each year (leave years run January to December).']);
        }
        if ($halfDay && ($from !== $to || ! $type->allow_half_day)) {
            throw ValidationException::withMessages(['half_day' => $type->allow_half_day ? 'A half day is for a single date.' : "{$type->name} can't be taken as a half day."]);
        }
        $days = $this->countDays($employee, $from, $to, $halfDay);
        if ($days <= 0) {
            throw ValidationException::withMessages(['from_date' => 'Those dates are holidays or weekly offs; no leave is needed.']);
        }
        if ($type->max_days_per_application && $days > $type->max_days_per_application) {
            throw ValidationException::withMessages(['to_date' => "{$type->name} allows at most {$type->max_days_per_application} days at a time."]);
        }
        $overlap = HrLeaveApplication::withoutGlobalScopes()->where('employee_id', $employee->id)->whereIn('status', ['PENDING', 'APPROVED'])
            ->whereDate('from_date', '<=', $to)->whereDate('to_date', '>=', $from)->exists();
        if ($overlap) {
            throw ValidationException::withMessages(['from_date' => 'There is already a leave application for some of these dates.']);
        }
        $this->checkBalance($employee, $type, (int) substr($from, 0, 4), $days);

        $application = HrLeaveApplication::create([
            'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'leave_type_id' => $type->id,
            'from_date' => $from, 'to_date' => $to, 'half_day' => $halfDay, 'days' => $days, 'reason' => $data['reason'] ?? null,
            'status' => 'PENDING', 'applied_by' => $by?->id, 'approver_user_id' => $employee->reportsTo?->user_id,
        ]);
        $this->notify($application->approver_user_id, $employee->store_id, 'LEAVE_REQUEST', 'Leave request',
            "{$employee->name} applied for {$days} day(s) of {$type->name} from {$from}".($to !== $from ? " to {$to}" : '').'.', $application);

        return $application;
    }

    public function approve(HrLeaveApplication $application, User $by, ?string $note = null): HrLeaveApplication
    {
        $this->decidable($application, $by);
        $employee = $application->employee()->withoutGlobalScopes()->firstOrFail();
        DB::transaction(function () use ($application, $by, $note, $employee) {
            $type = HrLeaveType::withoutGlobalScopes()->findOrFail($application->leave_type_id);
            // Re-checked: other leave may have been approved since this was applied for.
            $this->checkBalance($employee, $type, (int) $application->from_date->year, $application->days, $application->id);
            HrLeaveLedger::withoutGlobalScopes()->create([
                'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'leave_type_id' => $type->id,
                'year' => $application->from_date->year, 'days' => -$application->days, 'kind' => 'APPLICATION',
                'leave_application_id' => $application->id, 'created_by' => $by->id,
            ]);
            $application->update(['status' => 'APPROVED', 'decided_by' => $by->id, 'decided_at' => now(), 'decision_note' => $note]);
        });
        $this->rebuildDays($application, $employee);
        $this->notify($employee->user_id, $employee->store_id, 'LEAVE_DECIDED', 'Leave approved',
            "Your leave from {$application->from_date->toDateString()} was approved.".($note ? " {$note}" : ''), $application, onlyUser: true);

        return $application->refresh();
    }

    public function reject(HrLeaveApplication $application, User $by, ?string $note = null): HrLeaveApplication
    {
        $this->decidable($application, $by);
        $application->update(['status' => 'REJECTED', 'decided_by' => $by->id, 'decided_at' => now(), 'decision_note' => $note]);
        $employee = $application->employee()->withoutGlobalScopes()->first();
        $this->notify($employee?->user_id, $application->store_id, 'LEAVE_DECIDED', 'Leave rejected',
            "Your leave from {$application->from_date->toDateString()} was rejected.".($note ? " {$note}" : ''), $application, onlyUser: true);

        return $application->refresh();
    }

    /** Withdraws a pending application, or cancels an approved one (the days are credited back). */
    public function cancel(HrLeaveApplication $application, User $by): HrLeaveApplication
    {
        if (! in_array($application->status, ['PENDING', 'APPROVED'], true)) {
            throw ValidationException::withMessages(['status' => 'Only a pending or approved leave can be cancelled.']);
        }
        $employee = $application->employee()->withoutGlobalScopes()->firstOrFail();
        DB::transaction(function () use ($application, $by, $employee) {
            if ($application->status === 'APPROVED') {
                HrLeaveLedger::withoutGlobalScopes()->create([
                    'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'leave_type_id' => $application->leave_type_id,
                    'year' => $application->from_date->year, 'days' => $application->days, 'kind' => 'CANCEL',
                    'leave_application_id' => $application->id, 'created_by' => $by->id,
                ]);
            }
            $application->update(['status' => 'CANCELLED', 'decided_by' => $by->id, 'decided_at' => now()]);
        });
        $this->rebuildDays($application, $employee);

        return $application->refresh();
    }

    public function approvedOn(Employee $employee, string $date): ?HrLeaveApplication
    {
        return HrLeaveApplication::withoutGlobalScopes()->where('employee_id', $employee->id)->where('status', 'APPROVED')
            ->whereDate('from_date', '<=', $date)->whereDate('to_date', '>=', $date)->first();
    }

    private function checkBalance(Employee $employee, HrLeaveType $type, int $year, float $days, ?int $ignoreApplication = null): void
    {
        if (! $type->is_paid) {
            return;
        }
        $balance = (float) HrLeaveLedger::withoutGlobalScopes()->where('employee_id', $employee->id)->where('leave_type_id', $type->id)->where('year', $year)->sum('days');
        $pending = (float) HrLeaveApplication::withoutGlobalScopes()->where('employee_id', $employee->id)->where('leave_type_id', $type->id)
            ->where('status', 'PENDING')->whereYear('from_date', $year)->when($ignoreApplication, fn ($q) => $q->where('id', '!=', $ignoreApplication))->sum('days');
        if ($days > round($balance - $pending, 1)) {
            $left = max(0, round($balance - $pending, 1));
            throw ValidationException::withMessages(['leave_type_id' => "Not enough {$type->name}: {$left} day(s) available, {$days} needed."]);
        }
    }

    private function decidable(HrLeaveApplication $application, User $by): void
    {
        if ($application->status !== 'PENDING') {
            throw ValidationException::withMessages(['status' => 'This application has already been decided.']);
        }
        $own = Employee::withoutGlobalScopes()->whereKey($application->employee_id)->value('user_id');
        if ($own && (int) $own === (int) $by->id) {
            throw ValidationException::withMessages(['status' => "You can't approve or reject your own leave."]);
        }
    }

    private function credit(Employee $employee, int $typeId, int $year, string $kind, float $days, string $note, ?int $userId): int
    {
        if ($days <= 0 || HrLeaveLedger::withoutGlobalScopes()->where(['employee_id' => $employee->id, 'leave_type_id' => $typeId, 'year' => $year, 'kind' => $kind])->exists()) {
            return 0;
        }
        HrLeaveLedger::withoutGlobalScopes()->create([
            'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'leave_type_id' => $typeId,
            'year' => $year, 'days' => $days, 'kind' => $kind, 'note' => $note, 'created_by' => $userId,
        ]);

        return 1;
    }

    private function rebuildDays(HrLeaveApplication $application, Employee $employee): void
    {
        $attendance = app(AttendanceService::class);
        for ($date = $application->from_date->copy(); $date->lte($application->to_date); $date->addDay()) {
            $attendance->rebuild($employee, $date->toDateString(), force: true);
        }
    }

    /** To one user when known; a store-wide notice (seen by the store's users) for an approval with no named approver. */
    private function notify(?int $userId, ?int $storeId, string $type, string $title, string $message, HrLeaveApplication $application, bool $onlyUser = false): void
    {
        if (! $storeId || ($onlyUser && ! $userId)) {
            return;
        }
        Notification::withoutGlobalScopes()->create([
            'type' => $type, 'title' => $title, 'message' => $message, 'link' => '/hrms/leave',
            'reference_type' => 'LEAVE_APPLICATION', 'reference_id' => $application->id, 'store_id' => $storeId, 'user_id' => $userId,
        ]);
    }
}
