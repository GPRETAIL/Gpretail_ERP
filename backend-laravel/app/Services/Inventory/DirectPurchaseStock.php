<?php

namespace App\Services\Inventory;

use App\Models\Barcode;
use App\Models\DirectPurchase;

/**
 * A direct purchase's goods go into stock once they are labelled: real barcodes exist and the entry is not a
 * Temporary draft. Called after the purchase is saved and after its barcodes are generated, so stock no longer
 * depends on which status the barcode screen's Save sends. stock_applied makes it happen only once.
 */
class DirectPurchaseStock
{
    public function __construct(private readonly StockService $stockService) {}

    public function applyIfReady(DirectPurchase $purchase, ?int $userId = null): bool
    {
        $purchase->refresh();
        if ($purchase->stock_applied || $purchase->invoice_workflow_status === 'temporary') {
            return false;
        }

        // A PACK/CUT repeat purchase never gets its OWN barcode row (BarcodeController::generate() reuses the
        // variant's existing one), so also count a purchase as labelled when every item's variant already has
        // an active barcode.
        $items = $purchase->items()->get();
        $labelled = $purchase->barcodes()->exists()
            || ($items->isNotEmpty() && $items->every(
                fn ($item) => $item->variant_id && Barcode::where('variant_id', $item->variant_id)->where('is_active', true)->exists()
            ));
        if (! $labelled) {
            return false;
        }

        foreach ($items as $item) {
            $this->stockService->adjust(
                storeId: (int) $purchase->store_id,
                productId: (int) $item->product_id,
                variantId: $item->variant_id ? (int) $item->variant_id : null,
                delta: (float) $item->qty,
                referenceType: 'DIRECT_PURCHASE',
                referenceId: $purchase->id,
                costPrice: (float) $item->cost,
                userId: $userId,
            );
        }
        $purchase->update(['stock_applied' => true]);

        return true;
    }
}
