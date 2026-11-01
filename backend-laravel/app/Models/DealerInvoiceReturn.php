<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Goods a dealer sends back: stock comes in and the sale is reversed in the books (LedgerPoster dealer_return). */
class DealerInvoiceReturn extends Model
{
    protected $fillable = [
        'store_id',
        'return_no',
        'customer_id',
        'dealer_invoice_id',
        'return_date',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'other_charges',
        'grand_total',
        'status',
        'remarks',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'return_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'other_charges' => 'decimal:2',
            'grand_total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return BelongsTo<DealerInvoice, $this> */
    public function dealerInvoice(): BelongsTo
    {
        return $this->belongsTo(DealerInvoice::class);
    }

    /** @return HasMany<DealerInvoiceReturnItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(DealerInvoiceReturnItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
