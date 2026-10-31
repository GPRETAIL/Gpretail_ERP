<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Reorder engine. For every stocked item (each size/design variant) of a store whose available stock
 * has fallen to the item's Auto PO Min (else Re-Order Min), it suggests ordering up to Auto PO Max
 * (else Re-Order Max), less what is already on open purchase orders, so a shortage is never ordered
 * twice. The supplier is the item's preferred supplier, else the one it was last bought from.
 * Everything is filtered to one store explicitly, so it runs the same in a request and in the
 * nightly console job.
 */
class ReorderService
{
    /** @return Collection<int, array<string, mixed>> */
    public function suggestions(int $storeId): Collection
    {
        $stocks = DB::table('stocks')->where('store_id', $storeId)->get(['product_id', 'variant_id', 'available_quantity']);
        if ($stocks->isEmpty()) {
            return collect();
        }
        $products = Product::withoutGlobalScopes()->where('company_id', $storeId)->whereIn('id', $stocks->pluck('product_id')->unique())->get()->keyBy('id');
        $variants = ProductVariant::withoutGlobalScopes()->with(['size' => fn ($q) => $q->withoutGlobalScopes()])
            ->whereIn('id', $stocks->pluck('variant_id')->filter()->unique())->get()->keyBy('id');
        $onOrder = DB::table('purchase_order_items as i')->join('purchase_orders as o', 'o.id', '=', 'i.purchase_order_id')
            ->where('o.store_id', $storeId)->whereIn('o.status', PurchaseOrder::OPEN)
            ->selectRaw('i.product_id, i.variant_id, SUM(i.quantity) as qty')->groupBy('i.product_id', 'i.variant_id')->get()
            ->keyBy(fn ($row) => $row->product_id.':'.($row->variant_id ?? ''));
        $suppliers = $this->suppliers($storeId, $products);

        return $stocks->map(function ($stock) use ($products, $variants, $onOrder, $suppliers) {
            $product = $products->get($stock->product_id);
            if (! $product || $this->truthy($product->master_details['disable_po'] ?? null)) {
                return null;
            }
            $details = $product->master_details ?? [];
            $min = $this->number($details['auto_po_min'] ?? null) ?: $this->number($product->min_stock);
            $max = $this->number($details['auto_po_max'] ?? null) ?: $this->number($product->max_stock);
            $available = (float) $stock->available_quantity;
            if ($min <= 0 || $available > $min) {
                return null;
            }
            $target = max($max, $min);
            $ordered = (float) ($onOrder->get($stock->product_id.':'.($stock->variant_id ?? ''))->qty ?? 0);
            $suggested = round($target - $available - $ordered, 3);
            if ($suggested <= 0) {
                return null;
            }
            $variant = $stock->variant_id ? $variants->get($stock->variant_id) : null;
            $supplier = $suppliers[$product->id] ?? null;

            return [
                'product_id' => $product->id, 'variant_id' => $stock->variant_id, 'product_name' => $product->name, 'product_code' => $product->code,
                'size' => $variant?->size?->name, 'design_no' => $variant?->design_no,
                'available' => $available, 'reorder_min' => $min, 'reorder_max' => $target, 'on_order' => $ordered, 'suggested' => $suggested,
                'unit_cost' => (float) ($variant && (float) $variant->cost_price > 0 ? $variant->cost_price : $product->cost_price),
                'supplier_id' => $supplier?->id, 'supplier_name' => $supplier?->name,
            ];
        })->filter()->values();
    }

    /**
     * Drafts one purchase order per supplier from the current suggestions (an "Unassigned" draft for
     * items with no known supplier). Returns the drafts created.
     *
     * @return Collection<int, PurchaseOrder>
     */
    public function generate(int $storeId, ?int $userId = null): Collection
    {
        $created = $this->suggestions($storeId)->groupBy(fn ($line) => $line['supplier_id'] ?? 0)->map(function (Collection $lines, $supplierId) use ($storeId, $userId) {
            return DB::transaction(function () use ($lines, $supplierId, $storeId, $userId) {
                $order = PurchaseOrder::create([
                    'store_id' => $storeId, 'po_no' => DocumentNumberService::next($storeId, 'PO'), 'supplier_id' => $supplierId ?: null,
                    'po_date' => now()->toDateString(), 'status' => 'DRAFT', 'source' => 'AUTO', 'created_by' => $userId,
                    'notes' => 'Drafted by the reorder engine. Review the quantities, then approve.',
                ]);
                foreach ($lines as $line) {
                    PurchaseOrderItem::create([
                        'purchase_order_id' => $order->id, 'product_id' => $line['product_id'], 'variant_id' => $line['variant_id'],
                        'quantity' => $line['suggested'], 'unit_cost' => $line['unit_cost'], 'amount' => round($line['suggested'] * $line['unit_cost'], 2),
                        'stock_at_order' => $line['available'], 'reorder_min' => $line['reorder_min'], 'reorder_max' => $line['reorder_max'],
                    ]);
                }
                $order->refreshTotals();

                return $order;
            });
        })->values();

        if ($created->isNotEmpty()) {
            Notification::create(['type' => 'PURCHASE_ORDER_DRAFTS', 'title' => 'Purchase orders to review',
                'message' => $created->count().' draft purchase order(s) were prepared for items at or below their reorder level.',
                'link' => '/store/purchase-order', 'reference_type' => 'PURCHASE_ORDER', 'store_id' => $storeId]);
        }

        return $created;
    }

    /** @return array<int, Supplier> product id => preferred supplier, else the last one it was bought from */
    private function suppliers(int $storeId, Collection $products): array
    {
        $ids = $products->keys()->all();
        $bought = DB::table('direct_purchase_items as i')->join('direct_purchases as p', 'p.id', '=', 'i.direct_purchase_id')
            ->where('p.store_id', $storeId)->whereNotNull('p.supplier_id')->whereIn('i.product_id', $ids)
            ->get(['i.product_id', 'p.supplier_id', 'p.purchase_date as at', 'p.id as seq'])
            ->concat(DB::table('inventory_entries')->where('store_id', $storeId)->whereNotNull('supplier_id')->whereIn('product_id', $ids)
                ->get(['product_id', 'supplier_id', 'entry_date as at', 'id as seq']))
            ->sortBy(fn ($row) => [(string) $row->at, (int) $row->seq])
            ->pluck('supplier_id', 'product_id')->all(); // Later rows overwrite earlier: the last purchase wins.

        $chosen = [];
        foreach ($products as $product) {
            $chosen[$product->id] = (int) ($product->master_details['preferred_supplier_id'] ?? 0) ?: ($bought[$product->id] ?? null);
        }
        $known = Supplier::withoutGlobalScopes()->where('store_id', $storeId)->whereIn('id', array_filter($chosen))->get()->keyBy('id');

        return array_map(fn ($id) => $id ? $known->get($id) : null, $chosen);
    }

    private function number(mixed $value): float
    {
        return is_numeric($value) ? (float) $value : 0.0;
    }

    private function truthy(mixed $value): bool
    {
        return in_array(is_string($value) ? strtolower(trim($value)) : $value, [true, 1, '1', 'yes', 'true', 'y'], true);
    }
}
