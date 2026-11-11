<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrExpenseClaim;
use App\Models\HrHoliday;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveType;
use App\Models\HrLoan;
use App\Models\HrLoanRecovery;
use App\Models\HrPayslip;
use App\Models\HrRequest;
use App\Models\HrSeparation;
use App\Models\Store;
use App\Services\Hr\AttendanceService;
use App\Services\Hr\HrScope;
use App\Services\Hr\LeaveService;
use App\Services\Hr\PayrollSetup;
use App\Services\Tenancy\BusinessPermissions;
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
            'approvals' => $canApprove ? $this->inboxItems($request, $employee)->countBy('type') : (object) [],
            'team' => $this->teamCounts($employee, $today),
        ]]);
    }

    /** Everything waiting for this approver, newest first. Approve and reject use each type's own endpoint. */
    public function inbox(Request $request): JsonResponse
    {
        $employee = $this->employee($request);
        abort_unless($this->permissions->allows($request->user(), 'approvals.decide'), 403, 'Your role does not approve requests.');

        return response()->json(['success' => true, 'data' => $this->inboxItems($request, $employee)->sortByDesc('date')->values()]);
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

    /** @return Collection<int, array{type: string, id: int, employee_id: int, employee_name: ?string, title: string, detail: ?string, amount: ?float, date: string}> */
    private function inboxItems(Request $request, Employee $own): Collection
    {
        $user = $request->user();
        $scoped = fn ($query) => $this->scope->apply($query, $user)->where('employee_id', '!=', $own->id);
        $names = fn (Collection $rows) => Employee::whereIn('id', $rows->pluck('employee_id')->unique())->pluck('name', 'id');

        $leave = $scoped(HrLeaveApplication::query())->where('status', 'PENDING')->limit(200)->get();
        $types = HrLeaveType::whereIn('id', $leave->pluck('leave_type_id'))->pluck('name', 'id');
        $requests = $scoped(HrRequest::query())->where('status', 'PENDING')->limit(200)->get();
        $overtime = $scoped(Attendance::query())->where('ot_minutes', '>', 0)->where('ot_status', 'PENDING')->limit(200)->get();
        $loans = $scoped(HrLoan::query())->where('status', 'REQUESTED')->limit(200)->get();
        $claims = $scoped(HrExpenseClaim::query())->where('status', 'PENDING')->limit(200)->get();
        $exits = $scoped(HrSeparation::query())->where('status', 'REQUESTED')->limit(200)->get();
        $who = $names(collect([$leave, $requests, $overtime, $loans, $claims, $exits])->flatten(1));
        $date = fn ($value) => substr((string) $value, 0, 10);

        return collect()
            ->concat($leave->map(fn ($a) => ['type' => 'leave', 'id' => $a->id, 'employee_id' => $a->employee_id, 'employee_name' => $who[$a->employee_id] ?? null,
                'title' => ($types[$a->leave_type_id] ?? 'Leave').' · '.(float) $a->days.' day'.((float) $a->days === 1.0 ? '' : 's'),
                'detail' => $date($a->from_date).($date($a->to_date) !== $date($a->from_date) ? ' to '.$date($a->to_date) : '').($a->reason ? ' · '.$a->reason : ''),
                'amount' => null, 'date' => $date($a->created_at)]))
            ->concat($requests->map(fn ($r) => ['type' => strtolower($r->type) === 'shift' ? 'shift' : 'attendance', 'id' => $r->id, 'employee_id' => $r->employee_id,
                'employee_name' => $who[$r->employee_id] ?? null, 'title' => $r->type === 'SHIFT' ? 'Shift change' : 'Attendance correction',
                'detail' => $date($r->from_date).($r->to_date && $date($r->to_date) !== $date($r->from_date) ? ' to '.$date($r->to_date) : '').($r->reason ? ' · '.$r->reason : ''),
                'amount' => null, 'date' => $date($r->created_at)]))
            ->concat($overtime->map(fn ($a) => ['type' => 'overtime', 'id' => $a->id, 'employee_id' => $a->employee_id, 'employee_name' => $who[$a->employee_id] ?? null,
                'title' => 'Overtime · '.intdiv((int) $a->ot_minutes, 60).'h '.((int) $a->ot_minutes % 60).'m', 'detail' => $date($a->date),
                'amount' => null, 'date' => $date($a->date)]))
            ->concat($loans->map(fn ($l) => ['type' => 'loan', 'id' => $l->id, 'employee_id' => $l->employee_id, 'employee_name' => $who[$l->employee_id] ?? null,
                'title' => $l->type === 'LOAN' ? 'Loan · '.$l->instalments.' instalments' : 'Salary advance', 'detail' => $l->reason,
                'amount' => (float) $l->amount, 'date' => $date($l->created_at)]))
            ->concat($claims->map(fn ($c) => ['type' => 'claim', 'id' => $c->id, 'employee_id' => $c->employee_id, 'employee_name' => $who[$c->employee_id] ?? null,
                'title' => 'Expense · '.$c->category, 'detail' => trim($date($c->claim_date).($c->description ? ' · '.$c->description : '')),
                'amount' => (float) $c->amount, 'date' => $date($c->created_at), 'has_bill' => (bool) $c->bill_path]))
            ->concat($exits->map(fn ($s) => ['type' => 'resignation', 'id' => $s->id, 'employee_id' => $s->employee_id, 'employee_name' => $who[$s->employee_id] ?? null,
                'title' => 'Resignation', 'detail' => 'Last day asked: '.$date($s->requested_last_day ?? $s->last_working_day).($s->reason ? ' · '.$s->reason : ''),
                'amount' => null, 'date' => $date($s->applied_on ?? $s->created_at), 'last_day' => $date($s->requested_last_day ?? $s->last_working_day ?? $s->applied_on)]));
    }
}
