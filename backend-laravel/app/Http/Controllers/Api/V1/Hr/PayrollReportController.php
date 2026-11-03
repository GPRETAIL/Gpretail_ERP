<?php

namespace App\Http\Controllers\Api\V1\Hr;

use App\Http\Controllers\Controller;
use App\Models\HrPayrollRun;
use App\Models\HrPayslip;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/** Reports of one payroll run: salary register, bank sheet, and the PF, ESI and professional tax statements. */
class PayrollReportController extends Controller
{
    public const REPORTS = ['register', 'bank', 'pf', 'esi', 'pt'];

    public function show(Request $request, $runId, string $report)
    {
        abort_unless(in_array($report, self::REPORTS, true), 404);
        $run = HrPayrollRun::findOrFail($runId);
        $slips = HrPayslip::where('run_id', $run->id)->get()->sortBy(fn ($s) => $s->snapshot['name'] ?? '')->values();

        return response()->json(['success' => true, 'data' => ['run' => $run, 'rows' => $this->{$report}($slips)]]);
    }

    private function amount(array $lines, string $code): float
    {
        return (float) (collect($lines)->firstWhere('code', $code)['amount'] ?? 0);
    }

    private function base(HrPayslip $slip): array
    {
        return ['employee_id' => $slip->employee_id, 'code' => $slip->snapshot['code'] ?? '', 'name' => $slip->snapshot['name'] ?? ''];
    }

    /** Every pay head as a column, with days and totals. */
    private function register(Collection $slips): Collection
    {
        return $slips->map(function (HrPayslip $slip) {
            $row = $this->base($slip) + ['designation' => $slip->snapshot['designation'] ?? '', 'payable_days' => $slip->payable_days, 'lop_days' => $slip->lop_days,
                'gross_fixed' => $slip->gross_fixed];
            foreach ($slip->earnings as $line) {
                $row['e_'.$line['code']] = (float) $line['amount'];
            }
            foreach ($slip->deductions as $line) {
                $row['d_'.$line['code']] = (float) $line['amount'];
            }

            return $row + ['gross_earned' => $slip->gross_earned, 'total_deductions' => $slip->total_deductions, 'net_pay' => $slip->net_pay,
                'employer_pf' => $slip->employer_pf, 'employer_esi' => $slip->employer_esi, 'held' => $slip->held];
        });
    }

    /** What to transfer: salaries not on hold. */
    private function bank(Collection $slips): Collection
    {
        return $slips->where('held', false)->where('net_pay', '>', 0)->map(fn (HrPayslip $slip) => $this->base($slip) + [
            'account_name' => $slip->snapshot['bank_account_name'] ?: ($slip->snapshot['name'] ?? ''), 'account_no' => $slip->snapshot['bank_account_no'] ?? '',
            'ifsc' => $slip->snapshot['bank_ifsc'] ?? '', 'net_pay' => $slip->net_pay,
        ])->values();
    }

    private function pf(Collection $slips): Collection
    {
        return $slips->filter(fn ($s) => $this->amount($s->deductions, 'PF') > 0)->map(fn (HrPayslip $slip) => $this->base($slip) + [
            'uan' => $slip->snapshot['pf_uan'] ?? '', 'pf_no' => $slip->snapshot['pf_no'] ?? '', 'basic' => $this->amount($slip->earnings, 'BASIC'),
            'employee_pf' => $this->amount($slip->deductions, 'PF'), 'employer_pf' => $slip->employer_pf, 'lop_days' => $slip->lop_days,
        ])->values();
    }

    private function esi(Collection $slips): Collection
    {
        return $slips->filter(fn ($s) => $this->amount($s->deductions, 'ESI') > 0)->map(fn (HrPayslip $slip) => $this->base($slip) + [
            'esi_no' => $slip->snapshot['esi_no'] ?? '', 'gross_earned' => $slip->gross_earned, 'payable_days' => $slip->payable_days,
            'employee_esi' => $this->amount($slip->deductions, 'ESI'), 'employer_esi' => $slip->employer_esi,
        ])->values();
    }

    private function pt(Collection $slips): Collection
    {
        return $slips->filter(fn ($s) => $this->amount($s->deductions, 'PT') > 0)->map(fn (HrPayslip $slip) => $this->base($slip) + [
            'gross_earned' => $slip->gross_earned, 'pt' => $this->amount($slip->deductions, 'PT'),
        ])->values();
    }
}
