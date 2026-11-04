<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrLeaveApplication;
use App\Models\HrLoan;
use App\Models\HrRequest;
use App\Models\HrSeparation;
use App\Models\HrSettlement;
use App\Models\User;
use App\Services\Tenancy\StoreContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Someone leaving: a resignation sent by the employee (accepted by their manager or HR, who sets the last working
 * day), or a resignation, termination or retirement recorded by HR. On the last working day they are relieved:
 * the employee is marked inactive and their login is switched off.
 */
class SeparationService
{
    public const TYPES = ['RESIGNATION', 'TERMINATION', 'RETIREMENT', 'OTHER'];

    /** Why people leave, as the exit interview records it. */
    public const REASONS = ['BETTER_PAY', 'CAREER_GROWTH', 'PERSONAL', 'RELOCATION', 'HEALTH', 'STUDIES', 'WORK_HOURS', 'MANAGER', 'WORK_ENVIRONMENT', 'PERFORMANCE', 'RETIREMENT', 'OTHER'];

    /** Separations that are still going on (an employee has at most one). */
    public const OPEN = ['REQUESTED', 'ACCEPTED', 'RELIEVED'];

    public function __construct(private readonly LoanService $loans, private readonly PayrollSetup $setup) {}

    public static function today(): string
    {
        return Carbon::now(AttendanceService::timezone())->toDateString();
    }

    /** The employee's notice period: their own, else the store's. */
    public function noticeDays(Employee $employee): int
    {
        $own = $employee->master_details['notice_days'] ?? null;

        return $own !== null && $own !== '' ? (int) $own : (int) $this->setup->settings($employee->store_id)['exit']['notice_days'];
    }

    /** Days of notice not served: the notice period less the days from the resignation to the last working day. */
    public static function shortDays(int $noticeDays, string $appliedOn, string $lastDay): int
    {
        $served = (int) Carbon::parse($appliedOn)->startOfDay()->diffInDays(Carbon::parse($lastDay)->startOfDay(), true);

        return max(0, $noticeDays - $served);
    }

    public function resign(Employee $employee, array $data, ?User $by): HrSeparation
    {
        $this->noneOpen($employee);
        $today = self::today();
        if (($data['requested_last_day'] ?? $today) < $today) {
            throw ValidationException::withMessages(['requested_last_day' => 'Choose today or a later day.']);
        }
        $separation = HrSeparation::create([
            'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'type' => 'RESIGNATION', 'applied_on' => $today,
            'reason' => $data['reason'] ?? null, 'requested_last_day' => $data['requested_last_day'] ?? null, 'notice_days' => $this->noticeDays($employee),
            'status' => 'REQUESTED', 'applied_by' => $by?->id, 'approver_user_id' => $employee->reportsTo?->user_id,
        ]);
        $this->loans->notify($separation->approver_user_id, $employee->store_id, 'EXIT_REQUEST', 'Resignation received',
            "{$employee->name} has resigned".($separation->requested_last_day ? ", asking to leave on {$separation->requested_last_day->toDateString()}" : '').'.', '/hrms/exits', $separation->id);

        return $separation;
    }

    /** HR records an exit directly, with its last working day (accepted straight away). */
    public function record(Employee $employee, array $data, User $by): HrSeparation
    {
        $this->noneOpen($employee);
        $appliedOn = $data['applied_on'] ?? self::today();
        $this->validLastDay($appliedOn, $data['last_working_day']);
        $notice = isset($data['notice_days']) ? (int) $data['notice_days'] : $this->noticeDays($employee);

        return HrSeparation::create([
            'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'type' => $data['type'], 'applied_on' => $appliedOn,
            'reason' => $data['reason'] ?? null, 'requested_last_day' => $data['last_working_day'], 'last_working_day' => $data['last_working_day'],
            'notice_days' => $notice, 'notice_short_days' => $data['type'] === 'RESIGNATION' ? self::shortDays($notice, $appliedOn, $data['last_working_day']) : 0,
            'notice_waived' => (bool) ($data['notice_waived'] ?? false), 'status' => 'ACCEPTED', 'applied_by' => $by->id,
            'decided_by' => $by->id, 'decided_at' => now(), 'decision_note' => $data['note'] ?? null,
        ]);
    }

