<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Sales > Delivery: a bill's handover, checked item by item (see DeliveryService). */
class Delivery extends Model
{
    public const DELIVERED = 'delivered';

    public const SHORT = 'short';

    protected $fillable = [
        'store_id', 'source_type', 'source_id', 'bill_no', 'customer_id', 'status', 'expected_qty', 'delivered_qty',
        'short_reason', 'approval_request_id', 'approved_by', 'delivered_by', 'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'expected_qty' => 'decimal:3',
            'delivered_qty' => 'decimal:3',
            'delivered_at' => 'datetime',
        ];
    }

    /** @return HasMany<DeliveryItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(DeliveryItem::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return BelongsTo<User, $this> */
    public function deliverer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivered_by');
    }

    /** @return BelongsTo<User, $this> */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
