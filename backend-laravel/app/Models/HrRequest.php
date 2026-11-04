<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** An employee's request to fix a day's attendance or change their shift, decided by their manager or HR. */
class HrRequest extends Model
{
    protected $fillable = ['store_id', 'employee_id', 'type', 'from_date', 'to_date', 'payload', 'reason', 'status', 'applied_by', 'approver_user_id', 'decided_by', 'decided_at', 'decision_note'];

    protected function casts(): array
    {
        return ['from_date' => 'date:Y-m-d', 'to_date' => 'date:Y-m-d', 'payload' => 'array', 'decided_at' => 'datetime'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
