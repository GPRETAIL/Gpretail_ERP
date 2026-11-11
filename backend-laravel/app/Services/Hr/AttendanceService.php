<?php

namespace App\Services\Hr;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrCheckin;
use App\Models\HrDepartment;
use App\Models\HrHoliday;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveType;
use App\Models\HrShiftRoster;
use App\Models\Store;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Daily attendance, worked out from the punch log and the employee's working hour (shift), in the business
 * timezone (the app clock is UTC). A row a manager marked by hand (source MANUAL) is never recalculated.
 */
class AttendanceService
{
    public const STATUSES = ['PRESENT', 'HALF_DAY', 'ABSENT', 'LEAVE', 'HOLIDAY', 'WEEK_OFF'];

    /** Used for stores that never set a working hour: the old store-level shift start and late cut-off. */
    private const FALLBACK = ['start' => '09:30', 'end' => '18:30', 'grace' => 30, 'full_day' => 0, 'half_day' => 0];

    /** @var array<string, array<string, HrShiftRoster>> employee id|month => date => roster day */
    private array $roster = [];

    public function __construct(private readonly LeaveService $leave, private readonly PayrollSetup $payroll) {}

    /** The roster day for an employee and date, if one is set (a month is loaded at a time). */
    public function rosterOn(Employee $employee, string $date): ?HrShiftRoster
    {
        $key = $employee->id.'|'.substr($date, 0, 7);
        if (! isset($this->roster[$key])) {
            $first = Carbon::parse(substr($date, 0, 7).'-01');
            $this->roster[$key] = HrShiftRoster::withoutGlobalScopes()->where('employee_id', $employee->id)
                ->whereBetween('date', [$first->toDateString(), $first->copy()->endOfMonth()->toDateString()])->get()
                ->keyBy(fn ($r) => Carbon::parse($r->date)->toDateString())->all();
        }

        return $this->roster[$key][$date] ?? null;
    }

    /** Forget loaded roster days (after the roster changes). */
    public function forgetRoster(): void
    {
        $this->roster = [];
    }

    public static function timezone(): string
    {
        return config('app.business_timezone');
    }

    public function today(): string
    {
        return Carbon::now(self::timezone())->toDateString();
    }

    /** The attendance settings of the employee's store, with the geofence (lat, lng, radius_m). */
    public function settings(?int $storeId): array
    {
        $settings = $storeId ? (Store::find($storeId)?->attendance_settings ?? []) : [];

        return [
            'shift_start' => $settings['shift_start'] ?? '09:30',
            'late_cutoff' => $settings['late_cutoff'] ?? '10:00',
            'default_working_hour_id' => $settings['default_working_hour_id'] ?? null,
            'lat' => isset($settings['lat']) ? (float) $settings['lat'] : null,
            'lng' => isset($settings['lng']) ? (float) $settings['lng'] : null,
            'radius_m' => isset($settings['radius_m']) ? (int) $settings['radius_m'] : null,
        ];
    }

    /**
     * The employee's shift on a date: the roster's shift for that day, else their Working Hour (HR Configuration),
     * else the store default, else the old store-level shift start and late cut-off. Minutes for a full and a
     * half day are 0 when not set.
     */
    public function shiftFor(Employee $employee, ?string $date = null): array
    {
        $settings = $this->settings($employee->store_id);
        $rostered = $date ? $this->rosterOn($employee, $date)?->working_hour_id : null;
        $id = $rostered ?: (($employee->master_details['working_hour_id'] ?? null) ?: $settings['default_working_hour_id']);
        $row = $id ? HrDepartment::withoutGlobalScopes()->where('configuration_type', 'working_hour')
            ->where(fn ($q) => $q->where('store_id', $employee->store_id)->orWhereNull('store_id'))->find($id) : null;
        if (! $row) {
            $start = $settings['shift_start'];
            $grace = max(0, $this->minutes($settings['late_cutoff']) - $this->minutes($start));

            return ['id' => null, 'name' => 'Store default'] + array_merge(self::FALLBACK, ['start' => $start, 'grace' => $grace]);
        }
        $details = $row->master_details ?? [];

        return [
            'id' => $row->id,
            'name' => $row->name,
            'start' => $this->clock($details['from_time'] ?? null) ?? self::FALLBACK['start'],
            'end' => $this->clock($details['to_time'] ?? null) ?? self::FALLBACK['end'],
            'grace' => (int) ($details['grace_minutes'] ?? 0),
            'full_day' => $this->duration($details['minimum_full_day'] ?? null),
            'half_day' => $this->duration($details['minimum_present'] ?? null),
        ];
    }

