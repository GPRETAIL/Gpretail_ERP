<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Analytical tab of the main Dashboard. Deliberately lighter-weight than
 * Warehouse/CRM/Sales/Finance: the real analytical horsepower already lives
 * in the dedicated Analytical module pages (Stock Analyzer, Sales Comparer,
 * Sales vs Purchase/Stock, Supplier x Product Analyzer, Sales/Stock Pivot --
 * see GroupAggregationService::crossTab() and ProductPurchaseAnalyticsController)
 * built earlier this session. Re-running that same bounded-but-still-heavy
 * cross-tab machinery on every Dashboard load would be wasteful; this tab is
 * a launchpad (quick links to those pages) plus a handful of genuinely light,
 * cross-module headline numbers that don't require full crossTab() queries.
 */
class AnalyticalDashboardService
{
    protected function resolveStoreId(array $filters, $user): ?int
    {
        $role = strtolower((string) ($user?->role ?? ''));
        $isSuperAdmin = in_array($role, ['super_admin', 'superadmin'], true);

        if (!empty($filters['warehouse_id']) || !empty($filters['store_id'])) {
            $requestedStoreId = (int) ($filters['warehouse_id'] ?? $filters['store_id']);
            if ($isSuperAdmin) {
                return $requestedStoreId;
            }
            return (int) ($user?->store_id ?: $user?->company_id ?: $requestedStoreId);
        }

        if (!$isSuperAdmin) {
            return (int) ($user?->store_id ?: $user?->company_id ?: 0) ?: null;
        }

        return null;
    }

    protected function resolveDateRange(array $filters): array
    {
        $from = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : null;
        $to = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : null;

        return [$from, $to];
    }

