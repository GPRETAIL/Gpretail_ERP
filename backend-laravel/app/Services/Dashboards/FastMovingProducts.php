<?php

namespace App\Services\Dashboards;

use App\Support\BusinessDay;
use App\Services\Tenancy\StoreQuery;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard > Fast Moving Products, in full: for each product sold in a period, how much came in (purchases, inventory
 * entries, transfers) and when, how much went out (POS and dealer sales, less returns) and when, what is left, and how
 * quickly it sells. Everything comes from the stock movement log, so edits and cancellations (which log the reverse
 * movement) are already netted out. Store-scoped through StoreQuery.
 */
class FastMovingProducts
{
    private const SOLD = ['POS_SALE', 'DEALER_INVOICE'];

    private const RETURNED = ['POS_RETURN', 'DEALER_RETURN'];

    /** Stock that came in to be sold: bought, entered or received from another store (less purchase returns). */
    private const BOUGHT = ['PURCHASE_INVOICE', 'DIRECT_PURCHASE', 'INVENTORY_ENTRY', 'SUPPLIER_BILL', 'PURCHASE_RETURN', 'STORE_TRANSFER', 'TRANSFER'];

    /**
     * @return array{from: string, to: string, days: int, rows: array<int, array<string, mixed>>}
     */
    public function report(string $from, string $to, ?string $search = null, int $limit = 100): array
    {
        $tz = config('app.business_timezone');
        $start = Carbon::parse($from, $tz)->startOfDay()->utc();
        $end = Carbon::parse($to, $tz)->endOfDay()->utc();
        $days = max(1, (int) Carbon::parse($from)->diffInDays(Carbon::parse($to)) + 1);
        $in = fn (array $types) => "'".implode("','", $types)."'";

        $moves = StoreQuery::table('stock_transactions as st')
            ->whereBetween('st.created_at', BusinessDay::range($start->toDateTimeString(), $end->toDateTimeString()))
            ->whereIn('st.reference_type', [...self::SOLD, ...self::RETURNED, ...self::BOUGHT])
            ->when($search, fn ($q) => $q->whereIn('st.product_id', DB::table('products')->where(fn ($p) => $p->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%"))->select('id')))
            ->groupBy('st.product_id')
            ->selectRaw('st.product_id,
                SUM(CASE WHEN st.reference_type IN ('.$in(self::SOLD).') THEN st.before_qty - st.after_qty ELSE 0 END) as sold,
                SUM(CASE WHEN st.reference_type IN ('.$in(self::RETURNED).') THEN st.after_qty - st.before_qty ELSE 0 END) as returned,
                SUM(CASE WHEN st.reference_type IN ('.$in(self::BOUGHT).') THEN st.after_qty - st.before_qty ELSE 0 END) as bought,
                MIN(CASE WHEN st.reference_type IN ('.$in(self::SOLD).") AND st.type = 'OUT' THEN st.created_at END) as first_sold,
                MAX(CASE WHEN st.reference_type IN (".$in(self::SOLD).") AND st.type = 'OUT' THEN st.created_at END) as last_sold")
            ->get()
            ->map(fn ($r) => (object) [...(array) $r, 'net_sold' => round((float) $r->sold - (float) $r->returned, 3)])
            ->filter(fn ($r) => $r->net_sold > 0)
            ->sortByDesc('net_sold')->take($limit)->values();
        if ($moves->isEmpty()) {
            return ['from' => $from, 'to' => $to, 'days' => $days, 'rows' => []];
        }

        $ids = $moves->pluck('product_id')->all();
        $products = DB::table('products as p')->leftJoin('categories as c', 'c.id', '=', 'p.category_id')->leftJoin('brands as b', 'b.id', '=', 'p.brand_id')
            ->whereIn('p.id', $ids)->get(['p.id', 'p.name', 'p.code', 'c.name as category', 'b.name as brand'])->keyBy('id');
        $balance = StoreQuery::table('stocks')->whereIn('product_id', $ids)->groupBy('product_id')->selectRaw('product_id, SUM(quantity) as qty')->pluck('qty', 'product_id');
        // When stock last came in, whatever the period: "last purchased on".
        $received = StoreQuery::table('stock_transactions')->whereIn('product_id', $ids)->whereIn('reference_type', self::BOUGHT)->where('type', 'IN')
            ->groupBy('product_id')->selectRaw('product_id, MIN(created_at) as first_in, MAX(created_at) as last_in')->get()->keyBy('product_id');
        $age = $this->daysToSell($ids, $start, $end);

        return ['from' => $from, 'to' => $to, 'days' => $days, 'rows' => $moves->map(function ($r) use ($products, $balance, $received, $age, $days) {
            $left = round((float) ($balance[$r->product_id] ?? 0), 3);
            $perDay = $r->net_sold / $days;
            $product = $products[$r->product_id] ?? null;

            return [
                'product_id' => (int) $r->product_id, 'name' => $product->name ?? 'Product #'.$r->product_id, 'code' => $product->code ?? null,
                'category' => $product->category ?? null, 'brand' => $product->brand ?? null,
                'bought' => round((float) $r->bought, 3), 'sold' => round((float) $r->sold, 3), 'returned' => round((float) $r->returned, 3),
                'net_sold' => $r->net_sold, 'balance' => $left,
                'first_received' => $this->day($received[$r->product_id]->first_in ?? null), 'last_received' => $this->day($received[$r->product_id]->last_in ?? null),
                'first_sold' => $this->day($r->first_sold), 'last_sold' => $this->day($r->last_sold),
                'per_day' => round($perDay, 2),
                'sell_through' => round($r->net_sold / max(0.001, $r->net_sold + max(0, $left)) * 100, 1),
                'days_of_stock' => $left > 0 ? (int) ceil($left / $perDay) : 0,
                'avg_days_to_sell' => $age[$r->product_id] ?? null,
                'movement' => $this->movement($perDay, $left),
            ];
        })->all()];
    }

    /** Average days between a unit arriving (its FIFO batch) and being sold, for sales in the period; weighted by quantity. */
    private function daysToSell(array $productIds, Carbon $start, Carbon $end): array
    {
        $rows = StoreQuery::table('stock_transactions as st')
            ->join('stock_batch_allocations as a', 'a.stock_transaction_id', '=', 'st.id')
            ->join('stock_batches as b', 'b.id', '=', 'a.stock_batch_id')
            ->whereIn('st.product_id', $productIds)->whereIn('st.reference_type', self::SOLD)->where('st.type', 'OUT')
            ->whereBetween('st.created_at', BusinessDay::range($start->toDateTimeString(), $end->toDateTimeString()))
            ->get(['st.product_id', 'st.created_at as sold_at', 'b.received_at', 'a.quantity']);

        return $rows->groupBy('product_id')->map(function (Collection $group) {
            $qty = $group->sum(fn ($r) => (float) $r->quantity);
            $days = $group->sum(fn ($r) => (float) $r->quantity * max(0, Carbon::parse($r->received_at)->diffInDays(Carbon::parse($r->sold_at))));

            return $qty > 0 ? round($days / $qty, 1) : null;
        })->all();
    }

    /** Fast: sells a unit a day or more, or stock lasts under a month at this pace; slow: stock lasts over three months. */
    private function movement(float $perDay, float $left): string
    {
        $cover = $perDay > 0 ? $left / $perDay : INF;

        return match (true) {
            $perDay >= 1 || $cover <= 30 => 'Fast',
            $cover <= 90 => 'Medium',
            default => 'Slow',
        };
    }

    private function day(?string $stamp): ?string
    {
        return $stamp ? Carbon::parse($stamp, 'UTC')->setTimezone(config('app.business_timezone'))->toDateString() : null;
    }
}
