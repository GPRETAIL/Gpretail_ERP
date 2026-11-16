<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A salesperson's approved incentive for one month; payroll's Sales Incentive pays `total`. */
class IncentivePayout extends Model
{
    protected $fillable = [
        'store_id', 'month', 'employee_id', 'net_sales', 'qty', 'item_amount', 'scheme_amount', 'ageing_amount',
        'target_amount', 'returns_amount', 'total', 'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'net_sales' => 'float', 'qty' => 'float', 'item_amount' => 'float', 'scheme_amount' => 'float',
            'ageing_amount' => 'float', 'target_amount' => 'float', 'returns_amount' => 'float', 'total' => 'float',
            'approved_at' => 'datetime',
        ];
    }
}
