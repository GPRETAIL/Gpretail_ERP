<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrExpenseClaim;
use App\Models\HrHoliday;
use App\Models\HrLeaveApplication;
use App\Models\HrLoan;
use App\Models\HrLoanRecovery;
use App\Models\HrPayslip;
use App\Models\HrRequest;
use App\Models\Store;
use App\Services\Hr\AttendanceService;
use App\Services\Hr\HrInbox;
use App\Services\Hr\HrScope;
use App\Services\Hr\LeaveService;
use App\Services\Hr\PayrollSetup;
use App\Services\Tenancy\BusinessPermissions;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * The staff app (/hr): one call for the home screen, the approvals inbox across request types, a safe profile
 * and the team's day. Everything is the signed-in employee's own data or their team's (HrScope); applying,
 * approving and the detail lists use the existing HR endpoints.
 */
class StaffAppController extends Controller
{
    public function __construct(
        private readonly HrScope $scope,
        private readonly AttendanceService $attendance,
        private readonly LeaveService $leave,
        private readonly BusinessPermissions $permissions,
        private readonly HrInbox $inbox,
    ) {}

    public function home(Request $request): JsonResponse
    {
        $employee = $this->employee($request);
        $today = $this->attendance->today();
        $fy = PayrollSetup::fyOf(substr($today, 0, 7));
        $slips = HrPayslip::with('run')->where('employee_id', $employee->id)
            ->whereHas('run', fn ($q) => $q->whereIn('status', ['SUBMITTED', 'PAID']))->get()
            ->sortByDesc(fn ($slip) => $slip->run->month)->values();
        $fySlips = $slips->filter(fn ($slip) => PayrollSetup::fyOf($slip->run->month) === $fy);
        $loans = HrLoan::where('employee_id', $employee->id)->whereIn('status', ['APPROVED', 'ACTIVE'])->get();
        $recovered = HrLoanRecovery::whereIn('loan_id', $loans->pluck('id'))->sum('amount');
        $row = Attendance::where('employee_id', $employee->id)->whereDate('date', $today)->first();
        $canApprove = $this->permissions->allows($request->user(), 'approvals.decide');

        return response()->json(['success' => true, 'data' => [
            'employee' => $this->identity($employee),
            'today' => $today,
            'attendance' => $row ? ['status' => $row->status, 'check_in' => $row->check_in, 'check_out' => $row->check_out, 'late_minutes' => $row->late_minutes] : null,
            'leave' => $this->leave->balances($employee, (int) substr($today, 0, 4))
                ->map(fn ($b) => collect($b)->only(['leave_type_id', 'code', 'name', 'is_paid', 'balance', 'available', 'used', 'pending'])->all())->values(),
            'holidays' => HrHoliday::where('store_id', $employee->store_id)->whereDate('date', '>=', $today)->orderBy('date')->limit(3)->get(['date', 'name'])
                ->map(fn ($h) => ['date' => substr((string) $h->date, 0, 10), 'name' => $h->name]),
            'pay' => [
                'financial_year' => $fy,
                'latest' => ($slip = $slips->first()) ? ['id' => $slip->id, 'month' => $slip->run->month, 'net_pay' => (float) $slip->net_pay, 'held' => (bool) $slip->held] : null,
                'year_net' => round((float) $fySlips->sum('net_pay'), 2),
                'year_gross' => round((float) $fySlips->sum('gross_earned'), 2),
            ],
            'money' => [
                'loan_balance' => round((float) $loans->sum('amount') - (float) $recovered, 2),
                'claims_waiting' => HrExpenseClaim::where('employee_id', $employee->id)->where('status', 'PENDING')->count(),
                'claims_waiting_amount' => round((float) HrExpenseClaim::where('employee_id', $employee->id)->where('status', 'PENDING')->sum('amount'), 2),
            ],
            'my_pending' => [
                'leave' => HrLeaveApplication::where('employee_id', $employee->id)->where('status', 'PENDING')->count(),
                'requests' => HrRequest::where('employee_id', $employee->id)->where('status', 'PENDING')->count(),
                'loans' => HrLoan::where('employee_id', $employee->id)->where('status', 'REQUESTED')->count(),
                'claims' => HrExpenseClaim::where('employee_id', $employee->id)->where('status', 'PENDING')->count(),
            ],
            'can_approve' => $canApprove,
            'approvals' => $canApprove ? $this->inbox->items($request->user(), $employee)->countBy('type') : (object) [],
            'team' => $this->teamCounts($employee, $today),
        ]]);
    }

