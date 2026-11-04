<?php

namespace App\Services\Hr;

use App\Models\HrDepartment;
use App\Models\HrPayrollSetting;
use App\Models\HrSalaryComponent;
use App\Models\HrSalaryStructureLine;
use Illuminate\Support\Facades\DB;

/**
 * A store's payroll starting point: the settings (PF, ESI, professional tax, OT, batta), the pay heads, and a
 * "Standard" salary structure. Everything is editable; the rates are common defaults the store's accountant
 * should confirm.
 */
class PayrollSetup
{
    public const DEFAULTS = [
        'pf' => ['enabled' => true, 'employee_pct' => 12, 'employer_pct' => 12, 'cap_wages' => true, 'wage_ceiling' => 15000],
        'esi' => ['enabled' => true, 'employee_pct' => 0.75, 'employer_pct' => 3.25, 'gross_limit' => 21000],
        'pt' => ['state' => 'NONE', 'frequency' => 'monthly', 'months' => [], 'slabs' => []],
        'ot' => ['multiplier' => 1, 'hours_per_day' => 8, 'requires_approval' => true],
        'batta' => ['per_day' => 0],
    ];

    /**
     * Professional tax starting slabs by state (monthly gross, or half-year gross for half-yearly states).
     * Each slab: [from, to (null = no limit), amount, February amount (null = same)].
     */
    public const PT_PRESETS = [
        'NONE' => ['name' => 'No professional tax', 'frequency' => 'monthly', 'months' => [], 'slabs' => []],
        'KA' => ['name' => 'Karnataka', 'frequency' => 'monthly', 'months' => [], 'slabs' => [[0, 24999, 0, null], [25000, null, 200, 300]]],
        'AP' => ['name' => 'Andhra Pradesh', 'frequency' => 'monthly', 'months' => [], 'slabs' => [[0, 15000, 0, null], [15001, 20000, 150, null], [20001, null, 200, null]]],
        'TS' => ['name' => 'Telangana', 'frequency' => 'monthly', 'months' => [], 'slabs' => [[0, 15000, 0, null], [15001, 20000, 150, null], [20001, null, 200, null]]],
        'TN' => ['name' => 'Tamil Nadu', 'frequency' => 'half_yearly', 'months' => [9, 3], 'slabs' => [
            [0, 21000, 0, null], [21001, 30000, 180, null], [30001, 45000, 425, null], [45001, 60000, 930, null], [60001, 75000, 1025, null], [75001, null, 1250, null]]],
        'KL' => ['name' => 'Kerala', 'frequency' => 'half_yearly', 'months' => [9, 3], 'slabs' => [
            [0, 11999, 0, null], [12000, 17999, 120, null], [18000, 29999, 180, null], [30000, 44999, 300, null], [45000, 59999, 450, null],
            [60000, 74999, 600, null], [75000, 99999, 750, null], [100000, 124999, 1000, null], [125000, null, 1250, null]]],
        'MH' => ['name' => 'Maharashtra', 'frequency' => 'monthly', 'months' => [], 'slabs' => [[0, 7500, 0, null], [7501, 10000, 175, null], [10001, null, 200, 300]]],
        'WB' => ['name' => 'West Bengal', 'frequency' => 'monthly', 'months' => [], 'slabs' => [[0, 10000, 0, null], [10001, 15000, 110, null], [15001, 25000, 130, null], [25001, 40000, 150, null], [40001, null, 200, null]]],
        'GJ' => ['name' => 'Gujarat', 'frequency' => 'monthly', 'months' => [], 'slabs' => [[0, 11999, 0, null], [12000, null, 200, null]]],
        'OTHER' => ['name' => 'Other state (enter the slabs)', 'frequency' => 'monthly', 'months' => [], 'slabs' => []],
    ];