    /**
     * Records a punch and rebuilds that day. A self punch must come from within the store's radius when the
     * store has a location set; the distance is kept with the punch either way.
     */
    public function punch(Employee $employee, string $type, string $source, ?float $lat = null, ?float $lng = null, ?Carbon $at = null, ?int $userId = null): Attendance
    {
        $distance = $this->checkGeofence($employee, $source, $lat, $lng);
        $at = ($at ?? Carbon::now())->copy()->utc();
        $date = $at->copy()->setTimezone(self::timezone())->toDateString();
        if ($type === 'OUT' && ! $this->punches($employee, $date)->contains('type', 'IN')) {
            throw ValidationException::withMessages(['type' => "{$employee->name} has not checked in on {$date}."]);
        }

        HrCheckin::create([
            'store_id' => $employee->store_id,
            'employee_id' => $employee->id,
            'punched_at' => $at,
            'type' => $type,
            'source' => $source,
            'lat' => $lat,
            'lng' => $lng,
            'distance_m' => $distance,
            'created_by' => $userId,
        ]);

        return $this->rebuild($employee, $date, force: $source !== 'SELF') ?? $this->row($employee, $date);
    }

    /** Sets a day by hand (or, with status AUTO, hands it back to the punches). */
    public function mark(Employee $employee, string $date, string $status, ?string $remarks = null): ?Attendance
    {
        if ($status === 'AUTO') {
            $row = $this->row($employee, $date);
            $row->exists && $row->update(['source' => 'AUTO']);

            return $this->rebuild($employee, $date);
        }
        $row = $this->row($employee, $date);
        $row->fill([
            'status' => $status,
            'source' => 'MANUAL',
            'remarks' => $remarks,
            'late_minutes' => $status === 'PRESENT' || $status === 'HALF_DAY' ? $row->late_minutes : 0,
        ])->save();

        return $row;
    }

    /**
     * Works the day out from the punches. Holidays and weekly offs count as such unless the employee worked;
     * an approved leave is LEAVE. With no punches on an ordinary day nothing is recorded until the day closes.
     * A MANUAL row is kept unless $force (a manager's own punch replaces their earlier marking).
     */
    public function rebuild(Employee $employee, string $date, bool $force = false): ?Attendance
    {
        $row = $this->row($employee, $date);
        if ($row->exists && $row->source === 'MANUAL' && ! $force) {
            return $row;
        }
        $punches = $this->punches($employee, $date);
        $leave = $this->leave->approvedOn($employee, $date);
        $values = ['source' => 'AUTO', 'late_minutes' => 0, 'early_exit_minutes' => 0, 'worked_minutes' => 0, 'check_in' => null, 'check_out' => null,
            'remarks' => null, 'leave_application_id' => $leave?->id, 'ot_minutes' => 0, 'ot_approved_minutes' => null, 'ot_status' => 'NONE', 'ot_decided_by' => null];

        $in = $punches->firstWhere('type', 'IN');
        if ($in) {
            $shift = $this->shiftFor($employee, $date);
            $out = $punches->where('type', 'OUT')->filter(fn ($p) => $p->punched_at->gte($in->punched_at))->last();
            $inLocal = $in->punched_at->copy()->setTimezone(self::timezone());
            $outLocal = $out?->punched_at->copy()->setTimezone(self::timezone());
            $late = $this->minutes($inLocal->format('H:i')) - $this->minutes($shift['start']);
            $worked = $outLocal ? (int) $inLocal->diffInMinutes($outLocal) : 0;
            $values = array_merge($values, [
                'check_in' => $inLocal->format('H:i:s'),
                'check_out' => $outLocal?->format('H:i:s'),
                'late_minutes' => $late > $shift['grace'] ? $late : 0,
                'early_exit_minutes' => $outLocal ? max(0, $this->minutes($shift['end']) - $this->minutes($outLocal->format('H:i'))) : 0,
                'worked_minutes' => $worked,
                'status' => $this->workedStatus($shift, $outLocal !== null, $worked, $leave),
            ], $this->overtime($employee, $row, $shift, $worked));
            if ($this->holiday($employee->store_id, $date)) {
                $values['remarks'] = 'Worked on a holiday';
            } elseif ($this->isWeekOff($employee, $date)) {
                $values['remarks'] = 'Worked on the weekly off';
            }
        } elseif ($leave) {
            $values['status'] = 'LEAVE';
        } elseif ($name = $this->holiday($employee->store_id, $date)) {
            $values['status'] = 'HOLIDAY';
            $values['remarks'] = $name;
        } elseif ($this->isWeekOff($employee, $date)) {
            $values['status'] = 'WEEK_OFF';
        } elseif ($date < $this->today() && $row->exists) {
            $values['status'] = 'ABSENT';
        } else {
            // An ordinary day with no punch yet: nothing to record (the day closes at night).
            if ($row->exists) {
                $row->delete();
            }

            return null;
        }
        $row->fill($values)->save();

        return $row;
    }

