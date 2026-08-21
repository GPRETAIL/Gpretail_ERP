<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockBatch extends Model
{
    protected $fillable = [
        'variant_id',
        'store_id',
        'reference_type',
        'reference_id',
        'received_qty',
        'remaining_qty',
        'cost_price',
        'received_at',
    ];

    protected function casts(): array
    {
        return [
            'received_qty' => 'decimal:3',
            'remaining_qty' => 'decimal:3',
            'cost_price' => 'decimal:2',
            'received_at' => 'datetime',
        ];
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function allocations()
    {
        return $this->hasMany(StockBatchAllocation::class);
    }

    /**
     * received/remaining/sold per variant for one receiving document
     * (e.g. one Direct Purchase or Purchase Invoice) - the answer to "how
     * much of this invoice sold vs. remains", keyed by variant_id. Shared
     * by DirectPurchaseController::show() and the Supplier Payments detail
     * screen so both read the same batch ledger instead of two
     * independently-computed (and potentially drifting) versions.
     */
    public static function sellThroughByVariant(string $referenceType, int $referenceId, iterable $variantIds): \Illuminate\Support\Collection
    {
        $variantIds = collect($variantIds)->filter()->unique()->values();
        if ($variantIds->isEmpty()) {
            return collect();
        }

        return static::where('reference_type', $referenceType)
            ->where('reference_id', $referenceId)
            ->whereIn('variant_id', $variantIds)
            ->get()
            ->groupBy('variant_id')
            ->map(function ($group) {
                $received = (float) $group->sum('received_qty');
                $remaining = (float) $group->sum('remaining_qty');

                return [
                    'received_qty' => $received,
                    'remaining_qty' => $remaining,
                    'sold_qty' => $received - $remaining,
                ];
            });
    }
}
