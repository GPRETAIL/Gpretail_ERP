<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Http\Requests\Hr\CheckInRequest;
use App\Http\Requests\Hr\CheckOutRequest;
use App\Http\Requests\Hr\MarkLeaveRequest;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrCheckin;
use App\Models\HrHoliday;
use App\Models\Store;
use App\Services\Hr\AttendanceService;
use App\Services\Hr\HrScope;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Employee In/Out: the day's board, self check-in from the phone, manager punches and marking, spreadsheet
 * import, the punch log and the monthly register. The day's status is worked out by AttendanceService.
 */
class AttendanceController extends Controller
{
    public function __construct(private readonly AttendanceService $attendance, private readonly HrScope $scope) {}

    public function today(Request $request)
    {
        $date = $this->date($request->query('date'));
        $employees = $this->scope->apply(Employee::where('is_active', true), $request->user(), 'id')
            ->with(['department:id,name'])->orderBy('name')->get();
        $rows = Attendance::whereDate('date', $date)->whereIn('employee_id', $employees->pluck('id'))->get()->keyBy('employee_id');
        $closed = $date < $this->attendance->today();

        $data = $employees->map(function (Employee $employee) use ($rows, $date, $closed) {
            $row = $rows->get($employee->id);
            $status = $row?->status ?? ($this->attendance->holiday($employee->store_id, $date) ? 'HOLIDAY'
                : ($this->attendance->isWeekOff($employee, $date) ? 'WEEK_OFF' : ($closed ? 'ABSENT' : 'NOT_MARKED')));

            return [
                'employee_id' => $employee->id, 'name' => $employee->name, 'code' => $employee->code,
                'department' => $employee->department?->name, 'status' => $status,
                'check_in' => $row?->check_in, 'check_out' => $row?->check_out,
                'late_minutes' => (int) ($row?->late_minutes ?? 0), 'early_exit_minutes' => (int) ($row?->early_exit_minutes ?? 0),
                'worked_minutes' => (int) ($row?->worked_minutes ?? 0), 'source' => $row?->source, 'remarks' => $row?->remarks,
            ];
        })->values();
        $settings = $this->attendance->settings($this->resolveStoreId($request, null));

        return response()->json(['success' => true, 'data' => [
            'date' => $date,
            'today' => $this->attendance->today(),
            'settings' => ['shift_start' => $settings['shift_start'], 'late_cutoff' => $settings['late_cutoff']],
            'summary' => [
                'total' => $data->count(),
                'present' => $data->whereIn('status', ['PRESENT', 'HALF_DAY'])->count(),
                'late' => $data->where('late_minutes', '>', 0)->count(),
                'half_day' => $data->where('status', 'HALF_DAY')->count(),
                'absent' => $data->where('status', 'ABSENT')->count(),
                'leave' => $data->where('status', 'LEAVE')->count(),
                'off' => $data->whereIn('status', ['HOLIDAY', 'WEEK_OFF'])->count(),
                'not_marked' => $data->where('status', 'NOT_MARKED')->count(),
            ],
            'rows' => $data,
        ]]);
    }

    /** The signed-in user's own day, for the phone's check-in card. */
    public function me(Request $request)
    {
        $employee = $this->scope->employeeFor($request->user());
        if (! $employee) {
            return response()->json(['success' => true, 'data' => ['employee' => null]]);
        }
        $date = $this->attendance->today();
        $settings = $this->attendance->settings($employee->store_id);
        $row = Attendance::where('employee_id', $employee->id)->whereDate('date', $date)->first();
        $punches = $this->attendance->punches($employee, $date);

        return response()->json(['success' => true, 'data' => [
            'employee' => ['id' => $employee->id, 'name' => $employee->name, 'code' => $employee->code],
            'date' => $date,
            'shift' => $this->attendance->shiftFor($employee),
            'attendance' => $row,
            'punches' => $punches->map(fn (HrCheckin $p) => ['type' => $p->type, 'at' => $p->punched_at->copy()->setTimezone(AttendanceService::timezone())->format('H:i:s'), 'source' => $p->source]),
            'next' => $punches->last()?->type === 'IN' ? 'OUT' : 'IN',
            'geofence' => $settings['lat'] !== null && $settings['radius_m'] ? ['lat' => $settings['lat'], 'lng' => $settings['lng'], 'radius_m' => $settings['radius_m']] : null,
        ]]);
    }

