<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosReturnItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'pos_return_id',
        'product_id',
        'variant_id',
        'barcode_id',
        'quantity',
        'refund_price',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'cost_price',
        'discount',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'refund_price' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'cost_price' => 'decimal:2',
            'discount' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<PosReturn, $this> */
    public function posReturn(): BelongsTo
    {
        return $this->belongsTo(PosReturn::class);
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

    /** @return BelongsTo<Barcode, $this> */
    public function barcode(): BelongsTo
    {
        return $this->belongsTo(Barcode::class, 'barcode_id');
    }
}
