<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrDepartment;
use App\Models\HrShiftRoster;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * The shift roster: an employee's shift (a Working Hour) or day off on a date, overriding their usual shift and
 * weekly off. Days up to today are rebuilt when they change, so late/half-day/overtime follow the new shift.
 */
class RosterService
{
    public function __construct(private readonly AttendanceService $attendance) {}

    /** Sets (or with $clear, removes) one employee's day. */
    public function set(Employee $employee, string $date, ?int $workingHourId, bool $isOff, string $source = 'ROSTER', ?int $userId = null, bool $clear = false): void
    {
        if ($clear) {
            HrShiftRoster::withoutGlobalScopes()->where('employee_id', $employee->id)->whereDate('date', $date)->delete();
        } else {
            if (! $isOff) {
                $this->checkShift($employee->store_id, $workingHourId);
            }
            $row = HrShiftRoster::withoutGlobalScopes()->where('employee_id', $employee->id)->whereDate('date', $date)->first()
                ?? new HrShiftRoster(['employee_id' => $employee->id, 'date' => $date]);
            $row->forceFill(['store_id' => $employee->store_id, 'working_hour_id' => $isOff ? null : $workingHourId, 'is_off' => $isOff,
                'source' => $source, 'created_by' => $userId])->save();
        }
        $this->attendance->forgetRoster();
        if ($date <= $this->attendance->today()) {
            $this->attendance->rebuild($employee, $date);
        }
    }

    /**
     * Sets a range of days for many employees; `weekdays` (0 = Sunday … 6) limits it to those days of the week.
     *
     * @return int days set
     */
    public function bulk(iterable $employees, string $from, string $to, ?int $workingHourId, bool $isOff, ?array $weekdays, ?int $userId, bool $clear = false): int
    {
        if ($to < $from || Carbon::parse($from)->diffInDays(Carbon::parse($to)) > 92) {
            throw ValidationException::withMessages(['to' => 'Choose a range of up to three months, ending after it starts.']);
        }
        $count = 0;
        foreach ($employees as $employee) {
            for ($d = Carbon::parse($from); $d->toDateString() <= $to; $d->addDay()) {
                if ($weekdays && ! in_array($d->dayOfWeek, $weekdays, true)) {
                    continue;
                }
                $this->set($employee, $d->toDateString(), $workingHourId, $isOff, 'ROSTER', $userId, $clear);
                $count++;
            }
        }

        return $count;
    }

    public function checkShift(?int $storeId, ?int $workingHourId): void
    {
        $exists = $workingHourId && HrDepartment::withoutGlobalScopes()->where('configuration_type', 'working_hour')->whereKey($workingHourId)
            ->where(fn ($q) => $q->where('store_id', $storeId)->orWhereNull('store_id'))->exists();
        if (! $exists) {
            throw ValidationException::withMessages(['working_hour_id' => 'Choose a shift (Working Hour) of this store, or mark the day off.']);
        }
    }
}
