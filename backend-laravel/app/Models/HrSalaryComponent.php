<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A pay head: an earning (Basic, HRA, OT…) or a deduction (PF, ESI, PT…). `statutory` marks the ones payroll works out itself. */
class HrSalaryComponent extends Model
{
    protected $fillable = ['store_id', 'code', 'name', 'type', 'statutory', 'is_active', 'sort'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'sort' => 'integer'];
    }
}
