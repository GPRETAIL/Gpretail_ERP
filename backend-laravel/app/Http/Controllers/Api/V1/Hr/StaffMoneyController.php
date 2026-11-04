<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrExpenseClaim;
use App\Models\HrLeaveEncashment;
use App\Models\HrLeaveType;
use App\Models\HrLoan;
use App\Models\HrLoanRecovery;
use App\Services\Hr\ExpenseClaimService;
use App\Services\Hr\HrScope;
use App\Services\Hr\LoanService;
use App\Services\Tenancy\BusinessPermissions;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Staff money: salary advances and loans, expense claims and leave encashment. Employees ask for themselves
 * (My Claims & Advances); their manager or HR decides; HR pays out and recovers through payroll.
 */
class StaffMoneyController extends Controller
{
    public function __construct(private readonly LoanService $loans, private readonly ExpenseClaimService $claims, private readonly HrScope $scope,
        private readonly BusinessPermissions $permissions) {}

    /** The signed-in employee's claims, advances and loans (with balances). */
    public function mine(Request $request)
    {
        $employee = $this->scope->employeeFor($request->user());
        if (! $employee) {
            return response()->json(['success' => true, 'data' => ['employee' => null, 'claims' => [], 'loans' => []]]);
        }

        return response()->json(['success' => true, 'data' => [
            'employee' => ['id' => $employee->id, 'name' => $employee->name],
            'claims' => HrExpenseClaim::where('employee_id', $employee->id)->latest('claim_date')->limit(200)->get()->map(fn ($c) => $this->presentClaim($c)),
            'loans' => HrLoan::where('employee_id', $employee->id)->latest('id')->limit(100)->get()->map(fn ($l) => $this->presentLoan($l)),
            'categories' => ExpenseClaimService::CATEGORIES,
        ]]);
    }

    // ---- Advances and loans -------------------------------------------------------------------------------

    public function loans(Request $request)
    {
        $rows = $this->scope->apply(HrLoan::with('employee:id,name,code'), $request->user())
            ->when($request->query('status'), fn ($q, $status) => $q->whereIn('status', explode(',', strtoupper($status))))
            ->orderByRaw("CASE status WHEN 'REQUESTED' THEN 0 WHEN 'APPROVED' THEN 1 WHEN 'ACTIVE' THEN 2 ELSE 3 END")->latest('id')->limit(1000)->get();
        if ($request->boolean('inbox') && ($own = $this->scope->employeeFor($request->user()))) {
            $rows = $rows->where('employee_id', '!=', $own->id)->values();
        }

        return response()->json(['success' => true, 'data' => $rows->map(fn ($l) => $this->presentLoan($l))]);
    }

    public function requestLoan(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'nullable|integer', 'type' => 'required|in:ADVANCE,LOAN', 'amount' => 'required|numeric|min:1|max:10000000',
            'instalments' => 'nullable|integer|min:1|max:60', 'first_month' => ['nullable', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'], 'reason' => 'nullable|string|max:500',
        ]);
        $employee = $this->employee($request, $data['employee_id'] ?? null);

