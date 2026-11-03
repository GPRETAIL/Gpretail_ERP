<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A month's payroll for a store: DRAFT (recalculable), SUBMITTED (posted to the accounts), PAID. */
class HrPayrollRun extends Model
{
    protected $fillable = ['store_id', 'month', 'status', 'employees', 'gross', 'deductions', 'net', 'employer_cost', 'paid_on', 'pay_mode', 'created_by', 'submitted_by', 'submitted_at'];

    protected function casts(): array
    {
        return ['gross' => 'float', 'deductions' => 'float', 'net' => 'float', 'employer_cost' => 'float', 'employees' => 'integer', 'paid_on' => 'date:Y-m-d', 'submitted_at' => 'datetime'];
    }

    /** @return HasMany<HrPayslip, $this> */
    public function payslips(): HasMany
    {
        return $this->hasMany(HrPayslip::class, 'run_id');
    }
}
