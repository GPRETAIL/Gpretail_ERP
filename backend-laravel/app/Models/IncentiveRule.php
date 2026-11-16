<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Settings > Incentive Configuration: one rule (see Services/Sales/IncentiveCalculator for how rules apply). */
class IncentiveRule extends Model
{
    public const TYPES = ['item', 'scheme', 'ageing', 'target'];

    public const SCOPES = ['all', 'section', 'category', 'brand', 'product'];

    protected $fillable = [
        'store_id', 'type', 'name', 'basis', 'value', 'scope_type', 'scope_ids', 'employee_ids', 'department_ids',
        'min_age_days', 'target_type', 'slabs', 'valid_from', 'valid_to', 'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'scope_ids' => 'array',
            'employee_ids' => 'array',
            'department_ids' => 'array',
            'slabs' => 'array',
            'min_age_days' => 'integer',
            'valid_from' => 'date:Y-m-d',
            'valid_to' => 'date:Y-m-d',
            'is_active' => 'boolean',
        ];
    }
}
