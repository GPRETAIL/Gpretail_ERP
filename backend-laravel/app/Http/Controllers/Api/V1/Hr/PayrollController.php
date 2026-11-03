<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\HrPayrollRun;
use App\Models\HrPayslip;
use App\Models\Store;
use App\Services\Hr\HrScope;
use App\Services\Hr\PayrollService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/** Salary Management: monthly payroll runs and their payslips, and each employee's own payslips. */
class PayrollController extends Controller
{
    public function __construct(private readonly PayrollService $payroll, private readonly HrScope $scope) {}

    public function index(Request $request)
    {
        $runs = HrPayrollRun::when($request->query('year'), fn ($q, $year) => $q->where('month', 'like', "{$year}-%"))
            ->orderByDesc('month')->limit(120)->get();

        return response()->json(['success' => true, 'data' => $runs]);
    }

    public function show($id)
    {
        $run = HrPayrollRun::findOrFail($id);

        return response()->json(['success' => true, 'data' => $run->toArray() + [
            'payslips' => $run->payslips()->orderBy('id')->get()->sortBy(fn ($slip) => $slip->snapshot['name'] ?? '')->values(),
        ]]);
    }

    /** Creates or recalculates the draft for a month. */
    public function prepare(Request $request)
    {
        $data = $request->validate(['month' => 'required|string']);
        $storeId = $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first.']);
        }
        $run = $this->payroll->prepare($storeId, $data['month'], $request->user());

        return response()->json(['success' => true, 'message' => "{$run->employees} payslip(s) calculated", 'data' => $run]);
    }

    public function submit(Request $request, $id)
    {
        return response()->json(['success' => true, 'message' => 'Payroll submitted; payslips are visible to the employees',
            'data' => $this->payroll->submit(HrPayrollRun::findOrFail($id), $request->user())]);
    }

    public function markPaid(Request $request, $id)
    {
        $data = $request->validate(['paid_on' => 'required|date_format:Y-m-d', 'pay_mode' => 'required|in:BANK,CASH']);

        return response()->json(['success' => true, 'message' => 'Payroll marked paid',
            'data' => $this->payroll->markPaid(HrPayrollRun::findOrFail($id), $data['paid_on'], $data['pay_mode'])]);
    }

    public function reopen($id)
    {
        return response()->json(['success' => true, 'message' => 'Payroll reopened as a draft', 'data' => $this->payroll->reopen(HrPayrollRun::findOrFail($id))]);
    }

    public function slip($id)
    {
        $slip = HrPayslip::with('run')->findOrFail($id);

        return response()->json(['success' => true, 'data' => $this->presentSlip($slip)]);
    }

    /** The signed-in user's payslips (submitted or paid runs only). */
    public function mine(Request $request)
    {
        $employee = $this->scope->employeeFor($request->user());
        if (! $employee) {
            return response()->json(['success' => true, 'data' => ['employee' => null, 'payslips' => []]]);
        }
        $slips = HrPayslip::with('run')->where('employee_id', $employee->id)
            ->whereHas('run', fn ($q) => $q->whereIn('status', ['SUBMITTED', 'PAID']))->get()
            ->sortByDesc(fn ($slip) => $slip->run->month)->values()
            ->map(fn ($slip) => ['id' => $slip->id, 'month' => $slip->run->month, 'net_pay' => $slip->net_pay, 'gross_earned' => $slip->gross_earned,
                'status' => $slip->run->status, 'held' => $slip->held]);

        return response()->json(['success' => true, 'data' => ['employee' => ['id' => $employee->id, 'name' => $employee->name], 'payslips' => $slips]]);
    }

    public function mySlip(Request $request, $id)
    {
        $employee = $this->scope->employeeFor($request->user());
        $slip = HrPayslip::with('run')->where('employee_id', $employee?->id ?? 0)
            ->whereHas('run', fn ($q) => $q->whereIn('status', ['SUBMITTED', 'PAID']))->findOrFail($id);

        return response()->json(['success' => true, 'data' => $this->presentSlip($slip)]);
    }

    private function presentSlip(HrPayslip $slip): array
    {
        $store = Store::find($slip->store_id);

        return $slip->toArray() + [
            'month' => $slip->run->month,
            'month_label' => Carbon::parse("{$slip->run->month}-01")->format('F Y'),
            'run_status' => $slip->run->status,
            'paid_on' => $slip->run->paid_on?->toDateString(),
            'store' => $store ? ['name' => $store->name, 'address' => trim(implode(', ', array_filter([$store->address, $store->city]))), 'phone' => $store->phone] : null,
        ];
    }
}
