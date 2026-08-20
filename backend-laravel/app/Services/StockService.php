<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Stock;
use App\Models\StockBatch;
use App\Models\StockBatchAllocation;
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

        $transaction = StockTransaction::create([
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

        if ($stock->variant_id && abs($delta) > 0.0005) {
            if ($delta > 0) {
                StockBatch::create([
                    'variant_id' => $stock->variant_id,
                    'store_id' => $stock->store_id,
                    'reference_type' => $referenceType,
                    'reference_id' => $referenceId,
                    'received_qty' => $delta,
                    'remaining_qty' => $delta,
                    'cost_price' => $costPrice,
                    'received_at' => now(),
                ]);
            } else {
                $this->depleteBatches((int) $stock->variant_id, (int) $stock->store_id, abs($delta), $transaction->id, $referenceType, $referenceId);
            }
        }

        return $stock;
    }

    /**
     * FIFO sell-through ledger for a variant's OUT movement. If this exact
     * document previously created a batch (e.g. a Direct Purchase being
     * edited/deleted after its stock was applied), that batch is unwound
     * first - it's the same document undoing its own receipt, not a new
     * sale - before falling back to oldest-batch-first for any remainder.
     */
    private function depleteBatches(
        int $variantId,
        int $storeId,
        float $qty,
        int $transactionId,
        string $referenceType,
        ?int $referenceId,
    ): void {
        $remaining = $qty;

        $ownBatch = StockBatch::where('variant_id', $variantId)
            ->where('store_id', $storeId)
            ->where('reference_type', $referenceType)
            ->where('reference_id', $referenceId)
            ->where('remaining_qty', '>', 0)
            ->lockForUpdate()
            ->first();

        if ($ownBatch) {
            $remaining = $this->depleteBatch($ownBatch, $remaining, $transactionId);
        }

        if ($remaining <= 0.0005) {
            return;
        }

        // received_at alone isn't a strict order - two batches created in
        // the same second (common for back-to-back purchase entries) tie,
        // so id (always insertion-ordered) breaks the tie deterministically.
        $batches = StockBatch::where('variant_id', $variantId)
            ->where('store_id', $storeId)
            ->where('remaining_qty', '>', 0)
            ->orderBy('received_at')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($batches as $batch) {
            if ($remaining <= 0.0005) {
                break;
            }
            $remaining = $this->depleteBatch($batch, $remaining, $transactionId);
        }

        // If $remaining > 0 here, open batches don't fully cover this OUT
        // movement (e.g. stock predates batch-tracking) - the aggregate
        // stocks.quantity check in applyDelta() already guards against the
        // OUT itself being invalid, so this is just untracked older stock.
    }

    private function depleteBatch(StockBatch $batch, float $remaining, int $transactionId): float
    {
        $take = min($remaining, (float) $batch->remaining_qty);
        if ($take <= 0) {
            return $remaining;
        }

        $batch->remaining_qty = (float) $batch->remaining_qty - $take;
        $batch->save();

        StockBatchAllocation::create([
            'stock_batch_id' => $batch->id,
            'stock_transaction_id' => $transactionId,
            'quantity' => $take,
        ]);

        return $remaining - $take;
    }
}
