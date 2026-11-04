<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrExpenseClaim;
use App\Models\HrLeaveEncashment;
use App\Models\HrLeaveLedger;
use App\Models\HrLeaveType;
use App\Models\HrLoan;
use App\Models\HrLoanRecovery;
use App\Models\HrSeparation;
use App\Models\HrSettlement;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The full and final settlement of someone who left, paid in one go: salary for the days worked in the last month
 * (that month's payroll skips them), unused leave, gratuity as per the Act, less notice not served (unless waived)
 * and whatever is still owed on advances and loans. Prepared as a draft, submitted (posted to the accounts, the
 * employee relieved), then marked paid; a submitted settlement can be reopened before payment.
 */
class SettlementService
{
    public function __construct(private readonly PayrollCalculator $calculator, private readonly PayrollSetup $setup, private readonly LoanService $loans,
        private readonly LeaveService $leave, private readonly SeparationService $separations) {}

    /**
     * Works the settlement out (again) from the exit and the HR choices: leave days to pay per leave type, notice
     * waived, extra lines.
     *
     * @param  array{encash_days?: array<int|string, float>, notice_waived?: bool, adjustments?: array}  $input
     */
    public function prepare(HrSeparation $separation, ?User $by, array $input = []): HrSettlement
    {
        if (! in_array($separation->status, ['ACCEPTED', 'RELIEVED', 'SETTLED'], true)) {
            throw ValidationException::withMessages(['status' => 'Accept the exit before preparing the settlement.']);
        }
        $lastDay = $separation->last_working_day->toDateString();
        if ($lastDay > SeparationService::today()) {
            throw ValidationException::withMessages(['status' => "Prepare the settlement on or after the last working day ({$lastDay})."]);
        }
        $settlement = HrSettlement::withoutGlobalScopes()->firstOrNew(['separation_id' => $separation->id]);
        if ($settlement->exists && $settlement->status !== 'DRAFT') {
            throw ValidationException::withMessages(['status' => 'This settlement is already submitted. Reopen it to make changes.']);
        }
        if (array_key_exists('notice_waived', $input)) {
            $separation->update(['notice_waived' => (bool) $input['notice_waived']]);
        }

        // Worked out as of the last working day; the record itself is only changed when the employee is relieved.
        $employee = Employee::withoutGlobalScopes()->findOrFail($separation->employee_id);
        $employee->relieving_date = $lastDay;
        $month = substr($lastDay, 0, 7);
        $settings = $this->setup->settings($employee->store_id);
        $this->setup->ensureDefaults($employee->store_id);
        $daily = strcasecmp((string) ($employee->master_details['salary_mode'] ?? 'Monthly'), 'Daily') === 0;
        $rate = PayrollCalculator::grossOf($employee);
        $daysInMonth = Carbon::parse("{$month}-01")->daysInMonth;
        $dayRate = $daily ? $rate : $rate / $daysInMonth;

        $leave = $this->leaveOnExit($employee, $lastDay, $input['encash_days'] ?? $settlement->encash_days);
        $leaveAmount = round(array_sum(array_column($leave, 'days')) * $dayRate, 2);
        $gratuity = $this->gratuity($employee, $lastDay, $settings['gratuity'], $daily);
        $noticeShort = $separation->type === 'RESIGNATION' && ! $separation->notice_waived ? $separation->notice_short_days : 0;
        $adjustments = array_values(array_filter($input['adjustments'] ?? $settlement->adjustments ?? [], fn ($line) => (float) ($line['amount'] ?? 0) > 0));

        $slip = $this->calculator->slip($employee, $month, $settings, [
            'leave_exit' => $leaveAmount, 'gratuity' => $gratuity['amount'], 'notice' => round($noticeShort * $dayRate, 2), 'adjustments' => $adjustments,
        ]);
        $owed = array_sum(array_column($this->loans->outstandingFor($employee), 'amount'));
        $recovered = array_sum(array_column($slip['links']['loans'], 'amount'));

        $settlement->fill([
            'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'month' => $month, 'last_working_day' => $lastDay,
            'earnings' => $slip['earnings'], 'deductions' => $slip['deductions'], 'gross' => $slip['gross_earned'],
            'total_deductions' => $slip['total_deductions'], 'net' => $slip['net_pay'], 'employer_pf' => $slip['employer_pf'], 'employer_esi' => $slip['employer_esi'],
            'encash_days' => collect($leave)->mapWithKeys(fn ($l) => [$l['leave_type_id'] => $l['days']])->all(), 'adjustments' => $adjustments,
            'links' => $slip['links'], 'status' => 'DRAFT', 'created_by' => $settlement->created_by ?? $by?->id,
            'summary' => [
                'days_in_month' => $daysInMonth, 'payable_days' => $slip['payable_days'], 'lop_days' => $slip['lop_days'],
                'day_rate' => round($dayRate, 2), 'salary_mode' => $daily ? 'Daily' : 'Monthly', 'gross_rate' => $rate,
                'leave' => $leave, 'leave_amount' => $leaveAmount,
                'service' => $gratuity['service'], 'gratuity_years' => $gratuity['years'], 'gratuity_wage' => $gratuity['wage'], 'gratuity_amount' => $gratuity['amount'],
                'gratuity_note' => $gratuity['note'],
                'notice_days' => $separation->notice_days, 'notice_short_days' => $separation->notice_short_days, 'notice_waived' => $separation->notice_waived,
                'notice_recovery' => round($noticeShort * $dayRate, 2),
                'tax' => $slip['tax'],
                'loan_owed' => round($owed, 2), 'loan_recovered' => round($recovered, 2), 'loan_left' => round($owed - $recovered, 2),
            ],
        ])->save();

        return $settlement->refresh();
    }

    /**
     * Gratuity as per the Payment of Gratuity Act: service in years (six months or more counts as a year) from the
     * joining date to the last working day; from the minimum years, days ÷ divisor × Basic per year (Basic per day ×
     * days for daily-wage staff), up to the cap.
     *
     * @return array{years: int, service: string, wage: float, amount: float, note: string}
     */
    public function gratuity(Employee $employee, string $lastDay, array $rules, bool $daily): array
    {
        if (! $employee->joining_date) {
            return ['years' => 0, 'service' => '', 'wage' => 0, 'amount' => 0, 'note' => 'No joining date on the employee record.'];
        }
        $service = Carbon::parse($employee->joining_date)->startOfDay()->diff(Carbon::parse($lastDay)->addDay()->startOfDay());
        $years = $service->y + ($service->m >= 6 ? 1 : 0);
        $text = "{$service->y} year(s) {$service->m} month(s)";
        $wage = round($this->calculator->basicOf($employee), 2);
        if (! ($rules['enabled'] ?? true)) {
            return ['years' => $years, 'service' => $text, 'wage' => $wage, 'amount' => 0, 'note' => 'Gratuity is switched off in Payroll Settings.'];
        }
        if ($years < (float) $rules['min_years']) {
            return ['years' => $years, 'service' => $text, 'wage' => $wage, 'amount' => 0, 'note' => "Needs {$rules['min_years']} years of service."];
        }
        $amount = $daily ? $wage * (float) $rules['days'] * $years : $wage * (float) $rules['days'] / max(1, (float) $rules['divisor']) * $years;
        $capped = $amount > (float) $rules['cap'];

        return ['years' => $years, 'service' => $text, 'wage' => $wage, 'amount' => round(min($amount, (float) $rules['cap']), 2),
            'note' => $capped ? 'Capped at ₹'.number_format((float) $rules['cap']).'.' : ''];
    }

    /**
     * Leave paid on exit, per paid leave type: the days asked for (at most the balance), or by default the whole
     * balance of the types that carry forward (earned leave).
     *
     * @return array<int, array{leave_type_id: int, name: string, available: float, days: float}>
     */
    private function leaveOnExit(Employee $employee, string $lastDay, ?array $chosen): array
    {
        $balances = $this->leave->balances($employee, (int) substr($lastDay, 0, 4));
        $carry = HrLeaveType::withoutGlobalScopes()->where('store_id', $employee->store_id)->where('carry_forward', true)->pluck('id')->all();
        $rows = [];
        foreach ($balances->where('is_paid', true) as $balance) {
            $available = max(0, (float) $balance['available']);
            $days = $chosen !== null ? (float) ($chosen[$balance['leave_type_id']] ?? $chosen[(string) $balance['leave_type_id']] ?? 0)
                : (in_array($balance['leave_type_id'], $carry, true) ? $available : 0);
            if ($days > $available + 0.001) {
                throw ValidationException::withMessages(['encash_days' => "Only {$available} day(s) of {$balance['name']} are left."]);
            }
            $rows[] = ['leave_type_id' => $balance['leave_type_id'], 'name' => $balance['name'], 'available' => $available, 'days' => max(0, $days)];
        }

        return $rows;
    }

    public function submit(HrSettlement $settlement, User $by): HrSettlement
    {
        $separation = HrSeparation::withoutGlobalScopes()->findOrFail($settlement->separation_id);
        $settlement = $this->prepare($separation, $by); // Fresh figures at the moment it is locked.
        DB::transaction(function () use ($settlement, $separation, $by) {
            $links = $settlement->links ?? [];
            foreach ($links['loans'] ?? [] as $loan) {
                HrLoanRecovery::withoutGlobalScopes()->create(['store_id' => $settlement->store_id, 'loan_id' => $loan['loan_id'], 'month' => $settlement->month,
                    'amount' => $loan['amount'], 'kind' => 'PAYROLL', 'settlement_id' => $settlement->id, 'note' => 'Full and final settlement', 'created_by' => $by->id]);
                $this->loans->closeIfRepaid(HrLoan::withoutGlobalScopes()->findOrFail($loan['loan_id']));
            }
            HrExpenseClaim::withoutGlobalScopes()->whereIn('id', $links['claims'] ?? [])->update(['settlement_id' => $settlement->id]);
            foreach ($links['encashments'] ?? [] as $encashment) {
                HrLeaveEncashment::withoutGlobalScopes()->whereKey($encashment['id'])->update(['settlement_id' => $settlement->id, 'amount' => $encashment['amount']]);
            }
            foreach ($settlement->summary['leave'] ?? [] as $leave) {
                if ($leave['days'] > 0) {
                    HrLeaveLedger::withoutGlobalScopes()->create(['store_id' => $settlement->store_id, 'employee_id' => $settlement->employee_id,
                        'leave_type_id' => $leave['leave_type_id'], 'year' => (int) substr($settlement->last_working_day->toDateString(), 0, 4), 'days' => -$leave['days'],
                        'kind' => 'ENCASHMENT', 'note' => $this->ledgerNote($settlement), 'created_by' => $by->id]);
                }
            }
            $settlement->update(['status' => 'SUBMITTED', 'submitted_by' => $by->id, 'submitted_at' => now()]);
            $separation->update(['status' => 'SETTLED']);
            $this->separations->relieve($separation->refresh());
        });

        return $settlement->refresh();
    }

    public function markPaid(HrSettlement $settlement, string $date, string $mode): HrSettlement
    {
        if ($settlement->status !== 'SUBMITTED') {
            throw ValidationException::withMessages(['status' => 'Submit the settlement before marking it paid.']);
        }
        DB::transaction(function () use ($settlement, $date, $mode) {
            $settlement->update(['status' => 'PAID', 'paid_on' => $date, 'pay_mode' => $mode]);
            HrExpenseClaim::withoutGlobalScopes()->where('settlement_id', $settlement->id)->update(['status' => 'PAID', 'paid_on' => $date, 'pay_mode' => $mode]);
            HrLeaveEncashment::withoutGlobalScopes()->where('settlement_id', $settlement->id)->update(['status' => 'PAID']);
        });

        return $settlement->refresh();
    }

    /** Back to a draft (its voucher is removed, recoveries and leave given back); not once it is paid. The employee stays relieved. */
    public function reopen(HrSettlement $settlement): HrSettlement
    {
        if ($settlement->status !== 'SUBMITTED') {
            throw ValidationException::withMessages(['status' => $settlement->status === 'PAID' ? 'A paid settlement cannot be reopened.' : 'This settlement is already a draft.']);
        }
        DB::transaction(function () use ($settlement) {
            $loanIds = HrLoanRecovery::withoutGlobalScopes()->where('settlement_id', $settlement->id)->pluck('loan_id')->unique();
            HrLoanRecovery::withoutGlobalScopes()->where('settlement_id', $settlement->id)->get()->each->delete();
            HrLoan::withoutGlobalScopes()->whereIn('id', $loanIds)->get()->each(fn ($loan) => $this->loans->closeIfRepaid($loan));
            HrExpenseClaim::withoutGlobalScopes()->where('settlement_id', $settlement->id)->update(['settlement_id' => null]);
            HrLeaveEncashment::withoutGlobalScopes()->where('settlement_id', $settlement->id)->update(['settlement_id' => null, 'amount' => null]);
            HrLeaveLedger::withoutGlobalScopes()->where('employee_id', $settlement->employee_id)->where('kind', 'ENCASHMENT')->where('note', $this->ledgerNote($settlement))->delete();
            $settlement->update(['status' => 'DRAFT', 'submitted_by' => null, 'submitted_at' => null]);
            HrSeparation::withoutGlobalScopes()->whereKey($settlement->separation_id)->update(['status' => 'RELIEVED']);
        });

        return $settlement->refresh();
    }

    private function ledgerNote(HrSettlement $settlement): string
    {
        return "Paid on exit (settlement #{$settlement->id})";
    }
}
