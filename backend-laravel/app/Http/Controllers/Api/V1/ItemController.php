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

    private function formatItem($item)
    {
        $arr = $item->toArray();
        $arr['item_code'] = $item->code;
        $arr['selling_name'] = $item->name;
        $arr['printing_name'] = $item->description ?: $item->name;
        $arr['product_id'] = $item->category_id;
        $arr['pur_rate'] = (float) $item->cost_price;
        $arr['sale_rate'] = (float) $item->selling_price;
        $arr['mrp'] = (float) $item->mrp;
        $arr['active'] = (bool) $item->is_active;
        $arr['product'] = $item->category;
        return $arr;
    }

    private function extractItemData(Request $request): array
    {
        $data = $request->all();

        // Name mapping: selling_name or printing_name or name
        if (empty($data['name'])) {
            $data['name'] = $data['selling_name'] ?? $data['printing_name'] ?? ('Item ' . ($data['item_code'] ?? $data['code'] ?? ''));
        }

        // Code mapping: item_code or code
        if (empty($data['code'])) {
            $data['code'] = !empty($data['item_code']) ? $data['item_code'] : (!empty($data['sku']) ? $data['sku'] : ('ITM_' . strtoupper(substr(uniqid(), -6))));
        }
        if (empty($data['barcode'])) {
            $data['barcode'] = $data['code'];
        }

        // Category / Product mapping
        if (empty($data['category_id']) && !empty($data['product_id'])) {
            $data['category_id'] = $data['product_id'];
        }

        // Prices mapping
        if (isset($data['pur_rate']) && !isset($data['cost_price'])) {
            $data['cost_price'] = (float) $data['pur_rate'];
        }
        if (isset($data['sale_rate']) && !isset($data['selling_price'])) {
            $data['selling_price'] = (float) $data['sale_rate'];
        }
        if (isset($data['mrp'])) {
            $data['mrp'] = (float) $data['mrp'];
        }

        // Stock bounds
        if (isset($data['reorder_min']) && !isset($data['min_stock'])) {
            $data['min_stock'] = (int) $data['reorder_min'];
        }
        if (isset($data['reorder_max']) && !isset($data['max_stock'])) {
            $data['max_stock'] = (int) $data['reorder_max'];
        }

        // Active status
        if (isset($data['active'])) {
            $data['is_active'] = filter_var($data['active'], FILTER_VALIDATE_BOOLEAN);
        }

        // Validate foreign keys
        if (!empty($data['tax_id']) && !DB::table('taxes')->where('id', $data['tax_id'])->exists()) {
            $data['tax_id'] = null;
        }
        if (!empty($data['category_id']) && !DB::table('categories')->where('id', $data['category_id'])->exists()) {
            $data['category_id'] = null;
        }
        if (!empty($data['brand_id']) && !DB::table('brands')->where('id', $data['brand_id'])->exists()) {
            $data['brand_id'] = null;
        }

        // Handle image upload if present
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $data['image'] = '/storage/' . $path;
        }

        return $data;
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

        $limit = min(2000, max(1, $request->integer('limit', $request->integer('per_page', 50))));
        $page  = max(1, $request->integer('page', 1));
        $items = $query->orderBy('name')->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'success'    => true,
            'data'       => collect($items->items())->map(fn($item) => $this->formatItem($item)),
            'total'      => $items->total(),
            'page'       => $items->currentPage(),
            'limit'      => $items->perPage(),
            'totalPages' => $items->lastPage(),
        ]);
    }

    public function show($id)
    {
        $item = Product::with(['category', 'brand', 'tax', 'stocks', 'variants'])
            ->where('id', $id)
            ->orWhere('code', $id)
            ->firstOrFail();

        return response()->json(['success' => true, 'data' => $this->formatItem($item)]);
    }

    public function store(Request $request)
    {
        $data = $this->extractItemData($request);
        $item = Product::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Item created successfully',
            'data'    => $this->formatItem($item),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $item = Product::where('id', $id)
            ->orWhere('code', $id)
            ->firstOrFail();

        $data = $this->extractItemData($request);
        $item->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Item updated successfully',
            'data'    => $this->formatItem($item),
        ]);
    }

    public function destroy($id)
    {
        $item = Product::where('id', $id)
            ->orWhere('code', $id)
            ->firstOrFail();

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item deleted successfully',
        ]);
    }
}
