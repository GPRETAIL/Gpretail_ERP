<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\HrAdditionalPay;
use App\Models\HrPayrollRun;
use App\Models\HrSalaryComponent;
use App\Services\Hr\PayrollSetup;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** The store's payroll rules (PF, ESI, professional tax by state, OT, batta) and one-off pay for a month. */
class PayrollSettingsController extends Controller
{
    public function __construct(private readonly PayrollSetup $setup) {}

    public function show(Request $request)
    {
        $storeId = $request->attributes->get('store_context_id');

        return response()->json(['success' => true, 'data' => [
            'settings' => $storeId ? $this->setup->settings($storeId) : PayrollSetup::DEFAULTS,
            'pt_presets' => PayrollSetup::PT_PRESETS,
        ]]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'pf.enabled' => 'boolean', 'pf.employee_pct' => 'numeric|min:0|max:100', 'pf.employer_pct' => 'numeric|min:0|max:100',
            'pf.cap_wages' => 'boolean', 'pf.wage_ceiling' => 'numeric|min:0',
            'esi.enabled' => 'boolean', 'esi.employee_pct' => 'numeric|min:0|max:100', 'esi.employer_pct' => 'numeric|min:0|max:100', 'esi.gross_limit' => 'numeric|min:0',
            'pt.state' => 'required|string|max:10', 'pt.frequency' => 'required|in:monthly,half_yearly', 'pt.months' => 'array', 'pt.months.*' => 'integer|between:1,12',
            'pt.slabs' => 'array', 'pt.slabs.*' => 'array|min:3|max:4', 'pt.slabs.*.0' => 'required|numeric|min:0', 'pt.slabs.*.1' => 'nullable|numeric|min:0',
            'pt.slabs.*.2' => 'required|numeric|min:0', 'pt.slabs.*.3' => 'nullable|numeric|min:0',
            'ot.multiplier' => 'numeric|min:0|max:5', 'ot.hours_per_day' => 'numeric|min:1|max:24', 'batta.per_day' => 'numeric|min:0',
        ]);
        if ($data['pt']['frequency'] === 'half_yearly' && empty($data['pt']['months'])) {
            throw ValidationException::withMessages(['pt.months' => 'Choose the months half-yearly professional tax is deducted in.']);
        }

        return response()->json(['success' => true, 'message' => 'Payroll settings saved', 'data' => $this->setup->saveSettings($this->storeId($request), $data)]);
    }

    public function additionalIndex(Request $request)
    {
        $month = (string) $request->query('month');
        $rows = HrAdditionalPay::with(['employee:id,name,code', 'component:id,code,name,type'])->where('month', $month)->orderBy('id')->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function additionalStore(Request $request)
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

    public function additionalDestroy($id)
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

    private function storeId(Request $request): int
    {
        $storeId = $request->attributes->get('store_context_id');
        if (! $storeId) {
            throw ValidationException::withMessages(['store' => 'Select a store first.']);
        }

        return (int) $storeId;
    }
}
