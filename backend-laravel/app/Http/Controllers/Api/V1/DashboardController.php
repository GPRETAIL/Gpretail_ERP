<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DirectPurchase;
use App\Models\Employee;
use App\Models\PosSale;
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

        // Core Aggregate Metrics
        $totalSales = (float) ($dateScope($scope(PosSale::query()))->sum('grand_total') ?? 0);
        $totalOrders = (int) ($dateScope($scope(PosSale::query()))->count() ?? 0);
        $prevTotalSales = (float) ($prevDateScope($scope(PosSale::query()))->sum('grand_total') ?? 0);

        // Returns - real count+amount for the selected range (previously the only place this was
        // aggregated was buried as one row inside settlementDetails, with no standalone metric a
        // KPI card could read the way totalBills/stockValue already can).
        $returnDateScope = fn ($q) => $q->whereBetween('return_date', [$from, $to]);
        $returnScope = fn ($q) => ($storeId && $storeId !== 'all') ? $q->where('store_id', $storeId) : $q;
        $totalReturns = (float) ($returnDateScope($returnScope(DB::table('pos_returns')))->sum('total_refund') ?? 0);
        $totalReturnCount = (int) ($returnDateScope($returnScope(DB::table('pos_returns')))->count() ?? 0);
        $prevReturnDateScope = fn ($q) => $q->whereBetween('return_date', [$prevFrom, $prevTo]);
        $prevTotalReturns = (float) ($prevReturnDateScope($returnScope(DB::table('pos_returns')))->sum('total_refund') ?? 0);

        $totalProducts = (int) Product::count();
        $totalCustomers = (int) Customer::count();
        $totalStockQty = (float) ($scope(Stock::query())->sum('quantity') ?? 0);
        $lowStockAlerts = (int) ($scope(Stock::query())->where('quantity', '<=', 5)->count() ?? 0);
        $totalEmployees = (int) Employee::count();
        $presentEmployees = (int) Employee::where('is_active', true)->count();

        // GST/Tax collected - real sum of pos_sales.tax_amount for the range (combined CGST+SGST,
        // there's no separate column for each half).
        $totalTaxCollected = (float) ($dateScope($scope(PosSale::query()))->sum('tax_amount') ?? 0);
        $prevTotalTax = (float) ($prevDateScope($scope(PosSale::query()))->sum('tax_amount') ?? 0);

        // Gross profit - sum(qty * (selling_price - cost_price)) across sold line items in range.
        // cost_price is only recorded on items where the sale screen actually sent one (older/manual
        // entries can be null), so this is a real but partial figure - flagged via hasIncompleteCost
        // rather than silently understating profit as if every line item were accounted for.
        $profitQuery = DB::table('pos_sale_items')
            ->join('pos_sales', 'pos_sale_items.pos_sale_id', '=', 'pos_sales.id')
            ->whereBetween('pos_sales.sale_date', [$from, $to])
            ->when($storeId && $storeId !== 'all', fn ($q) => $q->where('pos_sales.store_id', $storeId));
        $grossProfit = (float) ((clone $profitQuery)->whereNotNull('pos_sale_items.cost_price')
            ->sum(DB::raw('pos_sale_items.quantity * (pos_sale_items.selling_price - pos_sale_items.cost_price)')) ?? 0);
        $itemsMissingCost = (int) ((clone $profitQuery)->whereNull('pos_sale_items.cost_price')->count() ?? 0);
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

        // Store List
        $stores = Store::when($storeId && $storeId !== 'all', fn ($q) => $q->where('id', $storeId))->get();
        if ($stores->isEmpty()) {
            $stores = Store::all();
        }

        // Daily Summary Rows
        $dailySummaryRows = [];
        $totalUnitsSold = 0;

        foreach ($stores as $st) {
            $stSales = (float) ($dateScope(PosSale::where('store_id', $st->id))->sum('grand_total') ?? 0);
            $stCount = (int) ($dateScope(PosSale::where('store_id', $st->id))->count() ?? 0);
            $stQty = (float) ($dateScope(PosSale::where('store_id', $st->id))->sum('total_qty') ?? 0);
            $totalUnitsSold += $stQty;

            $dailySummaryRows[] = [
                'company'  => $st->name,
                'location' => $st->city ?? 'Main',
                'count'    => $stCount,
                'quantity' => $stQty,
                'value'    => $stSales,
            ];
        }

        // Settlement Details (Payment Methods: Cash, Card, UPI, Credit, Return, Discount across Store Locations)
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
                    $val = (float) ($dateScope(PosSale::where('store_id', $st->id))
                        ->where('payment_mode', $m['mode'])
                        ->where('is_credit', false)
                        ->sum('grand_total') ?? 0);
                } elseif ($m['type'] === 'credit') {
                    $val = (float) ($dateScope(PosSale::where('store_id', $st->id))
                        ->where(function ($q) {
                            $q->where('payment_mode', 'CREDIT')
                              ->orWhere('is_credit', true);
                        })
                        ->sum('grand_total') ?? 0);
                } elseif ($m['type'] === 'return') {
                    $returnSum = (float) (DB::table('pos_returns')
                        ->where('store_id', $st->id)
                        ->whereBetween('return_date', [$from, $to])
                        ->sum('total_refund') ?? 0);
                    $val = -abs($returnSum);
                } elseif ($m['type'] === 'discount') {
                    $discSum = (float) ($dateScope(PosSale::where('store_id', $st->id))
                        ->sum('discount_amount') ?? 0);
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
        $todaySalesByHour = $scope(PosSale::query())
            ->whereDate('sale_date', now()->toDateString())
            ->selectRaw('HOUR(sale_date) as hr, COUNT(*) as bills, SUM(grand_total) as amt')
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

        // Last 10 Days Business Trend (Daily) - already real per-day queries; the old "if today and
        // zero, use the (now date-range-scoped) running total" fallback no longer makes sense once
        // $totalSales reflects the selected range instead of all-time, so it's dropped.
        $dailyTrendPoints = [];
        for ($i = 9; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $label = now()->subDays($i)->format('d M');
            $daySales = (float) ($scope(PosSale::query())->whereDate('sale_date', $date)->sum('grand_total') ?? 0);
            $dayUnits = (float) ($scope(PosSale::query())->whereDate('sale_date', $date)->sum('total_qty') ?? 0);

            $dailyTrendPoints[] = [
                'label'       => $label,
                'salesAmount' => $daySales,
                'units'       => $dayUnits,
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
        $storeId = $request->header('X-Company-Scope-Id') ?? $request->input('company_id');
        $scope = fn ($q) => ($storeId && $storeId !== 'all') ? $q->where('store_id', $storeId) : $q;

        // 1. Low Stock Alerts
        $lowStock = (int) ($scope(\App\Models\Stock::query())->where('quantity', '<=', 5)->count() ?? 0);

        // 2. Pending Approvals
        $pendingApprovals = (int) ($scope(\App\Models\SalesApproval::query())->where('status', 'PENDING')->count() ?? 0);

        // 3. Overdue Payables (Unpaid Purchase Bills)
        $overduePayables = (int) ($scope(\App\Models\PurchaseInvoice::query())->where('payment_status', '!=', 'PAID')->count() ?? 0);

        return response()->json([
            'success' => true,
            'data'    => [
                'low_stock'          => $lowStock,
                'pending_approvals'  => $pendingApprovals,
                'overdue_payables'   => $overduePayables,
            ],
        ]);
    }
}
