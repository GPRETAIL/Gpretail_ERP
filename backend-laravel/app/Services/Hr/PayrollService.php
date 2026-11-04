<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrExpenseClaim;
use App\Models\HrLeaveEncashment;
use App\Models\HrLoan;
use App\Models\HrLoanRecovery;
use App\Models\HrPayrollRun;
use App\Models\HrPayslip;
use App\Models\HrSeparation;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A store's monthly payroll: prepare (and re-prepare) a draft, submit it (posted to the accounts, employees can
 * see their payslips), mark it paid (the payment is posted), or reopen a submitted run before payment.
 */
class PayrollService
{
    public function __construct(private readonly PayrollCalculator $calculator, private readonly PayrollSetup $setup, private readonly LoanService $loans) {}

    public function prepare(int $storeId, string $month, ?User $by): HrPayrollRun
    {
        if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) || $month > Carbon::now(config('app.business_timezone'))->format('Y-m')) {
            throw ValidationException::withMessages(['month' => 'Choose this month or an earlier one.']);
        }
        $this->setup->ensureDefaults($storeId);
        $run = HrPayrollRun::withoutGlobalScopes()->firstOrCreate(['store_id' => $storeId, 'month' => $month], ['status' => 'DRAFT', 'created_by' => $by?->id]);
        if ($run->status !== 'DRAFT') {
            throw ValidationException::withMessages(['month' => "{$month} payroll is already submitted. Reopen it to make changes."]);
        }
        $settings = $this->setup->settings($storeId);
        $monthEnd = Carbon::parse("{$month}-01")->endOfMonth()->toDateString();
        $monthStart = "{$month}-01";

        DB::transaction(function () use ($run, $storeId, $month, $settings, $monthEnd, $monthStart) {
            $kept = [];
            // Staff working in the month: active ones, and anyone relieved later than its start (paid up to their last day).
            // Someone whose last working day falls in the month is paid in their full and final settlement instead.
            $settled = HrSeparation::withoutGlobalScopes()->where('store_id', $storeId)->whereIn('status', ['ACCEPTED', 'RELIEVED', 'SETTLED'])
                ->whereBetween('last_working_day', [$monthStart, $monthEnd])->pluck('employee_id');
            $employees = Employee::withoutGlobalScopes()->with('designation:id,name')->where('store_id', $storeId)
                ->where(fn ($q) => $q->where('is_active', true)->orWhere('relieving_date', '>=', $monthStart))
                ->whereNotIn('id', $settled)
                ->where(fn ($q) => $q->whereNull('joining_date')->orWhere('joining_date', '<=', $monthEnd))->orderBy('name')->get();
            foreach ($employees as $employee) {
                if (PayrollCalculator::grossOf($employee) <= 0) {
                    continue;
                }
                $slip = $this->calculator->slip($employee, $month, $settings);
                $details = $employee->master_details ?? [];
                HrPayslip::withoutGlobalScopes()->updateOrCreate(['run_id' => $run->id, 'employee_id' => $employee->id], [
                    'store_id' => $storeId, ...collect($slip)->except(['summary', 'links', 'tax'])->all(),
                    'snapshot' => [
                        'name' => $employee->name, 'code' => $employee->code, 'designation' => $employee->designation?->name,
                        'joining_date' => $employee->joining_date ? Carbon::parse($employee->joining_date)->toDateString() : null,
                        'bank_account_name' => $details['bank_account_name'] ?? null, 'bank_account_no' => $details['bank_account_no'] ?? null,
                        'bank_ifsc' => $details['bank_ifsc'] ?? null, 'pf_uan' => $details['pf_uan'] ?? null, 'pf_no' => $details['pf_no'] ?? null,
                        'esi_no' => $details['esi_no'] ?? null, 'pan_number' => $details['pan_number'] ?? null, 'salary_mode' => $details['salary_mode'] ?? 'Monthly',
                        'present_days' => $slip['summary']['present_days'], 'ot_minutes' => $slip['summary']['ot_minutes'],
                        // What this slip pays back or recovers; written to those records when the run is submitted.
                        'links' => $slip['links'],
                        'tax' => $slip['tax'],
                    ],
                ]);
                $kept[] = $employee->id;
            }
            // Someone who left or lost their salary since the last prepare.
            HrPayslip::withoutGlobalScopes()->where('run_id', $run->id)->whereNotIn('employee_id', $kept)->delete();
            $this->totals($run);
        });

        return $run->refresh();
    }

    public function submit(HrPayrollRun $run, User $by): HrPayrollRun
    {
        $this->expect($run, 'DRAFT', 'Only a draft payroll can be submitted.');
        if (! $run->payslips()->exists()) {
            throw ValidationException::withMessages(['run' => 'There are no payslips in this payroll. Set Gross Pay on the employees first.']);
        }
        DB::transaction(function () use ($run, $by) {
            $run->update(['status' => 'SUBMITTED', 'submitted_by' => $by->id, 'submitted_at' => now()]);
            foreach (HrPayslip::withoutGlobalScopes()->where('run_id', $run->id)->get() as $slip) {
                $links = $slip->snapshot['links'] ?? [];
                foreach ($links['loans'] ?? [] as $loan) {
                    HrLoanRecovery::withoutGlobalScopes()->create(['store_id' => $slip->store_id, 'loan_id' => $loan['loan_id'], 'month' => $run->month,
                        'amount' => $loan['amount'], 'kind' => 'PAYROLL', 'payslip_id' => $slip->id, 'created_by' => $by->id]);
                    $this->loans->closeIfRepaid(HrLoan::withoutGlobalScopes()->findOrFail($loan['loan_id']));
                }
                HrExpenseClaim::withoutGlobalScopes()->whereIn('id', $links['claims'] ?? [])->update(['payslip_id' => $slip->id]);
                foreach ($links['encashments'] ?? [] as $encashment) {
                    HrLeaveEncashment::withoutGlobalScopes()->whereKey($encashment['id'])->update(['payslip_id' => $slip->id, 'amount' => $encashment['amount']]);
                }
            }
        });
        $label = Carbon::parse("{$run->month}-01")->format('F Y');
        $users = Employee::withoutGlobalScopes()->whereIn('id', $run->payslips()->pluck('employee_id'))->whereNotNull('user_id')->pluck('user_id');
        foreach ($users as $userId) {
            Notification::withoutGlobalScopes()->create(['type' => 'PAYSLIP', 'title' => 'Payslip ready', 'message' => "Your payslip for {$label} is ready.",
                'link' => '/hrms/my-payslips', 'reference_type' => 'PAYROLL_RUN', 'reference_id' => $run->id, 'store_id' => $run->store_id, 'user_id' => $userId]);
        }

        return $run->refresh();
    }

    public function markPaid(HrPayrollRun $run, string $date, string $mode): HrPayrollRun
    {
        $this->expect($run, 'SUBMITTED', 'Submit the payroll before marking it paid.');
        $run->update(['status' => 'PAID', 'paid_on' => $date, 'pay_mode' => $mode]);
        $slipIds = HrPayslip::withoutGlobalScopes()->where('run_id', $run->id)->where('held', false)->pluck('id');
        HrExpenseClaim::withoutGlobalScopes()->whereIn('payslip_id', $slipIds)->update(['status' => 'PAID', 'paid_on' => $date, 'pay_mode' => $mode]);
        HrLeaveEncashment::withoutGlobalScopes()->whereIn('payslip_id', $slipIds)->update(['status' => 'PAID']);

        return $run->refresh();
    }

    /** Back to a draft (its vouchers are removed); not once it is paid. */
    public function reopen(HrPayrollRun $run): HrPayrollRun
    {
        $this->expect($run, 'SUBMITTED', $run->status === 'PAID' ? 'A paid payroll cannot be reopened.' : 'This payroll is already a draft.');
        DB::transaction(function () use ($run) {
            $slipIds = HrPayslip::withoutGlobalScopes()->where('run_id', $run->id)->pluck('id');
            $loanIds = HrLoanRecovery::withoutGlobalScopes()->whereIn('payslip_id', $slipIds)->pluck('loan_id')->unique();
            HrLoanRecovery::withoutGlobalScopes()->whereIn('payslip_id', $slipIds)->delete();
            HrLoan::withoutGlobalScopes()->whereIn('id', $loanIds)->get()->each(fn ($loan) => $this->loans->closeIfRepaid($loan));
            HrExpenseClaim::withoutGlobalScopes()->whereIn('payslip_id', $slipIds)->update(['payslip_id' => null]);
            HrLeaveEncashment::withoutGlobalScopes()->whereIn('payslip_id', $slipIds)->update(['payslip_id' => null, 'amount' => null]);
            $run->update(['status' => 'DRAFT', 'submitted_by' => null, 'submitted_at' => null]);
        });

        return $run->refresh();
    }

    private function totals(HrPayrollRun $run): void
    {
        $slips = HrPayslip::withoutGlobalScopes()->where('run_id', $run->id)->get();
        $run->update([
            'employees' => $slips->count(),
            'gross' => round($slips->sum('gross_earned'), 2),
            'deductions' => round($slips->sum('total_deductions'), 2),
            'net' => round($slips->sum('net_pay'), 2),
            'employer_cost' => round($slips->sum('gross_earned') + $slips->sum('employer_pf') + $slips->sum('employer_esi'), 2),
        ]);
    }

    private function expect(HrPayrollRun $run, string $status, string $message): void
    {
        if ($run->status !== $status) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }
}
