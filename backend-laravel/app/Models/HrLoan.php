<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A salary advance or an interest-free staff loan, recovered from salary in instalments. */
class HrLoan extends Model
{
    protected $fillable = ['store_id', 'employee_id', 'type', 'amount', 'instalments', 'instalment_amount', 'first_month', 'skip_months', 'reason', 'status', 'applied_by', 'approver_user_id', 'decided_by', 'decided_at', 'decision_note', 'disbursed_on', 'pay_mode', 'disbursed_by'];

    protected function casts(): array
    {
        return ['amount' => 'float', 'instalment_amount' => 'float', 'instalments' => 'integer', 'skip_months' => 'array', 'decided_at' => 'datetime', 'disbursed_on' => 'date:Y-m-d'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /** @return HasMany<HrLoanRecovery, $this> */
    public function recoveries(): HasMany
    {
        return $this->hasMany(HrLoanRecovery::class, 'loan_id');
    }
}