    /** Closes a day for everyone: absent when nobody punched, unless it was a leave, holiday or weekly off. */
    public function closeDay(string $date, ?int $storeId = null): int
    {
        $count = 0;
        Employee::withoutGlobalScopes()->where('is_active', true)
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->where(fn ($q) => $q->whereNull('joining_date')->orWhere('joining_date', '<=', $date))
            ->orderBy('id')->each(function (Employee $employee) use ($date, &$count) {
                $row = $this->rebuild($employee, $date);
                if (! $row) {
                    $row = $this->row($employee, $date);
                    $row->fill(['status' => 'ABSENT', 'source' => 'AUTO'])->save();
                } elseif ($row->status === 'PRESENT' && $row->check_in && ! $row->check_out && $row->source === 'AUTO') {
                    $row->update(['remarks' => 'No check-out']);
                }
                $count++;
            });

        return $count;
    }

    /**
     * The month in numbers for one employee: payable days (present, half days as ½, paid leave, holidays and
     * weekly offs), loss-of-pay days (absent, unpaid leave), days present for batta, and overtime minutes beyond
     * the shift. Days after today are not counted yet. Pass the month's rows and holidays to avoid queries.
     *
     * @param  Collection<int, Attendance>|null  $rows
     * @param  array<string, true>|null  $holidays  'Y-m-d' => true for the employee's store
     */
    public function monthSummary(Employee $employee, string $month, ?Collection $rows = null, ?array $holidays = null): array
    {
        $first = Carbon::parse("{$month}-01");
        $last = $first->copy()->endOfMonth();
        $today = $this->today();
        $rows ??= Attendance::withoutGlobalScopes()->where('employee_id', $employee->id)
            ->whereBetween('date', [$first->toDateString(), $last->toDateString()])->get();
        $holidays ??= HrHoliday::withoutGlobalScopes()->where('store_id', $employee->store_id)
            ->whereBetween('date', [$first->toDateString(), $last->toDateString()])->get()
            ->mapWithKeys(fn ($h) => [Carbon::parse($h->date)->toDateString() => true])->all();
        $byDate = $rows->keyBy(fn ($r) => Carbon::parse($r->date)->toDateString());
        $leaves = HrLeaveApplication::withoutGlobalScopes()->whereIn('id', $rows->pluck('leave_application_id')->filter()->unique())
            ->get()->keyBy('id');
        $paidTypes = HrLeaveType::withoutGlobalScopes()->whereIn('id', $leaves->pluck('leave_type_id')->unique())->pluck('is_paid', 'id');
        $otNeedsApproval = $this->otNeedsApproval($employee->store_id);
        $joined = $employee->joining_date ? Carbon::parse($employee->joining_date)->toDateString() : null;
        $left = $employee->relieving_date ? Carbon::parse($employee->relieving_date)->toDateString() : null;

        $sum = ['days_in_month' => $first->daysInMonth, 'counted_days' => 0, 'payable_days' => 0.0, 'lop_days' => 0.0, 'present_days' => 0.0,
            'paid_leave_days' => 0.0, 'unpaid_leave_days' => 0.0, 'off_days' => 0, 'absent_days' => 0, 'late_days' => 0, 'ot_minutes' => 0];
        for ($d = $first->copy(); $d->lte($last); $d->addDay()) {
            $key = $d->toDateString();
            if ($key > $today) {
                break;
            }
            $sum['counted_days']++;
            if (($joined && $key < $joined) || ($left && $key > $left)) {
                $sum['lop_days']++; // Not yet employed, or already left: not paid.
                continue;
            }
            $row = $byDate->get($key);
            $status = $row?->status ?? (isset($holidays[$key]) ? 'HOLIDAY' : ($this->isWeekOff($employee, $key) ? 'WEEK_OFF' : ($key < $today ? 'ABSENT' : null)));
            $leave = $row?->leave_application_id ? $leaves->get($row->leave_application_id) : null;
            $leavePaid = $leave ? (bool) ($paidTypes[$leave->leave_type_id] ?? true) : true;
            $leaveShare = $leave && $leave->half_day ? 0.5 : 1.0;
            switch ($status) {
                case 'PRESENT':
                    $sum['payable_days']++;
                    $sum['present_days']++;
                    break;
                case 'HALF_DAY':
                    $sum['present_days'] += 0.5;
                    $sum['payable_days'] += 0.5 + ($leave && $leavePaid ? 0.5 : 0);
                    $sum['lop_days'] += $leave && $leavePaid ? 0 : 0.5;
                    $leave && ($leavePaid ? $sum['paid_leave_days'] += 0.5 : $sum['unpaid_leave_days'] += 0.5);
                    break;
                case 'LEAVE':
                    if ($leavePaid) {
                        $sum['payable_days'] += 1; // A half-day paid leave with no work: the other half is absent.
                        $sum['paid_leave_days'] += $leaveShare;
                        if ($leaveShare < 1) {
                            $sum['payable_days'] -= 0.5;
                            $sum['lop_days'] += 0.5;
                        }
                    } else {
                        $sum['lop_days']++;
                        $sum['unpaid_leave_days'] += $leaveShare;
                    }
                    break;
                case 'HOLIDAY':
                case 'WEEK_OFF':
                    $sum['payable_days']++;
                    $sum['off_days']++;
                    break;
                case 'ABSENT':
                    $sum['lop_days']++;
                    $sum['absent_days']++;
                    break;
            }
            if ($row && $row->late_minutes > 0) {
                $sum['late_days']++;
            }
            if ($row) {
                $sum['ot_minutes'] += $this->payableOvertime($employee, $row, $key, $otNeedsApproval);
            }
        }

        return $sum;
    }

