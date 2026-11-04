<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrEmployeeMovement;
use App\Models\HrLeaveLedger;
use App\Models\HrLeaveType;
use App\Models\Store;
use App\Models\User;
use App\Services\Tenancy\StoreContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Dated changes to an employee: a promotion (designation, optionally pay), a transfer within the store (department,
 * section, floor, location), a salary revision, or a move to another store. A change is applied on its effective
 * date (straight away when that is today or earlier, otherwise by the nightly hr:apply-movements). Promotions and
 * transfers also write the employee's classification history (the Classification table on the employee form).
 */
class MovementService
{
    /** type => the fields it may change (master_details keys, plus the designation/department columns). */
    public const FIELDS = [
        'PROMOTION' => ['designation_id', 'gross_pay', 'salary_structure_id'],
        'TRANSFER' => ['department_id', 'section_id', 'floor_id', 'working_location_id'],
        'SALARY_REVISION' => ['gross_pay', 'salary_structure_id'],
        'STORE_TRANSFER' => ['store_id'],
    ];

    private const COLUMNS = ['designation_id', 'department_id'];

    public function __construct(private readonly LeaveService $leave) {}

    public function create(Employee $employee, string $type, string $effectiveDate, array $values, ?string $note, User $by): HrEmployeeMovement
    {
        $changes = [];
        foreach (self::FIELDS[$type] as $field) {
            if (array_key_exists($field, $values) && $values[$field] !== null && $values[$field] !== '') {
                $from = $this->current($employee, $field);
                if ((string) $from !== (string) $values[$field]) {
                    $changes[$field] = ['from' => $from, 'to' => $values[$field]];
                }
            }
        }
        if (! $changes) {
            throw ValidationException::withMessages(['values' => 'Nothing changes: choose the new values.']);
        }
        if ($type === 'STORE_TRANSFER') {
            $this->checkStoreTransfer($employee, (int) $changes['store_id']['to'], $by);
        }
        if (HrEmployeeMovement::where('employee_id', $employee->id)->where('status', 'SCHEDULED')->where('type', $type)->exists()) {
            throw ValidationException::withMessages(['type' => 'This employee already has a scheduled change of this kind. Cancel it first.']);
        }
        $movement = HrEmployeeMovement::create(['store_id' => $employee->store_id, 'employee_id' => $employee->id, 'type' => $type,
            'effective_date' => $effectiveDate, 'changes' => $changes, 'status' => 'SCHEDULED', 'note' => $note, 'created_by' => $by->id]);

        return $effectiveDate <= Carbon::now(AttendanceService::timezone())->toDateString() ? $this->apply($movement) : $movement;
    }

    /** Applies a scheduled change (also from the nightly command, where no store is selected). */
    public function apply(HrEmployeeMovement $movement): HrEmployeeMovement
    {
        if ($movement->status !== 'SCHEDULED') {
            return $movement;
        }
        DB::transaction(function () use ($movement) {
            $employee = Employee::withoutGlobalScopes()->findOrFail($movement->employee_id);
            if ($movement->type === 'STORE_TRANSFER') {
                // The receiving store's records are written for that store, not the one selected for this request.
                $attributes = request()->attributes;
                $writing = $attributes->get('store_context_write');
                $attributes->set('store_context_write', false);
                try {
                    $movement->new_employee_id = $this->moveToStore($employee, (int) $movement->changes['store_id']['to'], $movement->effective_date->toDateString());
                } finally {
                    $attributes->set('store_context_write', $writing);
                }
            } else {
                $details = $employee->master_details ?? [];
                $columns = [];
                foreach ($movement->changes as $field => $change) {
                    if ($field === 'gross_pay') {
                        // Gross Pay is the salary column (the employee form saves it there).
                        $columns['salary'] = $change['to'];
                        unset($details['gross_pay']);
                        continue;
                    }
                    in_array($field, self::COLUMNS, true) ? $columns[$field] = $change['to'] : null;
                    $details[$field] = (string) $change['to'];
                }
                if (in_array($movement->type, ['PROMOTION', 'TRANSFER'], true)) {
                    $details['classifications'] = $this->history($details, $employee, $movement->effective_date);
                }
                DB::table('employees')->where('id', $employee->id)->update($columns + ['master_details' => json_encode($details), 'updated_at' => now()]);
            }
            $movement->forceFill(['status' => 'APPLIED', 'applied_at' => now()])->save();
        });

        return $movement->refresh();
    }

    public function cancel(HrEmployeeMovement $movement): HrEmployeeMovement
    {
        if ($movement->status !== 'SCHEDULED') {
            throw ValidationException::withMessages(['status' => 'Only a scheduled change can be cancelled.']);
        }
        $movement->update(['status' => 'CANCELLED']);

        return $movement;
    }

    public function applyDue(): int
    {
        $today = Carbon::now(AttendanceService::timezone())->toDateString();
        $due = HrEmployeeMovement::withoutGlobalScopes()->where('status', 'SCHEDULED')->whereDate('effective_date', '<=', $today)->orderBy('effective_date')->get();
        $due->each(fn ($movement) => $this->apply($movement));

        return $due->count();
    }

    private function current(Employee $employee, string $field): mixed
    {
        return match ($field) {
            'store_id' => $employee->store_id,
            'designation_id', 'department_id' => $employee->{$field} ?? ($employee->master_details[$field] ?? null),
            'gross_pay' => PayrollCalculator::grossOf($employee),
            default => $employee->master_details[$field] ?? null,
        };
    }

