<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ImportsMasterRows;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Stock;
use App\Services\GroupAggregationService;
use App\Services\MasterFormData;
use App\Services\PaginationService;
use App\Services\StoreQuery;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ItemController extends Controller
{
    use ImportsMasterRows;

    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
    ) {}

    public function dashboardSummary(Request $request)
    {
        $totalItems = Product::count();
        $totalBarcodes = Product::whereNotNull('barcode')->where('barcode', '!=', '')->count();
        $totalStockValue = StoreQuery::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id')
            ->selectRaw('SUM(stocks.quantity * products.cost_price) as stock_value')
            ->value('stock_value') ?? 0;
        $lowStockItems = Stock::where('quantity', '<=', 5)->where('quantity', '>', 0)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'totalItems' => (int) $totalItems,
                'totalBarcodes' => (int) $totalBarcodes,
                'totalStockValue' => (float) $totalStockValue,
                'lowStockItems' => (int) $lowStockItems,
            ],
        ]);
    }

    private function formatItem($item)
    {
        $arr = $item->toArray();
        $arr['item_code'] = $item->code;
        $arr['selling_name'] = $item->name;
        $arr['printing_name'] = $item->description ?: $item->name;
        $arr['product_id'] = $item->parent_product_id;
        $arr['pur_rate'] = (float) $item->cost_price;
        $arr['sale_rate'] = (float) $item->selling_price;
        $arr['mrp'] = (float) $item->mrp;
        $arr['active'] = (bool) $item->is_active;
        $arr['product'] = $item->itemProduct;

        return $arr;
    }

    private function extractItemData(Request $request, ?Product $item = null): array
    {
        $request->validate(array_fill_keys(
            ['pur_rate', 'cost_price', 'sale_rate', 'selling_price', 'mrp', 'reorder_min', 'reorder_max', 'min_stock', 'max_stock'],
            'nullable|numeric|min:0'
        ));
        $data = $request->all();

        // Name mapping: selling_name or printing_name or name
        if (empty($data['name'])) {
            $data['name'] = $data['selling_name'] ?? $data['printing_name'] ?? $item->name ?? ('Item '.($data['item_code'] ?? $data['code'] ?? ''));
        }

        // Code mapping: item_code or code
        if (empty($data['code'])) {
            $data['code'] = ! empty($data['item_code']) ? $data['item_code'] : (! empty($data['sku']) ? $data['sku'] : ($item->code ?? 'ITM_'.strtoupper(substr(uniqid(), -6))));
        }
        if (empty($data['barcode'])) {
            $data['barcode'] = $item->barcode ?? $data['code'];
        }

        if (array_key_exists('product_id', $data)) {
            $data['parent_product_id'] = $data['product_id'] ?: null;
        }

        // Prices mapping
        if (isset($data['pur_rate']) && ! isset($data['cost_price'])) {
            $data['cost_price'] = (float) $data['pur_rate'];
        }
        if (isset($data['sale_rate']) && ! isset($data['selling_price'])) {
            $data['selling_price'] = (float) $data['sale_rate'];
        }
        if (isset($data['mrp'])) {
            $data['mrp'] = (float) $data['mrp'];
        }

        // Stock bounds
        if (isset($data['reorder_min']) && ! isset($data['min_stock'])) {
            $data['min_stock'] = (int) $data['reorder_min'];
        }
        if (isset($data['reorder_max']) && ! isset($data['max_stock'])) {
            $data['max_stock'] = (int) $data['reorder_max'];
        }

        // Active status
        if (isset($data['active'])) {
            $data['is_active'] = filter_var($data['active'], FILTER_VALIDATE_BOOLEAN);
        }

        foreach (['tax_id' => 'taxes', 'category_id' => 'categories', 'brand_id' => 'brands', 'parent_product_id' => 'products'] as $field => $table) {
            if (! empty($data[$field]) && ! StoreQuery::table($table)->where('id', $data[$field])->exists()) {
                throw ValidationException::withMessages([$field => 'Select a valid record from this store.']);
            }
            if (array_key_exists($field, $data) && $data[$field] === '') {
                $data[$field] = null;
            }
        }

        // Handle image upload if present
        if ($request->hasFile('image')) {
            $request->validate([
                'image' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            ]);
            $path = $request->file('image')->store('products', 'public');
            $data['image'] = '/storage/'.$path;
        }

        $request->merge($data);

        return MasterFormData::prepare($request, $item ?? new Product);
    }

    private function filteredQuery(Request $request)
    {
        $query = Product::with(['category', 'brand', 'tax', 'stocks', 'itemProduct', 'size:id,name']);

        if ($request->has('search') && $request->search != '') {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('code', 'like', "%{$s}%")
                    ->orWhere('barcode', 'like', "%{$s}%");
            });
        }

        return $query;
    }

    public function groupedSummary(Request $request)
    {
        // Same underlying table/resource as ProductController -- reuses
        // config('pagination.resources.products.groupable_columns') as-is.
        $result = $this->groupAggregationService->summarize($this->filteredQuery($request), 'products', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);

        $result = $this->paginationService->paginate($query, 'products', $request, [
            'default_sort' => 'name',
            'default_order' => 'asc',
            'tie_breaker' => 'id',
            'allowed_sorts' => ['id', 'name', 'code', 'barcode', 'sku', 'selling_price', 'created_at'],
        ]);

        $result['data'] = collect($result['data'])->map(fn ($item) => $this->formatItem($item))->values();

        return response()->json($result);
    }

    public function show($id)
    {
        $item = Product::with(['category', 'brand', 'tax', 'stocks', 'variants', 'itemProduct', 'size:id,name'])
            ->where(fn ($q) => $q->where('id', $id)->orWhere('code', $id))
            ->firstOrFail();

        return response()->json(['success' => true, 'data' => $this->formatItem($item)]);
    }

    public function store(Request $request)
    {
        $data = $this->extractItemData($request);
        $request->merge($data);
        $request->validate(['name' => 'required|string|max:255', 'code' => ['required', 'string', 'max:50', Rule::unique('products', 'code')->where('company_id', $request->attributes->get('store_context_id'))]]);
        $item = Product::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Item created successfully',
            'data' => $this->formatItem($item),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $item = Product::where(fn ($q) => $q->where('id', $id)->orWhere('code', $id))
            ->firstOrFail();

        $data = $this->extractItemData($request, $item);
        $request->merge($data);
        $request->validate(['name' => 'required|string|max:255', 'code' => ['required', 'string', 'max:50', Rule::unique('products', 'code')->where('company_id', $request->attributes->get('store_context_id'))->ignore($item->id)]]);
        $item->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Item updated successfully',
            'data' => $this->formatItem($item),
        ]);
    }

    public function destroy($id)
    {
        $item = Product::where(fn ($q) => $q->where('id', $id)->orWhere('code', $id))
            ->firstOrFail();

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item deleted successfully',
        ]);
    }
}
