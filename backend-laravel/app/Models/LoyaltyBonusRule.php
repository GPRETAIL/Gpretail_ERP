<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Extra loyalty points: birthday / anniversary month, first purchase, a date range, or bills above an amount. */
class LoyaltyBonusRule extends Model
{
    public const TYPES = ['birthday', 'anniversary', 'first_purchase', 'date_range', 'min_bill'];

    protected $fillable = ['store_id', 'name', 'type', 'multiplier', 'points', 'min_bill', 'starts_on', 'ends_on', 'is_active'];

    protected function casts(): array
    {
        return ['multiplier' => 'decimal:2', 'points' => 'integer', 'min_bill' => 'decimal:2', 'starts_on' => 'date:Y-m-d', 'ends_on' => 'date:Y-m-d', 'is_active' => 'boolean'];
    }
}
