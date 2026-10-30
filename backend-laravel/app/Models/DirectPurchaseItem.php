<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DirectPurchaseItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'direct_purchase_id',
        's_no',
        'product_id',
        'product_name',
        'brand_id',
        'brand_name',
        'size',
        'color_id',
        'color_name',
        'design_no',
        'hsn_code',
        'variant_id',
        'quantity',
        'qty',
        'cost_price',
        'cost',
        'tax_id',
        'tax_amount',
        'discount',
        'margin_perc',
        'price',
        'amount',
        'total_price',
        'jump_change_price',
        'jump_details',
    ];

    protected function casts(): array
    {
        return [
            's_no' => 'integer',
            'quantity' => 'decimal:3',
            'qty' => 'decimal:3',
            'cost_price' => 'decimal:2',
            'cost' => 'decimal:2',
            'margin_perc' => 'decimal:2',
            'price' => 'decimal:2',
            'amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'discount' => 'decimal:2',
            'total_price' => 'decimal:2',
            'jump_change_price' => 'boolean',
            'jump_details' => 'array',
        ];
    }

    /** @return BelongsTo<DirectPurchase, $this> */
    public function directPurchase(): BelongsTo
    {
        return $this->belongsTo(DirectPurchase::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<Brand, $this> */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /** @return BelongsTo<AttributeValue, $this> */
    public function color(): BelongsTo
    {
        return $this->belongsTo(AttributeValue::class, 'color_id');
    }
}
