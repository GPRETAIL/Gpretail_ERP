<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrLoan;
use App\Models\HrLoanRecovery;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Salary advances and interest-free staff loans: requested by the employee (or HR on their behalf), approved by
 * their manager or HR, paid out by HR (cash or bank), then recovered from each month's salary in equal
 * instalments from the first recovery month. A month can be skipped and the balance repaid by hand at any time.
 */
class LoanService
{
    public function request(Employee $employee, array $data, ?User $by): HrLoan
    {
        $amount = round((float) $data['amount'], 2);
        $instalments = $data['type'] === 'ADVANCE' ? max(1, (int) ($data['instalments'] ?? 1)) : max(1, (int) $data['instalments']);
        if ($instalments > 60) {
            throw ValidationException::withMessages(['instalments' => 'Recover a loan in at most 60 months.']);
        }
        $firstMonth = $data['first_month'] ?? Carbon::now(AttendanceService::timezone())->addMonthNoOverflow()->format('Y-m');
        $loan = HrLoan::create([
            'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'type' => $data['type'], 'amount' => $amount,
            'instalments' => $instalments, 'instalment_amount' => round(ceil($amount / $instalments * 100) / 100, 2), 'first_month' => $firstMonth,
            'reason' => $data['reason'] ?? null, 'status' => 'REQUESTED', 'applied_by' => $by?->id, 'approver_user_id' => $employee->reportsTo?->user_id,
        ]);
        $label = $loan->type === 'ADVANCE' ? 'a salary advance' : 'a loan';
        $this->notify($loan->approver_user_id, $employee->store_id, 'MONEY_REQUEST', 'Request to approve', "{$employee->name} asked for {$label} of ₹".number_format($amount, 2).'.', '/hrms/loans', $loan->id);

        return $loan;
    }

    public function decide(HrLoan $loan, User $by, bool $approve, ?string $note = null): HrLoan
    {
        if ($loan->status !== 'REQUESTED') {
            throw ValidationException::withMessages(['status' => 'This request has already been decided.']);
        }
        $this->notOwn($loan->employee_id, $by);
        $loan->update(['status' => $approve ? 'APPROVED' : 'REJECTED', 'decided_by' => $by->id, 'decided_at' => now(), 'decision_note' => $note]);
        $userId = Employee::withoutGlobalScopes()->whereKey($loan->employee_id)->value('user_id');
        $what = $loan->type === 'ADVANCE' ? 'advance' : 'loan';
        $this->notify($userId, $loan->store_id, 'MONEY_DECIDED', $approve ? "Your {$what} was approved" : "Your {$what} was rejected",
            '₹'.number_format($loan->amount, 2).($approve ? ' will be paid out by HR.' : '.').($note ? " {$note}" : ''), '/hrms/my-claims', $loan->id, true);

        return $loan->refresh();
    }

    /** Pays the money out; recovery starts in the first recovery month. Posted to the accounts. */
    public function disburse(HrLoan $loan, string $date, string $mode, User $by, ?string $firstMonth = null): HrLoan
    {
        if ($loan->status !== 'APPROVED') {
            throw ValidationException::withMessages(['status' => 'Only an approved request can be paid out.']);
        }
        $loan->update(['status' => 'ACTIVE', 'disbursed_on' => $date, 'pay_mode' => $mode, 'disbursed_by' => $by->id,
            'first_month' => $firstMonth ?: max($loan->first_month, substr($date, 0, 7))]);

        return $loan->refresh();
    }

    public function skip(HrLoan $loan, string $month): HrLoan
    {
        if ($loan->status !== 'ACTIVE') {
            throw ValidationException::withMessages(['status' => 'Only a running loan can skip a month.']);
        }
        if (HrLoanRecovery::where('loan_id', $loan->id)->where('month', $month)->exists()) {
            throw ValidationException::withMessages(['month' => 'This month has already been recovered.']);
        }
        $loan->update(['skip_months' => array_values(array_unique([...($loan->skip_months ?? []), $month]))]);

        return $loan->refresh();
    }

