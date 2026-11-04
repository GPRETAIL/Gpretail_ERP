<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrPayslip;
use App\Models\HrTaxDeclaration;
use Illuminate\Support\Carbon;

/**
 * Monthly TDS on salary: the year's taxable salary is projected (paid so far this financial year, this month, and
 * the rest of the year at the current pay), the year's tax worked out under the employee's regime, and what is
 * still to be deducted spread over the months left (all of it in March, or in a full and final settlement).
 */
class TdsService
{
    public const SECTIONS = ['HRA', '80C', '80D', '80CCD1B', '24B', '80E', '80G', 'OTHER', 'PREV_SALARY', 'PREV_TDS', 'PREV_PT'];

    /** Lines that are never taxable salary. */
    private const NOT_SALARY = ['REIMBURSE'];

    public function __construct(private readonly PayrollSetup $setup, private readonly TaxCalculator $calculator) {}

    /**
     * @param  array  $current  this month's earnings and deductions (TDS not yet in them)
     * @param  array  $fullMonth  the earnings of a full month at the current pay (for the months still to come)
     * @param  bool  $final  a full and final settlement: no months to come, everything due now
     */
    public function projection(Employee $employee, string $month, array $current, array $fullMonth, bool $final = false, ?string $regime = null): array
    {
        $fy = PayrollSetup::fyOf($month);
        $rules = $this->setup->taxRules($employee->store_id, $fy);
        [$start, $end] = PayrollSetup::fyMonths($fy);
        $declaration = HrTaxDeclaration::withoutGlobalScopes()->with('items')->where('employee_id', $employee->id)->where('fy', $fy)->first();
        $regime = $regime ?? $declaration?->regime ?? 'NEW';

        // Paid earlier this year: submitted payrolls and any settlement before this month.
        $paid = $this->totals([]);
        $slips = HrPayslip::withoutGlobalScopes()->join('hr_payroll_runs as r', 'r.id', '=', 'hr_payslips.run_id')
            ->where('hr_payslips.employee_id', $employee->id)->whereIn('r.status', ['SUBMITTED', 'PAID'])
            ->where('r.month', '>=', $start)->where('r.month', '<', $month)->get(['hr_payslips.earnings', 'hr_payslips.deductions']);
        foreach ($slips as $slip) {
            $paid = $this->totals(['earnings' => $slip->earnings, 'deductions' => $slip->deductions], $paid);
        }
        $now = $this->totals($current);
        $monthsAfter = $final ? 0 : $this->monthsBetween($month, $end);
        $future = $this->totals(['earnings' => $fullMonth, 'deductions' => []]);
        $futurePf = $now['pf'] * $monthsAfter;
        $futurePt = $now['pt'] * $monthsAfter;

        $useVerified = $this->afterDeadline($fy, $rules);
        $amount = fn (string $section) => $declaration ? $declaration->items->where('section', $section)->sum(fn ($item) => $this->counted($item, $useVerified)) : 0;
        $prevSalary = (float) $amount('PREV_SALARY');

        $gross = $paid['gross'] + $now['gross'] + $future['gross'] * $monthsAfter + $prevSalary;
        $basic = $paid['basic'] + $now['basic'] + $future['basic'] * $monthsAfter;
        $hra = $paid['hra'] + $now['hra'] + $future['hra'] * $monthsAfter;
        $pf = $paid['pf'] + $now['pf'] + $futurePf;
        $pt = $paid['pt'] + $now['pt'] + $futurePt + (float) $amount('PREV_PT');
        $gratuity = $paid['gratuity'] + $now['gratuity'];
        $leaveOnExit = $paid['leave_exit'] + $now['leave_exit'];

        $exemptions = [
            'gratuity' => min($gratuity, (float) $rules['exempt']['gratuity']),
            'leave_on_exit' => min($leaveOnExit, (float) $rules['exempt']['leave_on_exit']),
            'hra' => 0.0,
        ];
        $regimeRules = $rules[$regime === 'OLD' ? 'old' : 'new'];
        $deductions = ['standard' => min((float) $regimeRules['standard_deduction'], max(0, $gross - $exemptions['gratuity'] - $exemptions['leave_on_exit']))];
        if ($regime === 'OLD') {
            $hraItem = $declaration?->items->firstWhere('section', 'HRA');
            $rent = (float) $amount('HRA');
            if ($rent > 0 && $hra > 0) {
                $metro = (bool) ($hraItem?->details['metro'] ?? false);
                $exemptions['hra'] = max(0, min($hra, $rent - 0.1 * $basic, ($metro ? 0.5 : 0.4) * $basic));
            }
            $caps = $rules['caps'];
            $deductions += [
                'professional_tax' => $pt,
                '80C' => min((float) $caps['80C'], (float) $amount('80C') + $pf),
                '80CCD1B' => min((float) $caps['80CCD1B'], (float) $amount('80CCD1B')),
                '80D' => min((float) $caps['80D'], (float) $amount('80D')),
                '24B' => min((float) $caps['24B'], (float) $amount('24B')),
                '80E' => (float) $amount('80E'), '80G' => (float) $amount('80G'), 'other' => (float) $amount('OTHER'),
            ];
        }
        $taxable = round(max(0, $gross - array_sum($exemptions) - array_sum($deductions)) / 10) * 10; // Rounded to ₹10.
        $tax = $this->calculator->annualTax($regimeRules, $taxable, (float) $rules['cess_pct']);
        if (! ($rules['enabled'] ?? true)) {
            $tax = ['slab_tax' => 0, 'rebate' => 0, 'surcharge' => 0, 'cess' => 0, 'total' => 0];
        }

        $deducted = $paid['tds'] + (float) $amount('PREV_TDS');
        $monthsLeft = $final || $month >= $end ? 1 : $this->monthsBetween($month, $end) + 1;
        $due = max(0, $tax['total'] - $deducted);
        $thisMonth = (float) round($due / $monthsLeft);
        $pan = trim((string) ($employee->master_details['pan_number'] ?? ''));
        $noPan = $pan === '' && $tax['total'] > 0;
        if ($noPan) {
            // Section 206AA: without a PAN, at least the no-PAN rate on this month's taxable pay.
            $thisMonth = max($thisMonth, (float) round(max(0, $now['gross'] - $exemptions['gratuity'] - $exemptions['leave_on_exit']) * (float) $rules['no_pan_rate'] / 100));
        }

        return [
            'fy' => $fy, 'regime' => $regime, 'pan' => $pan, 'no_pan' => $noPan, 'final' => $final,
            'gross' => round($gross, 2), 'previous_salary' => round($prevSalary, 2), 'exemptions' => array_map(fn ($v) => round($v, 2), $exemptions),
            'deductions' => array_map(fn ($v) => round($v, 2), $deductions), 'taxable' => $taxable, 'tax' => $tax,
            'tds_deducted' => round($deducted, 2), 'months_left' => $monthsLeft, 'tds_month' => $thisMonth,
            'uses' => $useVerified ? 'verified' : 'declared',
        ];
    }

