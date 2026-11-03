<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrAdditionalPay;
use App\Models\HrPayrollRun;
use App\Models\HrSalaryComponent;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** One-off pay for a month (bonus, fine…), added to that month's payroll while it is a draft. */
class AdditionalPayController extends Controller
{
    public function index(Request $request)
    {
        $month = (string) $request->query('month');
        $rows = HrAdditionalPay::with(['employee:id,name,code', 'component:id,code,name,type'])->where('month', $month)->orderBy('id')->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => 'required|integer', 'component_id' => 'required|integer', 'month' => ['required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'amount' => 'required|numeric|min:0.01', 'note' => 'nullable|string|max:255',
        ]);
        $this->editable($data['month']);
        $component = HrSalaryComponent::findOrFail($data['component_id']);
        if ($component->statutory && $component->statutory !== 'BASIC') {
            throw ValidationException::withMessages(['component_id' => "{$component->name} is worked out by payroll. Use Bonus, Other Deduction or a pay head of your own."]);
        }
        Employee::findOrFail($data['employee_id']);

        return response()->json(['success' => true, 'message' => 'Added', 'data' => HrAdditionalPay::create($data + ['created_by' => $request->user()->id])], 201);
    }

    public function destroy($id)
    {
        $pay = HrAdditionalPay::findOrFail($id);
        $this->editable($pay->month);
        $pay->delete();

        return response()->json(['success' => true, 'message' => 'Removed']);
    }

    /** One-off pay changes a month only while its payroll is still a draft. */
    private function editable(string $month): void
    {
        if (HrPayrollRun::where('month', $month)->whereIn('status', ['SUBMITTED', 'PAID'])->exists()) {
            throw ValidationException::withMessages(['month' => "{$month} payroll is already submitted. Reopen it first."]);
        }
    }
}
