<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrAdditionalPay;
use App\Models\HrSalaryComponent;
use App\Models\HrSalaryStructureLine;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * One employee's pay for a month. Gross is earned for payable days (monthly salary ÷ days in the month, or a
 * day rate for daily-wage staff), split by the salary structure; OT, sales incentive, batta and one-off pay are
 * added; PF, ESI and professional tax are deducted by the store's settings.
 */
class PayrollCalculator
{
    public function __construct(private readonly AttendanceService $attendance, private readonly PayrollSetup $setup) {}

    /**
     * The employee's monthly gross (or day rate): the form's Gross Pay, which is saved as the salary column; a
     * gross_pay left in the details by older data is the fallback.
     */
    public static function grossOf(Employee $employee): float
    {
        $details = $employee->master_details ?? [];

        return (float) (((float) $employee->salary) ?: ($details['gross_pay'] ?? 0));
    }

    public function slip(Employee $employee, string $month, ?array $settings = null): array
    {
        $settings ??= $this->setup->settings($employee->store_id);
        $details = $employee->master_details ?? [];
        $summary = $this->attendance->monthSummary($employee, $month);
        $days = $summary['days_in_month'];
        $daily = strcasecmp((string) ($details['salary_mode'] ?? 'Monthly'), 'Daily') === 0;
        $rate = self::grossOf($employee);
        $fixed = $daily ? $rate * $days : $rate; // A day rate's full month, for the ESI limit and the PT half-year.
        $earned = round($daily ? $rate * $summary['payable_days'] : $rate * $summary['payable_days'] / $days, 2);

        $components = HrSalaryComponent::withoutGlobalScopes()->where('store_id', $employee->store_id)->get()->keyBy('id');
        $byCode = $components->keyBy('code');
        $earnings = $this->split($employee, $details, $earned, $components);

        // OT: hours beyond the shift, at the hourly rate × the multiplier.
        if ($this->flag($details, 'e_ot') || $this->flag($details, 'm_ot')) {
            $hourly = ($daily ? $rate : $rate / $days) / max(1, (float) $settings['ot']['hours_per_day']);
            $this->add($earnings, $byCode->get('OT'), round($summary['ot_minutes'] / 60 * $hourly * (float) $settings['ot']['multiplier'], 2), 'OT', 'Overtime');
        }
        $this->add($earnings, $byCode->get('INCENTIVE'), $this->incentive($employee, $details, $month), 'INCENTIVE', 'Sales Incentive');
        if ($this->flag($details, 'beta')) {
            $this->add($earnings, $byCode->get('BATTA'), round($summary['present_days'] * (float) $settings['batta']['per_day'], 2), 'BATTA', 'Batta');
        }

        $deductions = [];
        $additional = HrAdditionalPay::withoutGlobalScopes()->where('employee_id', $employee->id)->where('month', $month)->get();
        foreach ($additional as $pay) {
            $component = $components->get($pay->component_id);
            if ($component?->type === 'DEDUCTION') {
                $this->add($deductions, $component, (float) $pay->amount);
            } else {
                $this->add($earnings, $component, (float) $pay->amount);
            }
        }
        $gross = round(array_sum(array_column($earnings, 'amount')), 2);
        $monthEnd = Carbon::parse("{$month}-01")->endOfMonth()->toDateString();

        // PF on Basic (capped at the wage ceiling when set), once the employee is in PF.
        $employerPf = 0;
        $basic = (float) (collect($earnings)->firstWhere('code', 'BASIC')['amount'] ?? $earned);
        if ($settings['pf']['enabled'] && $this->joined($details, 'pf_eligible_date', ['pf_no', 'pf_uan'], $monthEnd)) {
            $wages = $settings['pf']['cap_wages'] ? min($basic, (float) $settings['pf']['wage_ceiling']) : $basic;
            $this->add($deductions, $byCode->get('PF'), round($wages * $settings['pf']['employee_pct'] / 100), 'PF', 'Provident Fund');
            $employerPf = round($wages * $settings['pf']['employer_pct'] / 100);
        }
        // ESI on the month's gross while the full gross is within the limit; contributions round up.
        $employerEsi = 0;
        if ($settings['esi']['enabled'] && $fixed <= (float) $settings['esi']['gross_limit'] && $this->joined($details, 'esi_eligible_date', ['esi_no'], $monthEnd)) {
            $this->add($deductions, $byCode->get('ESI'), ceil($gross * $settings['esi']['employee_pct'] / 100), 'ESI', 'ESI');
            $employerEsi = ceil($gross * $settings['esi']['employer_pct'] / 100);
        }
        $this->add($deductions, $byCode->get('PT'), $this->professionalTax($settings['pt'], $gross, (int) substr($month, 5, 2)), 'PT', 'Professional Tax');

        $totalDeductions = round(array_sum(array_column($deductions, 'amount')), 2);

        return [
            'days_in_month' => $days,
            'payable_days' => $summary['payable_days'],
            'lop_days' => $summary['lop_days'],
            'gross_fixed' => round($fixed, 2),
            'earnings' => array_values($earnings),
            'deductions' => array_values($deductions),
            'gross_earned' => $gross,
            'total_deductions' => $totalDeductions,
            'net_pay' => max(0, round($gross - $totalDeductions)),
            'employer_pf' => $employerPf,
            'employer_esi' => $employerEsi,
            'held' => $this->flag($details, 'hold_salary'),
            'summary' => $summary,
        ];
    }

