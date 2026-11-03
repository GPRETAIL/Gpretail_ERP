<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A kind of leave (CL, SL, EL, LOP…). An unpaid type has no balance to check. */
class HrLeaveType extends Model
{
    protected $fillable = ['store_id', 'code', 'name', 'is_paid', 'allow_half_day', 'carry_forward', 'max_carry_days', 'max_days_per_application', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_paid' => 'boolean', 'allow_half_day' => 'boolean', 'carry_forward' => 'boolean', 'is_active' => 'boolean',
            'max_carry_days' => 'float', 'max_days_per_application' => 'float',
        ];
    }
}