    public function selfPunch(Request $request)
    {
        $data = $request->validate(['type' => 'required|in:IN,OUT', 'lat' => 'nullable|numeric|between:-90,90', 'lng' => 'nullable|numeric|between:-180,180']);
        $employee = $this->scope->employeeFor($request->user());
        if (! $employee) {
            throw ValidationException::withMessages(['employee' => 'Your login is not linked to an employee. Ask HR to link it in the employee form (Allow System / UserName).']);
        }
        $row = $this->attendance->punch($employee, $data['type'], 'SELF', isset($data['lat']) ? (float) $data['lat'] : null,
            isset($data['lng']) ? (float) $data['lng'] : null, userId: $request->user()->id);

        return response()->json(['success' => true, 'message' => $data['type'] === 'IN' ? 'Checked in' : 'Checked out', 'data' => $row]);
    }

    /** A manager's punch for one or more employees, now or at a given time. */
    public function punch(Request $request)
    {
        $data = $request->validate([
            'employee_ids' => 'required|array|min:1', 'employee_ids.*' => 'integer',
            'type' => 'required|in:IN,OUT', 'date' => 'nullable|date_format:Y-m-d', 'time' => 'nullable|date_format:H:i',
        ]);
        $at = isset($data['time']) ? Carbon::parse(($data['date'] ?? $this->attendance->today()).' '.$data['time'], AttendanceService::timezone()) : null;
        if ($at && $at->isFuture()) {
            throw ValidationException::withMessages(['time' => 'A punch cannot be in the future.']);
        }
        $done = $this->employees($request, $data['employee_ids'])->map(fn (Employee $e) => $this->attendance->punch($e, $data['type'], 'MANAGER', at: $at, userId: $request->user()->id));

        return response()->json(['success' => true, 'message' => "{$done->count()} punch(es) recorded", 'data' => $done->values()]);
    }

    /** Sets a status by hand for one or more employees on a date; AUTO hands the day back to the punches. */
    public function mark(Request $request)
    {
        $data = $request->validate([
            'employee_ids' => 'required|array|min:1', 'employee_ids.*' => 'integer',
            'date' => 'required|date_format:Y-m-d', 'status' => ['required', Rule::in([...AttendanceService::STATUSES, 'AUTO'])],
            'remarks' => 'nullable|string|max:255',
        ]);
        if ($data['date'] > $this->attendance->today()) {
            throw ValidationException::withMessages(['date' => 'Attendance cannot be marked for a future date. Use leave for planned absence.']);
        }
        $done = $this->employees($request, $data['employee_ids'])->map(fn (Employee $e) => $this->attendance->mark($e, $data['date'], $data['status'], $data['remarks'] ?? null));

        return response()->json(['success' => true, 'message' => "{$done->count()} employee(s) updated", 'data' => $done->filter()->values()]);
    }

    /** Spreadsheet rows: employee_code, date, and check_in / check_out times or a status. The body is the raw row array. */
    public function import(Request $request)
    {
        $rows = array_values(array_filter($request->all(), 'is_array'));
        $codes = collect($rows)->map(fn ($r) => trim((string) ($r['employee_code'] ?? $r['code'] ?? '')))->filter()->unique();
        $employees = $this->scope->apply(Employee::whereIn('code', $codes), $request->user(), 'id')->get()->keyBy('code');
        $imported = 0;
        $errors = [];
        foreach ($rows as $index => $row) {
            $line = $index + 2;
            try {
                $employee = $employees->get(trim((string) ($row['employee_code'] ?? $row['code'] ?? '')));
                $date = $this->importDate($row['date'] ?? null);
                if (! $employee || ! $date || $date > $this->attendance->today()) {
                    throw ValidationException::withMessages(['row' => ! $employee ? 'Unknown employee code' : 'Invalid or future date']);
                }
                $status = strtoupper(str_replace([' ', '-'], '_', trim((string) ($row['status'] ?? ''))));
                foreach (['IN' => $row['check_in'] ?? null, 'OUT' => $row['check_out'] ?? null] as $type => $time) {
                    if ($time !== null && trim((string) $time) !== '') {
                        $this->attendance->punch($employee, $type, 'IMPORT', at: Carbon::parse("{$date} ".$this->importTime($time), AttendanceService::timezone()), userId: $request->user()->id);
                    }
                }
                if ($status !== '' && in_array($status, AttendanceService::STATUSES, true)) {
                    $this->attendance->mark($employee, $date, $status, 'Imported');
                } elseif ($status !== '' && empty($row['check_in'])) {
                    throw ValidationException::withMessages(['row' => "Unknown status {$row['status']}"]);
                }
                $imported++;
            } catch (ValidationException $e) {
                $errors[] = ['row' => $line, 'message' => collect($e->errors())->flatten()->first()];
            } catch (\Throwable) {
                $errors[] = ['row' => $line, 'message' => 'Could not read this row'];
            }
        }

        if ($imported === 0 && $errors) {
            $first = collect($errors)->take(3)->map(fn ($e) => "row {$e['row']}: {$e['message']}")->implode('; ');

            return response()->json(['success' => false, 'message' => "Nothing imported ({$first})", 'data' => ['imported' => 0, 'errors' => $errors]], 422);
        }

        return response()->json(['success' => true, 'message' => "{$imported} row(s) imported", 'created' => $imported, 'data' => ['imported' => $imported, 'errors' => $errors]]);
    }

