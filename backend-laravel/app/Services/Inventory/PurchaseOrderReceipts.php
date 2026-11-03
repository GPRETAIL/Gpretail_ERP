<?php

namespace App\Services\Inventory;

use App\Enums\PurchaseOrderStatus;
use App\Models\PurchaseOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Goods received against a purchase order. A direct purchase names the PO it delivers; what its lines bring in is
 * counted against the PO's lines (same variant first, then any other line of the same product, since a purchase
 * line's variant is resolved from its own brand/size/colour). A fully received order closes itself, and reopens if
 * a receipt is later edited down or deleted. Temporary drafts are not receipts yet.
 */
class PurchaseOrderReceipts
{
    /** The approved order of this store and supplier that a direct purchase may be received against. */
    public function resolve(mixed $purchaseOrderId, int $storeId, mixed $supplierId, ?int $alreadyLinkedId = null): ?PurchaseOrder
    {
        if (! $purchaseOrderId) {
            return null;
        }
        $order = PurchaseOrder::where('store_id', $storeId)->find((int) $purchaseOrderId);
        if (! $order) {
            throw ValidationException::withMessages(['purchaseOrderId' => 'That purchase order is not in this store.']);
        }
        if ((int) $order->supplier_id !== (int) $supplierId) {
            throw ValidationException::withMessages(['purchaseOrderId' => "{$order->po_no} was ordered from a different supplier."]);
        }
        // A purchase already received against an order keeps that link when it is edited, whatever the order's
        // status now (closed by its own receipt, closed by hand, or cancelled); only a new link needs an open order.
        if ($order->status !== PurchaseOrderStatus::Approved->value && $order->id !== $alreadyLinkedId) {
            throw ValidationException::withMessages(['purchaseOrderId' => "{$order->po_no} is not an approved, open purchase order."]);
        }

        return $order;
    }

    public function sync(?int $purchaseOrderId): void
    {
        $order = $purchaseOrderId ? PurchaseOrder::find($purchaseOrderId) : null;
        if (! $order) {
            return;
        }
        $received = DB::table('direct_purchase_items as i')->join('direct_purchases as p', 'p.id', '=', 'i.direct_purchase_id')
            ->where('p.purchase_order_id', $order->id)
            ->where(fn ($q) => $q->whereNull('p.invoice_workflow_status')->orWhere('p.invoice_workflow_status', '!=', 'temporary'))
            ->selectRaw('i.product_id, i.variant_id, SUM(i.qty) as qty')->groupBy('i.product_id', 'i.variant_id')->get();
        $pool = []; // product => [variant => qty]
        foreach ($received as $row) {
            $pool[$row->product_id][$row->variant_id ?? ''] = ($pool[$row->product_id][$row->variant_id ?? ''] ?? 0) + (float) $row->qty;
        }

        $lines = $order->items()->orderBy('id')->get();
        $got = $lines->mapWithKeys(fn ($line) => [$line->id => 0.0])->all();
        // Exact variant first, then whatever else of the product arrived, up to each line's ordered quantity.
        foreach ([true, false] as $exact) {
            foreach ($lines as $line) {
                foreach ($pool[$line->product_id] ?? [] as $variant => $qty) {
                    if ($exact && (string) $variant !== (string) ($line->variant_id ?? '')) {
                        continue;
                    }
                    $take = min($qty, max(0, (float) $line->quantity - $got[$line->id]));
                    $got[$line->id] += $take;
                    $pool[$line->product_id][$variant] -= $take;
                }
            }
        }
        // More than was ordered still shows, on the product's last line.
        foreach ($lines->groupBy('product_id') as $productId => $productLines) {
            $extra = array_sum($pool[$productId] ?? []);
            if ($extra > 0.0005) {
                $got[$productLines->last()->id] += $extra;
            }
        }
        foreach ($lines as $line) {
            if (abs((float) $line->received_qty - $got[$line->id]) > 0.0005) {
                $line->forceFill(['received_qty' => round($got[$line->id], 3)])->save();
            }
        }

        $complete = $lines->isNotEmpty() && $lines->every(fn ($line) => (float) $line->quantity <= $got[$line->id] + 0.0005);
        if ($complete && $order->status === PurchaseOrderStatus::Approved->value) {
            $order->update(['status' => PurchaseOrderStatus::Closed->value, 'closed_at' => now(), 'close_reason' => 'RECEIVED']);
        } elseif (! $complete && $order->status === PurchaseOrderStatus::Closed->value && $order->close_reason === 'RECEIVED') {
            $order->update(['status' => PurchaseOrderStatus::Approved->value, 'closed_at' => null, 'close_reason' => null]);
        }
    }
}
