<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** The store's payroll rules (PF, ESI, professional tax, OT, batta) as one JSON document. */
class HrPayrollSetting extends Model
{
    protected $fillable = ['store_id', 'settings'];

    protected function casts(): array
    {
        return ['settings' => 'array'];
    }
}
