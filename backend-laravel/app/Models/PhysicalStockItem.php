<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhysicalStockItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'physical_stock_id',
        'product_id',
        'variant_id',
        'system_qty',
        'counted_qty',
        'difference_qty',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'system_qty' => 'decimal:3',
            'counted_qty' => 'decimal:3',
            'difference_qty' => 'decimal:3',
        ];
    }

    /** @return BelongsTo<PhysicalStock, $this> */
    public function physicalStock(): BelongsTo
    {
        return $this->belongsTo(PhysicalStock::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<ProductVariant, $this> */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
