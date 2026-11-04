<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A dated promotion, transfer, salary revision or move to another store, applied on its effective date. */
class HrEmployeeMovement extends Model
{
    protected $fillable = ['store_id', 'employee_id', 'type', 'effective_date', 'changes', 'status', 'applied_at', 'new_employee_id', 'note', 'created_by'];

    protected function casts(): array
    {
        return ['effective_date' => 'date:Y-m-d', 'changes' => 'array', 'applied_at' => 'datetime'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