    public function accept(HrSeparation $separation, User $by, string $lastDay, ?int $noticeDays, bool $waived, ?string $note): HrSeparation
    {
        $this->expect($separation, 'REQUESTED', 'Only a resignation waiting for a decision can be accepted.');
        $this->loans->notOwn($separation->employee_id, $by);
        $appliedOn = $separation->applied_on->toDateString();
        $this->validLastDay($appliedOn, $lastDay);
        $notice = $noticeDays ?? $separation->notice_days;
        $separation->update(['status' => 'ACCEPTED', 'last_working_day' => $lastDay, 'notice_days' => $notice,
            'notice_short_days' => self::shortDays($notice, $appliedOn, $lastDay), 'notice_waived' => $waived,
            'decided_by' => $by->id, 'decided_at' => now(), 'decision_note' => $note]);
        $this->tell($separation, 'Resignation accepted', "Your last working day is {$lastDay}.".($note ? " {$note}" : ''));

        return $separation->refresh();
    }

    public function reject(HrSeparation $separation, User $by, ?string $note): HrSeparation
    {
        $this->expect($separation, 'REQUESTED', 'Only a resignation waiting for a decision can be rejected.');
        $this->loans->notOwn($separation->employee_id, $by);
        $separation->update(['status' => 'REJECTED', 'decided_by' => $by->id, 'decided_at' => now(), 'decision_note' => $note]);
        $this->tell($separation, 'Resignation not accepted', $note ?: 'Please speak to your manager.');

        return $separation->refresh();
    }

    /** The employee takes back a resignation not yet accepted, or HR cancels an exit before the person is relieved. */
    public function withdraw(HrSeparation $separation): HrSeparation
    {
        if (! in_array($separation->status, ['REQUESTED', 'ACCEPTED'], true)) {
            throw ValidationException::withMessages(['status' => 'Only an exit not yet relieved can be withdrawn.']);
        }
        $settlement = HrSettlement::withoutGlobalScopes()->where('separation_id', $separation->id)->first();
        if ($settlement && $settlement->status !== 'DRAFT') {
            throw ValidationException::withMessages(['status' => 'Reopen the full and final settlement first.']);
        }
        DB::transaction(function () use ($separation, $settlement) {
            $settlement?->delete();
            $separation->update(['status' => 'WITHDRAWN']);
        });

        return $separation->refresh();
    }

    /** Changes the last working day or notice of an accepted exit. */
    public function amend(HrSeparation $separation, string $lastDay, int $noticeDays, bool $waived): HrSeparation
    {
        $this->expect($separation, 'ACCEPTED', 'Only an accepted exit not yet relieved can be changed.');
        $appliedOn = $separation->applied_on->toDateString();
        $this->validLastDay($appliedOn, $lastDay);
        $separation->update(['last_working_day' => $lastDay, 'notice_days' => $noticeDays, 'notice_waived' => $waived,
            'notice_short_days' => $separation->type === 'RESIGNATION' ? self::shortDays($noticeDays, $appliedOn, $lastDay) : 0]);

        return $separation->refresh();
    }

    public function interview(HrSeparation $separation, array $answers, User $by): HrSeparation
    {
        if (! in_array($separation->status, ['ACCEPTED', 'RELIEVED', 'SETTLED'], true)) {
            throw ValidationException::withMessages(['status' => 'Record the exit interview once the exit is accepted.']);
        }
        $separation->update(['exit_interview' => $answers, 'interviewed_by' => $by->id, 'interviewed_at' => now()]);

        return $separation->refresh();
    }

