<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A one-off earning or deduction for an employee in a month (bonus, fine…). */
class HrAdditionalPay extends Model
{
    protected $table = 'hr_additional_pay';

    protected $fillable = ['store_id', 'employee_id', 'component_id', 'month', 'amount', 'note', 'created_by'];

    protected function casts(): array
    {
        return ['amount' => 'float'];
    }

    /** @return BelongsTo<HrSalaryComponent, $this> */
    public function component(): BelongsTo
    {
        return $this->belongsTo(HrSalaryComponent::class, 'component_id');
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
