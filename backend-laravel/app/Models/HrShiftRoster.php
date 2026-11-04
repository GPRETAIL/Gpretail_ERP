<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One employee's shift (a Working Hour) or day off on a date; it overrides their usual shift and weekly off. */
class HrShiftRoster extends Model
{
    protected $table = 'hr_shift_roster';

    protected $fillable = ['store_id', 'employee_id', 'date', 'working_hour_id', 'is_off', 'source', 'created_by'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d', 'is_off' => 'boolean'];
    }
}
