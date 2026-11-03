<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One employee's pay for a run. The snapshot keeps the name, bank and statutory numbers as they were. */
class HrPayslip extends Model
{
    protected $fillable = ['store_id', 'run_id', 'employee_id', 'days_in_month', 'payable_days', 'lop_days', 'gross_fixed', 'earnings', 'deductions', 'gross_earned', 'total_deductions', 'net_pay', 'employer_pf', 'employer_esi', 'held', 'snapshot'];

    protected function casts(): array
    {
        return ['earnings' => 'array', 'deductions' => 'array', 'snapshot' => 'array', 'held' => 'boolean', 'payable_days' => 'float', 'lop_days' => 'float', 'gross_fixed' => 'float', 'gross_earned' => 'float', 'total_deductions' => 'float', 'net_pay' => 'float', 'employer_pf' => 'float', 'employer_esi' => 'float'];
    }

    /** @return BelongsTo<HrPayrollRun, $this> */
    public function run(): BelongsTo
    {
        return $this->belongsTo(HrPayrollRun::class, 'run_id');
    }
}
