<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrAdditionalPay;
use App\Models\HrExpenseClaim;
use App\Models\HrLeaveEncashment;
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
    public function __construct(private readonly AttendanceService $attendance, private readonly PayrollSetup $setup, private readonly LoanService $loans) {}

    /**
     * The employee's monthly gross (or day rate): the form's Gross Pay, which is saved as the salary column; a
     * gross_pay left in the details by older data is the fallback.
     */
    public static function grossOf(Employee $employee): float
    {
        $details = $employee->master_details ?? [];

        return (float) (((float) $employee->salary) ?: ($details['gross_pay'] ?? 0));
    }

    /**
     * @param  array|null  $exit  A full and final settlement: ['leave_exit' => amount, 'gratuity' => amount, 'notice' => amount,
     *                            'adjustments' => [['type' => EARNING|DEDUCTION, 'name' => ..., 'amount' => ...]]]; running loans are
     *                            then recovered in full (as far as the net pay allows).
     */
    public function slip(Employee $employee, string $month, ?array $settings = null, ?array $exit = null): array
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

        // Paid with the salary but not part of it for PF, ESI and PT: expense claims and leave encashment.
        $links = ['claims' => [], 'encashments' => [], 'loans' => []];
        $claims = HrExpenseClaim::withoutGlobalScopes()->where('employee_id', $employee->id)->where('status', 'APPROVED')->where('pay_via', 'SALARY')
            ->whereNull('payslip_id')->whereNull('settlement_id')->whereDate('claim_date', '<=', $monthEnd)->get();
        if ($claims->isNotEmpty()) {
            $this->add($earnings, $byCode->get('REIMBURSE'), (float) $claims->sum('amount'), 'REIMBURSE', 'Expense Reimbursement');
            $links['claims'] = $claims->pluck('id')->all();
        }
        $dayRate = $daily ? $rate : $rate / $days;
        foreach (HrLeaveEncashment::withoutGlobalScopes()->where('employee_id', $employee->id)->where('status', 'APPROVED')->whereNull('payslip_id')->whereNull('settlement_id')
            ->where('month', '<=', $month)->get() as $encashment) {
            $amount = round($encashment->days * $dayRate, 2);
            $this->add($earnings, $byCode->get('ENCASH'), $amount, 'ENCASH', 'Leave Encashment');
            $links['encashments'][] = ['id' => $encashment->id, 'amount' => $amount];
        }
        if ($exit) {
            // Also outside PF, ESI and PT: leave paid on exit, gratuity, and the settlement's own adjustments.
            $this->add($earnings, $byCode->get('LEAVE_EXIT'), (float) ($exit['leave_exit'] ?? 0), 'LEAVE_EXIT', 'Leave Encashment on Exit');
            $this->add($earnings, $byCode->get('GRATUITY'), (float) ($exit['gratuity'] ?? 0), 'GRATUITY', 'Gratuity');
            $this->add($deductions, $byCode->get('NOTICE'), (float) ($exit['notice'] ?? 0), 'NOTICE', 'Notice Pay Recovery');
            foreach (array_values($exit['adjustments'] ?? []) as $i => $line) {
                $deduction = ($line['type'] ?? 'EARNING') === 'DEDUCTION';
                if ($deduction) {
                    $this->add($deductions, null, (float) $line['amount'], 'ADJ_D'.($i + 1), (string) $line['name']);
                } else {
                    $this->add($earnings, null, (float) $line['amount'], 'ADJ_E'.($i + 1), (string) $line['name']);
                }
            }
        }
        $totalEarnings = round(array_sum(array_column($earnings, 'amount')), 2);

        // Loan and advance instalments (on exit: the whole balance), never taking the net pay below zero.
        $room = $totalEarnings - array_sum(array_column($deductions, 'amount'));
        foreach ($exit ? $this->loans->outstandingFor($employee) : $this->loans->dueFor($employee, $month) as $due) {
            $amount = round(min($due['amount'], max(0, $room)), 2);
            if ($amount <= 0) {
                continue;
            }
            $code = $due['type'] === 'ADVANCE' ? 'ADVANCE' : 'LOAN';
            $this->add($deductions, $byCode->get($code), $amount, $code, $code === 'ADVANCE' ? 'Advance Recovery' : 'Loan Recovery');
            $links['loans'][] = ['loan_id' => $due['loan_id'], 'amount' => $amount];
            $room -= $amount;
        }

        $totalDeductions = round(array_sum(array_column($deductions, 'amount')), 2);

        return [
            'days_in_month' => $days,
            'payable_days' => $summary['payable_days'],
            'lop_days' => $summary['lop_days'],
            'gross_fixed' => round($fixed, 2),
            'earnings' => array_values($earnings),
            'deductions' => array_values($deductions),
            'gross_earned' => $totalEarnings,
            'total_deductions' => $totalDeductions,
            'net_pay' => max(0, round($totalEarnings - $totalDeductions)),
            'employer_pf' => $employerPf,
            'employer_esi' => $employerEsi,
            'held' => $this->flag($details, 'hold_salary'),
            'summary' => $summary,
            'links' => $links,
        ];
    }

    /** Basic for a full month (a day's Basic for daily-wage staff), by the employee's salary structure: the gratuity wage. */
    public function basicOf(Employee $employee): float
    {
        $components = HrSalaryComponent::withoutGlobalScopes()->where('store_id', $employee->store_id)->get()->keyBy('id');
        $lines = $this->split($employee, $employee->master_details ?? [], self::grossOf($employee), $components);

        return (float) ($lines['BASIC']['amount'] ?? collect($lines)->first()['amount'] ?? 0);
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
