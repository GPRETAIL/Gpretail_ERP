<?php

namespace App\Services\Inventory;

use App\Models\Barcode;
use App\Models\InventoryEntry;
use App\Models\PurchaseInvoice;
use App\Models\Stock;
use App\Models\TransportEntry;
use Illuminate\Support\Collection;

/**
 * Warehouse > Item Locator: every printed barcode of the selected store with where it came from (LR inward
 * through an inventory entry, or a direct purchase), its product details and prices, and the live stock of its
 * product/variant with the bin it is kept in. Store scope comes from the models' global scope.
 */
class ItemLocatorService
{
    /** Most rows one request returns; the screen filters them in the browser. */
    public const MAX_ROWS = 5000;

    /** @return list<array<string, mixed>> */
    public function rows(bool $inStockOnly = true): array
    {
        $barcodes = Barcode::with([
            'product:id,name,hsn_code',
            'variant',
            'inventoryItem:id,unit_price,size,design_no',
            'directPurchaseItem:id,cost_price',
            'directPurchase:id,company_id,company_name,supplier_id,supplier_name,invoice_no,purchase_date,total_amount,lr_no,retail_location',
            'directPurchase.company:id,name',
            'directPurchase.supplier:id,name',
        ])->where('is_active', true)->orderByDesc('id')->limit(self::MAX_ROWS)->get();

        $entries = InventoryEntry::with(['brand:id,name', 'supplier:id,name', 'color:id,name', 'material:id,name', 'pattern:id,name',
            'style:id,name', 'sleeve:id,name', 'fit:id,name', 'type:id,name'])
            ->whereIn('id', $barcodes->pluck('inventory_entry_id')->filter()->unique())->get()->keyBy('id');
        $transports = TransportEntry::with(['company:id,name', 'supplier:id,name'])
            ->whereIn('id', $entries->pluck('transport_entry_id')->filter()->unique())->get()->keyBy('id');
        $invoices = PurchaseInvoice::whereIn('id', $entries->pluck('invoice_id')->filter()->unique())
            ->get(['id', 'invoice_no', 'invoice_date', 'grand_total'])->keyBy('id');
        $stocks = $this->stocks($barcodes);

        $rows = [];
        foreach ($barcodes as $barcode) {
            $stock = $stocks[$barcode->product_id.'-'.($barcode->variant_id ?? '')] ?? null;
            $available = (float) ($stock?->available_quantity ?? 0);
            if ($inStockOnly && $available <= 0) {
                continue;
            }
            $entry = $entries[$barcode->inventory_entry_id] ?? null;
            $transport = $entry ? ($transports[$entry->transport_entry_id] ?? null) : null;
            $invoice = $entry ? ($invoices[$entry->invoice_id] ?? null) : null;
            $purchase = $barcode->directPurchase;
            $name = fn ($related) => $related?->name ?: '-';
            // Read the loaded relation, not a column of the same name (inventory_entries has a `type` column).
            $attribute = fn (string $relation) => $entry && $entry->relationLoaded($relation) ? $name($entry->getRelation($relation)) : '-';

            $rows[] = [
                'id' => $barcode->id,
                'barcode' => $barcode->barcode ?: '-',
                'batch' => $barcode->batch_no ?: '-',
                'source' => $purchase ? 'Direct Purchase' : ($transport ? 'LR Inward' : ($entry ? 'Inventory Entry' : '-')),
                'company' => $transport?->company?->name ?: ($purchase?->company?->name ?: ($purchase?->company_name ?: '-')),
                'supplier' => $transport?->supplier?->name ?: ($purchase?->supplier?->name ?: ($purchase?->supplier_name ?: $attribute('supplier'))),
                'product' => $barcode->product_name ?: $name($barcode->product),
                'brand' => $attribute('brand'),
                'colour' => $barcode->color_name ?: $attribute('color'),
                'material' => $attribute('material'),
                'pattern' => $attribute('pattern'),
                'style' => $attribute('style'),
                'sleeve' => $attribute('sleeve'),
                'fit' => $attribute('fit'),
                'type' => $attribute('type'),
                'size' => $barcode->size ?: ($barcode->inventoryItem?->size ?: '-'),
                'section' => $stock?->location_bin ?: ($purchase?->retail_location ?: '-'),
                'design' => $barcode->design_no ?: ($barcode->inventoryItem?->design_no ?: '-'),
                'hsn' => $entry?->hsn_code ?: ($barcode->product?->hsn_code ?: '-'),
                'invoiceNo' => $invoice?->invoice_no ?: ($purchase?->invoice_no ?: '-'),
                'billDate' => $invoice?->invoice_date ?? $purchase?->purchase_date,
                'billValue' => (float) ($invoice?->grand_total ?? $purchase?->total_amount ?? 0),
                'lrNo' => $transport?->lr_no ?: ($purchase?->lr_no ?: '-'),
                'qty' => $available,
                'stock' => $available,
                'cost' => (float) ($barcode->directPurchaseItem?->cost_price ?? $barcode->inventoryItem?->unit_price ?? 0),
                'sale' => (float) $barcode->selling_price,
                'net' => (float) ($barcode->final_price ?: $barcode->selling_price),
                'price' => (float) ($barcode->final_price ?: $barcode->selling_price),
            ];
        }

        return $rows;
    }

    /** @return Collection<string, Stock> keyed "product-variant" */
    private function stocks(Collection $barcodes): Collection
    {
        return Stock::whereIn('product_id', $barcodes->pluck('product_id')->filter()->unique())
            ->get(['product_id', 'variant_id', 'available_quantity', 'location_bin'])
            ->keyBy(fn (Stock $stock) => $stock->product_id.'-'.($stock->variant_id ?? ''));
    }
}
