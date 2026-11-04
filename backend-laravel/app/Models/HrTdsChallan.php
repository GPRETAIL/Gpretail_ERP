<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A TDS deposit (challan) for salaries: what was paid to the government, when, and for which months. */
class HrTdsChallan extends Model
{
    protected $fillable = ['store_id', 'fy', 'quarter', 'months', 'tax', 'interest', 'fee', 'total', 'bsr_code', 'challan_no', 'deposited_on', 'pay_mode', 'note', 'created_by'];

    protected function casts(): array
    {
        return ['months' => 'array', 'tax' => 'float', 'interest' => 'float', 'fee' => 'float', 'total' => 'float', 'deposited_on' => 'date:Y-m-d', 'quarter' => 'integer'];
    }
}