    /** Everything waiting for this approver, newest first. Approve and reject use each type's own endpoint. */
    public function inbox(Request $request): JsonResponse
    {
        $employee = $this->employee($request);
        abort_unless($this->permissions->allows($request->user(), 'approvals.decide'), 403, 'Your role does not approve requests.');

        return response()->json(['success' => true, 'data' => $this->inbox->items($request->user(), $employee)->sortByDesc('date')->values()]);
    }

    /** The employee's own record, without salary, ID numbers or documents (only the last digits of bank and PAN). */
    public function profile(Request $request): JsonResponse
    {
        $employee = $this->employee($request);
        $employee->loadMissing('designation:id,name', 'department:id,name', 'reportsTo:id,name');
        $details = $employee->master_details ?? [];
        $mask = fn ($value) => ($value = trim((string) $value)) === '' ? null : '••••'.substr($value, -4);

        return response()->json(['success' => true, 'data' => $this->identity($employee) + [
            'department' => $employee->department?->name,
            'reports_to' => $employee->reportsTo?->name,
            'joining_date' => $employee->joining_date?->toDateString(),
            'phone' => $employee->phone,
            'email' => $employee->email,
            'date_of_birth' => $details['date_of_birth'] ?? null,
            'blood_group' => $details['blood_group'] ?? null,
            'bank_account' => $mask($details['bank_account_no'] ?? null),
            'pan' => $mask($details['pan_number'] ?? null),
            'pin_set_at' => $employee->app_pin_set_at,
        ]]);
    }

    /** Today's status of the people who report to me (directly or further down). */
    public function team(Request $request): JsonResponse
    {
        $employee = $this->employee($request);
        $today = $this->attendance->today();
        $team = $this->teamMembers($employee);
        $rows = Attendance::whereIn('employee_id', $team->pluck('id'))->whereDate('date', $today)->get()->keyBy('employee_id');
        $onLeave = HrLeaveApplication::whereIn('employee_id', $team->pluck('id'))->where('status', 'APPROVED')
            ->whereDate('from_date', '<=', $today)->whereDate('to_date', '>=', $today)->pluck('employee_id')->flip();

        return response()->json(['success' => true, 'data' => ['date' => $today, 'members' => $team->map(fn (Employee $member) => [
            'id' => $member->id, 'name' => $member->name, 'code' => $member->code, 'designation' => $member->designation?->name,
            'status' => isset($onLeave[$member->id]) ? 'ON_LEAVE' : ($rows[$member->id]->status ?? 'NOT_IN'),
            'check_in' => $rows[$member->id]->check_in ?? null, 'check_out' => $rows[$member->id]->check_out ?? null,
        ])->values()]]);
    }

    /**
     * My attendance for one month: a status for each day, the first in and last out, and the month's counts (the same
     * numbers payroll uses). Only my own days.
     */
    public function attendanceMonth(Request $request): JsonResponse
    {
        $request->validate(['month' => 'nullable|date_format:Y-m']);
        $employee = $this->employee($request);
        $today = $this->attendance->today();
        $month = $request->query('month') ?: substr($today, 0, 7);
        $first = Carbon::parse("{$month}-01");
        $last = $first->copy()->endOfMonth();
        $rows = Attendance::where('employee_id', $employee->id)->whereBetween('date', [$first->toDateString(), $last->toDateString()])->get()
            ->keyBy(fn ($row) => $row->date->toDateString());
        $holidays = HrHoliday::where('store_id', $employee->store_id)->whereBetween('date', [$first->toDateString(), $last->toDateString()])->get()
            ->mapWithKeys(fn ($holiday) => [$holiday->date->toDateString() => $holiday->name]);
        $joined = $employee->joining_date?->toDateString();

        $days = [];
        for ($day = $first->copy(); $day->lte($last); $day->addDay()) {
            $key = $day->toDateString();
            $row = $rows->get($key);
            $status = $joined && $key < $joined ? null
                : ($row?->status ?? (isset($holidays[$key]) ? 'HOLIDAY' : ($this->attendance->isWeekOff($employee, $key) ? 'WEEK_OFF' : ($key < $today ? 'ABSENT' : null))));
            $days[] = [
                'date' => $key, 'status' => $status, 'holiday' => $holidays[$key] ?? null,
                'check_in' => $row?->check_in, 'check_out' => $row?->check_out,
                'worked_minutes' => (int) ($row?->worked_minutes ?? 0), 'late_minutes' => (int) ($row?->late_minutes ?? 0),
            ];
        }
        $summary = $this->attendance->monthSummary($employee, $month, $rows->values(), $holidays->map(fn () => true)->all());

        return response()->json(['success' => true, 'data' => [
            'month' => $month, 'today' => $today, 'days' => $days,
            'totals' => [
                'present' => $summary['present_days'], 'absent' => $summary['absent_days'], 'late' => $summary['late_days'], 'off' => $summary['off_days'],
                'paid_leave' => $summary['paid_leave_days'], 'unpaid_leave' => $summary['unpaid_leave_days'],
                'payable_days' => $summary['payable_days'], 'lop_days' => $summary['lop_days'],
                'worked_minutes' => (int) $rows->sum('worked_minutes'),
            ],
        ]]);
    }

