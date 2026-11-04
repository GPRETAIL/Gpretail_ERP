<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** The full and final settlement of someone who left: last salary, leave, gratuity and recoveries in one go. */
class HrSettlement extends Model
{
    protected $fillable = ['store_id', 'separation_id', 'employee_id', 'month', 'last_working_day', 'earnings', 'deductions', 'encash_days', 'adjustments', 'summary', 'links', 'gross', 'total_deductions', 'net', 'employer_pf', 'employer_esi', 'status', 'paid_on', 'pay_mode', 'created_by', 'submitted_by', 'submitted_at'];

    protected function casts(): array
    {
        return ['last_working_day' => 'date:Y-m-d', 'earnings' => 'array', 'deductions' => 'array', 'encash_days' => 'array', 'adjustments' => 'array', 'summary' => 'array', 'links' => 'array', 'gross' => 'float', 'total_deductions' => 'float', 'net' => 'float', 'employer_pf' => 'float', 'employer_esi' => 'float', 'paid_on' => 'date:Y-m-d', 'submitted_at' => 'datetime'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /** @return BelongsTo<HrSeparation, $this> */
    public function separation(): BelongsTo
    {
        return $this->belongsTo(HrSeparation::class, 'separation_id');
    }
}
