<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ItemController extends Controller
{
    public function dashboardSummary(Request $request)
    {
        $totalItems = Product::count();
        $totalBarcodes = Product::whereNotNull('barcode')->where('barcode', '!=', '')->count();
        $totalStockValue = DB::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id')
            ->selectRaw('SUM(stocks.quantity * products.cost_price)')
            ->value(DB::raw('SUM(stocks.quantity * products.cost_price)')) ?? 0;
        $lowStockItems = Stock::where('quantity', '<=', 5)->where('quantity', '>', 0)->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'totalItems'      => (int) $totalItems,
                'totalBarcodes'   => (int) $totalBarcodes,
                'totalStockValue' => (float) $totalStockValue,
                'lowStockItems'   => (int) $lowStockItems,
            ],
        ]);
    }

    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand', 'tax', 'stocks']);

        if ($request->has('search') && $request->search != '') {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%")
                  ->orWhere('barcode', 'like', "%{$s}%");
            });
        }

        // 'limit' matches the param name every other master-list endpoint reads;
        // 'per_page' stays supported as a fallback for any existing caller of it.
        // Capped at 2000 even when a caller asks for more (e.g. a "fetch all" flow
        // sending a very large limit) - same reasoning as the all=true caps elsewhere.
        $limit = min(2000, max(1, $request->integer('limit', $request->integer('per_page', 50))));
        $page  = max(1, $request->integer('page', 1));
        $items = $query->orderBy('name')->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'success'    => true,
            'data'       => $items->items(),
            'total'      => $items->total(),
            'page'       => $items->currentPage(),
            'limit'      => $items->perPage(),
            'totalPages' => $items->lastPage(),
        ]);
    }
}
