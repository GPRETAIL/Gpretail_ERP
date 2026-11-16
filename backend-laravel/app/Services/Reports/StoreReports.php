<?php

namespace App\Services\Reports;

use App\Services\Sales\IncentiveCalculator;
use App\Services\Tenancy\StoreQuery;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Sales Reports tabs that need their own data (stock batches, physical audits, loyalty redemptions, salesman
 * incentives). Every query goes through the store scope, so a store only ever sees its own rows.
 */
class StoreReports
{
    public const REPORTS = ['stock_aging', 'shelf_period', 'stock_audit', 'loyalty_redemptions', 'incentives'];

    private const AGE_BUCKETS = [30 => '0-30 days', 60 => '31-60 days', 90 => '61-90 days', 180 => '91-180 days'];

    public function rows(string $report): Collection
    {
        return match ($report) {
            'stock_aging' => $this->stockAging(),
            'shelf_period' => $this->shelfPeriod(),
            'stock_audit' => $this->stockAudit(),
            'loyalty_redemptions' => $this->loyaltyRedemptions(),
            'incentives' => $this->incentives(),
        };
    }

    /** Stock still on the shelf, batch by batch (FIFO receipts), with how long each has been there. */
    private function stockAging(): Collection
    {
        $today = CarbonImmutable::today();

        return $this->batches()->map(function ($row) use ($today) {
            $days = (int) CarbonImmutable::parse($row->received_at)->startOfDay()->diffInDays($today);

            return [
                'product_name' => $row->product_name, 'product_code' => $row->product_code, 'size' => $row->size_name ?? '-', 'design_no' => $row->design_no ?? '-',
                'source' => str_replace('_', ' ', ucwords(strtolower($row->reference_type), '_')), 'received_at' => substr((string) $row->received_at, 0, 10),
                'received_qty' => (float) $row->received_qty, 'remaining_qty' => (float) $row->remaining_qty, 'cost_price' => (float) $row->cost_price,
                'stock_value' => round((float) $row->remaining_qty * (float) $row->cost_price, 2), 'age_days' => $days, 'age_bucket' => $this->bucket($days),
            ];
        })->values();
    }

    /** Per item in stock: its oldest unsold batch against the item's Stock(Age) shelf period from the Item master. */
    private function shelfPeriod(): Collection
    {
        $today = CarbonImmutable::today();

        return $this->batches()->groupBy('variant_id')->map(function (Collection $batches) use ($today) {
            $first = $batches->first(); // Oldest first.
            $qty = (float) $batches->sum('remaining_qty');
            $days = (int) CarbonImmutable::parse($first->received_at)->startOfDay()->diffInDays($today);
            $limit = (int) (json_decode($first->master_details ?? '[]', true)['stock_age'] ?? 0);

            return [
                'product_name' => $first->product_name, 'product_code' => $first->product_code, 'size' => $first->size_name ?? '-', 'design_no' => $first->design_no ?? '-',
                'stock_qty' => $qty, 'stock_value' => round($batches->sum(fn ($b) => (float) $b->remaining_qty * (float) $b->cost_price), 2),
                'oldest_received' => substr((string) $first->received_at, 0, 10), 'latest_received' => substr((string) $batches->last()->received_at, 0, 10),
                'days_on_shelf' => $days, 'shelf_period' => $limit ?: null,
                'shelf_status' => $limit <= 0 ? 'No shelf period set' : ($days > $limit ? 'Over by '.($days - $limit).' days' : ($limit - $days).' days left'),
            ];
        })->sortByDesc('days_on_shelf')->values();
    }

    /** Physical stock audits: counted against the system quantity, line by line. */
    private function stockAudit(): Collection
    {
        return StoreQuery::table('physical_stocks as a')
            ->join('physical_stock_items as i', 'i.physical_stock_id', '=', 'a.id')
            ->join('products as p', 'p.id', '=', 'i.product_id')
            ->leftJoin('product_variants as v', 'v.id', '=', 'i.variant_id')
            ->leftJoin('sizes as s', 's.id', '=', 'v.size_id')
            ->select('a.audit_no', 'a.audit_date', 'a.status', 'p.name as product_name', 'p.code as product_code', 's.name as size_name', 'p.cost_price',
                'i.system_qty', 'i.counted_qty', 'i.difference_qty', 'i.notes')
            ->orderByDesc('a.audit_date')->orderBy('a.audit_no')->limit(20000)->get()
            ->map(fn ($row) => [
                'audit_no' => $row->audit_no, 'audit_date' => substr((string) $row->audit_date, 0, 10), 'status' => $row->status,
                'product_name' => $row->product_name, 'product_code' => $row->product_code, 'size' => $row->size_name ?? '-',
                'system_qty' => (float) $row->system_qty, 'counted_qty' => (float) $row->counted_qty, 'difference_qty' => (float) $row->difference_qty,
                'difference_value' => round((float) $row->difference_qty * (float) $row->cost_price, 2),
                'result' => abs((float) $row->difference_qty) < 0.0005 ? 'Matched' : ((float) $row->difference_qty > 0 ? 'Excess' : 'Short'), 'notes' => $row->notes ?? '',
            ]);
    }