        return response()->json(['success' => true, 'message' => 'Request sent for approval', 'data' => $this->loans->request($employee, $data, $request->user())], 201);
    }

    public function decideLoan(Request $request, $id)
    {
        $data = $request->validate(['action' => 'required|in:approve,reject', 'note' => 'nullable|string|max:255']);

        return response()->json(['success' => true, 'message' => $data['action'] === 'approve' ? 'Approved' : 'Rejected',
            'data' => $this->loans->decide($this->scoped(HrLoan::class, $request, $id), $request->user(), $data['action'] === 'approve', $data['note'] ?? null)]);
    }

    public function disburse(Request $request, $id)
    {
        $data = $request->validate(['paid_on' => 'required|date_format:Y-m-d', 'pay_mode' => 'required|in:CASH,BANK', 'first_month' => ['nullable', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/']]);

        return response()->json(['success' => true, 'message' => 'Paid out; recovery starts with the salary',
            'data' => $this->loans->disburse($this->scoped(HrLoan::class, $request, $id), $data['paid_on'], $data['pay_mode'], $request->user(), $data['first_month'] ?? null)]);
    }

    public function skipMonth(Request $request, $id)
    {
        $data = $request->validate(['month' => ['required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/']]);

        return response()->json(['success' => true, 'message' => "No recovery in {$data['month']}", 'data' => $this->loans->skip($this->scoped(HrLoan::class, $request, $id), $data['month'])]);
    }

    public function repay(Request $request, $id)
    {
        $data = $request->validate(['amount' => 'required|numeric|min:0.01', 'paid_on' => 'required|date_format:Y-m-d', 'pay_mode' => 'required|in:CASH,BANK', 'note' => 'nullable|string|max:255']);

        return response()->json(['success' => true, 'message' => 'Repayment recorded',
            'data' => $this->presentLoan($this->loans->repay($this->scoped(HrLoan::class, $request, $id), (float) $data['amount'], $data['paid_on'], $data['pay_mode'], $request->user(), $data['note'] ?? null))]);
    }

    /** Withdraw your own request, or (HR) cancel one not yet paid out. */
    public function cancelLoan(Request $request, $id)
    {
        $loan = HrLoan::findOrFail($id);
        $this->ownOrManaged($request, $loan->employee_id);

        return response()->json(['success' => true, 'message' => 'Cancelled', 'data' => $this->loans->cancel($loan)]);
    }

    public function recoveries(Request $request, $id)
    {
        $loan = $this->scoped(HrLoan::class, $request, $id);

        return response()->json(['success' => true, 'data' => HrLoanRecovery::where('loan_id', $loan->id)->orderBy('month')->orderBy('id')->get()]);
    }

    // ---- Expense claims -----------------------------------------------------------------------------------

    public function claims(Request $request)
    {
        $rows = $this->scope->apply(HrExpenseClaim::with('employee:id,name,code'), $request->user())
            ->when($request->query('status'), fn ($q, $status) => $q->whereIn('status', explode(',', strtoupper($status))))
            ->latest('claim_date')->latest('id')->limit(2000)->get();
        if ($request->boolean('inbox') && ($own = $this->scope->employeeFor($request->user()))) {
            $rows = $rows->where('employee_id', '!=', $own->id)->values();
        }

        return response()->json(['success' => true, 'data' => $rows->map(fn ($c) => $this->presentClaim($c))]);
    }

    public function submitClaim(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'nullable|integer', 'claim_date' => 'required|date_format:Y-m-d|before_or_equal:today', 'category' => ['required', Rule::in(ExpenseClaimService::CATEGORIES)],
            'amount' => 'required|numeric|min:1|max:1000000', 'description' => 'nullable|string|max:500',
            'bill' => 'nullable|file|max:5120|mimes:jpg,jpeg,png,webp,pdf',
        ]);
        $employee = $this->employee($request, $data['employee_id'] ?? null);

        return response()->json(['success' => true, 'message' => 'Claim sent for approval',
            'data' => $this->presentClaim($this->claims->submit($employee, $data, $request->file('bill'), $request->user()))], 201);
    }

    public function decideClaim(Request $request, $id)
    {
        $data = $request->validate(['action' => 'required|in:approve,reject', 'pay_via' => 'nullable|in:SALARY,DIRECT', 'note' => 'nullable|string|max:255']);

        return response()->json(['success' => true, 'message' => $data['action'] === 'approve' ? 'Approved' : 'Rejected',
            'data' => $this->presentClaim($this->claims->decide($this->scoped(HrExpenseClaim::class, $request, $id), $request->user(), $data['action'] === 'approve', $data['pay_via'] ?? null, $data['note'] ?? null))]);
    }

    public function payClaim(Request $request, $id)
    {
        $data = $request->validate(['paid_on' => 'required|date_format:Y-m-d', 'pay_mode' => 'required|in:CASH,BANK']);

        return response()->json(['success' => true, 'message' => 'Claim paid',
            'data' => $this->presentClaim($this->claims->pay($this->scoped(HrExpenseClaim::class, $request, $id), $data['paid_on'], $data['pay_mode']))]);
    }

    public function cancelClaim(Request $request, $id)
    {
        $claim = HrExpenseClaim::findOrFail($id);
        $this->ownOrManaged($request, $claim->employee_id);
        if ($claim->status !== 'PENDING') {
            throw ValidationException::withMessages(['status' => 'Only a pending claim can be withdrawn.']);
        }
        $claim->update(['status' => 'CANCELLED']);

        return response()->json(['success' => true, 'message' => 'Claim withdrawn']);
    }

    /** A short-lived link to the bill: for the employee themselves, their manager or HR. */
    public function bill(Request $request, $id)
    {
        $claim = HrExpenseClaim::findOrFail($id);
        $own = $this->scope->employeeFor($request->user());
        if (($own?->id !== $claim->employee_id) && ! $this->scope->canSee($request->user(), $claim->employee_id)) {
            abort(404);
        }
        $url = $this->claims->billUrl($claim);
        abort_unless($url, 404);

        return response()->json(['success' => true, 'data' => ['url' => $url]]);
    }

    // ---- Leave encashment ---------------------------------------------------------------------------------

    public function encashments(Request $request)
    {
        $types = HrLeaveType::pluck('name', 'id');
        $rows = $this->scope->apply(HrLeaveEncashment::with('employee:id,name,code'), $request->user())->latest('id')->limit(1000)->get()
            ->map(fn ($e) => $e->toArray() + ['leave_type_name' => $types[$e->leave_type_id] ?? null]);

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function encash(Request $request)
    {
        $data = $request->validate(['employee_id' => 'required|integer', 'leave_type_id' => 'required|integer', 'days' => 'required|numeric|min:0.5|max:365',
            'month' => ['required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'], 'note' => 'nullable|string|max:255']);
        $employee = $this->scope->apply(Employee::whereKey($data['employee_id']), $request->user(), 'id')->firstOrFail();

        return response()->json(['success' => true, 'message' => "{$data['days']} day(s) will be paid in {$data['month']} payroll",
            'data' => $this->claims->encash($employee, (int) $data['leave_type_id'], (float) $data['days'], $data['month'], $data['note'] ?? null, $request->user())], 201);
    }

    public function cancelEncashment(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Encashment cancelled; the days are back in the balance',
            'data' => $this->claims->cancelEncashment($this->scoped(HrLeaveEncashment::class, $request, $id), $request->user())]);
    }

    // ---- helpers -------------------------------------------------------------------------------------------

    /** Yourself, or (HR) an employee you manage. */
    private function employee(Request $request, $employeeId): Employee
    {
        $own = $this->scope->employeeFor($request->user());
        if ($employeeId && (int) $employeeId !== $own?->id) {
            if (! $this->permissions->allows($request->user(), 'payroll.manage') || ! $this->scope->canSee($request->user(), (int) $employeeId)) {
                throw ValidationException::withMessages(['employee_id' => "You can't do this for that employee."]);
            }

            return Employee::findOrFail($employeeId);
        }
        if (! $own) {
            throw ValidationException::withMessages(['employee_id' => 'Your login is not linked to an employee. Ask HR to link it in the employee form (Allow System / UserName).']);
        }

        return $own;
    }

    private function scoped(string $model, Request $request, $id)
    {
        $record = $model::findOrFail($id);
        if (! $this->scope->canSee($request->user(), $record->employee_id)) {
            throw ValidationException::withMessages(['status' => "Only the employee's manager or HR can do this."]);
        }

        return $record;
    }

    private function ownOrManaged(Request $request, int $employeeId): void
    {
        $own = $this->scope->employeeFor($request->user());
        if ($own?->id !== $employeeId && ! ($this->permissions->allows($request->user(), 'payroll.manage') && $this->scope->canSee($request->user(), $employeeId))) {
            throw ValidationException::withMessages(['status' => "You can't cancel this."]);
        }
    }

    private function presentLoan(HrLoan $loan): array
    {
        $recovered = round((float) HrLoanRecovery::where('loan_id', $loan->id)->sum('amount'), 2);

        return $loan->toArray() + ['employee_name' => $loan->employee?->name, 'recovered' => $recovered, 'balance' => round($loan->amount - $recovered, 2)];
    }

    private function presentClaim(HrExpenseClaim $claim): array
    {
        return collect($claim->toArray())->except('bill_path')->all() + ['employee_name' => $claim->employee?->name, 'has_bill' => (bool) $claim->bill_path];
    }
}
