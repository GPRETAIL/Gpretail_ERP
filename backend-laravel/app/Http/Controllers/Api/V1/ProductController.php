<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ImportsMasterRows;
use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Tax;
use App\Services\GroupAggregationService;
use App\Services\PaginationService;
use App\Services\ProductFormData;
use App\Services\StoreQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    use ImportsMasterRows;

    public function __construct(
        protected PaginationService $paginationService,
        protected GroupAggregationService $groupAggregationService,
    ) {}

    public function dashboardSummary(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'totalProducts' => Cache::remember(StoreQuery::cacheKey('summary_products_count'), 60, fn () => Product::count()),
                'totalBrands' => Cache::remember(StoreQuery::cacheKey('summary_brands_count'), 60, fn () => Brand::count()),
                'totalSuppliers' => Cache::remember(StoreQuery::cacheKey('summary_suppliers_count'), 60, fn () => Supplier::count()),
                'totalTaxes' => Cache::remember(StoreQuery::cacheKey('summary_taxes_count'), 60, fn () => Tax::count()),
                'totalAgents' => 0,
                'totalConfigurations' => Cache::remember(StoreQuery::cacheKey('summary_configs_count'), 60, fn () => StoreQuery::table('system_configurations')->count()),
            ],
        ]);
    }

    /**
     * Shared by index() and groupedSummary() so grouping always reflects the same
     * search/column_filters/category_id/brand_id filters the list view applies.
     */
    private function filteredQuery(Request $request)
    {
        $query = Product::query();

        // High-Performance FULLTEXT / Indexed Search
        if ($request->filled('search')) {
            $s = trim($request->input('search'));
            $field = $request->input('field');

            if ($field && in_array($field, ['name', 'code', 'barcode', 'sku'])) {
                $query->where($field, 'like', "%{$s}%");
            } else {
                $cleaned = preg_replace('/[+\-><()~*\"@]+/', ' ', $s);
                $terms = array_filter(explode(' ', trim($cleaned)));

                if (! empty($terms) && strlen($s) >= 3) {
                    $booleanQuery = '+'.implode('* +', $terms).'*';
                    $query->whereRaw('MATCH(name, code, sku, barcode) AGAINST(? IN BOOLEAN MODE)', [$booleanQuery]);
                } else {
                    $query->where(function ($q) use ($s) {
                        $q->where('name', 'like', "{$s}%")
                            ->orWhere('code', 'like', "{$s}%")
                            ->orWhere('barcode', 'like', "{$s}%")
                            ->orWhere('sku', 'like', "{$s}%");
                    });
                }
            }
        }

        // Column filters
        if ($request->filled('column_filters')) {
            $filters = json_decode($request->input('column_filters'), true) ?? [];
            $allowed = ['code', 'name', 'sku', 'barcode', 'brand_id', 'category_id', 'is_active'];
            foreach ($filters as $filter) {
                $col = $filter['field'] ?? null;
                $op = $filter['operator'] ?? 'contains';
                $val = $filter['value'] ?? '';
                if (! $col || ! in_array($col, $allowed)) {
                    continue;
                }
                match ($op) {
                    'equals' => $query->where($col, $val),
                    'not_equals' => $query->where($col, '!=', $val),
                    'starts' => $query->where($col, 'like', "{$val}%"),
                    'ends' => $query->where($col, 'like', "%{$val}"),
                    'blank' => $query->where(fn ($q) => $q->whereNull($col)->orWhere($col, '')),
                    'not_blank' => $query->whereNotNull($col)->where($col, '!=', ''),
                    default => $query->where($col, 'like', "%{$val}%"),
                };
            }
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->input('brand_id'));
        }

        return $query;
    }

    public function groupedSummary(Request $request)
    {
        $result = $this->groupAggregationService->summarize($this->filteredQuery($request), 'products', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function index(Request $request)
    {
        $query = $this->filteredQuery($request);

        // ?dropdown=true or ?all=true — fast direct join for dropdowns / search / export
        if ($request->boolean('dropdown') || $request->input('mode') === 'dropdown') {
            $cap = (int) ($request->input('limit') ?? ($request->boolean('all') ? 25000 : 100));
            $items = StoreQuery::table('products')
                ->leftJoin('taxes', 'products.tax_id', '=', 'taxes.id')
                ->leftJoin('brands', 'products.brand_id', '=', 'brands.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->select([
                    'products.id',
                    'products.name',
                    'products.code',
                    'products.sku',
                    'products.barcode',
                    'products.category_id',
                    'products.brand_id',
                    'products.tax_id',
                    'products.size_group_id',
                    'products.hsn_code',
                    'products.unit',
                    'products.cost_price',
                    'products.selling_price',
                    'products.mrp',
                    'products.is_active',
                    'brands.name as brand_name',
                    'categories.name as category_name',
                    'taxes.name as tax_name',
                    'taxes.rate as tax_rate',
                ])
                ->when($request->filled('search'), function ($q) use ($request) {
                    $s = trim($request->input('search'));
                    // Match filteredQuery()'s column set above (name/code/sku/barcode) -- this dropdown-mode
                    // path is a separate raw query for speed and was missing sku, so a product findable by
                    // SKU in the regular list view silently couldn't be found from this page's dropdowns.
                    $q->where(function ($sub) use ($s) {
                        $sub->where('products.name', 'like', "%{$s}%")
                            ->orWhere('products.code', 'like', "%{$s}%")
                            ->orWhere('products.sku', 'like', "%{$s}%")
                            ->orWhere('products.barcode', 'like', "%{$s}%");
                    });
                })
                ->orderBy('products.name')
                ->limit($cap)
                ->get()
                ->map(function ($p) {
                    $taxRate = (float) ($p->tax_rate ?? 0);
                    $p->hsn = $p->hsn_code;
                    $p->brand = ['id' => $p->brand_id, 'name' => $p->brand_name];
                    $p->category = ['id' => $p->category_id, 'name' => $p->category_name];
                    $p->tax = ['id' => $p->tax_id, 'name' => $p->tax_name, 'rate' => $taxRate, 'tax_percentage' => $taxRate];
                    $p->purchaseTax = ['id' => $p->tax_id, 'name' => $p->tax_name, 'rate' => $taxRate, 'tax_percentage' => $taxRate];
                    $p->salesTax = ['id' => $p->tax_id, 'name' => $p->tax_name, 'rate' => $taxRate, 'tax_percentage' => $taxRate];

                    return $p;
                });

            return response()->json(['success' => true, 'data' => $items, 'total' => $items->count()]);
        }

        // 4. Unified Server-Side Pagination via PaginationService
        $query->with([
            'category:id,name',
            'brand:id,name',
            'tax:id,name,rate',
            'purchaseTax:id,name,rate',
            'salesTax:id,name,rate',
            'sizeGroup:id,name,code',
            'companyRef:id,name',
        ]);

        if ($request->boolean('all')) {
            $items = $query->orderBy('name')->limit(25000)->get();

            return response()->json(['success' => true, 'data' => $items, 'total' => $items->count()]);
        }

        $paginated = $this->paginationService->paginate(
            query: $query,
            resource: 'products',
            request: $request,
            options: [
                'default_sort' => 'name',
                'default_order' => 'asc',
                'allowed_sorts' => ['id', 'name', 'code', 'barcode', 'sku', 'selling_price', 'created_at'],
            ]
        );

        return response()->json($paginated);
    }

    public function show($id)
    {
        $product = Product::with(['category', 'brand', 'tax', 'purchaseTax', 'salesTax', 'sizeGroup', 'variants', 'stocks'])
            ->where(fn ($q) => $q->where('id', $id)->orWhere('code', $id))
            ->firstOrFail();

        $data = $product->toArray();
        $data['product_group_id'] = $product->master_details['product_group_attribute_id'] ?? $product->category_id;
        $data['sales_tax_id'] = $product->sales_tax_id ?: $product->tax_id;
        $data['purchase_tax_id'] = $product->purchase_tax_id;
        $data['barcode_id'] = $product->barcode;
        $data['hsn'] = $product->hsn_code;
        $data['uom'] = $product->unit;
        $data['active'] = (bool) $product->is_active;
        $data['stock_qty'] = (float) $product->stocks->sum('quantity');

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function findByBarcode($barcode)
    {
        $product = Product::with(['category', 'brand', 'tax', 'variants'])
            ->where(fn ($q) => $q->where('barcode', $barcode)->orWhere('code', $barcode))
            ->first();

        if (! $product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found for barcode: '.$barcode,
            ], 404);
        }

        return response()->json(['success' => true, 'data' => $product]);
    }

    protected function extractProductData(Request $request, ?Product $existing = null)
    {
        return app(ProductFormData::class)->prepare($request, $existing);
    }

    public function store(Request $request)
    {
        return DB::transaction(function () use ($request) {
            $data = $this->extractProductData($request);

            $storeScopeId = $this->resolveStoreId($request, 1);
            $validator = Validator::make($data, [
                'name' => 'required|string|max:255',
                'code' => ['required', 'string', 'max:50', Rule::unique('products', 'code')->where('company_id', $storeScopeId)],
            ]);

            $validator->validate();

            $product = Product::create($data);
            Cache::forget(StoreQuery::cacheKey('products_total_unfiltered_count'));

            return response()->json([
                'success' => true,
                'message' => 'Product created successfully',
                'data' => $this->show($product->id)->getOriginalContent()['data'] ?? $product,
            ], 201);
        });
    }

    public function update(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $product = Product::where(fn ($q) => $q->where('id', $id)->orWhere('code', $id))
                ->firstOrFail();

            $data = $this->extractProductData($request, $product);

            $storeScopeId = $this->resolveStoreId($request, (int) ($product->company_id ?: 1));
            $validator = Validator::make($data, [
                'name' => 'sometimes|required|string|max:255',
                'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('products', 'code')->where('company_id', $storeScopeId)->ignore($product->id)],
            ]);

            $validator->validate();

            $product->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Product updated successfully',
                'data' => $this->show($product->id)->getOriginalContent()['data'] ?? $product,
            ]);
        });
    }

    public function destroy($id)
    {
        $product = Product::where(fn ($q) => $q->where('id', $id)->orWhere('code', $id))
            ->firstOrFail();

        $product->delete();
        Cache::forget(StoreQuery::cacheKey('products_total_unfiltered_count'));

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
        ]);
    }
}
