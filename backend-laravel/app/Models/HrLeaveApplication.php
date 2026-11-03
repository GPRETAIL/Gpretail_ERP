<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HrLeaveApplication extends Model
{
    protected $fillable = ['store_id', 'employee_id', 'leave_type_id', 'from_date', 'to_date', 'half_day', 'days', 'reason', 'status',
        'applied_by', 'approver_user_id', 'decided_by', 'decided_at', 'decision_note'];

    protected function casts(): array
    {
        return ['from_date' => 'date:Y-m-d', 'to_date' => 'date:Y-m-d', 'half_day' => 'boolean', 'days' => 'float', 'decided_at' => 'datetime'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /** @return BelongsTo<HrLeaveType, $this> */
    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(HrLeaveType::class);
    }
}