    /** A repayment outside payroll (cash or bank); posted to the accounts. */
    public function repay(HrLoan $loan, float $amount, string $date, string $mode, User $by, ?string $note = null): HrLoan
    {
        if ($loan->status !== 'ACTIVE') {
            throw ValidationException::withMessages(['status' => 'Only a running loan can be repaid.']);
        }
        if ($amount <= 0 || $amount > $this->balance($loan) + 0.001) {
            throw ValidationException::withMessages(['amount' => 'Repay at most the balance of ₹'.number_format($this->balance($loan), 2).'.']);
        }
        HrLoanRecovery::create(['store_id' => $loan->store_id, 'loan_id' => $loan->id, 'month' => substr($date, 0, 7), 'amount' => $amount, 'kind' => 'MANUAL',
            'paid_on' => $date, 'pay_mode' => $mode, 'note' => $note, 'created_by' => $by->id]);
        $this->closeIfRepaid($loan);

        return $loan->refresh();
    }

    public function cancel(HrLoan $loan): HrLoan
    {
        if (! in_array($loan->status, ['REQUESTED', 'APPROVED'], true)) {
            throw ValidationException::withMessages(['status' => 'Only a request not yet paid out can be cancelled.']);
        }
        $loan->update(['status' => 'CANCELLED']);

        return $loan;
    }

    public function balance(HrLoan $loan): float
    {
        return round($loan->amount - (float) HrLoanRecovery::withoutGlobalScopes()->where('loan_id', $loan->id)->sum('amount'), 2);
    }

    /**
     * What each running loan of the employee recovers in a month's payroll: the instalment (never more than what
     * is left), from the first recovery month, except skipped months and months already recovered.
     *
     * @return array<int, array{loan_id: int, type: string, amount: float}>
     */
    public function dueFor(Employee $employee, string $month): array
    {
        $due = [];
        $loans = HrLoan::withoutGlobalScopes()->where('employee_id', $employee->id)->where('status', 'ACTIVE')->where('first_month', '<=', $month)->orderBy('id')->get();
        foreach ($loans as $loan) {
            if (in_array($month, $loan->skip_months ?? [], true)
                || HrLoanRecovery::withoutGlobalScopes()->where('loan_id', $loan->id)->where('month', $month)->where('kind', 'PAYROLL')->exists()) {
                continue;
            }
            $amount = min($loan->instalment_amount, $this->balance($loan));
            if ($amount > 0) {
                $due[] = ['loan_id' => $loan->id, 'type' => $loan->type, 'amount' => round($amount, 2)];
            }
        }

        return $due;
    }

    public function closeIfRepaid(HrLoan $loan): void
    {
        if ($loan->status === 'ACTIVE' && $this->balance($loan) <= 0.004) {
            $loan->forceFill(['status' => 'CLOSED'])->save();
        } elseif ($loan->status === 'CLOSED' && $this->balance($loan) > 0.004) {
            $loan->forceFill(['status' => 'ACTIVE'])->save();
        }
    }

    public function notOwn(int $employeeId, User $by): void
    {
        $own = Employee::withoutGlobalScopes()->whereKey($employeeId)->value('user_id');
        if ($own && (int) $own === (int) $by->id) {
            throw ValidationException::withMessages(['status' => "You can't approve or reject your own request."]);
        }
    }

    public function notify(?int $userId, ?int $storeId, string $type, string $title, string $message, string $link, int $referenceId, bool $onlyUser = false): void
    {
        if (! $storeId || ($onlyUser && ! $userId)) {
            return;
        }
        Notification::withoutGlobalScopes()->create(['type' => $type, 'title' => $title, 'message' => $message, 'link' => $link,
            'reference_type' => 'HR_MONEY', 'reference_id' => $referenceId, 'store_id' => $storeId, 'user_id' => $userId]);
    }
}
