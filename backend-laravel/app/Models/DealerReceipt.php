<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Sales > Dealer Receipt: money collected from a dealer, allocated to their open invoices. */
class DealerReceipt extends Model
{
    protected $fillable = [
        'store_id', 'receipt_no', 'customer_id', 'receipt_date', 'mode', 'amount', 'reference_no', 'cheque_date', 'notes',
        'status', 'cancelled_at', 'cancelled_by', 'created_by',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'receipt_date' => 'date:Y-m-d', 'cheque_date' => 'date:Y-m-d', 'cancelled_at' => 'datetime'];
    }

    /** @return HasMany<DealerReceiptItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(DealerReceiptItem::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