    public function punches(Request $request)
    {
        $from = $this->date($request->query('from'));
        $to = $this->date($request->query('to', $from));
        $start = Carbon::parse($from, AttendanceService::timezone())->startOfDay()->utc();
        $end = Carbon::parse($to, AttendanceService::timezone())->endOfDay()->utc();
        $rows = $this->scope->apply(HrCheckin::query(), $request->user())->with('employee:id,name,code')
            ->when($request->query('employee_id'), fn ($q, $id) => $q->where('employee_id', $id))
            ->whereBetween('punched_at', [$start, $end])->orderByDesc('punched_at')->limit(5000)->get()
            ->map(fn (HrCheckin $p) => [
                'id' => $p->id, 'employee_id' => $p->employee_id, 'employee' => $p->employee?->name, 'code' => $p->employee?->code,
                'date' => $p->punched_at->copy()->setTimezone(AttendanceService::timezone())->toDateString(),
                'time' => $p->punched_at->copy()->setTimezone(AttendanceService::timezone())->format('H:i:s'),
                'type' => $p->type, 'source' => $p->source, 'distance_m' => $p->distance_m,
            ]);

        return response()->json(['success' => true, 'data' => $rows]);
    }

    /** One row per employee with a status code per day of the month, and totals. */
    public function monthly(Request $request)
    {
        $month = preg_match('/^\d{4}-\d{2}$/', (string) $request->query('month')) ? $request->query('month') : substr($this->attendance->today(), 0, 7);
        $first = Carbon::parse("{$month}-01");
        $last = $first->copy()->endOfMonth();
        $today = $this->attendance->today();
        $employees = $this->scope->apply(Employee::query(), $request->user(), 'id')->with('department:id,name')
            ->where(fn ($q) => $q->where('is_active', true)->orWhereHas('attendances', fn ($a) => $a->whereBetween('date', [$first->toDateString(), $last->toDateString()])))
            ->orderBy('name')->get();
        $rows = Attendance::whereIn('employee_id', $employees->pluck('id'))->whereBetween('date', [$first->toDateString(), $last->toDateString()])
            ->get()->groupBy('employee_id');
        // One query for the month's holidays instead of one per employee and day.
        $holidays = HrHoliday::whereBetween('date', [$first->toDateString(), $last->toDateString()])->get()
            ->groupBy('store_id')->map(fn ($rows) => $rows->map(fn ($h) => $h->date->toDateString())->flip());
        $codes = ['PRESENT' => 'P', 'HALF_DAY' => 'HD', 'ABSENT' => 'A', 'LEAVE' => 'L', 'HOLIDAY' => 'H', 'WEEK_OFF' => 'WO'];

        $data = $employees->map(function (Employee $employee) use ($rows, $first, $last, $today, $codes, $holidays) {
            $byDate = ($rows->get($employee->id) ?? collect())->keyBy(fn ($r) => $r->date->toDateString());
            $days = [];
            $totals = ['present' => 0, 'half_day' => 0, 'absent' => 0, 'leave' => 0, 'off' => 0, 'late' => 0];
            for ($d = $first->copy(); $d->lte($last); $d->addDay()) {
                $key = $d->toDateString();
                $row = $byDate->get($key);
                $status = $row?->status ?? ($key > $today ? null : (isset($holidays[$employee->store_id][$key]) ? 'HOLIDAY'
                    : ($this->attendance->isWeekOff($employee, $key) ? 'WEEK_OFF' : ($key < $today ? 'ABSENT' : null))));
                $days[$d->day] = $status ? $codes[$status] : '';
                match ($status) {
                    'PRESENT' => $totals['present']++, 'HALF_DAY' => $totals['half_day']++, 'ABSENT' => $totals['absent']++,
                    'LEAVE' => $totals['leave']++, 'HOLIDAY', 'WEEK_OFF' => $totals['off']++, default => null,
                };
                if ($row && $row->late_minutes > 0) {
                    $totals['late']++;
                }
            }
            $totals['payable_days'] = $totals['present'] + $totals['half_day'] / 2 + $totals['leave'] + $totals['off'];

            return ['employee_id' => $employee->id, 'name' => $employee->name, 'code' => $employee->code, 'department' => $employee->department?->name, 'days' => $days] + $totals;
        })->values();

        return response()->json(['success' => true, 'data' => ['month' => $month, 'days_in_month' => $first->daysInMonth, 'rows' => $data]]);
    }

