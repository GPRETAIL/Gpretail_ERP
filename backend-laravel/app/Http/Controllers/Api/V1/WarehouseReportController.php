<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Stock;
use App\Models\Product;
use App\Services\GroupAggregationService;
use App\Services\PaginationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarehouseReportController extends Controller
{
    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
    ) {}

    public function index(Request $request)
    {
        return $this->stockLedger($request);
    }

    /**
     * Enterprise pivot: stock qty/cost/retail value by any two of
     * store/brand/category, e.g. "retail value by brand x store". Point-in-time
     * snapshot (stock has no date dimension), so no date filter here -- unlike
     * salesPivot()/salesVsPurchase() which are all date-ranged. Thin wrapper
     * around GroupAggregationService::crossTab(), driven by
     * config('pagination.resources.stocks.pivotable_columns'/'measures').
     */
    public function stockPivot(Request $request)
    {
        $storeId = $request->input('company_id') ?: $request->header('X-Company-Scope-Id');
        $storeId = ($storeId && $storeId !== 'all') ? $storeId : null;

        $query = Stock::query();
        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        $result = $this->groupAggregationService->crossTab($query, 'stocks', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
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

        $result = $this->paginationService->paginate($query, 'stock_transactions', $request, [
            'default_sort'  => 'id',
            'default_order' => 'desc',
            'tie_breaker'   => 'id',
            'allowed_sorts' => ['id', 'quantity', 'created_at'],
        ]);

        return response()->json($result);
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

        // This used Laravel's plain paginate() directly, bypassing PaginationService like
        // every sibling method in this controller -- meaning no cursor mode, no sort
        // whitelist, and a bespoke response shape instead of the app's standard one.
        $result = $this->paginationService->paginate($query, 'stock_transactions', $request, [
            'default_sort'  => 'id',
            'default_order' => 'desc',
            'tie_breaker'   => 'id',
            'allowed_sorts' => ['id', 'quantity', 'created_at'],
        ]);

        return response()->json($result);
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

    /**
     * Dimensions available to the 360 Stock Analyzer's field picker, grouping
     * `stocks` joined to `products` (and, for company, to `stores`). Any field
     * the frontend lists that isn't here has no backing column in the schema
     * (garment-attribute leftovers from an older system) and gets a "not
     * available" notice instead of fake/blank data. "Supplier" is deliberately
     * not included -- products have no supplier_id, only purchase documents do,
     * so a real supplier dimension belongs to the dedicated supplier/product
     * purchase-history report, not a per-product grouping here.
     */
    private const STOCK_FIELD_CONFIG = [
        'brand'         => ['label' => 'Brand', 'column' => 'brand_id', 'join_table' => 'brands', 'label_from' => 'brands.name'],
        'product_group' => ['label' => 'Product Group', 'column' => 'category_id', 'join_table' => 'categories', 'label_from' => 'categories.name'],
        'hsn_code'      => ['label' => 'HSN Code', 'column' => 'hsn_code'],
        'type'          => ['label' => 'Type', 'column' => 'type'],
        'section'       => ['label' => 'Section', 'column' => 'section'],
        'product'       => ['label' => 'Product', 'column' => 'name'],
        'item'          => ['label' => 'Item', 'column' => 'name'],
        'product_code'  => ['label' => 'Product Code', 'column' => 'code'],
        'barcode'       => ['label' => 'Barcode', 'column' => 'barcode'],
    ];

    public function stockAnalyzer(Request $request)
    {
        $field = (string) $request->input('groupBy', 'brand');

        if ($field !== 'company' && !array_key_exists($field, self::STOCK_FIELD_CONFIG)) {
            $label = self::STOCK_FIELD_CONFIG[$field]['label'] ?? strtoupper(str_replace('_', ' ', $field));
            return response()->json([
                'success' => true,
                'data'    => [],
                'totals'  => null,
                'notice'  => "\"{$label}\" is not available for analysis yet -- this attribute has no matching data in the current system.",
            ]);
        }

        $storeId = $request->input('company_id') ?: $request->header('X-Company-Scope-Id');
        $storeId = ($storeId && $storeId !== 'all') ? $storeId : null;

        $query = DB::table('stocks as s')->join('products as p', 'p.id', '=', 's.product_id');
        if ($storeId) {
            $query->where('s.store_id', $storeId);
        }

        if ($field === 'company') {
            $query->leftJoin('stores', 'stores.id', '=', 's.store_id');
            $groupExpr = 's.store_id';
            $selects = ["{$groupExpr} as group_value", 'MAX(stores.name) as group_label'];
        } else {
            $config = self::STOCK_FIELD_CONFIG[$field];
            $groupExpr = "p.{$config['column']}";
            $selects = ["{$groupExpr} as group_value"];
            if (!empty($config['join_table'])) {
                $query->leftJoin($config['join_table'], "{$config['join_table']}.id", '=', "p.{$config['column']}");
                $selects[] = "MAX({$config['label_from']}) as group_label";
            }
        }

        $rows = $query->selectRaw(implode(', ', array_merge($selects, [
                'SUM(s.quantity) as qty',
                'SUM(s.quantity * p.cost_price) as cost_value',
                'SUM(s.quantity * p.selling_price) as retail_value',
            ])))
            ->groupBy($groupExpr)
            ->orderByDesc('retail_value')
            ->limit(500)
            ->get();

        $data = $rows->map(function ($row) {
            $qty = (float) $row->qty;
            $costValue = (float) $row->cost_value;
            $retailValue = (float) $row->retail_value;
            // margin % of retail, markup % of cost -- standard retail definitions.
            // markdown is the mirror case (selling below cost), 0 otherwise.
            $marginPerc = $retailValue > 0 ? round((($retailValue - $costValue) / $retailValue) * 100, 2) : 0;
            $markupPerc = $costValue > 0 ? round((($retailValue - $costValue) / $costValue) * 100, 2) : 0;
            $markdownPerc = ($costValue > 0 && $retailValue < $costValue)
                ? round((($costValue - $retailValue) / $costValue) * 100, 2)
                : 0;

            return [
                'description'   => empty($row->group_label) ? ($row->group_value === null ? '(Blank)' : (string) $row->group_value) : (string) $row->group_label,
                'qty'           => $qty,
                'cost_price'    => round($costValue, 2),
                'sale_price'    => round($retailValue, 2),
                'margin_perc'   => $marginPerc,
                'markup_perc'   => $markupPerc,
                'markdown_perc' => $markdownPerc,
            ];
        });

        $totalCost = round($data->sum('cost_price'), 2);
        $totalRetail = round($data->sum('sale_price'), 2);

        $totals = [
            'qty'           => $data->sum('qty'),
            'cost_price'    => $totalCost,
            'sale_price'    => $totalRetail,
            'margin_perc'   => $totalRetail > 0 ? round((($totalRetail - $totalCost) / $totalRetail) * 100, 2) : 0,
            'markup_perc'   => $totalCost > 0 ? round((($totalRetail - $totalCost) / $totalCost) * 100, 2) : 0,
            'markdown_perc' => ($totalCost > 0 && $totalRetail < $totalCost) ? round((($totalCost - $totalRetail) / $totalCost) * 100, 2) : 0,
        ];

        return response()->json(['success' => true, 'data' => $data, 'totals' => $totals]);
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