    private const COMPONENTS = [
        ['BASIC', 'Basic', 'EARNING', 'BASIC'], ['HRA', 'House Rent Allowance', 'EARNING', null], ['CONV', 'Conveyance', 'EARNING', null],
        ['SPECIAL', 'Special Allowance', 'EARNING', null], ['OT', 'Overtime', 'EARNING', 'OT'], ['INCENTIVE', 'Sales Incentive', 'EARNING', 'INCENTIVE'],
        ['BATTA', 'Batta', 'EARNING', 'BATTA'], ['BONUS', 'Bonus', 'EARNING', null],
        ['PF', 'Provident Fund', 'DEDUCTION', 'PF'], ['ESI', 'ESI', 'DEDUCTION', 'ESI'], ['PT', 'Professional Tax', 'DEDUCTION', 'PT'], ['OTHER', 'Other Deduction', 'DEDUCTION', null],
    ];

    /** The store's settings merged over the defaults (so a setting added later always has a value). */
    public function settings(int $storeId): array
    {
        $saved = HrPayrollSetting::withoutGlobalScopes()->where('store_id', $storeId)->value('settings');
        $saved = is_string($saved) ? json_decode($saved, true) : ($saved ?? []);

        return array_replace_recursive(self::DEFAULTS, $saved ?: []);
    }

    public function saveSettings(int $storeId, array $settings): array
    {
        $merged = array_replace_recursive(self::DEFAULTS, $settings);
        $merged['pt']['slabs'] = array_values($settings['pt']['slabs'] ?? []); // Replaced as a whole, never merged by index.
        $merged['pt']['months'] = array_values($settings['pt']['months'] ?? []);
        HrPayrollSetting::withoutGlobalScopes()->updateOrCreate(['store_id' => $storeId], ['settings' => $merged]);

        return $merged;
    }

    /** Creates the pay heads and the Standard structure the first time a store uses payroll. */
    public function ensureDefaults(?int $storeId): void
    {
        if (! $storeId || HrSalaryComponent::withoutGlobalScopes()->where('store_id', $storeId)->exists()) {
            return;
        }
        DB::transaction(function () use ($storeId) {
            $ids = [];
            foreach (self::COMPONENTS as $i => [$code, $name, $type, $statutory]) {
                $ids[$code] = HrSalaryComponent::withoutGlobalScopes()->create(['store_id' => $storeId, 'code' => $code, 'name' => $name, 'type' => $type, 'statutory' => $statutory, 'sort' => $i])->id;
            }
            $structure = HrDepartment::withoutGlobalScopes()->where('store_id', $storeId)->where('configuration_type', 'salary_structure')->where('name', 'Standard')->first()
                ?? HrDepartment::withoutGlobalScopes()->forceCreate(['store_id' => $storeId, 'name' => 'Standard', 'code' => 'STD-PAY', 'configuration_type' => 'salary_structure', 'is_active' => true]);
            if (! HrSalaryStructureLine::withoutGlobalScopes()->where('structure_id', $structure->id)->exists()) {
                foreach ([['BASIC', 'PERCENT_OF_GROSS', 50], ['HRA', 'PERCENT_OF_BASIC', 40], ['CONV', 'FIXED', 1600], ['SPECIAL', 'BALANCE', 0]] as $i => [$code, $calc, $value]) {
                    HrSalaryStructureLine::withoutGlobalScopes()->create(['store_id' => $storeId, 'structure_id' => $structure->id, 'component_id' => $ids[$code], 'calc' => $calc, 'value' => $value, 'sort' => $i]);
                }
            }
        });
    }

    /** The structure an employee is paid on: theirs, else the store's Standard (or first) structure. */
    public function structureFor(int $storeId, $structureId): ?HrDepartment
    {
        $query = HrDepartment::withoutGlobalScopes()->where('configuration_type', 'salary_structure')
            ->where(fn ($q) => $q->where('store_id', $storeId)->orWhereNull('store_id'));

        return ($structureId ? (clone $query)->find($structureId) : null)
            ?? (clone $query)->where('name', 'Standard')->first()
            ?? $query->orderBy('id')->first();
    }
}