    /**
     * Relieves the employee on or after their last working day: inactive from the next day, login switched off,
     * requests still waiting cancelled. Safe to run again.
     */
    public function relieve(HrSeparation $separation): HrSeparation
    {
        if ($separation->relieved_at) {
            return $separation;
        }
        if (! in_array($separation->status, ['ACCEPTED', 'SETTLED'], true)) {
            throw ValidationException::withMessages(['status' => 'Only an accepted exit can be relieved.']);
        }
        $lastDay = $separation->last_working_day->toDateString();
        if ($lastDay > self::today()) {
            throw ValidationException::withMessages(['status' => "{$separation->employee?->name} can be relieved on or after {$lastDay}."]);
        }
        DB::transaction(function () use ($separation, $lastDay) {
            $employee = Employee::withoutGlobalScopes()->findOrFail($separation->employee_id);
            Employee::withoutGlobalScopes()->whereKey($employee->id)->update(['relieving_date' => $lastDay, 'is_active' => false]);
            if ($employee->user_id && $this->loginCanBeClosed($employee)) {
                User::whereKey($employee->user_id)->update(['is_active' => false]);
                DB::table('personal_access_tokens')->where('tokenable_type', User::class)->where('tokenable_id', $employee->user_id)->delete();
            }
            HrLeaveApplication::withoutGlobalScopes()->where('employee_id', $employee->id)->where('status', 'PENDING')->update(['status' => 'CANCELLED']);
            HrRequest::withoutGlobalScopes()->where('employee_id', $employee->id)->where('status', 'PENDING')->update(['status' => 'CANCELLED']);
            HrLoan::withoutGlobalScopes()->where('employee_id', $employee->id)->whereIn('status', ['REQUESTED', 'APPROVED'])->update(['status' => 'CANCELLED']);
            $separation->update(['status' => $separation->status === 'SETTLED' ? 'SETTLED' : 'RELIEVED', 'relieved_at' => now()]);
        });

        return $separation->refresh();
    }

    /** The nightly run: everyone whose last working day has passed. */
    public function relieveDue(): int
    {
        $count = 0;
        HrSeparation::withoutGlobalScopes()->whereIn('status', ['ACCEPTED', 'SETTLED'])->whereNull('relieved_at')
            ->where('last_working_day', '<', self::today())->get()->each(function (HrSeparation $separation) use (&$count) {
                $this->relieve($separation);
                $count++;
            });

        return $count;
    }

    /** An admin login, or one still linked to another active employee (e.g. after a store transfer), stays open. */
    private function loginCanBeClosed(Employee $employee): bool
    {
        $user = User::find($employee->user_id);
        if (! $user || in_array($user->role, ['admin', 'super_admin'], true) || app(StoreContext::class)->isTenantAdmin($user)) {
            return false;
        }

        return ! Employee::withoutGlobalScopes()->where('user_id', $user->id)->where('id', '!=', $employee->id)->where('is_active', true)->exists();
    }

    private function noneOpen(Employee $employee): void
    {
        if (HrSeparation::withoutGlobalScopes()->where('employee_id', $employee->id)->whereIn('status', self::OPEN)->exists()) {
            throw ValidationException::withMessages(['employee_id' => "{$employee->name} already has an exit in progress."]);
        }
    }

    private function validLastDay(string $appliedOn, string $lastDay): void
    {
        if ($lastDay < $appliedOn) {
            throw ValidationException::withMessages(['last_working_day' => 'The last working day cannot be before the resignation date.']);
        }
    }

    private function expect(HrSeparation $separation, string $status, string $message): void
    {
        if ($separation->status !== $status) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }

    private function tell(HrSeparation $separation, string $title, string $message): void
    {
        $userId = Employee::withoutGlobalScopes()->whereKey($separation->employee_id)->value('user_id');
        $this->loans->notify($userId, $separation->store_id, 'EXIT_DECIDED', $title, $message, '/hrms/my-resignation', $separation->id, true);
    }
}
