<?php

namespace App\Services\Pos;

use App\Exceptions\PosReturnNotReturnableException;
use App\Models\Barcode;
use App\Models\PosReturn;
use App\Models\PosReturnItem;
use App\Models\PosSaleItem;
use App\Services\Approvals\ApprovalService;
use App\Services\Documents\DocumentNumberService;
use App\Services\Inventory\StockService;
use App\Services\Sales\BusinessDate;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Writes a POS return: the returnable quantity is checked against the original bill, the refund is what the customer
 * actually paid for those units, and the stock comes back. Used by POS Return and by POS Old's exchange.
 */
class PosReturnWriter
{
    public function __construct(private readonly StockService $stockService) {}

    /**
     * @param  array{standalone?: bool, sourcePosSaleId?: int|null, items: list<array>, customerId?: int|null,
     *     refundMode?: string, returnReasonId?: int|null, returnReasonName?: string|null, approvalToken?: string|null}  $input
     *
     * @throws PosReturnNotReturnableException when an item is not (or no longer) returnable from the bill
     */
    public function write(Request $request, int $storeId, array $input): PosReturn
    {
        $sourcePosSaleId = $input['sourcePosSaleId'] ?? null;
        $standalone = (bool) ($input['standalone'] ?? false) || ! $sourcePosSaleId;
        $itemsData = $input['items'];

        // Recompute each item's returnable ceiling server-side - never trust the client's maxQty for a return
        // against a real sale.
        $saleLines = collect();
        if (! $standalone) {
            // A product can sit on several lines of one bill; return against their combined totals.
            $saleLines = PosSaleItem::where('pos_sale_id', $sourcePosSaleId)->get()->groupBy('product_id')
                ->map(fn ($lines) => [
                    'quantity' => (float) $lines->sum('quantity'),
                    'price' => (float) $lines->first()->selling_price,
                    'tax_rate' => (float) $lines->first()->tax_rate,
                    'discount' => (float) $lines->sum('discount'),
                    'tax_amount' => (float) $lines->sum('tax_amount'),
                    'paid' => (float) $lines->sum('subtotal'),
                ]);

            foreach ($itemsData as $item) {
                $qty = (float) ($item['qty'] ?? 1);
                $originalQty = (float) ($saleLines->get($item['productId'])['quantity'] ?? 0);
                $alreadyReturned = (float) PosReturnItem::where('product_id', $item['productId'])
                    ->whereHas('posReturn', fn ($q) => $q->where('pos_sale_id', $sourcePosSaleId))
                    ->sum('quantity');
                $remaining = max(0, $originalQty - $alreadyReturned);

                if ($qty > $remaining + 0.0001) {
                    throw new PosReturnNotReturnableException("Cannot return {$qty} of this item: only {$remaining} remains returnable from this bill.");
                }
            }
        }

        // Refund what the customer actually paid: a bill line's discount and tax are shared out by quantity, so
        // returning 1 of 3 refunds a third of the discounted, taxed line.
        $refundLines = array_map(function (array $item) use ($saleLines) {
            $qty = (float) ($item['qty'] ?? 1);
            $sold = $saleLines->get($item['productId']);
            if ($sold && $sold['quantity'] > 0) {
                $share = $qty / $sold['quantity'];
                $discount = round($sold['discount'] * $share, 2);
                $taxAmount = round($sold['tax_amount'] * $share, 2);
                $paid = $sold['paid'] > 0
                    ? round($sold['paid'] * $share, 2)
                    : round($qty * $sold['price'] - $discount + $taxAmount, 2);

                return [$item, $qty, $sold['price'], $sold['tax_rate'], $discount, $taxAmount, $paid];
            }
            $price = (float) ($item['price'] ?? 0);
            $taxRate = (float) ($item['tax'] ?? 0);
            $discount = round(max(0, (float) ($item['discount'] ?? 0)), 2);
            $base = max(0, $qty * $price - $discount);
            $taxAmount = round($base * $taxRate / 100, 2);

            return [$item, $qty, $price, $taxRate, $discount, $taxAmount, round($base + $taxAmount, 2)];
        }, $itemsData);

        return DB::transaction(function () use ($request, $storeId, $standalone, $sourcePosSaleId, $refundLines, $input) {
            $totalRefund = round(array_sum(array_column($refundLines, 6)), 2);
            // Refunds above the user's limit, or without the original bill, need an approval token.
            $approval = app(ApprovalService::class)->authorizeRefund($request->user(), $storeId, $totalRefund, $standalone, $input['approvalToken'] ?? null);
            // After the counter's cash closing, the return belongs to the next business date (as a bill would).
            $counterId = PosCounter::find($request->user()?->counter_id, $storeId)?->id;
            $business = app(BusinessDate::class)->forCounter($storeId, $counterId);
            $returnNo = DocumentNumberService::resolve($request, $storeId, 'RET', $business['shifted'] ? Carbon::parse($business['date']) : null);

            $posReturn = PosReturn::create([
                'store_id' => $storeId,
                // The till's counter, so a cash refund comes out of that counter's drawer at Cash Closing.
                'counter_id' => $counterId,
                'pos_sale_id' => $standalone ? null : $sourcePosSaleId,
                'customer_id' => $input['customerId'] ?? null,
                'return_no' => $returnNo,
                'return_date' => app(BusinessDate::class)->stamp($business),
                'billed_at' => now(),
                'total_refund' => $totalRefund,
                'refund_mode' => $input['refundMode'] ?? 'CASH',
                'status' => 'COMPLETED',
                'created_by' => $request->user()->id ?? 1,
                'return_reason_id' => $input['returnReasonId'] ?? null,
                'return_reason_name' => $input['returnReasonName'] ?? null,
                'standalone' => $standalone,
            ]);
            $approval?->forceFill(['status' => 'used', 'used_at' => now(), 'pos_return_id' => $posReturn->id])->save();

            foreach ($refundLines as [$item, $qty, $price, $taxRate, $discount, $taxAmount, $paid]) {
                $barcodeId = isset($item['barcodeId']) ? (int) $item['barcodeId'] : null;

                PosReturnItem::create([
                    'pos_return_id' => $posReturn->id,
                    'product_id' => $item['productId'],
                    'variant_id' => $item['variantId'] ?? null,
                    'barcode_id' => $barcodeId,
                    'quantity' => $qty,
                    'refund_price' => $price,
                    'subtotal' => $paid, // Like a sale line: after discount, tax included.
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'cost_price' => $item['cost'] ?? null,
                    'discount' => $discount,
                ]);

                // Locked, audited increment that also keeps available_quantity in sync.
                $this->stockService->adjust(
                    storeId: $storeId,
                    productId: (int) $item['productId'],
                    variantId: isset($item['variantId']) ? (int) $item['variantId'] : null,
                    delta: $qty,
                    referenceType: 'POS_RETURN',
                    referenceId: $posReturn->id,
                    costPrice: $price,
                    userId: $request->user()?->id,
                );

                // The unit's physical label is back on the shelf and sellable again - reactivate it (no-op for
                // PACK/CUT, whose shared barcode was never deactivated on sale).
                if ($barcodeId) {
                    Barcode::where('id', $barcodeId)->update(['is_active' => true]);
                }
            }

            return $posReturn;
        });
    }
}