    /** One of my days: its punches (time, in or out, how and how far from the store) and the shift. */
    public function attendanceDay(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => 'required|date_format:Y-m-d']);
        $employee = $this->employee($request);
        $row = Attendance::where('employee_id', $employee->id)->whereDate('date', $data['date'])->first();
        $zone = AttendanceService::timezone();

        return response()->json(['success' => true, 'data' => [
            'date' => $data['date'],
            'status' => $this->attendance->dayStatus($employee, $row, $data['date']),
            'holiday' => $this->attendance->holiday($employee->store_id, $data['date']),
            'shift' => $this->attendance->shiftFor($employee, $data['date']),
            'check_in' => $row?->check_in, 'check_out' => $row?->check_out,
            'worked_minutes' => (int) ($row?->worked_minutes ?? 0), 'late_minutes' => (int) ($row?->late_minutes ?? 0),
            'punches' => $this->attendance->punches($employee, $data['date'])->map(fn ($punch) => [
                'type' => $punch->type, 'at' => $punch->punched_at->copy()->setTimezone($zone)->format('H:i:s'), 'source' => $punch->source, 'distance_m' => $punch->distance_m,
            ])->values(),
        ]]);
    }

    /**
     * Who in my team is on approved leave in a date range (default: this week): the people who report to my manager,
     * and the people who report to me. Names and dates only; the reason and the type of leave stay private.
     */
    public function teamOnLeave(Request $request): JsonResponse
    {
        $data = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d|after_or_equal:from']);
        $employee = $this->employee($request);
        $from = $data['from'] ?? $this->attendance->today();
        $to = $data['to'] ?? Carbon::parse($from)->addDays(13)->toDateString();
        $mates = Employee::where('is_active', true)->where('id', '!=', $employee->id)
            ->where(fn ($q) => $q->where('reports_to_id', $employee->id)->when($employee->reports_to_id, fn ($w) => $w->orWhere('reports_to_id', $employee->reports_to_id)))
            ->get(['id', 'name'])->keyBy('id');
        $leaves = HrLeaveApplication::whereIn('employee_id', $mates->keys())->where('status', 'APPROVED')
            ->whereDate('from_date', '<=', $to)->whereDate('to_date', '>=', $from)->orderBy('from_date')->get();

        return response()->json(['success' => true, 'data' => ['from' => $from, 'to' => $to, 'people' => $leaves->map(fn ($leave) => [
            'employee_id' => $leave->employee_id, 'name' => $mates[$leave->employee_id]->name,
            'from' => $leave->from_date->toDateString(), 'to' => $leave->to_date->toDateString(), 'half_day' => (bool) $leave->half_day,
        ])->values()]]);
    }

    private function employee(Request $request): Employee
    {
        $employee = $this->scope->employeeFor($request->user());
        abort_unless($employee, 404, 'Your login is not linked to an employee. Ask HR.');

        return $employee;
    }

    private function identity(Employee $employee): array
    {
        $employee->loadMissing('designation:id,name');

        return ['id' => $employee->id, 'name' => $employee->name, 'code' => $employee->code, 'designation' => $employee->designation?->name,
            'store' => ($store = Store::find($employee->store_id)) ? ['id' => $store->id, 'name' => $store->name] : null];
    }

    /** People below me in reports-to (not the whole store, even for HR roles: this is "my team"). */
    private function teamMembers(Employee $employee): Collection
    {
        $ids = [];
        $frontier = [$employee->id];
        while ($frontier && count($ids) < 2000) {
            $frontier = array_values(array_diff(Employee::whereIn('reports_to_id', $frontier)->where('is_active', true)->pluck('id')->all(), $ids, [$employee->id]));
            $ids = array_merge($ids, $frontier);
        }

        return Employee::with('designation:id,name')->whereIn('id', $ids)->orderBy('name')->get(['id', 'name', 'code', 'designation_id']);
    }

    private function teamCounts(Employee $employee, string $today): array
    {
        $ids = $this->teamMembers($employee)->pluck('id');

        return ['size' => $ids->count(), 'checked_in' => $ids->isEmpty() ? 0
            : Attendance::whereIn('employee_id', $ids)->whereDate('date', $today)->whereNotNull('check_in')->count()];
    }
}
