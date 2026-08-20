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

    public function show($id)
    {
        $item = Product::with(['category', 'brand', 'tax', 'stocks', 'variants'])->findOrFail($id);
        return response()->json(['success' => true, 'data' => $item]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        if (empty($data['code'])) {
            $data['code'] = !empty($data['item_code']) ? $data['item_code'] : (!empty($data['sku']) ? $data['sku'] : ('ITM_' . strtoupper(substr(uniqid(), -6))));
        }
        if (empty($data['barcode'])) {
            $data['barcode'] = $data['code'];
        }

        if (!empty($data['tax_id']) && !DB::table('taxes')->where('id', $data['tax_id'])->exists()) {
            $data['tax_id'] = null;
        }
        if (!empty($data['category_id']) && !DB::table('categories')->where('id', $data['category_id'])->exists()) {
            $data['category_id'] = null;
        }
        if (!empty($data['brand_id']) && !DB::table('brands')->where('id', $data['brand_id'])->exists()) {
            $data['brand_id'] = null;
        }

        $item = Product::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Item created successfully',
            'data'    => $item,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $item = Product::findOrFail($id);
        $data = $request->all();

        if (!empty($data['tax_id']) && !DB::table('taxes')->where('id', $data['tax_id'])->exists()) {
            unset($data['tax_id']);
        }
        if (!empty($data['category_id']) && !DB::table('categories')->where('id', $data['category_id'])->exists()) {
            unset($data['category_id']);
        }
        if (!empty($data['brand_id']) && !DB::table('brands')->where('id', $data['brand_id'])->exists()) {
            unset($data['brand_id']);
        }

        $item->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Item updated successfully',
            'data'    => $item,
        ]);
    }

    public function destroy($id)
    {
        $item = Product::findOrFail($id);
        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item deleted successfully',
        ]);
    }
}
