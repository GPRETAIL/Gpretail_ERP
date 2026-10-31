<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PurchaseOrder extends Model
{
    /** Still being prepared, or ordered from the supplier and not yet closed. */
    public const OPEN = ['DRAFT', 'APPROVED'];

    protected $fillable = [
        'store_id', 'uuid', 'po_no', 'supplier_id', 'po_date', 'expected_date', 'status', 'source', 'notes',
        'total_qty', 'total_amount', 'created_by', 'approved_by', 'approved_at', 'closed_at', 'cancelled_at',
    ];

    protected static function booted(): void
    {
        static::creating(fn (self $order) => $order->uuid ??= (string) Str::uuid7());
    }

    protected function casts(): array
    {
        return [
            'po_date' => 'date',
            'expected_date' => 'date',
            'total_qty' => 'decimal:3',
            'total_amount' => 'decimal:2',
            'approved_at' => 'datetime',
            'closed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    /** Totals follow the lines. */
    public function refreshTotals(): void
    {
        $this->forceFill([
            'total_qty' => (float) $this->items()->sum('quantity'),
            'total_amount' => (float) $this->items()->sum('amount'),
        ])->save();
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<Supplier, $this> */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /** @return HasMany<PurchaseOrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