    /** @return Collection<int, HrCheckin> the day's punches (business-timezone day), oldest first */
    public function punches(Employee $employee, string $date): Collection
    {
        $from = Carbon::parse($date, self::timezone())->startOfDay()->utc();

        return HrCheckin::withoutGlobalScopes()->where('employee_id', $employee->id)
            ->whereBetween('punched_at', [$from, $from->copy()->addDay()->subSecond()])
            ->orderBy('punched_at')->orderBy('id')->get();
    }

    /**
     * An employee's status on a day: the attendance row's status, else holiday, weekly off, or (once the
     * day is over) absent; a day still running with no punch is NOT_MARKED.
     */
    public function dayStatus(Employee $employee, ?Attendance $row, string $date): string
    {
        return $row?->status ?? ($this->holiday($employee->store_id, $date) ? 'HOLIDAY'
            : ($this->isWeekOff($employee, $date) ? 'WEEK_OFF' : ($date < $this->today() ? 'ABSENT' : 'NOT_MARKED')));
    }

    /** Off on the roster that day; with no roster day, the employee's weekly off ("Dynamic" means only the roster sets it). */
    public function isWeekOff(Employee $employee, string $date): bool
    {
        if ($rostered = $this->rosterOn($employee, $date)) {
            return $rostered->is_off;
        }
        $day = $employee->master_details['week_off'] ?? null;

        return $day && $day !== 'Dynamic' && strcasecmp(Carbon::parse($date)->englishDayOfWeek, $day) === 0;
    }

    /** The holiday's name, or null. */
    public function holiday(?int $storeId, string $date): ?string
    {
        return HrHoliday::withoutGlobalScopes()->where('store_id', $storeId)->whereDate('date', $date)->value('name');
    }

    /** Metres from the store, or null when either side has no location. */
    public function distance(Employee $employee, ?float $lat, ?float $lng): ?int
    {
        $settings = $this->settings($employee->store_id);
        if ($lat === null || $lng === null || $settings['lat'] === null || $settings['lng'] === null) {
            return null;
        }
        $rad = M_PI / 180;
        $a = sin(($lat - $settings['lat']) * $rad / 2) ** 2
            + cos($settings['lat'] * $rad) * cos($lat * $rad) * sin(($lng - $settings['lng']) * $rad / 2) ** 2;

        return (int) round(6371000 * 2 * atan2(sqrt($a), sqrt(1 - $a)));
    }

    private function checkGeofence(Employee $employee, string $source, ?float $lat, ?float $lng): ?int
    {
        $settings = $this->settings($employee->store_id);
        $fenced = $source === 'SELF' && $settings['lat'] !== null && $settings['lng'] !== null && $settings['radius_m'];
        if ($fenced && ($lat === null || $lng === null)) {
            throw ValidationException::withMessages(['location' => 'Turn on location to check in: check-in is allowed only at the store.']);
        }
        $distance = $this->distance($employee, $lat, $lng);
        if ($fenced && $distance > $settings['radius_m']) {
            throw ValidationException::withMessages(['location' => "You are {$distance} m from the store. Check-in is allowed within {$settings['radius_m']} m."]);
        }

        return $distance;
    }

