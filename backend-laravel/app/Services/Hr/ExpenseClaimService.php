<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\HrExpenseClaim;
use App\Models\HrLeaveApplication;
use App\Models\HrLeaveEncashment;
use App\Models\HrLeaveLedger;
use App\Models\HrLeaveType;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Expense claims (an employee paid for the store; they are paid back with the next salary or straight away, chosen
 * when approving) and leave encashment (leave days paid in a month's payroll).
 */
class ExpenseClaimService
{
    public const CATEGORIES = ['TRAVEL', 'FUEL', 'FOOD', 'STORE_PURCHASE', 'PHONE', 'OTHER'];

    public function __construct(private readonly LoanService $loans, private readonly LeaveService $leave) {}

    public function submit(Employee $employee, array $data, ?UploadedFile $bill, ?User $by): HrExpenseClaim
    {
        $claim = HrExpenseClaim::create([
            'store_id' => $employee->store_id, 'employee_id' => $employee->id, 'claim_date' => $data['claim_date'], 'category' => $data['category'],
            'amount' => round((float) $data['amount'], 2), 'description' => $data['description'] ?? null, 'status' => 'PENDING',
            'applied_by' => $by?->id, 'approver_user_id' => $employee->reportsTo?->user_id,
        ]);
        if ($bill) {
            $claim->update(['bill_path' => $bill->store("employees/{$employee->id}/claims", 'local')]);
        }
        $this->loans->notify($claim->approver_user_id, $employee->store_id, 'MONEY_REQUEST', 'Expense claim to approve',
            "{$employee->name} claimed ₹".number_format($claim->amount, 2)." ({$claim->category}).", '/hrms/expense-claims', $claim->id);

        return $claim;
    }

    public function decide(HrExpenseClaim $claim, User $by, bool $approve, ?string $payVia, ?string $note = null): HrExpenseClaim
    {
        if ($claim->status !== 'PENDING') {
            throw ValidationException::withMessages(['status' => 'This claim has already been decided.']);
        }
        $this->loans->notOwn($claim->employee_id, $by);
        $claim->update(['status' => $approve ? 'APPROVED' : 'REJECTED', 'pay_via' => $approve ? ($payVia ?: 'SALARY') : null,
            'decided_by' => $by->id, 'decided_at' => now(), 'decision_note' => $note]);
        $userId = Employee::withoutGlobalScopes()->whereKey($claim->employee_id)->value('user_id');
        $how = $claim->pay_via === 'DIRECT' ? 'It will be paid to you directly.' : 'It will be paid with your next salary.';
        $this->loans->notify($userId, $claim->store_id, 'MONEY_DECIDED', $approve ? 'Expense claim approved' : 'Expense claim rejected',
            '₹'.number_format($claim->amount, 2).' '.($approve ? $how : '').($note ? " {$note}" : ''), '/hrms/my-claims', $claim->id, true);

        return $claim->refresh();
    }

    /** Pays an approved claim now (cash or bank); posted to the accounts. */
    public function pay(HrExpenseClaim $claim, string $date, string $mode): HrExpenseClaim
    {
        if ($claim->status !== 'APPROVED' || $claim->payslip_id) {
            throw ValidationException::withMessages(['status' => 'Only an approved claim not already in a payroll can be paid now.']);
        }
        $claim->update(['status' => 'PAID', 'pay_via' => 'DIRECT', 'paid_on' => $date, 'pay_mode' => $mode]);

        return $claim->refresh();
    }

    public function billUrl(HrExpenseClaim $claim): ?string
    {
        return $claim->bill_path && Storage::disk('local')->exists($claim->bill_path)
            ? Storage::disk('local')->temporaryUrl($claim->bill_path, now()->addMinutes(10))
            : null;
    }

    /** Takes leave days off the balance now; they are paid in the chosen month's payroll. */
    public function encash(Employee $employee, int $leaveTypeId, float $days, string $month, ?string $note, User $by): HrLeaveEncashment
    {
        $type = HrLeaveType::withoutGlobalScopes()->where('store_id', $employee->store_id)->whereKey($leaveTypeId)->first();
        if (! $type || ! $type->is_paid) {
            throw ValidationException::withMessages(['leave_type_id' => 'Choose a paid leave type of this store.']);
        }
        $year = (int) substr($month, 0, 4);
        $available = collect($this->leave->balances($employee, $year))->firstWhere('leave_type_id', $type->id)['available'] ?? 0;
        if ($days <= 0 || $days > $available) {
            throw ValidationException::withMessages(['days' => "Encash at most {$available} day(s) of {$type->name}."]);
        }

        return DB::transaction(function () use ($employee, $type, $days, $month, $note, $by, $year) {
            $encashment = HrLeaveEncashment::create(['store_id' => $employee->store_id, 'employee_id' => $employee->id, 'leave_type_id' => $type->id,
                'days' => $days, 'month' => $month, 'status' => 'APPROVED', 'note' => $note, 'created_by' => $by->id]);
            HrLeaveLedger::withoutGlobalScopes()->create(['store_id' => $employee->store_id, 'employee_id' => $employee->id, 'leave_type_id' => $type->id,
                'year' => $year, 'days' => -$days, 'kind' => 'ENCASHMENT', 'note' => "Encashed, paid in {$month}", 'created_by' => $by->id]);

            return $encashment;
        });
    }

    public function cancelEncashment(HrLeaveEncashment $encashment, User $by): HrLeaveEncashment
    {
        if ($encashment->status !== 'APPROVED' || $encashment->payslip_id) {
            throw ValidationException::withMessages(['status' => 'Only an encashment not yet in a submitted payroll can be cancelled.']);
        }
        DB::transaction(function () use ($encashment, $by) {
            HrLeaveLedger::withoutGlobalScopes()->create(['store_id' => $encashment->store_id, 'employee_id' => $encashment->employee_id,
                'leave_type_id' => $encashment->leave_type_id, 'year' => (int) substr($encashment->month, 0, 4), 'days' => $encashment->days,
                'kind' => 'ADJUSTMENT', 'note' => 'Encashment cancelled', 'created_by' => $by->id]);
            $encashment->update(['status' => 'CANCELLED']);
        });

        return $encashment;
    }
}
