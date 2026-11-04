<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrDepartment;
use App\Models\HrShiftRoster;
use App\Services\Hr\AttendanceService;
use App\Services\Hr\HrScope;
use App\Services\Hr\RosterService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** HRMS > Shift Roster: a week of shifts and days off per employee, set by day or in bulk. */
class RosterController extends Controller
{
    public function __construct(private readonly RosterService $roster, private readonly AttendanceService $attendance, private readonly HrScope $scope) {}

    public function week(Request $request)
    {
        $start = Carbon::parse($request->query('from') ?: $this->attendance->today())->startOfWeek(Carbon::MONDAY);
        $dates = collect(range(0, 6))->map(fn ($i) => $start->copy()->addDays($i)->toDateString());
        $employees = $this->scope->apply(Employee::where('is_active', true), $request->user(), 'id')->orderBy('name')->get();
        $shifts = HrDepartment::where('configuration_type', 'working_hour')->orderBy('name')->get();
        $names = $shifts->pluck('name', 'id');
        $cells = HrShiftRoster::whereIn('employee_id', $employees->pluck('id'))->whereBetween('date', [$dates->first(), $dates->last()])->get()
            ->groupBy('employee_id');

        return response()->json(['success' => true, 'data' => [
            'from' => $dates->first(),
            'dates' => $dates,
            'shifts' => $shifts->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'from_time' => $s->master_details['from_time'] ?? null, 'to_time' => $s->master_details['to_time'] ?? null])->values(),
            'rows' => $employees->map(function (Employee $employee) use ($dates, $cells, $names) {
                $own = $employee->master_details['working_hour_id'] ?? null;
                $byDate = ($cells->get($employee->id) ?? collect())->keyBy(fn ($c) => $c->date->toDateString());

                return [
                    'employee_id' => $employee->id, 'name' => $employee->name, 'code' => $employee->code,
                    'usual_shift' => $own ? ($names[$own] ?? null) : null, 'week_off' => $employee->master_details['week_off'] ?? null,
                    'days' => $dates->mapWithKeys(function ($date) use ($byDate, $employee, $names) {
                        $cell = $byDate->get($date);
                        $off = $cell ? $cell->is_off : $this->attendance->isWeekOff($employee, $date);

                        return [$date => [
                            'rostered' => (bool) $cell, 'is_off' => $off, 'working_hour_id' => $cell?->working_hour_id,
                            'shift' => $off ? null : ($cell?->working_hour_id ? ($names[$cell->working_hour_id] ?? null) : null), 'source' => $cell?->source,
                        ]];
                    }),
                ];
            })->values(),
        ]]);
    }

    public function set(Request $request)
    {
        $data = $request->validate(['employee_id' => 'required|integer', 'date' => 'required|date_format:Y-m-d', 'working_hour_id' => 'nullable|integer',
            'is_off' => 'boolean', 'clear' => 'boolean']);
        $employee = $this->scope->apply(Employee::whereKey($data['employee_id']), $request->user(), 'id')->firstOrFail();
        $this->roster->set($employee, $data['date'], $data['working_hour_id'] ?? null, (bool) ($data['is_off'] ?? false), 'ROSTER', $request->user()->id, (bool) ($data['clear'] ?? false));

        return response()->json(['success' => true, 'message' => 'Roster updated']);
    }

    public function bulk(Request $request)
    {
        $data = $request->validate([
            'employee_ids' => 'required|array|min:1', 'employee_ids.*' => 'integer', 'from' => 'required|date_format:Y-m-d', 'to' => 'required|date_format:Y-m-d',
            'working_hour_id' => 'nullable|integer', 'is_off' => 'boolean', 'clear' => 'boolean', 'weekdays' => 'nullable|array', 'weekdays.*' => 'integer|between:0,6',
        ]);
        $employees = $this->scope->apply(Employee::whereIn('id', $data['employee_ids']), $request->user(), 'id')->get();
        $count = $this->roster->bulk($employees, $data['from'], $data['to'], $data['working_hour_id'] ?? null, (bool) ($data['is_off'] ?? false),
            array_map('intval', $data['weekdays'] ?? []) ?: null, $request->user()->id, (bool) ($data['clear'] ?? false));

        return response()->json(['success' => true, 'message' => "{$count} day(s) set"]);
    }

    /** Copies the previous week's roster into the week starting `from` (days already set are kept). */
    public function copyWeek(Request $request)
    {
        $data = $request->validate(['from' => 'required|date_format:Y-m-d']);
        $start = Carbon::parse($data['from'])->startOfWeek(Carbon::MONDAY);
        $employees = $this->scope->apply(Employee::where('is_active', true), $request->user(), 'id')->get()->keyBy('id');
        $previous = HrShiftRoster::whereIn('employee_id', $employees->keys())
            ->whereBetween('date', [$start->copy()->subWeek()->toDateString(), $start->copy()->subDay()->toDateString()])->get();
        $taken = HrShiftRoster::whereIn('employee_id', $employees->keys())->whereBetween('date', [$start->toDateString(), $start->copy()->addDays(6)->toDateString()])
            ->get()->map(fn ($r) => $r->employee_id.'|'.$r->date->toDateString())->flip();
        $copied = 0;
        foreach ($previous as $cell) {
            $date = $cell->date->copy()->addWeek()->toDateString();
            if (! isset($taken[$cell->employee_id.'|'.$date])) {
                $this->roster->set($employees[$cell->employee_id], $date, $cell->working_hour_id, $cell->is_off, 'ROSTER', $request->user()->id);
                $copied++;
            }
        }

        return response()->json(['success' => true, 'message' => $copied ? "{$copied} day(s) copied from last week" : 'Nothing to copy from last week']);
    }
}
