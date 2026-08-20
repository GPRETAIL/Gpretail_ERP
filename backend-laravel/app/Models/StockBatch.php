<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockBatch extends Model
{
    protected $fillable = [
        'variant_id',
        'store_id',
        'reference_type',
        'reference_id',
        'received_qty',
        'remaining_qty',
        'cost_price',
        'received_at',
    ];

    protected function casts(): array
    {
        return [
            'received_qty' => 'decimal:3',
            'remaining_qty' => 'decimal:3',
            'cost_price' => 'decimal:2',
            'received_at' => 'datetime',
        ];
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function allocations()
    {
        return $this->hasMany(StockBatchAllocation::class);
    }
}
