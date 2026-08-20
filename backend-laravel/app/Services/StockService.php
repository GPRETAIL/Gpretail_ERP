<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Stock;
use App\Models\StockTransaction;
use Illuminate\Support\Facades\DB;

/**
 * The single place every warehouse controller should go through to change
 * a stock quantity. Before this existed, DirectPurchase/InventoryEntry/
 * PurchaseInvoice/PurchaseReturn/StockOutward each hand-rolled their own
 * slightly-different version of "read quantity, add/subtract, save" with
 * no row lock (a race under concurrent requests could silently lose an
 * update) and inconsistent (or missing) audit-trail logging. Routing every
 * call through here fixes both at once, and keeps `available_quantity`
 * (quantity - allocated_quantity) in sync, which nothing previously did.
 */
class StockService
{
    /**
     * Apply $delta (positive = stock in, negative = stock out) to the
     * store+product(+variant) stock row, inside its own locked transaction,
     * and record one StockTransaction audit row for it. Throws
     * InsufficientStockException instead of allowing quantity to go
     * negative - callers should catch it and return a 422.
     */
    public function adjust(
        int $storeId,
        int $productId,
        ?int $variantId,
        float $delta,
        string $referenceType,
        ?int $referenceId,
        float $costPrice = 0,
        ?int $userId = null,
    ): Stock {
        return DB::transaction(function () use ($storeId, $productId, $variantId, $delta, $referenceType, $referenceId, $costPrice, $userId) {
            $stock = $this->lockOrCreateStock($storeId, $productId, $variantId);

            return $this->applyDelta($stock, $delta, $referenceType, $referenceId, $costPrice, $userId);
        });
    }

    /**
     * Set the stock row to an absolute counted quantity (physical stock
     * audits count what's actually on the shelf, not "add/remove N") rather
     * than accepting a caller-computed delta - computing target-minus-
     * current outside this method's own lock would leave a gap where a
     * concurrent change could be silently overwritten by a stale count.
     * Locks and computes the delta from the current row itself, then
     * shares the exact same apply-and-log path as adjust().
     */
    public function setAbsolute(
        int $storeId,
        int $productId,
        ?int $variantId,
        float $targetQuantity,
        string $referenceType,
        ?int $referenceId,
        float $costPrice = 0,
        ?int $userId = null,
    ): Stock {
        return DB::transaction(function () use ($storeId, $productId, $variantId, $targetQuantity, $referenceType, $referenceId, $costPrice, $userId) {
            $stock = $this->lockOrCreateStock($storeId, $productId, $variantId);
            $delta = $targetQuantity - (float) $stock->quantity;

            return $this->applyDelta($stock, $delta, $referenceType, $referenceId, $costPrice, $userId);
        });
    }

    /** Must be called from inside a transaction - see adjust()/setAbsolute(). */
    private function lockOrCreateStock(int $storeId, int $productId, ?int $variantId): Stock
    {
        $stock = Stock::where('store_id', $storeId)
            ->where('product_id', $productId)
            ->where('variant_id', $variantId)
            ->lockForUpdate()
            ->first();

        if ($stock) {
            return $stock;
        }

        // Create-then-lock: a plain create() isn't covered by the
        // lockForUpdate() above (it runs before the row exists), but since
        // we're already inside this transaction no other caller can see or
        // touch this row until we commit, so a fresh SELECT ... FOR UPDATE
        // here is just for consistency, not strictly required for safety.
        $stock = Stock::create([
            'store_id' => $storeId,
            'product_id' => $productId,
            'variant_id' => $variantId,
            'quantity' => 0,
            'allocated_quantity' => 0,
            'available_quantity' => 0,
        ]);

        return Stock::where('id', $stock->id)->lockForUpdate()->first();
    }

    /** Must be called on a $stock already locked by lockOrCreateStock() in the current transaction. */
    private function applyDelta(
        Stock $stock,
        float $delta,
        string $referenceType,
        ?int $referenceId,
        float $costPrice,
        ?int $userId,
    ): Stock {
        $before = (float) $stock->quantity;
        $after = $before + $delta;

        if ($after < -0.0005) {
            throw new InsufficientStockException((int) $stock->product_id, $before, -$delta);
        }
        $after = max(0, $after);

        $stock->quantity = $after;
        $stock->available_quantity = $after - (float) $stock->allocated_quantity;
        $stock->save();

        StockTransaction::create([
            'store_id' => $stock->store_id,
            'product_id' => $stock->product_id,
            'variant_id' => $stock->variant_id,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'type' => $delta >= 0 ? 'IN' : 'OUT',
            'quantity' => abs($delta),
            'before_qty' => $before,
            'after_qty' => $after,
            'cost_price' => $costPrice,
            'created_by' => $userId,
        ]);

        return $stock;
    }
}
