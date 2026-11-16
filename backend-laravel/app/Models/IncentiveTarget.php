<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A salesperson's (or an HR section's) target for one month. */
class IncentiveTarget extends Model
{
    protected $fillable = ['store_id', 'month', 'employee_id', 'department_id', 'target_amount', 'target_qty'];

    protected function casts(): array
    {
        return ['target_amount' => 'float', 'target_qty' => 'float'];
    }
}
