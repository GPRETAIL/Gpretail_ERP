<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\PurchaseInvoice;
use App\Models\Stock;
use App\Models\Product;
use App\Services\GroupAggregationService;
use App\Services\PaginationService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SalesReportController extends Controller
{
    public function __construct(
        private readonly PaginationService $paginationService,
        private readonly GroupAggregationService $groupAggregationService,
    ) {}

    /**
     * Enterprise pivot: revenue/qty/bills by any two of store/month/payment-mode,
     * e.g. "revenue by store x month". Thin wrapper -- the bounded 2D aggregation
     * itself lives in GroupAggregationService::crossTab(), driven by
     * config('pagination.resources.pos_sales.pivotable_columns'/'measures').
     */
    public function salesPivot(Request $request)
    {
        $storeId = $this->resolveStoreId($request);
        $query = PosSale::query();
        if ($storeId) {
            $query->where('store_id', $storeId);
        }
        if ($request->filled('dateFrom')) {
            $query->whereDate('sale_date', '>=', $request->input('dateFrom'));
        }
        if ($request->filled('dateTo')) {
            $query->whereDate('sale_date', '<=', $request->input('dateTo'));
        }

        $result = $this->groupAggregationService->crossTab($query, 'pos_sales', $request);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function index(Request $request)
    {
        $query = PosSale::with(['customer', 'user', 'items.product', 'payments']);

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

        $result = $this->paginationService->paginate($query, 'pos_sales', $request, [
            'default_sort'  => 'id',
            'default_order' => 'desc',
            'tie_breaker'   => 'id',
            'allowed_sorts' => ['id', 'sale_date', 'invoice_no', 'grand_total', 'created_at'],
        ]);

        return response()->json($result);
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

    /**
     * Dimensions available to salesComparer/salesVsPurchase/salesVsStock's field
     * picker. Each maps to a real column -- either on `products` (joined via each
     * item table's product_id) or directly on the relevant header table
     * (store_id/customer_id). Any field the frontend lists that isn't here has no
     * backing column in the schema (garment-attribute leftovers from an older
     * system) and gets a "not available" notice instead of fake/blank data.
     */
    private const FIELD_CONFIG = [
        'brand'         => ['label' => 'Brand', 'source' => 'product', 'column' => 'brand_id', 'join_table' => 'brands', 'label_from' => 'brands.name'],
        'product_group' => ['label' => 'Product Group', 'source' => 'product', 'column' => 'category_id', 'join_table' => 'categories', 'label_from' => 'categories.name'],
        'hsn_code'      => ['label' => 'HSN Code', 'source' => 'product', 'column' => 'hsn_code'],
        'type'          => ['label' => 'Type', 'source' => 'product', 'column' => 'type'],
        'section'       => ['label' => 'Section', 'source' => 'product', 'column' => 'section'],
        'product'       => ['label' => 'Product', 'source' => 'product', 'column' => 'name'],
        'item'          => ['label' => 'Item', 'source' => 'product', 'column' => 'name'],
        'product_code'  => ['label' => 'Product Code', 'source' => 'product', 'column' => 'code'],
        'barcode'       => ['label' => 'Barcode', 'source' => 'product', 'column' => 'barcode'],
        'company'       => ['label' => 'Company', 'source' => 'store'],
        'customer'      => ['label' => 'Customer', 'source' => 'customer'],
    ];

    private function fieldNotice(string $field): string
    {
        $label = self::FIELD_CONFIG[$field]['label'] ?? strtoupper(str_replace('_', ' ', $field));
        return "\"{$label}\" is not available for analysis yet -- this attribute has no matching data in the current system.";
    }

    private function resolveStoreId(Request $request)
    {
        $storeId = $request->input('company_id') ?: $request->header('X-Company-Scope-Id');
        return ($storeId && $storeId !== 'all') ? $storeId : null;
    }

    /**
     * Groups one item-level table (joined to its header, and to products when the
     * dimension lives there) by the requested field, returning
     * {group_value, group_label?, ...sums} rows capped at $limit, ordered by the
     * first sum column descending. $wheres are applied to the query before
     * grouping (each receives the query builder and filters on 'h.'/'i.' columns).
     */
    private function groupItemsByDimension(
        string $itemTable,
        string $headerTable,
        string $headerForeignKey,
        string $field,
        array $wheres,
        array $sumSelects,
        int $limit = 500
    ): Collection {
        $config = self::FIELD_CONFIG[$field] ?? null;
        if (!$config) {
            return collect();
        }

        $query = DB::table("{$itemTable} as i")
            ->join("{$headerTable} as h", 'h.id', '=', "i.{$headerForeignKey}");

        foreach ($wheres as $callback) {
            $callback($query);
        }

        $labelSelect = null;

        if ($config['source'] === 'product') {
            $query->join('products as p', 'p.id', '=', 'i.product_id');
            $groupExpr = "p.{$config['column']}";
            if (!empty($config['join_table'])) {
                $query->leftJoin($config['join_table'], "{$config['join_table']}.id", '=', "p.{$config['column']}");
                $labelSelect = "MAX({$config['label_from']}) as group_label";
            }
        } elseif ($config['source'] === 'store') {
            $groupExpr = 'h.store_id';
            $query->leftJoin('stores', 'stores.id', '=', 'h.store_id');
            $labelSelect = 'MAX(stores.name) as group_label';
        } else {
            $groupExpr = 'h.customer_id';
            $query->leftJoin('customers', 'customers.id', '=', 'h.customer_id');
            $labelSelect = 'MAX(customers.name) as group_label';
        }

        $selects = ["{$groupExpr} as group_value"];
        if ($labelSelect) {
            $selects[] = $labelSelect;
        }
        foreach ($sumSelects as $alias => $expr) {
            $selects[] = "{$expr} as {$alias}";
        }

        $firstAlias = array_key_first($sumSelects);

        return $query->selectRaw(implode(', ', $selects))
            ->groupBy($groupExpr)
            ->orderByDesc($firstAlias)
            ->limit($limit)
            ->get();
    }

    /**
     * Left-merges two dimension-grouped result sets (keyed by group_value) into
     * one row per distinct key: {group_value, group_label, a, b} where a/b are the
     * original rows from each side (null if that side had no row for this key).
     */
    private function mergeByGroupValue(Collection $a, Collection $b): Collection
    {
        $keyOf = fn ($r) => $r->group_value === null ? '__null__' : (string) $r->group_value;
        $aKeyed = $a->keyBy($keyOf);
        $bKeyed = $b->keyBy($keyOf);
        $allKeys = $aKeyed->keys()->merge($bKeyed->keys())->unique();

        return $allKeys->map(function ($key) use ($aKeyed, $bKeyed) {
            $ar = $aKeyed->get($key);
            $br = $bKeyed->get($key);
            return (object) [
                'group_value' => $ar->group_value ?? $br->group_value ?? null,
                'group_label' => $ar->group_label ?? $br->group_label ?? null,
                'a' => $ar,
                'b' => $br,
            ];
        })->values();
    }

    private function describeRow($row): string
    {
        if (!empty($row->group_label)) {
            return (string) $row->group_label;
        }
        return $row->group_value === null ? '(Blank)' : (string) $row->group_value;
    }

    public function salesComparer(Request $request)
    {
        $field = (string) $request->input('groupBy', 'brand');

        if (!array_key_exists($field, self::FIELD_CONFIG)) {
            return response()->json(['success' => true, 'data' => [], 'totals' => null, 'notice' => $this->fieldNotice($field)]);
        }

        $storeId = $this->resolveStoreId($request);
        $saleFrom = $request->input('saleFromDate');
        $saleTo = $request->input('saleToDate');

        $sales = $this->groupItemsByDimension('pos_sale_items', 'pos_sales', 'pos_sale_id', $field, [
            function ($q) use ($storeId, $saleFrom, $saleTo) {
                if ($storeId) $q->where('h.store_id', $storeId);
                if ($saleFrom) $q->whereDate('h.sale_date', '>=', $saleFrom);
                if ($saleTo) $q->whereDate('h.sale_date', '<=', $saleTo);
            },
        ], [
            'qty_sold' => 'SUM(i.quantity)',
            'net_amount' => 'SUM(i.subtotal)',
            'net_cost' => 'SUM(i.quantity * i.cost_price)',
            'total_discount' => 'SUM(i.discount)',
        ]);

        $returns = $this->groupItemsByDimension('pos_return_items', 'pos_returns', 'pos_return_id', $field, [
            function ($q) use ($storeId, $saleFrom, $saleTo) {
                if ($storeId) $q->where('h.store_id', $storeId);
                if ($saleFrom) $q->whereDate('h.return_date', '>=', $saleFrom);
                if ($saleTo) $q->whereDate('h.return_date', '<=', $saleTo);
            },
        ], [
            'qty_returned' => 'SUM(i.quantity)',
        ]);

        $merged = $this->mergeByGroupValue($sales, $returns);

        $rows = $merged->map(function ($row) {
            $qtySold = (float) ($row->a->qty_sold ?? 0);
            $qtyReturned = (float) ($row->b->qty_returned ?? 0);
            $netAmount = (float) ($row->a->net_amount ?? 0);
            $netCost = (float) ($row->a->net_cost ?? 0);
            $totalDiscount = (float) ($row->a->total_discount ?? 0);
            $marginPerc = $netAmount > 0 ? round((($netAmount - $netCost) / $netAmount) * 100, 2) : 0;
            $markupPerc = $netCost > 0 ? round((($netAmount - $netCost) / $netCost) * 100, 2) : 0;

            return [
                'description' => $this->describeRow($row),
                'qty_sold' => $qtySold,
                'qty_returned' => $qtyReturned,
                'net_qty' => $qtySold - $qtyReturned,
                'net_amount' => round($netAmount, 2),
                'net_cost' => round($netCost, 2),
                'total_discount' => round($totalDiscount, 2),
                'margin_perc' => $marginPerc,
                'markup_perc' => $markupPerc,
            ];
        })->sortByDesc('net_amount')->values();

        $sumAmount = $rows->sum('net_amount');
        $sumCost = $rows->sum('net_cost');

        $totals = [
            'qty_sold' => $rows->sum('qty_sold'),
            'qty_returned' => $rows->sum('qty_returned'),
            'net_qty' => $rows->sum('net_qty'),
            'net_amount' => round($sumAmount, 2),
            'net_cost' => round($sumCost, 2),
            'total_discount' => round($rows->sum('total_discount'), 2),
            'margin_perc' => $sumAmount > 0 ? round((($sumAmount - $sumCost) / $sumAmount) * 100, 2) : 0,
            'markup_perc' => $sumCost > 0 ? round((($sumAmount - $sumCost) / $sumCost) * 100, 2) : 0,
        ];

        return response()->json(['success' => true, 'data' => $rows, 'totals' => $totals]);
    }

    public function salesVsPurchase(Request $request)
    {
        $field = (string) $request->input('groupBy', 'brand');

        if ($field === 'customer' || !array_key_exists($field, self::FIELD_CONFIG)) {
            return response()->json(['success' => true, 'data' => [], 'totals' => null, 'notice' => $this->fieldNotice($field)]);
        }

        $storeId = $this->resolveStoreId($request);
        $saleFrom = $request->input('saleFromDate');
        $saleTo = $request->input('saleToDate');
        $purchaseFrom = $request->input('purchaseFromDate');
        $purchaseTo = $request->input('purchaseToDate');

        $sales = $this->groupItemsByDimension('pos_sale_items', 'pos_sales', 'pos_sale_id', $field, [
            function ($q) use ($storeId, $saleFrom, $saleTo) {
                if ($storeId) $q->where('h.store_id', $storeId);
                if ($saleFrom) $q->whereDate('h.sale_date', '>=', $saleFrom);
                if ($saleTo) $q->whereDate('h.sale_date', '<=', $saleTo);
            },
        ], [
            'qty_sold' => 'SUM(i.quantity)',
            'sale_amount' => 'SUM(i.subtotal)',
        ]);

        $returns = $this->groupItemsByDimension('pos_return_items', 'pos_returns', 'pos_return_id', $field, [
            function ($q) use ($storeId, $saleFrom, $saleTo) {
                if ($storeId) $q->where('h.store_id', $storeId);
                if ($saleFrom) $q->whereDate('h.return_date', '>=', $saleFrom);
                if ($saleTo) $q->whereDate('h.return_date', '<=', $saleTo);
            },
        ], [
            'qty_returned' => 'SUM(i.quantity)',
        ]);

        // Direct Purchases + Purchase Invoices only (GRNs deliberately excluded --
        // same document-scope decision as the Phase 3 supplier/product report,
        // to avoid double-counting until the receiving workflow is confirmed).
        $directPurchases = $this->groupItemsByDimension('direct_purchase_items', 'direct_purchases', 'direct_purchase_id', $field, [
            function ($q) use ($storeId, $purchaseFrom, $purchaseTo) {
                if ($storeId) $q->where('h.store_id', $storeId);
                if ($purchaseFrom) $q->whereDate('h.purchase_date', '>=', $purchaseFrom);
                if ($purchaseTo) $q->whereDate('h.purchase_date', '<=', $purchaseTo);
            },
        ], [
            'purchase_qty' => 'SUM(i.quantity)',
            'purchase_amount' => 'SUM(i.total_price)',
        ]);

        $invoicePurchases = $this->groupItemsByDimension('purchase_invoice_items', 'purchase_invoices', 'purchase_invoice_id', $field, [
            function ($q) use ($storeId, $purchaseFrom, $purchaseTo) {
                if ($storeId) $q->where('h.store_id', $storeId);
                if ($purchaseFrom) $q->whereDate('h.invoice_date', '>=', $purchaseFrom);
                if ($purchaseTo) $q->whereDate('h.invoice_date', '<=', $purchaseTo);
            },
        ], [
            'purchase_qty' => 'SUM(i.quantity)',
            'purchase_amount' => 'SUM(i.total)',
        ]);

        $purchases = $this->mergeByGroupValue($directPurchases, $invoicePurchases)->map(function ($row) {
            return (object) [
                'group_value' => $row->group_value,
                'group_label' => $row->group_label,
                'purchase_qty' => (float) ($row->a->purchase_qty ?? 0) + (float) ($row->b->purchase_qty ?? 0),
                'purchase_amount' => (float) ($row->a->purchase_amount ?? 0) + (float) ($row->b->purchase_amount ?? 0),
            ];
        });

        $salesReturns = $this->mergeByGroupValue($sales, $returns)->map(function ($row) {
            return (object) [
                'group_value' => $row->group_value,
                'group_label' => $row->group_label,
                'qty_sold' => (float) ($row->a->qty_sold ?? 0),
                'qty_returned' => (float) ($row->b->qty_returned ?? 0),
                'sale_amount' => (float) ($row->a->sale_amount ?? 0),
            ];
        });

        $merged = $this->mergeByGroupValue($salesReturns, $purchases);

        $rows = $merged->map(function ($row) {
            $qtySold = (float) ($row->a->qty_sold ?? 0);
            $qtyReturned = (float) ($row->a->qty_returned ?? 0);
            $netQty = $qtySold - $qtyReturned;
            $saleAmount = (float) ($row->a->sale_amount ?? 0);
            $purchaseQty = (float) ($row->b->purchase_qty ?? 0);
            $purchaseAmount = (float) ($row->b->purchase_amount ?? 0);
            $salePrice = $qtySold > 0 ? round($saleAmount / $qtySold, 2) : 0;
            $purchasePrice = $purchaseQty > 0 ? round($purchaseAmount / $purchaseQty, 2) : 0;
            $marginPerc = $saleAmount > 0 ? round((($saleAmount - $purchaseAmount) / $saleAmount) * 100, 2) : 0;
            $markupPerc = $purchaseAmount > 0 ? round((($saleAmount - $purchaseAmount) / $purchaseAmount) * 100, 2) : 0;

            return [
                'description' => $this->describeRow($row),
                'qty_sold' => $qtySold,
                'qty_returned' => $qtyReturned,
                'net_qty' => $netQty,
                'sale_amount' => round($saleAmount, 2),
                'purchase_amount' => round($purchaseAmount, 2),
                'sale_price' => $salePrice,
                'purchase_price' => $purchasePrice,
                'margin_perc' => $marginPerc,
                'markup_perc' => $markupPerc,
                // Not a TABLE_COLUMNS field -- kept so totals below can compute a
                // correct weighted average purchase_price instead of a naive mean.
                'purchase_qty' => $purchaseQty,
            ];
        })->sortByDesc('sale_amount')->values();

        $sumSale = $rows->sum('sale_amount');
        $sumPurchase = $rows->sum('purchase_amount');
        $sumQtySold = $rows->sum('qty_sold');
        $sumPurchaseQty = $rows->sum('purchase_qty');

        $totals = [
            'qty_sold' => $sumQtySold,
            'qty_returned' => $rows->sum('qty_returned'),
            'net_qty' => $rows->sum('net_qty'),
            'sale_amount' => round($sumSale, 2),
            'purchase_amount' => round($sumPurchase, 2),
            'sale_price' => $sumQtySold > 0 ? round($sumSale / $sumQtySold, 2) : 0,
            'purchase_price' => $sumPurchaseQty > 0 ? round($sumPurchase / $sumPurchaseQty, 2) : 0,
            'margin_perc' => $sumSale > 0 ? round((($sumSale - $sumPurchase) / $sumSale) * 100, 2) : 0,
            'markup_perc' => $sumPurchase > 0 ? round((($sumSale - $sumPurchase) / $sumPurchase) * 100, 2) : 0,
        ];

        return response()->json(['success' => true, 'data' => $rows, 'totals' => $totals]);
    }

    public function salesVsStock(Request $request)
    {
        $field = (string) $request->input('groupBy', 'brand');

        if ($field === 'customer' || !array_key_exists($field, self::FIELD_CONFIG)) {
            return response()->json(['success' => true, 'data' => [], 'totals' => null, 'notice' => $this->fieldNotice($field)]);
        }

        $storeId = $this->resolveStoreId($request);
        $dateFrom = $request->input('dateFrom');
        $dateTo = $request->input('dateTo');

        $sold = $this->groupItemsByDimension('pos_sale_items', 'pos_sales', 'pos_sale_id', $field, [
            function ($q) use ($storeId, $dateFrom, $dateTo) {
                if ($storeId) $q->where('h.store_id', $storeId);
                if ($dateFrom) $q->whereDate('h.sale_date', '>=', $dateFrom);
                if ($dateTo) $q->whereDate('h.sale_date', '<=', $dateTo);
            },
        ], [
            'sold_pieces' => 'SUM(i.quantity)',
        ]);

        // Stock is a point-in-time snapshot (no date dimension), so it's built
        // directly here rather than through groupItemsByDimension, which assumes
        // an item+header pair.
        $config = self::FIELD_CONFIG[$field];
        $stockQuery = DB::table('stocks as i');
        if ($storeId) {
            $stockQuery->where('i.store_id', $storeId);
        }

        if ($config['source'] === 'product') {
            $stockQuery->join('products as p', 'p.id', '=', 'i.product_id');
            $groupExpr = "p.{$config['column']}";
            $selects = ["{$groupExpr} as group_value"];
            if (!empty($config['join_table'])) {
                $stockQuery->leftJoin($config['join_table'], "{$config['join_table']}.id", '=', "p.{$config['column']}");
                $selects[] = "MAX({$config['label_from']}) as group_label";
            }
        } else {
            $groupExpr = 'i.store_id';
            $stockQuery->leftJoin('stores', 'stores.id', '=', 'i.store_id');
            $selects = ["{$groupExpr} as group_value", 'MAX(stores.name) as group_label'];
        }

        $stock = $stockQuery->selectRaw(implode(', ', array_merge($selects, ['SUM(i.quantity) as stock_pieces'])))
            ->groupBy($groupExpr)
            ->orderByDesc('stock_pieces')
            ->limit(500)
            ->get();

        $merged = $this->mergeByGroupValue($sold, $stock);

        $rows = $merged->map(function ($row) {
            return [
                'description' => $this->describeRow($row),
                'sold_pieces' => (float) ($row->a->sold_pieces ?? 0),
                'stock_pieces' => (float) ($row->b->stock_pieces ?? 0),
            ];
        })->sortByDesc('stock_pieces')->values();

        $totals = [
            'sold_pieces' => $rows->sum('sold_pieces'),
            'stock_pieces' => $rows->sum('stock_pieces'),
        ];

        return response()->json(['success' => true, 'data' => $rows, 'totals' => $totals]);
    }
}
