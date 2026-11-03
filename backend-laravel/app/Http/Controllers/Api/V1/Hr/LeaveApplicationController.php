<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveLedger;
use App\Models\HrLeaveType;
use App\Services\Hr\HrScope;
use App\Services\Hr\LeaveService;
use App\Services\Tenancy\BusinessPermissions;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Leave applications. Anyone linked to an employee applies for themselves and withdraws while pending; HR can
 * apply for someone else; a manager decides for the people who report to them (HR for everyone).
 */
class LeaveApplicationController extends Controller
{
    public function __construct(private readonly LeaveService $leave, private readonly HrScope $scope, private readonly BusinessPermissions $permissions) {}

    /** The signed-in user's balances and applications. */
    public function mine(Request $request)
    {
        $employee = $this->scope->employeeFor($request->user());
        $year = $this->year($request);
        if (! $employee) {
            return response()->json(['success' => true, 'data' => ['employee' => null, 'balances' => [], 'applications' => []]]);
        }

        return response()->json(['success' => true, 'data' => [
            'employee' => ['id' => $employee->id, 'name' => $employee->name],
            'year' => $year,
            'balances' => $this->leave->balances($employee, $year),
            'applications' => $this->present(HrLeaveApplication::where('employee_id', $employee->id)->whereYear('from_date', $year)->latest('from_date')->get()),
        ]]);
    }

    public function index(Request $request)
    {
        $query = $this->scope->apply(HrLeaveApplication::query(), $request->user())
            ->when($request->query('status'), fn ($q, $status) => $q->whereIn('status', explode(',', strtoupper($status))))
            ->when($request->query('employee_id'), fn ($q, $id) => $q->where('employee_id', $id))
            ->when($request->query('year'), fn ($q, $year) => $q->whereYear('from_date', $year));
        // The approvals inbox leaves out the user's own applications.
        if ($request->boolean('inbox') && ($own = $this->scope->employeeFor($request->user()))) {
            $query->where('employee_id', '!=', $own->id);
        }

        return response()->json(['success' => true, 'data' => $this->present($query->orderByRaw("CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END")->latest('from_date')->limit(2000)->get())]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'nullable|integer', 'leave_type_id' => 'required|integer',
            'from_date' => 'required|date_format:Y-m-d', 'to_date' => 'nullable|date_format:Y-m-d',
            'half_day' => 'boolean', 'reason' => 'nullable|string|max:500',
        ]);
        $own = $this->scope->employeeFor($request->user());
        if (! empty($data['employee_id']) && (int) $data['employee_id'] !== $own?->id) {
            if (! $this->permissions->allows($request->user(), 'hr.manage') || ! $this->scope->canSee($request->user(), (int) $data['employee_id'])) {
                throw ValidationException::withMessages(['employee_id' => "You can't apply for leave for this employee."]);
            }
            $employee = Employee::findOrFail($data['employee_id']);
        } elseif (! $own) {
            throw ValidationException::withMessages(['employee_id' => 'Your login is not linked to an employee. Ask HR to link it in the employee form (Allow System / UserName).']);
        } else {
            $employee = $own;
        }
        $application = $this->leave->apply($employee, $data, $request->user());

