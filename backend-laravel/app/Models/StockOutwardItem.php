<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockOutwardItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_outward_id',
        'product_id',
        'variant_id',
        'quantity',
        'unit_price',
        'received_qty',
        'damaged_qty',
        'receive_note',
        'received_product_id',
        'received_variant_id',
        'product_name',
        'product_code',
        'sku',
        'product_barcode',
        'selling_mode',
        'hsn_code',
        'unit',
        'size',
        'design_no',
        'brand_name',
        'brand_code',
        'color_name',
        'tax_name',
        'mrp',
        'selling_price',
    ];

    protected $appends = ['shortage_qty'];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'received_qty' => 'decimal:3',
            'damaged_qty' => 'decimal:3',
        ];
    }

    /** Sent but neither received nor reported damaged; null until the transfer is received. */
    public function getShortageQtyAttribute(): ?float
    {
        return $this->received_qty === null ? null
            : round(max(0, (float) $this->quantity - (float) $this->received_qty - (float) $this->damaged_qty), 3);
    }

    /** @return BelongsTo<StockOutward, $this> */
    public function stockOutward(): BelongsTo
    {
        return $this->belongsTo(StockOutward::class);
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
