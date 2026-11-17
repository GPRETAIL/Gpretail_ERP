<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A loyalty tier: customers who spent at least min_spend in the last 12 months earn points × multiplier. */
class LoyaltyTier extends Model
{
    protected $fillable = ['store_id', 'name', 'min_spend', 'multiplier'];

    protected function casts(): array
    {
        return ['min_spend' => 'decimal:2', 'multiplier' => 'decimal:2'];
    }
}