    /** Closes the open classification row the day before and adds one from the effective date with the new values. */
    private function history(array $details, Employee $employee, Carbon $effective): array
    {
        $rows = array_values(array_filter((array) ($details['classifications'] ?? []), 'is_array'));
        foreach ($rows as &$row) {
            if (empty($row['valid_to']) && ($row['valid_from'] ?? '') < $effective->toDateString()) {
                $row['valid_to'] = $effective->copy()->subDay()->toDateString();
            }
        }
        unset($row);
        $rows[] = [
            'valid_from' => $effective->toDateString(), 'valid_to' => '',
            'designation_id' => (string) ($details['designation_id'] ?? $employee->designation_id ?? ''),
            'department_id' => (string) ($details['department_id'] ?? $employee->department_id ?? ''),
            'section_id' => (string) ($details['section_id'] ?? ''), 'floor_id' => (string) ($details['floor_id'] ?? ''),
        ];

        return $rows;
    }

    private function checkStoreTransfer(Employee $employee, int $targetStoreId, User $by): void
    {
        $context = app(StoreContext::class);
        if ($targetStoreId === (int) $employee->store_id || ! $context->available($by)->whereKey($targetStoreId)->exists()) {
            throw ValidationException::withMessages(['store_id' => 'Choose another store you manage.']);
        }
        if ($employee->user_id && ($login = User::find($employee->user_id)) && ! $context->available($login)->whereKey($targetStoreId)->exists()) {
            throw ValidationException::withMessages(['store_id' => "Give the login {$login->username} access to that store first (Settings > Users), so they can sign in there."]);
        }
    }

    /**
     * The employee is copied into the receiving store (store-specific links such as department, shift and policy are
     * left for that store to set); the login moves with them, leave balances carry over by leave code, and the old
     * record is closed as transferred. Raw table writes: the copy belongs to another store than the one selected.
     */
    private function moveToStore(Employee $employee, int $targetStoreId, string $effectiveDate): int
    {
        $target = Store::findOrFail($targetStoreId);
        $source = Store::find($employee->store_id);
        $details = $employee->master_details ?? [];
        foreach (['department_id', 'designation_id', 'section_id', 'floor_id', 'working_location_id', 'working_hour_id', 'salary_structure_id',
            'manager_designation_id', 'classifications', 'transferred_to'] as $storeSpecific) {
            unset($details[$storeSpecific]);
        }
        $details['transferred_from'] = ($source?->name ?? 'another store')." on {$effectiveDate}";
        $code = $employee->code;
        if (DB::table('employees')->where('store_id', $targetStoreId)->where('code', $code)->exists()) {
            $code .= '-T';
        }
        $userId = $employee->user_id;
        DB::table('employees')->where('id', $employee->id)->update(['user_id' => null, 'is_active' => false, 'updated_at' => now(),
            'master_details' => json_encode(($employee->master_details ?? []) + ['transferred_to' => "{$target->name} on {$effectiveDate}"])]);
        $newId = DB::table('employees')->insertGetId([
            'store_id' => $targetStoreId, 'name' => $employee->name, 'code' => $code, 'email' => $employee->email, 'phone' => $employee->phone,
            'address' => $employee->address, 'salary' => $employee->salary ?? 0, 'joining_date' => $employee->joining_date, 'is_active' => true,
            'user_id' => $userId, 'master_details' => json_encode($details), 'created_at' => now(), 'updated_at' => now(),
        ]);

        // Leave balances follow the employee to the leave types with the same code.
        $this->leave->ensureDefaults($targetStoreId);
        $year = (int) substr($effectiveDate, 0, 4);
        $targetTypes = HrLeaveType::withoutGlobalScopes()->where('store_id', $targetStoreId)->pluck('id', 'code');
        $balances = HrLeaveLedger::withoutGlobalScopes()->where('employee_id', $employee->id)->where('year', $year)
            ->selectRaw('leave_type_id, SUM(days) AS balance')->groupBy('leave_type_id')->get();
        $codes = HrLeaveType::withoutGlobalScopes()->whereIn('id', $balances->pluck('leave_type_id'))->pluck('code', 'id');
        foreach ($balances as $row) {
            $code = $codes[$row->leave_type_id] ?? null;
            if ((float) $row->balance <= 0 || ! $code || ! isset($targetTypes[$code])) {
                continue;
            }
            $now = now();
            DB::table('hr_leave_ledger')->insert([
                ['store_id' => $employee->store_id, 'employee_id' => $employee->id, 'leave_type_id' => $row->leave_type_id, 'year' => $year, 'days' => -$row->balance,
                    'kind' => 'ADJUSTMENT', 'note' => "Transferred to {$target->name}", 'leave_application_id' => null, 'created_by' => null, 'created_at' => $now, 'updated_at' => $now],
                ['store_id' => $targetStoreId, 'employee_id' => $newId, 'leave_type_id' => $targetTypes[$code], 'year' => $year, 'days' => $row->balance,
                    'kind' => 'ADJUSTMENT', 'note' => 'Carried from '.($source?->name ?? 'previous store'), 'leave_application_id' => null, 'created_by' => null, 'created_at' => $now, 'updated_at' => $now],
            ]);
        }
        // Someone who reported to them in the old store no longer does.
        DB::table('employees')->where('reports_to_id', $employee->id)->update(['reports_to_id' => null]);

        return $newId;
    }
}
