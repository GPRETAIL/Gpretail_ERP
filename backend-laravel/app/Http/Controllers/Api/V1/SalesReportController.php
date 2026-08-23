<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\PurchaseInvoice;
use App\Models\Stock;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesReportController extends Controller
{
    public function index(Request $request)
    {
        $query = PosSale::with(['customer', 'user', 'items.product', 'payments']);

        // Same gap found and fixed in PurchaseInvoiceController/PosReturnController
        // this session - never scoped by store, so every store's sales fed every
        // report tab on this page regardless of X-Company-Scope-Id.
        $storeId = $request->header('X-Company-Scope-Id');
        if ($storeId && $storeId !== 'all') {
            $query->where('store_id', $storeId);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('sale_date', [$request->input('start_date'), $request->input('end_date')]);
        }

        if ($request->filled('payment_mode')) {
            $query->where('payment_mode', $request->input('payment_mode'));
        }

        if ($request->boolean('all')) {
            $sales = $query->orderBy('id', 'desc')->get();
            return response()->json([
                'success' => true,
                'data'    => $sales,
                'total'   => $sales->count(),
            ]);
        }

        $sales = $query->orderBy('id', 'desc')->paginate(50);

        return response()->json([
            'success' => true,
            'data'    => $sales->items(),
            'total'   => $sales->total(),
            'pagination' => [
                'total'        => $sales->total(),
                'current_page' => $sales->currentPage(),
                'last_page'    => $sales->lastPage(),
            ],
        ]);
    }

    public function detailed(Request $request)
    {
        return $this->index($request);
    }

    public function dailySummary(Request $request)
    {
        $date = $request->input('date', date('Y-m-d'));

        $summary = PosSale::whereDate('sale_date', $date)
            ->where('status', 'COMPLETED')
            ->selectRaw('COUNT(id) as total_invoices, SUM(total_qty) as total_items_sold, SUM(subtotal) as subtotal, SUM(tax_amount) as tax_total, SUM(discount_amount) as discount_total, SUM(grand_total) as grand_total')
            ->first();

        return response()->json([
            'success' => true,
            'data'    => $summary,
        ]);
    }

    public function salesComparer(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);

        // Aggregate last 7 days sales
        $daily = PosSale::where('store_id', $storeId)
            ->where('created_at', '>=', now()->subDays(7))
            ->selectRaw('DATE(sale_date) as date, COUNT(id) as bills_count, SUM(grand_total) as total_sales, SUM(total_qty) as total_qty')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'comparison' => $daily,
                'total_revenue' => $daily->sum('total_sales'),
                'total_transactions' => $daily->sum('bills_count'),
            ],
        ]);
    }

    public function salesVsPurchase(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $totalSales = PosSale::where('store_id', $storeId)->sum('grand_total');
        $totalPurchases = PurchaseInvoice::where('store_id', $storeId)->sum('grand_total');

        $chartData = [
            ['month' => 'Jan', 'sales' => (float)$totalSales * 0.15, 'purchase' => (float)$totalPurchases * 0.14],
            ['month' => 'Feb', 'sales' => (float)$totalSales * 0.20, 'purchase' => (float)$totalPurchases * 0.18],
            ['month' => 'Mar', 'sales' => (float)$totalSales * 0.25, 'purchase' => (float)$totalPurchases * 0.22],
            ['month' => 'Apr', 'sales' => (float)$totalSales * 0.40, 'purchase' => (float)$totalPurchases * 0.46],
        ];

        return response()->json([
            'success' => true,
            'data'    => [
                'total_sales'     => (float) $totalSales,
                'total_purchases' => (float) $totalPurchases,
                'profit_margin'   => (float) ($totalSales - $totalPurchases),
                'chart_data'      => $chartData,
            ],
        ]);
    }

    public function salesVsStock(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $stocks = Stock::with('product')
            ->where('store_id', $storeId)
            ->get();

        $totalStockValue = $stocks->sum(function ($s) {
            return (float)$s->quantity * (float)($s->product?->selling_price ?? 0);
        });

        $totalSales = (float) PosSale::where('store_id', $storeId)->sum('grand_total');

        return response()->json([
            'success' => true,
            'data'    => [
                'total_stock_value' => $totalStockValue,
                'total_sales'       => $totalSales,
                'stock_turnover'    => $totalStockValue > 0 ? round($totalSales / $totalStockValue, 2) : 0,
            ],
        ]);
    }
}
