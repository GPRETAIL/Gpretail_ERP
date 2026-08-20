<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Brand;
use App\Models\Supplier;
use App\Models\Tax;
use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    public function dashboardSummary(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'totalProducts'       => Cache::remember('summary_products_count', 60, fn() => Product::count()),
                'totalBrands'         => Cache::remember('summary_brands_count', 60, fn() => Brand::count()),
                'totalSuppliers'      => Cache::remember('summary_suppliers_count', 60, fn() => Supplier::count()),
                'totalTaxes'          => Cache::remember('summary_taxes_count', 60, fn() => Tax::count()),
                'totalAgents'         => 0,
                'totalConfigurations' => Cache::remember('summary_configs_count', 60, fn() => DB::table('system_configurations')->count()),
            ],
        ]);
    }

    public function index(Request $request)
    {
        // 1. Base Query
        $query = Product::query();
        $hasFilters = false;

        // 2. High-Performance FULLTEXT / Indexed Search
        if ($request->filled('search')) {
            $hasFilters = true;
            $s     = trim($request->input('search'));
            $field = $request->input('field');

            if ($field && in_array($field, ['name', 'code', 'barcode', 'sku'])) {
                $query->where($field, 'like', "%{$s}%");
            } else {
                $cleaned = preg_replace('/[+\-><()~*\"@]+/', ' ', $s);
                $terms = array_filter(explode(' ', trim($cleaned)));

                if (!empty($terms) && strlen($s) >= 3) {
                    $booleanQuery = '+' . implode('* +', $terms) . '*';
                    $query->whereRaw("MATCH(name, code, sku, barcode) AGAINST(? IN BOOLEAN MODE)", [$booleanQuery]);
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

        // 3. Column filters
        if ($request->filled('column_filters')) {
            $hasFilters = true;
            $filters = json_decode($request->input('column_filters'), true) ?? [];
            $allowed = ['code', 'name', 'sku', 'barcode', 'brand_id', 'category_id', 'is_active'];
            foreach ($filters as $filter) {
                $col = $filter['field'] ?? null;
                $op  = $filter['operator'] ?? 'contains';
                $val = $filter['value'] ?? '';
                if (!$col || !in_array($col, $allowed)) continue;
                match ($op) {
                    'equals'    => $query->where($col, $val),
                    'not_equals'=> $query->where($col, '!=', $val),
                    'starts'    => $query->where($col, 'like', "{$val}%"),
                    'ends'      => $query->where($col, 'like', "%{$val}"),
                    'blank'     => $query->whereNull($col)->orWhere($col, ''),
                    'not_blank' => $query->whereNotNull($col)->where($col, '!=', ''),
                    default     => $query->where($col, 'like', "%{$val}%"),
                };
            }
        }

        if ($request->filled('category_id')) {
            $hasFilters = true;
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('brand_id')) {
            $hasFilters = true;
            $query->where('brand_id', $request->input('brand_id'));
        }

        // ?dropdown=true or ?all=true — fast direct join for dropdowns / search / export
        if ($request->boolean('dropdown') || $request->boolean('all') || $request->input('mode') === 'dropdown' || in_array($request->input('limit'), ['500', '1000', 500, 1000])) {
            $cap = (int) ($request->input('limit') ?? ($request->boolean('all') ? 25000 : 100));
            $items = DB::table('products')
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
                    'taxes.rate as tax_rate'
                ])
                ->when($request->filled('search'), function ($q) use ($request) {
                    $s = trim($request->input('search'));
                    $q->where(function ($sub) use ($s) {
                        $sub->where('products.name', 'like', "%{$s}%")
                            ->orWhere('products.code', 'like', "%{$s}%")
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

        // 4. Deferred Join Server-Side Pagination
        $limit  = max(1, (int) ($request->input('limit') ?? $request->input('per_page') ?? 20));
        $page   = max(1, $request->integer('page', 1));
        $offset = ($page - 1) * $limit;

        if (!$hasFilters) {
            $total = Cache::remember('products_total_unfiltered_count', 60, fn() => Product::count());
        } else {
            $total = (clone $query)->count();
        }

        $totalPages = max((int) ceil($total / $limit), 1);

        // Deferred Join: Index-only scan on subquery IDs, followed by main table join
        $idSubquery = (clone $query)->select('products.id')->orderBy('products.name')->forPage($page, $limit);
        $ids = $idSubquery->pluck('id')->toArray();

        if (empty($ids)) {
            $items = [];
        } else {
            $items = Product::select([
                'id', 'name', 'code', 'sku', 'barcode',
                'category_id', 'brand_id', 'tax_id', 'size_group_id',
                'hsn_code', 'unit', 'cost_price', 'selling_price', 'mrp',
                'min_stock', 'max_stock', 'is_active', 'created_at', 'updated_at'
            ])->with([
                'category:id,name',
                'brand:id,name',
                'tax:id,name,rate',
            ])->whereIn('id', $ids)
              ->orderBy('name')
              ->get();
        }

        return response()->json([
            'success'    => true,
            'data'       => $items,
            'total'      => $total,
            'page'       => $page,
            'limit'      => $limit,
            'totalPages' => $totalPages,
            'pagination' => [
                'total'        => $total,
                'current_page' => $page,
                'last_page'    => $totalPages,
                'per_page'     => $limit,
            ],
        ]);
    }

    public function show($id)
    {
        $product = Product::with(['category', 'brand', 'tax', 'variants'])->findOrFail($id);
        return response()->json(['success' => true, 'data' => $product]);
    }

    public function findByBarcode($barcode)
    {
        $product = Product::with(['category', 'brand', 'tax', 'variants'])
            ->where('barcode', $barcode)
            ->orWhere('code', $barcode)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found for barcode: ' . $barcode,
            ], 404);
        }

        return response()->json(['success' => true, 'data' => $product]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        if (empty($data['code'])) {
            $data['code'] = !empty($data['sku']) ? $data['sku'] : ('PRD_' . strtoupper(substr(uniqid(), -6)));
        }
        if (empty($data['barcode'])) {
            $data['barcode'] = $data['code'];
        }

        // Validate tax_id existence only if non-empty
        if (!empty($data['tax_id']) && !DB::table('taxes')->where('id', $data['tax_id'])->exists()) {
            $data['tax_id'] = null;
        }
        if (!empty($data['category_id']) && !DB::table('categories')->where('id', $data['category_id'])->exists()) {
            $data['category_id'] = null;
        }
        if (!empty($data['brand_id']) && !DB::table('brands')->where('id', $data['brand_id'])->exists()) {
            $data['brand_id'] = null;
        }

        $validator = Validator::make($data, [
            'name'          => 'required|string|max:255',
            'code'          => 'required|string|max:50|unique:products,code',
            'category_id'   => 'nullable',
            'brand_id'      => 'nullable',
            'tax_id'        => 'nullable',
            'cost_price'    => 'nullable|numeric|min:0',
            'selling_price' => 'nullable|numeric|min:0',
            'mrp'           => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $product = Product::create($data);
        Cache::forget('products_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully',
            'data'    => $product,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:products,code,' . $id,
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $product->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
            'data'    => $product,
        ]);
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();
        Cache::forget('products_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
        ]);
    }
}
