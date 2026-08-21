<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Stock;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarehouseReportController extends Controller
{
    public function index(Request $request)
    {
        return $this->stockLedger($request);
    }

    public function stockLedger(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $query = Stock::with(['product.category', 'product.brand', 'store'])
            ->where('store_id', $storeId);

        if ($request->boolean('all')) {
            $stocks = $query->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $stocks,
                'total'   => $stocks->count(),
            ]);
        }

        $stocks = $query->paginate($request->integer('limit', 50));

        return response()->json([
            'success' => true,
            'data'    => $stocks->items(),
            'total'   => $stocks->total(),
            'pagination' => [
                'total'        => $stocks->total(),
                'current_page' => $stocks->currentPage(),
                'last_page'    => $stocks->lastPage(),
            ],
        ]);
    }

    public function lowStock(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $query = Stock::with(['product', 'store'])
            ->where('store_id', $storeId)
            ->whereHas('product', function ($q) {
                $q->whereColumn('stocks.quantity', '<=', 'products.min_stock');
            });

        // Previously always unbounded (no pagination at all, regardless of
        // request params) - capped even on an explicit ?all=true, same
        // reasoning as the master-list endpoints' all=true caps.
        if ($request->boolean('all')) {
            $lowStocks = $query->limit(2000)->get();
            return response()->json([
                'success' => true,
                'data'    => $lowStocks,
                'total'   => $lowStocks->count(),
            ]);
        }

        $limit = $request->integer('limit', 50);
        $paginated = $query->paginate($limit);

        return response()->json([
            'success'    => true,
            'data'       => $paginated->items(),
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }

    public function valuation(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $summary = DB::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id')
            ->where('stocks.store_id', $storeId)
            ->selectRaw('SUM(stocks.quantity) as total_units, SUM(stocks.quantity * products.cost_price) as total_cost_value, SUM(stocks.quantity * products.selling_price) as total_retail_value')
            ->first();

        return response()->json([
            'success' => true,
            'data'    => $summary,
        ]);
    }

    public function stockAnalyzer(Request $request)
    {
        $storeId = $request->header('X-Company-Scope-Id', 1);

        $query = Stock::with(['product.category', 'product.brand'])
            ->where('store_id', $storeId);

        $mapRow = function ($s) {
            $qty = (float) $s->quantity;
            $cost = (float) ($s->product?->cost_price ?? 0);
            $retail = (float) ($s->product?->selling_price ?? 0);
            return [
                'product_id'    => $s->product_id,
                'name'          => $s->product?->name,
                'code'          => $s->product?->code,
                'brand'         => $s->product?->brand?->name ?? 'Generic',
                'category'      => $s->product?->category?->name ?? 'General',
                'quantity'      => $qty,
                'cost_value'    => $qty * $cost,
                'retail_value'  => $qty * $retail,
                'status'        => $qty <= 5 ? 'LOW_STOCK' : ($qty >= 100 ? 'OVERSTOCK' : 'OPTIMAL'),
            ];
        };

        // Previously always loaded every stock row (+ product/category/brand
        // relations) into memory on every call, unconditionally.
        if ($request->boolean('all')) {
            $analysis = $query->limit(2000)->get()->map($mapRow);
            return response()->json([
                'success' => true,
                'data'    => $analysis,
                'total'   => $analysis->count(),
            ]);
        }

        $limit = $request->integer('limit', 50);
        $paginated = $query->paginate($limit);
        $analysis = collect($paginated->items())->map($mapRow);

        return response()->json([
            'success'    => true,
            'data'       => $analysis,
            'total'      => $paginated->total(),
            'page'       => $paginated->currentPage(),
            'limit'      => $paginated->perPage(),
            'totalPages' => $paginated->lastPage(),
        ]);
    }

    public function warehouseCustomization(Request $request)
    {
        $storeId = $request->input('company_id')
            ?? $request->input('companyId')
            ?? $request->header('X-Company-Scope-Id', 1);

        if ($request->isMethod('post') || $request->isMethod('put')) {
            if (!$storeId) {
                return response()->json(['success' => false, 'message' => 'companyId is required'], 422);
            }

            $store = \App\Models\Store::find($storeId);
            if (!$store) {
                return response()->json(['success' => false, 'message' => 'Store not found'], 404);
            }

            $customization = $request->except(['companyId', 'company_id']);
            $store->update([
                'barcode_customization' => $customization,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Warehouse barcode customisation saved successfully',
                'data'    => $store->barcode_customization,
            ]);
        }

        $store = $storeId ? \App\Models\Store::find($storeId) : null;

        return response()->json([
            'success' => true,
            'data'    => $store?->barcode_customization ?? [],
        ]);
    }
}
