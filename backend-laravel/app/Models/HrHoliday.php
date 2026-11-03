<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A store holiday; weekly offs come from each employee's week off instead. */
class HrHoliday extends Model
{
    protected $fillable = ['store_id', 'date', 'name'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d'];
    }
}
