<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Leave days turned into pay in a month's payroll; the days leave the balance when recorded. */
class HrLeaveEncashment extends Model
{
    protected $fillable = ['store_id', 'employee_id', 'leave_type_id', 'days', 'month', 'status', 'amount', 'payslip_id', 'note', 'created_by'];

    protected function casts(): array
    {
        return ['days' => 'float', 'amount' => 'float'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
