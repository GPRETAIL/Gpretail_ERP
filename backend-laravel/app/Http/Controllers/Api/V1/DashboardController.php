<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DirectPurchase;
use App\Models\PosSale;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Stock;
use App\Models\StockOutward;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        return $this->overview($request);
    }

    public function overview(Request $request)
    {
        $totalSales = PosSale::sum('grand_total') ?? 0;
        $totalOrders = PosSale::count();
        $totalProducts = Product::count();
        $totalCustomers = Customer::count();
        $totalStockUnits = Stock::sum('quantity') ?? 0;

        $recentSales = PosSale::with(['customer', 'user'])
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        $topSelling = DB::table('pos_sale_items')
            ->join('products', 'pos_sale_items.product_id', '=', 'products.id')
            ->select('products.name', 'products.code', DB::raw('SUM(pos_sale_items.quantity) as total_sold'), DB::raw('SUM(pos_sale_items.subtotal) as total_revenue'))
            ->groupBy('products.id', 'products.name', 'products.code')
            ->orderByDesc('total_sold')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'overview' => [
                    'total_sales'      => (float) $totalSales,
                    'total_orders'     => (int) $totalOrders,
                    'total_products'   => (int) $totalProducts,
                    'total_customers'  => (int) $totalCustomers,
                    'total_stock_qty'  => (float) $totalStockUnits,
                    'low_stock_alerts' => Stock::where('quantity', '<=', 5)->count(),
                ],
                'recent_sales'   => $recentSales,
                'top_products'   => $topSelling,
                'monthly_trend'  => [
                    ['month' => 'Jan', 'sales' => 12000],
                    ['month' => 'Feb', 'sales' => 18000],
                    ['month' => 'Mar', 'sales' => 24000],
                    ['month' => 'Apr', 'sales' => 31000],
                    ['month' => 'May', 'sales' => 29000],
                    ['month' => 'Jun', 'sales' => 35000],
                ],
            ],
        ]);
    }

    public function warehouse(Request $request)
    {
        // Same X-Company-Scope-Id convention every other warehouse endpoint
        // in this app already reads (see e.g. DirectPurchaseController::index())
        // - "all"/absent means every store, otherwise scope to the one
        // selected. Previously these four sums always covered every store
        // regardless of what was selected, so switching stores never
        // changed what this dashboard reported.
        $storeId = $request->header('X-Company-Scope-Id');
        $scoped = fn ($query) => ($storeId && $storeId !== 'all') ? $query->where('store_id', $storeId) : $query;

        return response()->json([
            'success' => true,
            'data'    => [
                'total_items_in_stock' => $scoped(Stock::query())->sum('quantity') ?? 0,
                'low_stock_items'      => $scoped(Stock::query())->where('quantity', '<=', 5)->count(),
                'out_of_stock_items'   => $scoped(Stock::query())->where('quantity', '<=', 0)->count(),
                'total_inventory_val'  => $scoped(
                    DB::table('stocks')->join('products', 'stocks.product_id', '=', 'products.id')
                )->sum(DB::raw('stocks.quantity * products.cost_price')) ?? 0,
                // Previously hardcoded to always return empty, regardless of
                // real activity - this panel never showed anything.
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
        $todaySales = PosSale::whereDate('sale_date', $today)->sum('grand_total') ?? 0;
        $todayOrders = PosSale::whereDate('sale_date', $today)->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'totalBillsToday'      => (int) $todayOrders,
                'totalSettlementToday' => (float) $todaySales,
                'unsettledBills'       => 0,
                'todaySales'           => (float) $todaySales,
                'todayOrders'          => (int) $todayOrders,
                'yesterdaySales'       => 0,
                'thisMonthSales'       => (float) (PosSale::sum('grand_total') ?? 0),
                'averageBillValue'     => $todayOrders > 0 ? (float) ($todaySales / $todayOrders) : 0,
            ],
        ]);
    }

    public function analytics(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'sales_by_category' => DB::table('pos_sale_items')
                    ->join('products', 'pos_sale_items.product_id', '=', 'products.id')
                    ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                    ->select(DB::raw('COALESCE(categories.name, "General") as category_name'), DB::raw('SUM(pos_sale_items.subtotal) as total'))
                    ->groupBy('categories.name')
                    ->get(),
                'hourly_traffic' => [
                    ['hour' => '10:00', 'bills' => 2],
                    ['hour' => '12:00', 'bills' => 5],
                    ['hour' => '14:00', 'bills' => 3],
                    ['hour' => '16:00', 'bills' => 8],
                    ['hour' => '18:00', 'bills' => 12],
                    ['hour' => '20:00', 'bills' => 6],
                ],
                'growth_rate' => 14.8,
            ],
        ]);
    }
}