    /** Professional tax for the month: monthly slabs on the month's gross, or half-yearly slabs on 6 × gross in the set months. */
    public function professionalTax(array $pt, float $gross, int $monthNumber): float
    {
        $halfYearly = ($pt['frequency'] ?? 'monthly') === 'half_yearly';
        if ($halfYearly && ! in_array($monthNumber, array_map('intval', $pt['months'] ?? []), true)) {
            return 0;
        }
        $base = $halfYearly ? $gross * 6 : $gross;
        foreach ($pt['slabs'] ?? [] as $slab) {
            [$from, $to, $amount, $february] = array_pad(array_values((array) $slab), 4, null);
            if ($base >= (float) $from && ($to === null || $to === '' || $base <= (float) $to)) {
                return (float) ($monthNumber === 2 && $february !== null && $february !== '' ? $february : $amount);
            }
        }

        return 0;
    }

    /** The earned gross split by the employee's salary structure; BALANCE takes what the other lines leave. */
    private function split(Employee $employee, array $details, float $earned, Collection $components): array
    {
        $structure = $this->setup->structureFor($employee->store_id, $details['salary_structure_id'] ?? null);
        $lines = $structure ? HrSalaryStructureLine::withoutGlobalScopes()->where('structure_id', $structure->id)->orderBy('sort')->orderBy('id')->get() : collect();
        $earnings = [];
        if ($lines->isEmpty()) {
            $this->add($earnings, $components->firstWhere('code', 'BASIC'), $earned, 'BASIC', 'Basic');

            return $earnings;
        }
        $basic = 0;
        foreach ($lines->where('calc', '!=', 'BALANCE') as $line) {
            $amount = match ($line->calc) {
                'PERCENT_OF_GROSS' => $earned * $line->value / 100,
                'PERCENT_OF_BASIC' => $basic * $line->value / 100,
                'FIXED' => $line->value,
                default => 0,
            };
            // Nothing beyond what was earned: fixed amounts shrink for a short month.
            $amount = round(min($amount, max(0, $earned - array_sum(array_column($earnings, 'amount')))), 2);
            $component = $components->get($line->component_id);
            if ($component?->statutory === 'BASIC' || $component?->code === 'BASIC') {
                $basic = $amount;
            }
            $this->add($earnings, $component, $amount);
        }
        foreach ($lines->where('calc', 'BALANCE') as $line) {
            $this->add($earnings, $components->get($line->component_id), round(max(0, $earned - array_sum(array_column($earnings, 'amount'))), 2));
        }

        return $earnings;
    }

    /** The month's sales incentive: net sales billed by the employee × their Incentive %. */
    private function incentive(Employee $employee, array $details, string $month): float
    {
        $pct = (float) ($details['incentive_pct'] ?? 0);
        if ($pct <= 0) {
            return 0;
        }
        $sales = (float) DB::table('pos_sale_items as i')->join('pos_sales as s', 's.id', '=', 'i.pos_sale_id')
            ->where('i.sales_man_id', $employee->id)->whereNotIn('s.status', ['CANCELLED', 'CANCELED'])
            ->where('s.sale_date', 'like', "{$month}%")->sum('i.subtotal');

        return round($sales * $pct / 100, 2);
    }

    /** Adds to (or merges into) a line list, skipping zero amounts. */
    private function add(array &$lines, ?HrSalaryComponent $component, float $amount, ?string $code = null, ?string $name = null): void
    {
        if (round($amount, 2) == 0) {
            return;
        }
        $code = $component?->code ?? $code ?? 'OTHER';
        if (isset($lines[$code])) {
            $lines[$code]['amount'] = round($lines[$code]['amount'] + $amount, 2);

            return;
        }
        $lines[$code] = ['code' => $code, 'name' => $component?->name ?? $name ?? $code, 'amount' => round($amount, 2)];
    }

    private function flag(array $details, string $key): bool
    {
        return filter_var($details[$key] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    /** In PF/ESI from the eligible date; with no date, when the employee has a PF/ESI number. */
    private function joined(array $details, string $dateKey, array $numberKeys, string $monthEnd): bool
    {
        $date = $details[$dateKey] ?? null;
        if ($date) {
            return Carbon::parse($date)->toDateString() <= $monthEnd;
        }

        return collect($numberKeys)->contains(fn ($key) => trim((string) ($details[$key] ?? '')) !== '');
    }
}
