<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Services\Hr\PayrollSetup;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** The store's payroll rules: PF, ESI, professional tax by state, OT, batta, notice period and gratuity. */
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
            'ot.multiplier' => 'numeric|min:0|max:5', 'ot.requires_approval' => 'boolean', 'ot.hours_per_day' => 'numeric|min:1|max:24', 'batta.per_day' => 'numeric|min:0',
            'exit.notice_days' => 'integer|min:0|max:365', 'gratuity.enabled' => 'boolean', 'gratuity.min_years' => 'numeric|min:0|max:50',
            'gratuity.days' => 'numeric|min:0|max:60', 'gratuity.divisor' => 'numeric|min:1|max:31', 'gratuity.cap' => 'numeric|min:0',
        ]);
        if ($data['pt']['frequency'] === 'half_yearly' && empty($data['pt']['months'])) {
            throw ValidationException::withMessages(['pt.months' => 'Choose the months half-yearly professional tax is deducted in.']);
        }

        return response()->json(['success' => true, 'message' => 'Payroll settings saved', 'data' => $this->setup->saveSettings($this->storeId($request), $data)]);
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
