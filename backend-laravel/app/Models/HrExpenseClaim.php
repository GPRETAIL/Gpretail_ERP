<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** An expense an employee paid for the store, paid back with the salary or straight away. */
class HrExpenseClaim extends Model
{
    protected $fillable = ['store_id', 'employee_id', 'claim_date', 'category', 'amount', 'description', 'bill_path', 'status', 'pay_via', 'applied_by', 'approver_user_id', 'decided_by', 'decided_at', 'decision_note', 'paid_on', 'pay_mode', 'payslip_id'];

    protected function casts(): array
    {
        return ['amount' => 'float', 'claim_date' => 'date:Y-m-d', 'decided_at' => 'datetime', 'paid_on' => 'date:Y-m-d'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
