<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DealerInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'customer_id',
        'invoice_no',
        'invoice_date',
        'so_no',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'other_charges',
        'grand_total',
        'status',
        'remarks',
        'cancelled_at',
        'cancelled_by',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'other_charges' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'cancelled_at' => 'datetime',
        ];
    }

    /** @return HasMany<DealerInvoiceReturn, $this> */
    public function returns(): HasMany
    {
        return $this->hasMany(DealerInvoiceReturn::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return HasMany<DealerInvoiceItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(DealerInvoiceItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
