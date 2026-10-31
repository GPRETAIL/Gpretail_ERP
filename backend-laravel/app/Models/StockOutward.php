<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class StockOutward extends Model
{
    use HasFactory;

    protected $fillable = [
        'source_store_id',
        'target_store_id',
        'outward_no',
        'outward_date',
        'status',
        'notes',
        'created_by',
        'dispatched_at',
        'received_at',
        'received_by',
        'receive_notes',
        'cancelled_at',
        'uuid',
    ];

    protected static function booted(): void
    {
        // The transfer key; the dispatch screen normally supplies it so retries stay one transfer.
        static::creating(fn (self $outward) => $outward->uuid ??= (string) Str::uuid7());
    }

    /** DISPATCHED = in transit (left the source, not yet in the target); RECEIVED; CANCELLED. */
    public const IN_TRANSIT = 'DISPATCHED';

    /** Quantity totals for transfer lists; items are always eager-loaded there. */
    protected $appends = ['total_qty', 'received_total', 'damaged_total', 'shortage_qty'];

    protected function casts(): array
    {
        return [
            'outward_date' => 'date',
            'dispatched_at' => 'datetime',
            'received_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function getTotalQtyAttribute(): float
    {
        return (float) $this->items->sum('quantity');
    }

    public function getReceivedTotalAttribute(): ?float
    {
        return $this->received_at ? (float) $this->items->sum('received_qty') : null;
    }

    public function getDamagedTotalAttribute(): float
    {
        return (float) $this->items->sum('damaged_qty');
    }

    public function getShortageQtyAttribute(): ?float
    {
        return $this->received_at ? (float) $this->items->sum(fn (StockOutwardItem $item) => $item->shortage_qty) : null;
    }

    /** @return BelongsTo<User, $this> */
    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    /** @return BelongsTo<Store, $this> */
    public function sourceStore(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'source_store_id');
    }

    /** @return BelongsTo<Store, $this> */
    public function targetStore(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'target_store_id');
    }

    /**
     * A transfer is shared by two stores, and StockOutwardController lets only those two open it,
     * so its lines follow the transfer rather than the store scope (which would hide a line from
     * the receiving store because it points at the sender's product). The sender's product and
     * variant themselves stay scoped; the receiver reads the line's snapshot instead.
     *
     * @return HasMany<StockOutwardItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(StockOutwardItem::class)->withoutGlobalScope('http_store_context');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