    public function settings(Request $request)
    {
        $storeId = $this->resolveStoreId($request, null);
        if ($request->isMethod('post') || $request->isMethod('put')) {
            $store = $storeId ? Store::find($storeId) : null;
            if (! $store || $request->header('X-Company-Scope-Id') === 'all') {
                return response()->json(['success' => false, 'message' => 'A specific store must be selected'], 422);
            }
            $data = $request->validate([
                'shift_start' => 'nullable|date_format:H:i', 'late_cutoff' => 'nullable|date_format:H:i',
                'default_working_hour_id' => 'nullable|integer', 'lat' => 'nullable|numeric|between:-90,90',
                'lng' => 'nullable|numeric|between:-180,180', 'radius_m' => 'nullable|integer|min:20|max:5000',
            ]);
            // Only the fields sent are changed (a geofence save keeps the shift times and the other way round).
            $store->update(['attendance_settings' => array_replace($store->attendance_settings ?? [], $data)]);

            return response()->json(['success' => true, 'message' => 'Attendance settings updated', 'data' => $this->attendance->settings($store->id)]);
        }

        return response()->json(['success' => true, 'data' => $this->attendance->settings($storeId)]);
    }

    // The original roll-call actions, kept for older app versions: a manager's punch now, or leave today.
    public function checkIn(CheckInRequest $request)
    {
        $employee = $this->employees($request, [(int) $request->input('employee_id')])->firstOrFail();

        return response()->json(['success' => true, 'message' => 'Checked in', 'data' => $this->attendance->punch($employee, 'IN', 'MANAGER', userId: $request->user()->id)]);
    }

    public function checkOut(CheckOutRequest $request)
    {
        $employee = $this->employees($request, [(int) $request->input('employee_id')])->firstOrFail();

        return response()->json(['success' => true, 'message' => 'Checked out', 'data' => $this->attendance->punch($employee, 'OUT', 'MANAGER', userId: $request->user()->id)]);
    }

    public function markLeave(MarkLeaveRequest $request)
    {
        $employee = $this->employees($request, [(int) $request->input('employee_id')])->firstOrFail();

        return response()->json(['success' => true, 'message' => 'Marked on leave', 'data' => $this->attendance->mark($employee, $this->attendance->today(), 'LEAVE')]);
    }

    /** The requested employees the user may manage (others are silently left out). */
    private function employees(Request $request, array $ids)
    {
        return $this->scope->apply(Employee::whereIn('id', $ids), $request->user(), 'id')->get();
    }

    private function date(?string $value): string
    {
        return $value && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : $this->attendance->today();
    }

    /** "09:30", "9:30 AM", or an Excel time (a fraction of a day). */
    private function importTime(mixed $value): string
    {
        if (is_numeric($value) && (float) $value < 1) {
            $minutes = (int) round((float) $value * 1440);

            return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
        }

        return trim((string) $value);
    }

    private function importDate(mixed $value): ?string
    {
        if (is_numeric($value)) {
            return Carbon::create(1899, 12, 30)->addDays((int) $value)->toDateString(); // An Excel serial date.
        }
        foreach (['Y-m-d', 'd-m-Y', 'd/m/Y', 'd.m.Y'] as $format) {
            try {
                $date = Carbon::createFromFormat("!{$format}", trim((string) $value));
                if ($date && $date->format($format) === trim((string) $value)) {
                    return $date->toDateString();
                }
            } catch (\Throwable) {
            }
        }

        return null;
    }
}
