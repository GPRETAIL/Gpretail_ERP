<?php

namespace App\Services;

use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Masters tab of the main Dashboard -- sibling to WarehouseDashboardService/
 * CrmDashboardService/SalesDashboardService, same shape. Focused on master
 * data health/completeness (a data-quality angle none of the other tabs
 * cover), not transactional activity.
 */
class MastersDashboardService
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

    public function getDashboardData(array $filters, $user): array
    {
        $storeId = $this->resolveStoreId($filters, $user);

        $summary = $this->getSummary();
        $actionRequired = $this->getActionRequired();
        $breakdown = $this->getMasterDataBreakdown();
        $categoryChart = $this->getProductsByCategoryChart();
        $recentProducts = $this->getRecentlyAddedProducts(10);
        $stores = $this->getAvailableStores($user);

        return [
            'summary'           => $summary,
            'action_required'   => $actionRequired,
            'breakdown'         => $breakdown,
            'charts'            => [
                'products_by_category' => $categoryChart,
            ],
            'recent_products'   => $recentProducts,
            'stores'            => $stores,
            'active_store_id'   => $storeId,
            'last_updated'      => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Primary Summary KPI Cards
     */
    public function getSummary(): array
    {
        $totalProducts = DB::table('products')->count();
        $activeProducts = DB::table('products')->where('is_active', true)->count();
        $totalBrands = DB::table('brands')->count();
        $totalCategories = DB::table('categories')->count();
        $totalSuppliers = DB::table('suppliers')->count();
        $activeSuppliers = DB::table('suppliers')->where('is_active', true)->count();
        $totalTaxes = DB::table('taxes')->count();
        $totalAgents = DB::table('agents')->count();
        $missingHsn = DB::table('products')->where(function ($q) {
            $q->whereNull('hsn_code')->orWhere('hsn_code', '');
        })->count();
        $missingBarcode = DB::table('products')->where(function ($q) {
            $q->whereNull('barcode')->orWhere('barcode', '');
        })->count();

        return [
            'total_products'    => $totalProducts,
            'active_products'   => $activeProducts,
            'inactive_products' => $totalProducts - $activeProducts,
            'total_brands'      => $totalBrands,
            'total_categories'  => $totalCategories,
            'total_suppliers'   => $totalSuppliers,
            'active_suppliers'  => $activeSuppliers,
            'total_taxes'       => $totalTaxes,
            'total_agents'      => $totalAgents,
            'missing_hsn_count'     => $missingHsn,
            'missing_barcode_count' => $missingBarcode,
        ];
    }

    /**
     * Action Required: master-data completeness/compliance gaps.
     */
    public function getActionRequired(): array
    {
        $missingHsn = DB::table('products')->where(function ($q) {
            $q->whereNull('hsn_code')->orWhere('hsn_code', '');
        })->count();

        $missingBarcode = DB::table('products')->where(function ($q) {
            $q->whereNull('barcode')->orWhere('barcode', '');
        })->count();

        $missingTax = DB::table('products')->whereNull('tax_id')->count();

        $inactiveProducts = DB::table('products')->where('is_active', false)->count();

        $suppliersNoGstin = DB::table('suppliers')
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('gstin')->orWhere('gstin', '');
            })->count();

        $inactiveSuppliers = DB::table('suppliers')->where('is_active', false)->count();

        return [
            [
                'key'          => 'missing_hsn',
                'label'        => 'Products Missing HSN Code',
                'count'        => $missingHsn,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/masters/product',
                'filter_param' => 'filter=missing_hsn',
            ],
            [
                'key'          => 'missing_tax',
                'label'        => 'Products Without Tax Configured',
                'count'        => $missingTax,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/masters/product',
                'filter_param' => 'filter=missing_tax',
            ],
            [
                'key'          => 'missing_barcode',
                'label'        => 'Products Missing Barcode',
                'count'        => $missingBarcode,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/masters/product',
                'filter_param' => 'filter=missing_barcode',
            ],
            [
                'key'          => 'suppliers_no_gstin',
                'label'        => 'Active Suppliers Without GSTIN',
                'count'        => $suppliersNoGstin,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/masters/supplier',
                'filter_param' => 'filter=missing_gstin',
            ],
            [
                'key'          => 'inactive_products',
                'label'        => 'Inactive Products',
                'count'        => $inactiveProducts,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/masters/product',
                'filter_param' => 'filter=inactive',
            ],
            [
                'key'          => 'inactive_suppliers',
                'label'        => 'Inactive Suppliers',
                'count'        => $inactiveSuppliers,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/masters/supplier',
                'filter_param' => 'filter=inactive',
            ],
        ];
    }

    /**
     * Master Data Overview tiles.
     */
    public function getMasterDataBreakdown(): array
    {
        return [
            'products'   => ['count' => DB::table('products')->count(), 'label' => 'Products'],
            'brands'     => ['count' => DB::table('brands')->count(), 'label' => 'Brands'],
            'categories' => ['count' => DB::table('categories')->count(), 'label' => 'Categories'],
            'suppliers'  => ['count' => DB::table('suppliers')->count(), 'label' => 'Suppliers'],
            'taxes'      => ['count' => DB::table('taxes')->count(), 'label' => 'Taxes'],
            'agents'     => ['count' => DB::table('agents')->count(), 'label' => 'Agents'],
        ];
    }

    /**
     * Product count by category (top 8)
     */
    public function getProductsByCategoryChart(): array
    {
        $rows = DB::table('products')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->selectRaw('COALESCE(categories.name, "Uncategorized") as category_name, COUNT(*) as count')
            ->groupBy(DB::raw('COALESCE(categories.name, "Uncategorized")'))
            ->orderByDesc('count')
            ->limit(8)
            ->get()
            ->map(fn ($row) => ['category_name' => $row->category_name, 'count' => (int) $row->count]);

        return $rows->toArray();
    }

    /**
     * Recently added products
     */
    public function getRecentlyAddedProducts(int $limit = 10): array
    {
        $rows = DB::table('products')
            ->leftJoin('brands', 'products.brand_id', '=', 'brands.id')
            ->select([
                'products.id',
                'products.name',
                'products.code',
                'products.selling_price',
                'products.is_active',
                'products.created_at',
                DB::raw('COALESCE(brands.name, "-") as brand_name'),
            ])
            ->orderByDesc('products.id')
            ->limit($limit)
            ->get();

        return $rows->toArray();
    }

    public function getAvailableStores($user): array
    {
        $role = strtolower((string) ($user?->role ?? ''));
        $isSuperAdmin = in_array($role, ['super_admin', 'superadmin'], true);

        if ($isSuperAdmin) {
            return Store::select('id', 'name', 'code')->orderBy('name')->get()->toArray();
        }

        $storeId = (int) ($user?->store_id ?: $user?->company_id ?: 0);
        if ($storeId) {
            return Store::where('id', $storeId)->select('id', 'name', 'code')->get()->toArray();
        }

        return [];
    }
}