    public function getDashboardData(array $filters, $user): array
    {
        $storeId = $this->resolveStoreId($filters, $user);
        [$from, $to] = $this->resolveDateRange($filters);

        $summary = $this->getSummary($storeId);
        $dataQuality = $this->getDataQualityFlags($storeId);
        $insights = $this->getCrossModuleInsights($storeId, $from, $to);
        $quickLinks = $this->getQuickLinks();

        return [
            'summary'          => $summary,
            'data_quality'     => $dataQuality,
            'insights'         => $insights,
            'quick_links'      => $quickLinks,
            'active_store_id'  => $storeId,
            'last_updated'     => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Primary Summary KPI Cards -- cheap counts, no cross-tab aggregation.
     */
    public function getSummary(?int $storeId): array
    {
        $productsWithStock = DB::table('stocks')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->distinct('product_id')
            ->count('product_id');

        $brandsTracked = DB::table('brands')->count();
        $categoriesTracked = DB::table('categories')->count();

        $suppliersWithPurchases = DB::table('direct_purchases')
            ->when($storeId, fn ($q) => $q->where(fn ($sq) => $sq->where('store_id', $storeId)->orWhere('company_id', $storeId)))
            ->whereNotNull('supplier_id')
            ->distinct('supplier_id')
            ->count('supplier_id');

        return [
            'products_with_stock'      => $productsWithStock,
            'brands_tracked'           => $brandsTracked,
            'categories_tracked'       => $categoriesTracked,
            'suppliers_with_purchases' => $suppliersWithPurchases,
        ];
    }

    /**
     * Data-quality flags -- gaps that make the analytics pages less useful
     * until addressed (e.g. a pivot's "(Blank)" bucket growing because
     * products aren't categorized).
     */
    public function getDataQualityFlags(?int $storeId): array
    {
        $productsNoBrand = DB::table('products')->whereNull('brand_id')->count();
        $productsNoCategory = DB::table('products')->whereNull('category_id')->count();

        $directPurchasesNoSupplierId = DB::table('direct_purchases')
            ->when($storeId, fn ($q) => $q->where(fn ($sq) => $sq->where('store_id', $storeId)->orWhere('company_id', $storeId)))
            ->whereNull('supplier_id')
            ->count();

        $stocksZeroValue = DB::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id')
            ->when($storeId, fn ($q) => $q->where('stocks.store_id', $storeId))
            ->where('stocks.quantity', '>', 0)
            ->where(function ($q) {
                $q->whereNull('products.selling_price')->orWhere('products.selling_price', 0);
            })
            ->count();

        return [
            [
                'key'          => 'products_no_brand',
                'label'        => 'Products Without Brand (skew brand pivots)',
                'count'        => $productsNoBrand,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/masters/product',
                'filter_param' => 'filter=missing_brand',
            ],
            [
                'key'          => 'products_no_category',
                'label'        => 'Products Without Category',
                'count'        => $productsNoCategory,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/masters/product',
                'filter_param' => 'filter=missing_category',
            ],
            [
                'key'          => 'purchases_no_supplier_id',
                'label'        => 'Purchases With No Linked Supplier (legacy bucket)',
                'count'        => $directPurchasesNoSupplierId,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/warehouse/direct-purchase',
                'filter_param' => 'filter=missing_supplier',
            ],
            [
                'key'          => 'stocks_zero_value',
                'label'        => 'In-Stock Products Priced at ₹0',
                'count'        => $stocksZeroValue,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/masters/product',
                'filter_param' => 'filter=zero_price',
            ],
        ];
    }

    /**
     * Cross-module headline insights: top brand by stock value, top category
     * by sales, top supplier by purchase value -- each a single, indexed
     * GROUP BY, not the full bounded-pivot machinery.
     */
    public function getCrossModuleInsights(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $topBrandByStock = DB::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id')
            ->leftJoin('brands', 'products.brand_id', '=', 'brands.id')
            ->when($storeId, fn ($q) => $q->where('stocks.store_id', $storeId))
            ->selectRaw('COALESCE(brands.name, "(Blank)") as name, COALESCE(SUM(stocks.quantity * products.selling_price), 0) as value')
            ->groupBy(DB::raw('COALESCE(brands.name, "(Blank)")'))
            ->orderByDesc('value')
            ->first();

        $topCategoryBySales = DB::table('pos_sale_items as i')
            ->join('pos_sales as s', 's.id', '=', 'i.pos_sale_id')
            ->join('products as p', 'p.id', '=', 'i.product_id')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->when($storeId, fn ($q) => $q->where('s.store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('s.sale_date', [$from, $to]))
            ->selectRaw('COALESCE(c.name, "(Blank)") as name, COALESCE(SUM(i.subtotal), 0) as value')
            ->groupBy(DB::raw('COALESCE(c.name, "(Blank)")'))
            ->orderByDesc('value')
            ->first();

        $topSupplierByPurchase = DB::table('direct_purchases')
            ->leftJoin('suppliers', 'direct_purchases.supplier_id', '=', 'suppliers.id')
            ->when($storeId, fn ($q) => $q->where(fn ($sq) => $sq->where('direct_purchases.store_id', $storeId)->orWhere('direct_purchases.company_id', $storeId)))
            ->selectRaw('COALESCE(suppliers.name, direct_purchases.supplier_name, "(Blank)") as name, COALESCE(SUM(direct_purchases.total_amount), 0) as value')
            ->groupBy(DB::raw('COALESCE(suppliers.name, direct_purchases.supplier_name, "(Blank)")'))
            ->orderByDesc('value')
            ->first();

        return [
            'top_brand_by_stock_value'    => ['name' => $topBrandByStock->name ?? '-', 'value' => (float) ($topBrandByStock->value ?? 0)],
            'top_category_by_sales'       => ['name' => $topCategoryBySales->name ?? '-', 'value' => (float) ($topCategoryBySales->value ?? 0)],
            'top_supplier_by_purchase'    => ['name' => $topSupplierByPurchase->name ?? '-', 'value' => (float) ($topSupplierByPurchase->value ?? 0)],
        ];
    }

    /**
     * Static launchpad -- the real analytics pages built this session.
     */
    public function getQuickLinks(): array
    {
        return [
            ['label' => '360° Stock Analyzer', 'path' => '/analytical/stock-analyzer', 'description' => 'Group stock by any product attribute'],
            ['label' => '360° Purchase Analyzer', 'path' => '/analytical/purchase-analyzer', 'description' => 'Supplier x Product purchase pivot'],
            ['label' => '360° Sales Analyzer', 'path' => '/analytical/sales-analyzer', 'description' => 'Sales pivot by store/month/payment'],
            ['label' => 'Sales Comparer', 'path' => '/analytical/sales-comparer', 'description' => 'Sales performance by dimension'],
            ['label' => 'Sales Vs Purchase', 'path' => '/analytical/sales-vs-purchase', 'description' => 'Margin and markup by dimension'],
            ['label' => 'Sales Vs Stock', 'path' => '/analytical/sales-vs-stock', 'description' => 'Sell-through vs on-hand stock'],
            ['label' => 'Stock Marker Analyzer', 'path' => '/analytical/stock-marker-analyzer', 'description' => 'Stock valuation by brand/category/store'],
        ];
    }
}
