<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DealerInvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'short_qty',
        'dealer_invoice_id',
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
            'short_qty' => 'decimal:3',
            'price' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<DealerInvoice, $this> */
    public function dealerInvoice(): BelongsTo
    {
        return $this->belongsTo(DealerInvoice::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