    /** Loyalty points customers spent on bills. */
    private function loyaltyRedemptions(): Collection
    {
        return StoreQuery::table('loyalty_transactions as t')->where('t.type', 'REDEEM')
            ->join('customers as c', 'c.id', '=', 't.customer_id')
            ->leftJoin('pos_sales as s', 's.id', '=', 't.pos_sale_id')
            ->select('t.created_at', 'c.name as customer_name', 'c.phone', 'c.loyalty_card_number', 's.invoice_no', 's.grand_total', 't.points', 't.amount', 't.balance_after')
            ->orderByDesc('t.created_at')->limit(20000)->get()
            ->map(fn ($row) => [
                'redeemed_at' => substr((string) $row->created_at, 0, 16), 'customer_name' => $row->customer_name, 'mobile_no' => $row->phone ?? '-',
                'card_no' => $row->loyalty_card_number ?? '-', 'bill_no' => $row->invoice_no ?? '-', 'bill_amount' => (float) $row->grand_total,
                'points' => abs((float) $row->points), 'amount' => abs((float) $row->amount), 'balance_after' => (float) $row->balance_after,
            ]);
    }

    /**
     * Salesperson incentive per month for the last 12 months, worked out by the same rules as Finance > Incentive
     * Report (Services/Sales/IncentiveCalculator), so both reports agree.
     */
    private function incentives(): Collection
    {
        $storeIds = array_map('intval', (array) request()->attributes->get('store_context_ids', []));
        $calculator = app(IncentiveCalculator::class);
        $rows = collect();
        foreach ($storeIds as $storeId) {
            $months = DB::table('pos_sale_items as i')->join('pos_sales as s', 's.id', '=', 'i.pos_sale_id')
                ->where('s.store_id', $storeId)->whereNotNull('i.sales_man_id')->where('s.sale_date', '>=', now()->subMonths(11)->startOfMonth())
                ->selectRaw('DISTINCT SUBSTR(s.sale_date, 1, 7) as m')->pluck('m');
            foreach ($months as $month) {
                foreach ($calculator->month($storeId, (string) $month)['rows'] as $row) {
                    $rows->push([
                        'month' => $month, 'employee_code' => $row['employee_code'] ?? '-', 'employee_name' => $row['employee_name'],
                        'section' => $row['section'] ?? 'No section', 'bills' => $row['bills'], 'qty' => (float) $row['qty'], 'net_sales' => $row['net_sales'],
                        'incentive_pct' => $row['net_sales'] > 0 ? round($row['total'] / $row['net_sales'] * 100, 2) : 0, 'incentive_amount' => $row['total'],
                    ]);
                }
            }
        }

        return $rows->sortBy([['month', 'desc'], ['incentive_amount', 'desc']])->values();
    }

    /** Unsold stock batches, oldest first, with the item they belong to. */
    private function batches(): Collection
    {
        return StoreQuery::table('stock_batches as b')->where('b.remaining_qty', '>', 0)
            ->join('product_variants as v', 'v.id', '=', 'b.variant_id')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->leftJoin('sizes as s', 's.id', '=', 'v.size_id')
            ->select('b.variant_id', 'b.reference_type', 'b.received_at', 'b.received_qty', 'b.remaining_qty', 'b.cost_price',
                'p.name as product_name', 'p.code as product_code', 'p.master_details', 'v.design_no', 's.name as size_name')
            ->orderBy('b.received_at')->orderBy('b.id')->limit(50000)->get();
    }

    private function bucket(int $days): string
    {
        foreach (self::AGE_BUCKETS as $upTo => $label) {
            if ($days <= $upTo) {
                return $label;
            }
        }

        return 'Over 180 days';
    }
}
