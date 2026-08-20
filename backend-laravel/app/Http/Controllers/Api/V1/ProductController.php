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
            $items = Product::with([
                'category:id,name',
                'brand:id,name',
                'tax:id,name,rate',
                'purchaseTax:id,name,rate',
                'salesTax:id,name,rate',
                'sizeGroup:id,name,code',
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
        $product = Product::with(['category', 'brand', 'tax', 'purchaseTax', 'salesTax', 'sizeGroup', 'variants'])
            ->where('id', $id)
            ->orWhere('code', $id)
            ->firstOrFail();

        $data = $product->toArray();
        $data['product_group_id'] = $product->category_id;
        $data['sales_tax_id'] = $product->sales_tax_id ?: $product->tax_id;
        $data['purchase_tax_id'] = $product->purchase_tax_id ?: $product->tax_id;
        $data['barcode_id'] = $product->barcode;
        $data['hsn'] = $product->hsn_code;
        $data['uom'] = $product->unit;
        $data['active'] = (bool) $product->is_active;

        return response()->json(['success' => true, 'data' => $data]);
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

    protected function extractProductData(Request $request, $isUpdate = false)
    {
        $raw = $request->all();

        $code = $request->input('code');
        if (empty($code) && !$isUpdate) {
            $code = $request->input('sku') ?: ('PRD_' . strtoupper(substr(uniqid(), -6)));
        }

        $barcode = $request->input('barcode') ?: $request->input('barcode_id') ?: $request->input('barcodeID') ?: ($isUpdate ? null : $code);

        // Product Group / Category
        $categoryId = $request->input('category_id') ?: $request->input('product_group_id') ?: $request->input('productGroup');
        if (is_string($categoryId) && !is_numeric($categoryId)) {
            $cat = DB::table('categories')->where('name', $categoryId)->first();
            $categoryId = $cat ? $cat->id : null;
        }

        // Brand
        $brandId = $request->input('brand_id') ?: $request->input('brand');
        if (is_string($brandId) && !is_numeric($brandId)) {
            $b = DB::table('brands')->where('name', $brandId)->first();
            $brandId = $b ? $b->id : null;
        }

        // Taxes
        $salesTaxId = $request->input('sales_tax_id') ?: $request->input('salesTax') ?: $request->input('tax_id');
        if (is_string($salesTaxId) && !is_numeric($salesTaxId)) {
            $t = DB::table('taxes')->where('name', $salesTaxId)->first();
            $salesTaxId = $t ? $t->id : null;
        }

        $purchaseTaxId = $request->input('purchase_tax_id') ?: $request->input('purchaseTax') ?: $salesTaxId;
        if (is_string($purchaseTaxId) && !is_numeric($purchaseTaxId)) {
            $t = DB::table('taxes')->where('name', $purchaseTaxId)->first();
            $purchaseTaxId = $t ? $t->id : null;
        }

        // Size Group
        $sizeGroupId = $request->input('size_group_id') ?: $request->input('sizeGroup');
        if (is_string($sizeGroupId) && !is_numeric($sizeGroupId)) {
            $sg = DB::table('size_groups')->where('name', $sizeGroupId)->orWhere('code', $sizeGroupId)->first();
            $sizeGroupId = $sg ? $sg->id : null;
        }

        // Company
        $companyId = $request->input('company_id') ?: $request->input('company');
        if (is_string($companyId) && !is_numeric($companyId)) {
            $c = DB::table('companies')->where('name', $companyId)->orWhere('code', $companyId)->first();
            $companyId = $c ? $c->id : null;
        }

        $data = [
            'name'                      => $request->input('name'),
            'category_id'               => $categoryId ?: null,
            'brand_id'                  => $brandId ?: null,
            'tax_id'                    => $salesTaxId ?: null,
            'sales_tax_id'              => $salesTaxId ?: null,
            'purchase_tax_id'           => $purchaseTaxId ?: null,
            'size_group_id'             => $sizeGroupId ?: null,
            'company_id'                => $companyId ?: null,
            'hsn_code'                  => $request->input('hsn_code') ?: $request->input('hsn'),
            'unit'                      => $request->input('unit') ?: $request->input('uom') ?: 'PCS',
            'type'                      => $request->input('type'),
            'section'                   => $request->input('section'),
            'selling_mode'              => $request->input('selling_mode') ?: $request->input('sellingMode'),
            'pack_size'                 => $request->filled('pack_size') ? $request->input('pack_size') : $request->input('packSize'),
            'barcode_mode'              => $request->input('barcode_mode') ?: $request->input('barcodeMode'),
            'barcode_source'            => $request->input('barcode_source') ?: $request->input('barcodeSource'),
            'discount_mode'             => $request->input('discount_mode') ?: $request->input('discountMode'),
            'discount_mode_value'       => $request->filled('discount_mode_value') ? $request->input('discount_mode_value') : $request->input('discountModeValue'),
            'margin_min'                => $request->filled('margin_min') ? $request->input('margin_min') : $request->input('marginMin'),
            'margin_max'                => $request->filled('margin_max') ? $request->input('margin_max') : $request->input('marginMax'),
            'stock_holding_period'      => $request->input('stock_holding_period') ?: $request->input('stockHoldingPeriod'),
            'purchase_plan_mode'        => $request->input('purchase_plan_mode') ?: $request->input('purchasePlanMode'),
            'expected_gender'           => $request->input('expected_gender') ?: $request->input('expectedGender'),
            'dumping'                   => $request->has('dumping') ? $request->boolean('dumping') : false,
            'dumping_value'             => $request->input('dumping_value') ?: $request->input('dumpingValue'),
            'cess'                      => $request->has('cess') ? $request->boolean('cess') : false,
            'cess_value'                => $request->filled('cess_value') ? $request->input('cess_value') : $request->input('cessValue'),
            'daily_price'               => $request->has('daily_price') ? $request->boolean('daily_price') : ($request->has('dailyPrice') ? $request->boolean('dailyPrice') : false),
            'daily_price_value'         => $request->input('daily_price_value') ?: $request->input('dailyPriceValue'),
            'is_core'                   => $request->has('is_core') ? $request->boolean('is_core') : ($request->has('isCore') ? $request->boolean('isCore') : false),
            'is_core_value'             => $request->input('is_core_value') ?: $request->input('isCoreValue'),
            'exclude_reward'            => $request->has('exclude_reward') ? $request->boolean('exclude_reward') : ($request->has('excludeReward') ? $request->boolean('excludeReward') : false),
            'auto_po'                   => $request->has('auto_po') ? $request->boolean('auto_po') : ($request->has('autoPO') ? $request->boolean('autoPO') : false),
            'auto_po_value'             => $request->input('auto_po_value') ?: $request->input('autoPOValue'),
            'purchase_entry_attributes' => $request->input('purchase_entry_attributes') ?: $request->input('purchaseEntryAttrs'),
            'cost_price'                => $request->input('cost_price', 0),
            'selling_price'             => $request->input('selling_price', 0),
            'mrp'                       => $request->input('mrp', 0),
            'min_stock'                 => $request->input('min_stock', 0),
            'max_stock'                 => $request->input('max_stock', 1000),
            'is_active'                 => $request->has('active') ? $request->boolean('active') : ($request->has('is_active') ? $request->boolean('is_active') : true),
        ];

        if ($code) {
            $data['code'] = $code;
        }
        if ($barcode) {
            $data['barcode'] = $barcode;
        }

        // Filter out null values for updates if not explicitly provided
        return array_filter($data, fn($v) => $v !== null);
    }

    public function store(Request $request)
    {
        $data = $this->extractProductData($request);

        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:products,code',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $product = Product::create($data);
        Cache::forget('products_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully',
            'data'    => $this->show($product->id)->getOriginalContent()['data'] ?? $product,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::where('id', $id)
            ->orWhere('code', $id)
            ->firstOrFail();

        $data = $this->extractProductData($request, true);

        $validator = Validator::make($data, [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:products,code,' . $product->id,
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $product->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
            'data'    => $this->show($product->id)->getOriginalContent()['data'] ?? $product,
        ]);
    }

    public function destroy($id)
    {
        $product = Product::where('id', $id)
            ->orWhere('code', $id)
            ->firstOrFail();

        $product->delete();
        Cache::forget('products_total_unfiltered_count');

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
        ]);
    }
}
