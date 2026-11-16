<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryItem extends Model
{
    protected $fillable = ['delivery_id', 'product_id', 'variant_id', 'expected_qty', 'delivered_qty', 'scanned_barcodes'];

    protected function casts(): array
    {
        return [
            'expected_qty' => 'decimal:3',
            'delivered_qty' => 'decimal:3',
            'scanned_barcodes' => 'array',
        ];
    }

    /** @return BelongsTo<Delivery, $this> */
    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