    public function otNeedsApproval(?int $storeId): bool
    {
        return $storeId ? (bool) ($this->payroll->settings($storeId)['ot']['requires_approval'] ?? true) : true;
    }

    /** A day's full-day minutes: the shift's minimum full day, else its length. */
    public function fullDayMinutes(array $shift): int
    {
        return $shift['full_day'] ?: max(0, $this->minutes($shift['end']) - $this->minutes($shift['start']));
    }

    /**
     * Overtime on a worked day, for employees with OT ticked: the minutes beyond the shift's full day. With approval
     * required it waits as PENDING; a decision already made stays while the minutes are unchanged.
     */
    private function overtime(Employee $employee, Attendance $row, array $shift, int $worked): array
    {
        $details = $employee->master_details ?? [];
        $eligible = filter_var($details['e_ot'] ?? false, FILTER_VALIDATE_BOOLEAN) || filter_var($details['m_ot'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $minutes = $eligible ? max(0, $worked - $this->fullDayMinutes($shift)) : 0;
        if ($minutes === 0) {
            return ['ot_minutes' => 0, 'ot_approved_minutes' => null, 'ot_status' => 'NONE', 'ot_decided_by' => null];
        }
        if ($row->exists && (int) $row->ot_minutes === $minutes && in_array($row->ot_status, ['APPROVED', 'REJECTED'], true)) {
            return ['ot_minutes' => $minutes, 'ot_approved_minutes' => $row->ot_approved_minutes, 'ot_status' => $row->ot_status, 'ot_decided_by' => $row->ot_decided_by];
        }

        return ['ot_minutes' => $minutes, 'ot_approved_minutes' => null, 'ot_status' => $this->otNeedsApproval($employee->store_id) ? 'PENDING' : 'NONE', 'ot_decided_by' => null];
    }

    /**
     * Overtime minutes payroll pays for a day: approved minutes when approval is required, otherwise all of them.
     * A row a manager entered by hand (no stored OT) falls back to the worked minutes beyond the shift.
     */
    private function payableOvertime(Employee $employee, Attendance $row, string $date, bool $needsApproval): int
    {
        if ($row->ot_status === 'APPROVED') {
            return (int) ($row->ot_approved_minutes ?? $row->ot_minutes);
        }
        if ($needsApproval) {
            return 0;
        }
        if ((int) $row->ot_minutes > 0) {
            return (int) $row->ot_minutes;
        }

        return max(0, (int) $row->worked_minutes - $this->fullDayMinutes($this->shiftFor($employee, $date)));
    }

    private function workedStatus(array $shift, bool $checkedOut, int $worked, $leave): string
    {
        if (! $checkedOut) {
            return 'PRESENT'; // Still at work; finalised at check-out or when the day closes.
        }
        if ($shift['full_day'] && $worked < $shift['full_day']) {
            // A half-day leave plus a half day worked is a half day; otherwise the half-day threshold decides.
            return $leave || ! $shift['half_day'] || $worked >= $shift['half_day'] ? 'HALF_DAY' : 'ABSENT';
        }

        return 'PRESENT';
    }

    private function row(Employee $employee, string $date): Attendance
    {
        return Attendance::withoutGlobalScopes()->where('employee_id', $employee->id)->whereDate('date', $date)->first()
            ?? new Attendance(['employee_id' => $employee->id, 'store_id' => $employee->store_id, 'date' => $date, 'status' => 'ABSENT',
                'late_minutes' => 0, 'early_exit_minutes' => 0, 'worked_minutes' => 0, 'source' => 'AUTO']);
    }

    private function minutes(string $time): int
    {
        [$h, $m] = array_map('intval', explode(':', $time) + [0, 0]);

        return $h * 60 + $m;
    }

    /** "09:30" / "9:30" / "09:30:00" as "09:30", or null. */
    private function clock(?string $value): ?string
    {
        return $value && preg_match('/^(\d{1,2}):(\d{2})/', $value, $m) ? sprintf('%02d:%s', $m[1], $m[2]) : null;
    }

    /** An "hh:mm" duration in minutes (0 when not set). */
    private function duration(?string $value): int
    {
        return $value && preg_match('/^(\d{1,2}):(\d{2})/', $value, $m) ? (int) $m[1] * 60 + (int) $m[2] : 0;
    }
}
