<?php

namespace App\Services\Accounting;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Closing stock at cost (FIFO) for the Trading account and Balance Sheet. The quantity on hand at
 * the end of a past day comes from the stock movement log; under FIFO what is left is the most recently
 * received stock, so it is valued from the newest batches received by then. Stock with no batch
 * (product-level stock, or older than batch tracking) is valued at the item's cost price.
 */
class StockValuation
{
    public static function at(int $storeId, string $date): float
    {
        $until = Carbon::parse($date, config('app.business_timezone'))->endOfDay()->setTimezone(config('app.timezone'))->toDateTimeString();
        $key = fn ($row) => $row->variant_id ? 'v'.$row->variant_id : 'p'.$row->product_id;

        $quantities = [];
        foreach (DB::table('stocks')->where('store_id', $storeId)->get(['product_id', 'variant_id', 'quantity', 'created_at']) as $stock) {
            // No movement logged at all: count today's quantity if the row existed by then.
            $quantities[$key($stock)] = ['product_id' => $stock->product_id, 'variant_id' => $stock->variant_id,
                'qty' => $stock->created_at <= $until ? (float) $stock->quantity : 0];
        }
        // Today or later: the live stock quantities are authoritative (the same figures the stock
        // screens show). Earlier dates are rebuilt from the movement log.
        $isPast = $date < Carbon::now(config('app.business_timezone'))->toDateString();
        $movements = fn (string $op, string $pick) => ! $isPast ? collect() : DB::table('stock_transactions')->whereIn('id', DB::table('stock_transactions')
            ->where('store_id', $storeId)->where('created_at', $op, $until)->groupBy('product_id', 'variant_id')->selectRaw("$pick(id)"))
            ->get(['product_id', 'variant_id', 'before_qty', 'after_qty']);
        foreach ($movements('>', 'MIN') as $first) { // The quantity just before the first later movement.
            $quantities[$key($first)] = ['product_id' => $first->product_id, 'variant_id' => $first->variant_id, 'qty' => (float) $first->before_qty];
        }
        foreach ($movements('<=', 'MAX') as $last) { // Or right after the last movement by then.
            $quantities[$key($last)] = ['product_id' => $last->product_id, 'variant_id' => $last->variant_id, 'qty' => (float) $last->after_qty];
        }
        $quantities = array_filter($quantities, fn ($row) => $row['qty'] > 0);
        if (! $quantities) {
            return 0.0;
        }

        $batches = DB::table('stock_batches')->where('store_id', $storeId)->where('received_at', '<=', $until)
            ->orderByDesc('received_at')->orderByDesc('id')->get(['variant_id', 'received_qty', 'cost_price'])->groupBy('variant_id');
        $variantCost = DB::table('product_variants')->whereIn('id', array_filter(array_column($quantities, 'variant_id')))->pluck('cost_price', 'id');
        $productCost = DB::table('products')->whereIn('id', array_column($quantities, 'product_id'))->pluck('cost_price', 'id');

        $value = 0.0;
        foreach ($quantities as $row) {
            $left = $row['qty'];
            foreach ($row['variant_id'] ? ($batches[$row['variant_id']] ?? []) : [] as $batch) {
                $take = min($left, (float) $batch->received_qty);
                $value += $take * (float) $batch->cost_price;
                if (($left -= $take) <= 0) {
                    break;
                }
            }
            if ($left > 0) {
                $value += $left * (float) (($row['variant_id'] ? ($variantCost[$row['variant_id']] ?? 0) : 0) ?: ($productCost[$row['product_id']] ?? 0));
            }
        }

        return round($value, 2);
    }
}
