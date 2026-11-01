<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DealerInvoiceReturnItem extends Model
{
    protected $fillable = [
        'dealer_invoice_return_id',
        'product_id',
        'variant_id',
        'barcode_id',
        'quantity',
        'price',
        'discount',
        'tax_amount',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'price' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<DealerInvoiceReturn, $this> */
    public function dealerInvoiceReturn(): BelongsTo
    {
        return $this->belongsTo(DealerInvoiceReturn::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
