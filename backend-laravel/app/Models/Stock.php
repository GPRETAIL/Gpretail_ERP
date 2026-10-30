<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stock extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'product_id',
        'variant_id',
        'quantity',
        'allocated_quantity',
        'available_quantity',
        'location_bin',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'allocated_quantity' => 'decimal:3',
            'available_quantity' => 'decimal:3',
        ];
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