        return response()->json(['success' => true, 'message' => 'Leave applied; waiting for approval', 'data' => $this->present(collect([$application]))->first()], 201);
    }

    public function approve(Request $request, $id)
    {
        $application = $this->decidable($request, $id);

        return response()->json(['success' => true, 'message' => 'Leave approved', 'data' => $this->leave->approve($application, $request->user(), $request->input('note'))]);
    }

    public function reject(Request $request, $id)
    {
        $application = $this->decidable($request, $id);

        return response()->json(['success' => true, 'message' => 'Leave rejected', 'data' => $this->leave->reject($application, $request->user(), $request->input('note'))]);
    }

    /** Withdraw your own pending application; a manager or HR can also cancel an approved one. */
    public function cancel(Request $request, $id)
    {
        $application = HrLeaveApplication::findOrFail($id);
        $own = $this->scope->employeeFor($request->user());
        $isOwn = $own && $own->id === $application->employee_id;
        $manages = $this->permissions->allows($request->user(), 'approvals.decide') && $this->scope->canSee($request->user(), $application->employee_id);
        if (! ($isOwn && $application->status === 'PENDING') && ! ($manages && ! $isOwn)) {
            throw ValidationException::withMessages(['status' => $isOwn ? 'Ask your manager to cancel an approved leave.' : "You can't cancel this leave."]);
        }

        return response()->json(['success' => true, 'message' => 'Leave cancelled', 'data' => $this->leave->cancel($application, $request->user())]);
    }

    /** Every employee's balance per leave type for a year (HR), or the user's team. */
    public function balances(Request $request)
    {
        $year = $this->year($request);
        $this->leave->ensureDefaults($request->attributes->get('store_context_id'));
        $types = HrLeaveType::where('is_active', true)->orderBy('id')->get(['id', 'code', 'name', 'is_paid']);
        $employees = $this->scope->apply(Employee::where('is_active', true), $request->user(), 'id')->orderBy('name')->get(['id', 'name', 'code']);
        $sums = HrLeaveLedger::whereIn('employee_id', $employees->pluck('id'))->where('year', $year)
            ->selectRaw('employee_id, leave_type_id, SUM(days) AS balance, SUM(CASE WHEN days > 0 THEN days ELSE 0 END) AS credit')
            ->groupBy('employee_id', 'leave_type_id')->get()->groupBy('employee_id');

        return response()->json(['success' => true, 'data' => [
            'year' => $year,
            'types' => $types,
            'rows' => $employees->map(function ($employee) use ($types, $sums) {
                $byType = ($sums->get($employee->id) ?? collect())->keyBy('leave_type_id');
                $row = ['employee_id' => $employee->id, 'name' => $employee->name, 'code' => $employee->code];
                foreach ($types as $type) {
                    $entry = $byType->get($type->id);
                    $row[$type->code] = ['allocated' => round((float) ($entry->credit ?? 0), 1), 'balance' => round((float) ($entry->balance ?? 0), 1)];
                }

                return $row;
            })->values(),
        ]]);
    }

    public function ledger(Request $request)
    {
        $employeeId = (int) $request->query('employee_id');
        if (! $employeeId || ! $this->scope->canSee($request->user(), $employeeId)) {
            throw ValidationException::withMessages(['employee_id' => 'Select one of your employees.']);
        }
        $types = HrLeaveType::pluck('code', 'id');
        $rows = HrLeaveLedger::where('employee_id', $employeeId)->where('year', $this->year($request))->orderBy('created_at')->orderBy('id')->get()
            ->map(fn ($r) => $r->toArray() + ['leave_type' => $types[$r->leave_type_id] ?? null]);

        return response()->json(['success' => true, 'data' => $rows]);
    }

    private function decidable(Request $request, $id): HrLeaveApplication
    {
        $application = HrLeaveApplication::findOrFail($id);
        if (! $this->scope->canSee($request->user(), $application->employee_id)) {
            throw ValidationException::withMessages(['status' => 'Only the employee\'s manager or HR can decide this leave.']);
        }

        return $application;
    }

    private function year(Request $request): int
    {
        $year = (int) $request->query('year');

        return $year >= 2000 && $year <= 2100 ? $year : now(config('app.business_timezone'))->year;
    }

    private function present($applications)
    {
        $employees = Employee::whereIn('id', $applications->pluck('employee_id'))->get(['id', 'name', 'code'])->keyBy('id');
        $types = HrLeaveType::whereIn('id', $applications->pluck('leave_type_id'))->get(['id', 'code', 'name'])->keyBy('id');

        return $applications->map(fn (HrLeaveApplication $a) => $a->toArray() + [
            'employee_name' => $employees[$a->employee_id]->name ?? null, 'employee_code' => $employees[$a->employee_id]->code ?? null,
            'leave_type_code' => $types[$a->leave_type_id]->code ?? null, 'leave_type_name' => $types[$a->leave_type_id]->name ?? null,
        ])->values();
    }
}
