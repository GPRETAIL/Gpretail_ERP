<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\DirectPurchase;
use App\Models\Employee;
use App\Models\PosSale;
use App\Models\PurchaseInvoice;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Stock;
use App\Models\StockOutward;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        return $this->overview($request);
    }

    public function overview(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id') ?? $request->input('company_id');
        $scope = fn ($q) => ($storeId && $storeId !== 'all') ? $q->where('store_id', $storeId) : $q;

        // Date range - the frontend's date pickers send these on every request but the metrics
        // below used to ignore them entirely and return all-time totals regardless of selection.
        $from = $request->filled('from')
            ? Carbon::parse($request->input('from'))->startOfDay()
            : now()->startOfMonth();
        $to = $request->filled('to')
            ? Carbon::parse($request->input('to'))->endOfDay()
            : now()->endOfDay();
        $dateScope = fn ($q) => $q->whereBetween('sale_date', [$from, $to]);

        // Previous period of equal length immediately preceding $from, for real trend percentages
        // (period-over-period) instead of the hardcoded "+12.5%"-style strings this used to send.
        $periodDays = max(1, $from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay()) + 1);
        $prevTo = $from->copy()->subSecond();
        $prevFrom = $prevTo->copy()->subDays($periodDays - 1)->startOfDay();
        $prevDateScope = fn ($q) => $q->whereBetween('sale_date', [$prevFrom, $prevTo]);

        $computeTrend = function ($current, $previous) {
            $current = (float) $current;
            $previous = (float) $previous;
            if ($previous <= 0) {
                if ($current <= 0) return ['direction' => 'flat', 'changePercent' => 0];
                return ['direction' => 'up', 'changePercent' => 100];
            }
            $change = round((($current - $previous) / $previous) * 100, 1);
            if (abs($change) < 0.05) return ['direction' => 'flat', 'changePercent' => 0];
            return ['direction' => $change > 0 ? 'up' : 'down', 'changePercent' => abs($change)];
        };

        // Core Aggregate Metrics. Every sum()+count() pair below that shares the identical
        // WHERE clause is combined into one selectRaw() query instead of two -- the database has
        // to do the same table scan / index lookup either way, so asking it for both aggregates
        // in one pass halves the round trips this section makes. This endpoint previously issued
        // 40-50+ separate queries per load (a major contributor to the "Failed to load dashboard"
        // timeouts under this dev environment's known slow-MariaDB conditions); consolidating the
        // ones below and the per-store loops further down cuts that roughly in half without
        // changing any returned value.
        $salesAgg = $dateScope($scope(PosSale::query()))
            ->selectRaw('COALESCE(SUM(grand_total), 0) as total, COUNT(*) as cnt')
            ->first();
        $totalSales = (float) $salesAgg->total;
        $totalOrders = (int) $salesAgg->cnt;
        $prevTotalSales = (float) ($prevDateScope($scope(PosSale::query()))->sum('grand_total') ?? 0);

        // Returns - real count+amount for the selected range (previously the only place this was
        // aggregated was buried as one row inside settlementDetails, with no standalone metric a
        // KPI card could read the way totalBills/stockValue already can).
        $returnDateScope = fn ($q) => $q->whereBetween('return_date', [$from, $to]);
        $returnScope = fn ($q) => ($storeId && $storeId !== 'all') ? $q->where('store_id', $storeId) : $q;
        $returnsAgg = $returnDateScope($returnScope(DB::table('pos_returns')))
            ->selectRaw('COALESCE(SUM(total_refund), 0) as total, COUNT(*) as cnt')
            ->first();
        $totalReturns = (float) $returnsAgg->total;
        $totalReturnCount = (int) $returnsAgg->cnt;
        $prevReturnDateScope = fn ($q) => $q->whereBetween('return_date', [$prevFrom, $prevTo]);
        $prevTotalReturns = (float) ($prevReturnDateScope($returnScope(DB::table('pos_returns')))->sum('total_refund') ?? 0);

        // Purchase Return - goods sent back to a supplier, a real, separate
        // concept from a customer's POS return (different table entirely:
        // purchase_returns, keyed to a supplier_id/purchase_invoice_id).
        $purchaseReturnsAgg = $returnDateScope($returnScope(DB::table('purchase_returns')))
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total, COUNT(*) as cnt')
            ->first();
        $totalPurchaseReturns = (float) $purchaseReturnsAgg->total;
        $totalPurchaseReturnCount = (int) $purchaseReturnsAgg->cnt;
        $prevTotalPurchaseReturns = (float) ($prevReturnDateScope($returnScope(DB::table('purchase_returns')))->sum('total_amount') ?? 0);

        // Purchases - this ERP has two independent real purchase-bill sources
        // (Direct Purchase entries, and Invoices from the Transport Entry ->
        // Invoice -> Inventory Entry flow), so both are summed together
        // rather than treating Direct Purchase as the only pathway.
        $directPurchaseScope = fn ($q) => ($storeId && $storeId !== 'all')
            ? $q->where(fn ($sq) => $sq->where('store_id', $storeId)->orWhere('company_id', $storeId))
            : $q;
        $directPurchaseDateScope = fn ($q) => $q->whereBetween('purchase_date', [$from, $to]);
        $prevDirectPurchaseDateScope = fn ($q) => $q->whereBetween('purchase_date', [$prevFrom, $prevTo]);
        $directPurchaseAgg = $directPurchaseDateScope($directPurchaseScope(DirectPurchase::query()))
            ->selectRaw('COALESCE(SUM(total_amount), 0) as total, COUNT(*) as cnt')
            ->first();
        $totalDirectPurchases = (float) $directPurchaseAgg->total;
        $directPurchaseCount = (int) $directPurchaseAgg->cnt;
        $prevDirectPurchases = (float) ($prevDirectPurchaseDateScope($directPurchaseScope(DirectPurchase::query()))->sum('total_amount') ?? 0);

        $invoicePurchaseScope = fn ($q) => ($storeId && $storeId !== 'all') ? $q->where('store_id', $storeId) : $q;
        $invoiceDateScope = fn ($q) => $q->whereBetween('invoice_date', [$from, $to]);
        $prevInvoiceDateScope = fn ($q) => $q->whereBetween('invoice_date', [$prevFrom, $prevTo]);
        $invoicePurchaseAgg = $invoiceDateScope($invoicePurchaseScope(PurchaseInvoice::query()))
            ->selectRaw('COALESCE(SUM(grand_total), 0) as total, COUNT(*) as cnt')
            ->first();
        $totalInvoicePurchases = (float) $invoicePurchaseAgg->total;
        $invoicePurchaseCount = (int) $invoicePurchaseAgg->cnt;
        $prevInvoicePurchases = (float) ($prevInvoiceDateScope($invoicePurchaseScope(PurchaseInvoice::query()))->sum('grand_total') ?? 0);

        $totalPurchases = $totalDirectPurchases + $totalInvoicePurchases;
        $prevTotalPurchases = $prevDirectPurchases + $prevInvoicePurchases;
        $totalPurchaseCount = $directPurchaseCount + $invoicePurchaseCount;

        $totalProducts = (int) Product::count();
        $totalCustomers = (int) Customer::count();
        // Stock qty + low-stock count combined into one query (same table/scope, two aggregates
        // via conditional SUM) instead of a sum() call followed by a separate count() call.
        $stockAgg = $scope(Stock::query())
            ->selectRaw('COALESCE(SUM(quantity), 0) as total_qty, SUM(CASE WHEN quantity <= 5 THEN 1 ELSE 0 END) as low_stock_count')
            ->first();
        $totalStockQty = (float) $stockAgg->total_qty;
        $lowStockAlerts = (int) $stockAgg->low_stock_count;
        // Real attendance-derived counts (was previously just Employee::count() /
        // is_active count, unrelated to who actually checked in today).
        $todayForAttendance = now()->toDateString();
        $totalEmployees = (int) ($scope(Employee::query())->where('is_active', true)->count() ?? 0);
        $presentEmployees = (int) (Attendance::whereDate('date', $todayForAttendance)
            ->where('status', 'PRESENT')
            ->whereHas('employee', fn ($q) => $scope($q))
            ->count() ?? 0);

        // GST/Tax collected - real sum of pos_sales.tax_amount for the range (combined CGST+SGST,
        // there's no separate column for each half).
        $totalTaxCollected = (float) ($dateScope($scope(PosSale::query()))->sum('tax_amount') ?? 0);
        $prevTotalTax = (float) ($prevDateScope($scope(PosSale::query()))->sum('tax_amount') ?? 0);

        // Gross profit - sum(qty * (selling_price - cost_price)) across sold line items in range.
        // cost_price is only recorded on items where the sale screen actually sent one (older/manual
        // entries can be null), so this is a real but partial figure - flagged via hasIncompleteCost
        // rather than silently understating profit as if every line item were accounted for.
        // Profit total and the missing-cost count are combined into one query via conditional
        // aggregation instead of two separate passes over the same joined row set.
        $profitAgg = DB::table('pos_sale_items')
            ->join('pos_sales', 'pos_sale_items.pos_sale_id', '=', 'pos_sales.id')
            ->whereBetween('pos_sales.sale_date', [$from, $to])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('pos_sales.store_id', $storeId))
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN pos_sale_items.cost_price IS NOT NULL '
                . 'THEN pos_sale_items.quantity * (pos_sale_items.selling_price - pos_sale_items.cost_price) '
                . 'ELSE 0 END), 0) as profit, '
                . 'SUM(CASE WHEN pos_sale_items.cost_price IS NULL THEN 1 ELSE 0 END) as missing_cost_count'
            )
            ->first();
        $grossProfit = (float) $profitAgg->profit;
        $itemsMissingCost = (int) $profitAgg->missing_cost_count;
        $prevProfitQuery = DB::table('pos_sale_items')
            ->join('pos_sales', 'pos_sale_items.pos_sale_id', '=', 'pos_sales.id')
            ->whereBetween('pos_sales.sale_date', [$prevFrom, $prevTo])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('pos_sales.store_id', $storeId))
            ->whereNotNull('pos_sale_items.cost_price');
        $prevGrossProfit = (float) ($prevProfitQuery->sum(DB::raw('pos_sale_items.quantity * (pos_sale_items.selling_price - pos_sale_items.cost_price)')) ?? 0);

        // Calculate Stock Value (Qty * Product Cost Price)
        $stockValQuery = DB::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id');
        if ($storeId && $storeId !== 'all') {
            $stockValQuery->where('stocks.store_id', $storeId);
        }
        $totalStockValue = (float) ($stockValQuery->sum(DB::raw('stocks.quantity * COALESCE(products.cost_price, products.selling_price, 0)')) ?? 0);

        // Top Selling Items for Highlight Card - joined through pos_sales (previously ungrouped by
        // store or date at all, so every store's entire history fed this one global ranking).
        $topSellingQuery = DB::table('pos_sale_items')
            ->join('products', 'pos_sale_items.product_id', '=', 'products.id')
            ->join('pos_sales', 'pos_sale_items.pos_sale_id', '=', 'pos_sales.id')
            ->whereBetween('pos_sales.sale_date', [$from, $to])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('pos_sales.store_id', $storeId))
            ->select(
                'products.name',
                DB::raw('SUM(pos_sale_items.quantity) as saleQty'),
                DB::raw('SUM(pos_sale_items.subtotal) as value')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('saleQty')
            ->limit(10)
            ->get();

        $topSellingRows = $topSellingQuery->map(fn ($r) => [
            'name'    => $r->name,
            'saleQty' => (float) $r->saleQty,
            'value'   => (float) $r->value,
        ])->all();

        // Top Customers
        $topCustomerQuery = DB::table('pos_sales')
            ->join('customers', 'pos_sales.customer_id', '=', 'customers.id')
            ->whereBetween('pos_sales.sale_date', [$from, $to])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('pos_sales.store_id', $storeId))
            ->select(
                'customers.name',
                DB::raw('SUM(pos_sales.total_qty) as saleQty'),
                DB::raw('SUM(pos_sales.grand_total) as value')
            )
            ->groupBy('customers.id', 'customers.name')
            ->orderByDesc('value')
            ->limit(10)
            ->get();

        $topCustomerRows = $topCustomerQuery->map(fn ($r) => [
            'name'    => $r->name,
            'saleQty' => (float) $r->saleQty,
            'value'   => (float) $r->value,
        ])->all();

        // Supplier Payments (Overview) - per-invoice outstanding payables across both payable
        // document types (Direct Purchase and Purchase Invoice), the same two sources Finance's own
        // payables KPI already sums (see FinanceDashboardService::getSummary). One row per document
        // here instead of that summary's per-supplier aggregate, so Overview can show what's
        // actually due, per invoice, and how overdue it is -- ordered most-overdue first.
        $overdueThresholdDays = 30;
        $todayForDays = Carbon::today();

        $dpPayments = DB::table('direct_purchases as dp')
            ->leftJoin('suppliers as s', 's.id', '=', 'dp.supplier_id')
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where(fn ($sq) => $sq->where('dp.store_id', $storeId)->orWhere('dp.company_id', $storeId)))
            ->whereRaw('dp.total_amount > dp.paid_amount')
            ->selectRaw('
                COALESCE(s.name, dp.supplier_name, "Unknown") as supplier_name,
                COALESCE(dp.invoice_no, dp.purchase_no) as invoice_no,
                COALESCE(dp.purchase_type, "Direct Purchase") as invoice_type,
                COALESCE(dp.invoice_date, dp.purchase_date) as invoice_date,
                dp.total_amount as invoice_value,
                (dp.total_amount - dp.paid_amount) as balance
            ');

        $piPayments = DB::table('purchase_invoices as pi')
            ->leftJoin('suppliers as s', 's.id', '=', 'pi.supplier_id')
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('pi.store_id', $storeId))
            ->whereRaw('pi.grand_total > pi.paid_amount')
            ->selectRaw('
                COALESCE(s.name, "Unknown") as supplier_name,
                COALESCE(pi.supplier_invoice_no, pi.invoice_no) as invoice_no,
                "Purchase Invoice" as invoice_type,
                COALESCE(pi.supplier_invoice_date, pi.invoice_date) as invoice_date,
                pi.grand_total as invoice_value,
                (pi.grand_total - pi.paid_amount) as balance
            ');

        $supplierPaymentRows = $dpPayments->unionAll($piPayments)->get()
            ->map(function ($row) use ($todayForDays, $overdueThresholdDays) {
                $invoiceDate = $row->invoice_date ? Carbon::parse($row->invoice_date) : null;
                $days = $invoiceDate ? $invoiceDate->diffInDays($todayForDays) : null;
                return [
                    'supplierName' => $row->supplier_name,
                    'invoiceNo'    => $row->invoice_no ?: '-',
                    'invoiceType'  => $row->invoice_type,
                    'days'         => $days,
                    'invoiceValue' => (float) $row->invoice_value,
                    'balance'      => (float) $row->balance,
                    'overdue'      => $days !== null && $days > $overdueThresholdDays,
                ];
            })
            ->sortByDesc('days')
            ->values()
            ->take(15)
            ->all();

        $supplierPaymentsTotalBalance = collect($supplierPaymentRows)->sum('balance');
        $supplierPaymentsOverdueCount = collect($supplierPaymentRows)->where('overdue', true)->count();

        // Store List
        $stores = Store::when($storeId && $storeId !== 'all', fn ($q) => $q->where('id', $storeId))->get();
        if ($stores->isEmpty()) {
            $stores = Store::all();
        }

        // Daily Summary Rows - one grouped query across every visible store instead of 3 separate
        // queries (sum, count, sum) run once per store (previously up to 3xN round trips).
        $storeIds = $stores->pluck('id');
        $dailySummaryByStore = $dateScope(PosSale::query())
            ->whereIn('store_id', $storeIds)
            ->selectRaw('store_id, COALESCE(SUM(grand_total), 0) as sales, COUNT(*) as cnt, COALESCE(SUM(total_qty), 0) as qty')
            ->groupBy('store_id')
            ->get()
            ->keyBy('store_id');

        $dailySummaryRows = [];
        $totalUnitsSold = 0;

        foreach ($stores as $st) {
            $agg = $dailySummaryByStore->get($st->id);
            $stSales = (float) ($agg->sales ?? 0);
            $stCount = (int) ($agg->cnt ?? 0);
            $stQty = (float) ($agg->qty ?? 0);
            $totalUnitsSold += $stQty;

            $dailySummaryRows[] = [
                'company'  => $st->name,
                'location' => $st->city ?? 'Main',
                'count'    => $stCount,
                'quantity' => $stQty,
                'value'    => $stSales,
            ];
        }

        // Settlement Details (Payment Methods: Cash, Card, UPI, Credit, Return, Discount across
        // Store Locations). Previously up to 6 methods x N stores individual queries; replaced
        // with 4 grouped queries total -- CASH/CARD/UPI share one grouped-by-(store_id,
        // payment_mode) query since they're the same shape, differing only in which mode value
        // gets read back out per row below.
        $modeAggRows = $dateScope(PosSale::query())
            ->whereIn('store_id', $storeIds)
            ->where('is_credit', false)
            ->whereIn('payment_mode', ['CASH', 'CARD', 'UPI'])
            ->selectRaw('store_id, payment_mode, COALESCE(SUM(grand_total), 0) as total')
            ->groupBy('store_id', 'payment_mode')
            ->get();
        $modeByStore = [];
        foreach ($modeAggRows as $row) {
            $modeByStore[$row->store_id][$row->payment_mode] = (float) $row->total;
        }

        $creditAggByStore = $dateScope(PosSale::query())
            ->whereIn('store_id', $storeIds)
            ->where(fn ($q) => $q->where('payment_mode', 'CREDIT')->orWhere('is_credit', true))
            ->selectRaw('store_id, COALESCE(SUM(grand_total), 0) as total')
            ->groupBy('store_id')
            ->get()
            ->keyBy('store_id');

        $returnAggByStore = $returnDateScope(DB::table('pos_returns'))
            ->whereIn('store_id', $storeIds)
            ->selectRaw('store_id, COALESCE(SUM(total_refund), 0) as total')
            ->groupBy('store_id')
            ->get()
            ->keyBy('store_id');

        $discountAggByStore = $dateScope(PosSale::query())
            ->whereIn('store_id', $storeIds)
            ->selectRaw('store_id, COALESCE(SUM(discount_amount), 0) as total')
            ->groupBy('store_id')
            ->get()
            ->keyBy('store_id');

        $settlementColumns = [];
        $settlementColumnTotals = [];

        foreach ($stores as $st) {
            $colKey = 'store_' . $st->id;
            $locationLabel = !empty($st->city) ? $st->city : $st->name;
            $settlementColumns[] = [
                'key'   => $colKey,
                'label' => $locationLabel,
            ];
            $settlementColumnTotals[$colKey] = 0;
        }

        $methodDefinitions = [
            ['key' => 'cash',     'label' => 'Cash',     'color' => 'emerald', 'type' => 'mode',     'mode' => 'CASH'],
            ['key' => 'card',     'label' => 'Card',     'color' => 'blue',    'type' => 'mode',     'mode' => 'CARD'],
            ['key' => 'upi',      'label' => 'UPI',      'color' => 'violet',  'type' => 'mode',     'mode' => 'UPI'],
            ['key' => 'credit',   'label' => 'Credit',   'color' => 'amber',   'type' => 'credit',   'mode' => 'CREDIT'],
            ['key' => 'return',   'label' => 'Return',   'color' => 'rose',    'type' => 'return',   'mode' => 'RETURN'],
            ['key' => 'discount', 'label' => 'Discount', 'color' => 'slate',   'type' => 'discount', 'mode' => 'DISCOUNT'],
        ];

        $settlementRows = [];
        $grandSettlementTotal = 0;

        foreach ($methodDefinitions as $m) {
            $rowValues = [];
            $rowTotal = 0;

            foreach ($stores as $st) {
                $colKey = 'store_' . $st->id;
                $val = 0;

                if ($m['type'] === 'mode') {
                    $val = (float) ($modeByStore[$st->id][$m['mode']] ?? 0);
                } elseif ($m['type'] === 'credit') {
                    $val = (float) ($creditAggByStore->get($st->id)->total ?? 0);
                } elseif ($m['type'] === 'return') {
                    $returnSum = (float) ($returnAggByStore->get($st->id)->total ?? 0);
                    $val = -abs($returnSum);
                } elseif ($m['type'] === 'discount') {
                    $discSum = (float) ($discountAggByStore->get($st->id)->total ?? 0);
                    $val = -abs($discSum);
                }

                $rowValues[$colKey] = $val;
                $rowTotal += $val;
                $settlementColumnTotals[$colKey] += $val;
            }

            $settlementRows[] = [
                'key'    => $m['key'],
                'label'  => $m['label'],
                'color'  => $m['color'],
                'values' => $rowValues,
                'total'  => $rowTotal,
            ];
            $grandSettlementTotal += $rowTotal;
        }

        // Hourly Sales Points (10 AM to 10 PM) - real per-hour aggregation for today, always
        // "today" regardless of the selected from/to range (matches this chart's own subtitle).
        // Previously this was 3 fixed fake buckets (15%/35%/50% of the day's total, always in the
        // same 3 slots) rather than a real query grouped by hour.
        // One bucket per real hour (0-23), covering the full day so a sale outside typical store
        // hours doesn't silently vanish from the chart instead of being bucketed.
        $hourlyBuckets = array_map(function ($h) {
            $displayHour = $h % 12 === 0 ? 12 : $h % 12;
            return ['label' => $displayHour.($h < 12 ? ' AM' : ' PM'), 'start' => $h, 'end' => $h + 1];
        }, range(0, 23));
        // HOUR() is MySQL-specific; the test suite runs against in-memory SQLite (phpunit.xml),
        // which needs strftime() instead -- this only swaps the expression under the test driver,
        // production (MySQL) behavior is unchanged.
        $hourExpr = DB::connection()->getDriverName() === 'sqlite'
            ? "CAST(strftime('%H', sale_date) AS INTEGER)"
            : 'HOUR(sale_date)';
        $todaySalesByHour = $scope(PosSale::query())
            ->whereDate('sale_date', now()->toDateString())
            ->selectRaw("{$hourExpr} as hr, COUNT(*) as bills, SUM(grand_total) as amt")
            ->groupBy('hr')
            ->get()
            ->keyBy('hr');

        $hourlyPoints = array_map(function ($bucket) use ($todaySalesByHour) {
            $bills = 0;
            $amount = 0.0;
            for ($h = $bucket['start']; $h < $bucket['end']; $h++) {
                $row = $todaySalesByHour->get($h);
                if ($row) {
                    $bills += (int) $row->bills;
                    $amount += (float) $row->amt;
                }
            }
            return ['label' => $bucket['label'], 'bills' => $bills, 'salesAmount' => round($amount, 2)];
        }, $hourlyBuckets);

        // Last 10 Days Business Trend (Daily) - the old "if today and zero, use the (now
        // date-range-scoped) running total" fallback no longer makes sense once $totalSales
        // reflects the selected range instead of all-time, so it's dropped. This used to run 2
        // individual queries per day (20 total for the 10-day window); replaced with one grouped
        // query across the whole window, same consolidation pattern as the per-store sections above.
        $trendRangeStart = now()->subDays(9)->startOfDay();
        $trendRangeEnd = now()->endOfDay();
        $dailyTrendByDate = $scope(PosSale::query())
            ->whereBetween('sale_date', [$trendRangeStart, $trendRangeEnd])
            ->selectRaw('DATE(sale_date) as d, COALESCE(SUM(grand_total), 0) as sales, COALESCE(SUM(total_qty), 0) as units')
            ->groupBy('d')
            ->get()
            ->keyBy('d');

        $dailyTrendPoints = [];
        for ($i = 9; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $label = now()->subDays($i)->format('d M');
            $agg = $dailyTrendByDate->get($date);

            $dailyTrendPoints[] = [
                'label'       => $label,
                'salesAmount' => (float) ($agg->sales ?? 0),
                'units'       => (float) ($agg->units ?? 0),
            ];
        }

        // Sales Person of the Day - joined through pos_sales so this respects the selected date
        // range and store scope instead of aggregating every sales-man's entire history globally.
        $salesPersonQuery = DB::table('pos_sale_items')
            ->leftJoin('employees', 'pos_sale_items.sales_man_id', '=', 'employees.id')
            ->join('pos_sales', 'pos_sale_items.pos_sale_id', '=', 'pos_sales.id')
            ->whereBetween('pos_sales.sale_date', [$from, $to])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('pos_sales.store_id', $storeId))
            ->select(
                DB::raw('COALESCE(pos_sale_items.sales_man_name, employees.name, "Store Admin") as name'),
                DB::raw('SUM(pos_sale_items.quantity) as saleQty'),
                DB::raw('SUM(pos_sale_items.subtotal) as value')
            )
            ->groupBy(DB::raw('COALESCE(pos_sale_items.sales_man_name, employees.name, "Store Admin")'))
            ->orderByDesc('saleQty')
            ->limit(10)
            ->get();

        $salesPersonRows = $salesPersonQuery->map(fn ($r) => [
            'name'    => $r->name,
            'saleQty' => (float) $r->saleQty,
            'value'   => (float) $r->value,
        ])->all();

        return response()->json([
            'success' => true,
            'data'    => [
                // UI Contract Schema for React Dashboard.jsx
                'metrics' => [
                    'totalBills' => [
                        'amount'         => $totalSales,
                        'count'          => $totalOrders,
                        'unsettledCount' => 0,
                        // {direction, changePercent} - MetricCard's TrendBadge expects this shape,
                        // not a plain string; a literal "+12.5%" string rendered as "undefined%"
                        // in a red down-arrow badge regardless of the real number's sign.
                        'trend'          => $computeTrend($totalSales, $prevTotalSales),
                    ],
                    'settlements' => [
                        'amount' => $totalSales,
                        'trend'  => $computeTrend($totalSales, $prevTotalSales),
                    ],
                    'employees' => [
                        'present' => max($presentEmployees, 1),
                        'total'   => max($totalEmployees, 1),
                    ],
                    'stockValue' => [
                        // Point-in-time snapshot (current stock on hand) - no historical stock-value
                        // series exists to compare against, so no trend is sent rather than a fake one.
                        'amount' => $totalStockValue,
                        'trend'  => null,
                    ],
                    'returns' => [
                        'amount' => $totalReturns,
                        'count'  => $totalReturnCount,
                        'trend'  => $computeTrend($totalReturns, $prevTotalReturns),
                    ],
                    'purchaseReturns' => [
                        'amount' => $totalPurchaseReturns,
                        'count'  => $totalPurchaseReturnCount,
                        'trend'  => $computeTrend($totalPurchaseReturns, $prevTotalPurchaseReturns),
                    ],
                    'purchases' => [
                        // Sum of Direct Purchase entries + Invoices (Transport Entry -> Invoice ->
                        // Inventory Entry flow) - two independent real sources, not just one.
                        'amount' => $totalPurchases,
                        'count'  => $totalPurchaseCount,
                        'trend'  => $computeTrend($totalPurchases, $prevTotalPurchases),
                    ],
                    'gst' => [
                        'amount' => $totalTaxCollected,
                        'trend'  => $computeTrend($totalTaxCollected, $prevTotalTax),
                    ],
                    'profitLoss' => [
                        'amount'           => $grossProfit,
                        'itemsMissingCost' => $itemsMissingCost,
                        'trend'            => $computeTrend($grossProfit, $prevGrossProfit),
                    ],
                    'receivables' => [
                        // Real customer credit balance (Customer.current_balance) - same figure
                        // CustomerController::dashboardSummary() already exposes as totalCreditBalance.
                        'amount' => (float) (Customer::sum('current_balance') ?? 0),
                    ],
                ],
                'charts' => [
                    'hourlySales' => [
                        'title'    => 'Sales Graph (Hourly)',
                        'subtitle' => "Today's sales performance by hour",
                        'points'   => $hourlyPoints,
                    ],
                    'dailyTrend' => [
                        'title'    => 'Business Trend (Daily)',
                        'subtitle' => 'Sales value and units over the last 10 days',
                        'points'   => $dailyTrendPoints,
                    ],
                ],
                'tables' => [
                    'fastMovingSection' => [
                        'title' => 'Fast Moving Products',
                        'rows'  => $topSellingRows,
                    ],
                    'supplierPayments' => [
                        'title'        => 'Supplier Payments',
                        'rows'         => $supplierPaymentRows,
                        'totalBalance' => $supplierPaymentsTotalBalance,
                        'overdueCount' => $supplierPaymentsOverdueCount,
                        'overdueDays'  => $overdueThresholdDays,
                    ],
                    'salesPersonOfTheDay' => [
                        'title' => 'Sales Person of the Day',
                        'rows'  => $salesPersonRows,
                    ],
                    'topSellingItems' => [
                        'title' => 'Fast Moving Products',
                        'rows'  => $topSellingRows,
                    ],
                    'topCustomers' => [
                        'title' => 'Top Customers',
                        'rows'  => $topCustomerRows,
                    ],
                    'dailySalesSummary' => [
                        'title'  => 'Daily Sales Summary',
                        'rows'   => $dailySummaryRows,
                        'totals' => [
                            'count'    => $totalOrders,
                            'quantity' => $totalUnitsSold,
                            'value'    => $totalSales,
                        ],
                    ],
                    'settlementDetails' => [
                        'title'        => 'Settlement Details',
                        'columns'      => $settlementColumns,
                        'rows'         => $settlementRows,
                        'columnTotals' => $settlementColumnTotals,
                        'grandTotal'   => $grandSettlementTotal > 0 ? $grandSettlementTotal : $totalSales,
                    ],
                ],
                // Legacy overview keys for backwards compatibility
                'overview' => [
                    'total_sales'      => $totalSales,
                    'total_orders'     => $totalOrders,
                    'total_products'   => $totalProducts,
                    'total_customers'  => $totalCustomers,
                    'total_stock_qty'  => $totalStockQty,
                    'low_stock_alerts' => $lowStockAlerts,
                ],
                'recent_sales'  => PosSale::with(['customer', 'user'])->orderBy('id', 'desc')->limit(5)->get(),
                'top_products'  => $topSellingRows,
                'monthly_trend' => $dailyTrendPoints,
            ],
        ]);
    }

    public function warehouse(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id') ?? $request->input('company_id');
        $scoped = fn ($query) => ($storeId && $storeId !== 'all') ? $query->where('store_id', $storeId) : $query;

        return response()->json([
            'success' => true,
            'data'    => [
                'total_items_in_stock' => (float) ($scoped(Stock::query())->sum('quantity') ?? 0),
                'low_stock_items'      => (int) ($scoped(Stock::query())->where('quantity', '<=', 5)->count() ?? 0),
                'out_of_stock_items'   => (int) ($scoped(Stock::query())->where('quantity', '<=', 0)->count() ?? 0),
                'total_inventory_val'  => (float) ($scoped(
                    DB::table('stocks')->join('products', 'stocks.product_id', '=', 'products.id')
                )->sum(DB::raw('stocks.quantity * COALESCE(products.cost_price, 0)')) ?? 0),
                'recent_grns' => DirectPurchase::query()
                    ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('store_id', $storeId))
                    ->orderBy('id', 'desc')
                    ->limit(5)
                    ->get(['id', 'purchase_no', 'supplier_name', 'purchase_date', 'total_amount']),
                'recent_dispatches' => StockOutward::query()
                    ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('source_store_id', $storeId))
                    ->with('targetStore:id,name')
                    ->orderBy('id', 'desc')
                    ->limit(5)
                    ->get(['id', 'outward_no', 'target_store_id', 'outward_date', 'status']),
            ],
        ]);
    }

    public function summary(Request $request)
    {
        $today = now()->toDateString();
        $todaySales = (float) (PosSale::whereDate('sale_date', $today)->sum('grand_total') ?? 0);
        $todayOrders = (int) (PosSale::whereDate('sale_date', $today)->count() ?? 0);

        return response()->json([
            'success' => true,
            'data'    => [
                'totalBillsToday'      => $todayOrders,
                'totalSettlementToday' => $todaySales,
                'unsettledBills'       => 0,
                'todaySales'           => $todaySales,
                'todayOrders'          => $todayOrders,
                'yesterdaySales'       => 0,
                'thisMonthSales'       => (float) (PosSale::sum('grand_total') ?? 0),
                'averageBillValue'     => $todayOrders > 0 ? round($todaySales / $todayOrders, 2) : 0,
            ],
        ]);
    }

    public function analytics(Request $request)
    {
        $totalSales = (float) (PosSale::sum('grand_total') ?? 0);
        $totalOrders = (int) (PosSale::count() ?? 0);

        return response()->json([
            'success' => true,
            'data'    => [
                'cards' => [
                    [
                        'key'       => 'gross_margin',
                        'title'     => 'Gross Margin',
                        'subtitle'  => 'Overall Margin %',
                        'value'     => 28.5,
                        'valueType' => 'percent',
                        'trend'     => '+2.1%',
                    ],
                    [
                        'key'       => 'avg_basket',
                        'title'     => 'Average Basket Size',
                        'subtitle'  => 'Per Transaction',
                        'value'     => $totalOrders > 0 ? round($totalSales / $totalOrders, 2) : 0,
                        'valueType' => 'currency',
                        'trend'     => '+4.5%',
                    ],
                    [
                        'key'       => 'inventory_turnover',
                        'title'     => 'Inventory Turnover',
                        'subtitle'  => 'Annualized Ratio',
                        'value'     => 4.2,
                        'valueType' => 'multiple',
                        'trend'     => '+0.3x',
                    ],
                    [
                        'key'       => 'sales_growth',
                        'title'     => 'Sales Growth',
                        'subtitle'  => 'vs Last Month',
                        'value'     => 14.8,
                        'valueType' => 'percent',
                        'trend'     => '+3.2%',
                    ],
                ],
            ],
        ]);
    }

    public function attentionSummary(Request $request)
    {
        // Mobile never sets the X-Company-Scope-Id header (no store-switcher there, unlike
        // desktop's Navbar) - without falling back to the user's own store, $storeId stayed
        // null and $scope became a no-op, silently running every count unscoped across ALL
        // stores instead of the caller's, matching PosSaleController::store()'s fallback.
        $storeId = $request->header('X-Company-Scope-Id')
            ?? $request->input('company_id')
            ?? $request->user()?->store_id;
        $scope = fn ($q) => ($storeId && $storeId !== 'all') ? $q->where('store_id', $storeId) : $q;

        // 1. Low Stock Alerts
        $lowStock = (int) ($scope(\App\Models\Stock::query())->where('quantity', '<=', 5)->count() ?? 0);

        // 2. Pending Approvals
        $pendingApprovals = (int) ($scope(\App\Models\SalesApproval::query())->where('status', 'PENDING')->count() ?? 0);

        // 3. Overdue Payables (Unpaid Purchase Bills)
        $overduePayables = (int) ($scope(\App\Models\PurchaseInvoice::query())->where('payment_status', '!=', 'PAID')->count() ?? 0);

        // 4. Employees on Leave (today)
        $employeesOnLeave = (int) (Attendance::whereDate('date', now()->toDateString())
            ->where('status', 'LEAVE')
            ->whereHas('employee', fn ($q) => $scope($q))
            ->count() ?? 0);

        return response()->json([
            'success' => true,
            'data'    => [
                'low_stock'          => $lowStock,
                'pending_approvals'  => $pendingApprovals,
                'overdue_payables'   => $overduePayables,
                'employees_on_leave' => $employeesOnLeave,
            ],
        ]);
    }
}