    /** The year's estimate for My Tax, under both regimes: this month taken as a full month at the current pay. */
    public function estimate(Employee $employee, array $fullMonth, ?string $month = null): array
    {
        $month ??= Carbon::now(AttendanceService::timezone())->format('Y-m');
        $last = HrPayslip::withoutGlobalScopes()->where('employee_id', $employee->id)->latest('id')->first();
        $current = ['earnings' => $fullMonth, 'deductions' => collect($last?->deductions ?? [])->whereIn('code', ['PF', 'PT'])->values()->all()];

        return ['new' => $this->projection($employee, $month, $current, $fullMonth, false, 'NEW'),
            'old' => $this->projection($employee, $month, $current, $fullMonth, false, 'OLD')];
    }

    /** What a declared item counts for: the declared amount until the proof deadline, then only what HR verified. */
    public function counted($item, bool $useVerified): float
    {
        if ($item->proof_status === 'VERIFIED') {
            return (float) ($item->proof_amount ?? $item->declared_amount);
        }
        if ($useVerified || $item->proof_status === 'REJECTED') {
            return 0;
        }

        return (float) $item->declared_amount;
    }

    public function afterDeadline(string $fy, array $rules): bool
    {
        $deadline = ((int) substr($fy, 0, 4) + 1).'-'.($rules['proof_deadline'] ?? '01-31');

        return Carbon::now(AttendanceService::timezone())->toDateString() > $deadline;
    }

    /** Whole months after $from up to and including $to (2026-11 → 2027-03 = 4). */
    private function monthsBetween(string $from, string $to): int
    {
        $a = Carbon::parse("{$from}-01");
        $b = Carbon::parse("{$to}-01");

        return max(0, ($b->year - $a->year) * 12 + $b->month - $a->month);
    }

    /** Adds a slip's taxable salary, Basic, HRA, PF, PT and TDS to running totals. */
    private function totals(array $slip, ?array $sum = null): array
    {
        $sum ??= ['gross' => 0.0, 'basic' => 0.0, 'hra' => 0.0, 'pf' => 0.0, 'pt' => 0.0, 'tds' => 0.0, 'gratuity' => 0.0, 'leave_exit' => 0.0];
        foreach ($slip['earnings'] ?? [] as $line) {
            $code = $line['code'] ?? '';
            $amount = (float) ($line['amount'] ?? 0);
            if (in_array($code, self::NOT_SALARY, true)) {
                continue;
            }
            $sum['gross'] += $amount;
            match ($code) {
                'BASIC' => $sum['basic'] += $amount,
                'HRA' => $sum['hra'] += $amount,
                'GRATUITY' => $sum['gratuity'] += $amount,
                'LEAVE_EXIT' => $sum['leave_exit'] += $amount,
                default => null,
            };
        }
        foreach ($slip['deductions'] ?? [] as $line) {
            $amount = (float) ($line['amount'] ?? 0);
            match ($line['code'] ?? '') {
                'PF' => $sum['pf'] += $amount,
                'PT' => $sum['pt'] += $amount,
                'TDS' => $sum['tds'] += $amount,
                default => null,
            };
        }

        return $sum;
    }
}
