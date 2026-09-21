<?php

namespace App\Services;

use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Store tab of the main Dashboard. Unlike Warehouse/CRM/Sales/Finance (one
 * store or "all stores consolidated" at a time), this tab's whole point is a
 * side-by-side comparison across every store the user can see -- so its
 * central section is a per-store table, not a single aggregate.
 */
class StoreDashboardService
{
    protected function resolveDateRange(array $filters): array
    {
        $from = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : null;
        $to = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : null;

        return [$from, $to];
    }

    /**
     * Stores visible to this user -- a non-super-admin only ever sees their
     * own store, so the comparison table degenerates to one row for them.
     */
    protected function visibleStoreIds($user): array
    {
        $role = strtolower((string) ($user?->role ?? ''));
        $isSuperAdmin = in_array($role, ['super_admin', 'superadmin'], true);

        if ($isSuperAdmin) {
            return Store::pluck('id')->all();
        }

        $storeId = (int) ($user?->store_id ?: $user?->company_id ?: 0);
        return $storeId ? [$storeId] : [];
    }

    public function getDashboardData(array $filters, $user): array
    {
        [$from, $to] = $this->resolveDateRange($filters);
        $storeIds = $this->visibleStoreIds($user);

        $summary = $this->getSummary($storeIds, $from, $to);
        $actionRequired = $this->getActionRequired($storeIds);
        $comparison = $this->getStoreComparison($storeIds, $from, $to);
        $salesChart = $this->getSalesByStoreChart($storeIds, $from, $to);

        return [
            'summary'          => $summary,
            'action_required'  => $actionRequired,
            'comparison'       => $comparison,
            'charts'           => [
                'sales_by_store' => $salesChart,
            ],
            'last_updated'     => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Primary Summary KPI Cards
     */
    public function getSummary(array $storeIds, ?Carbon $from, ?Carbon $to): array
    {
        $totalStores = count($storeIds);
        $activeStores = DB::table('stores')->whereIn('id', $storeIds)->where('is_active', true)->count();

        $stockValue = DB::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id')
            ->whereIn('stocks.store_id', $storeIds)
            ->sum(DB::raw('stocks.quantity * COALESCE(products.selling_price, 0)'));

        $salesRange = DB::table('pos_sales')
            ->whereIn('store_id', $storeIds)
            ->when($from && $to, fn ($q) => $q->whereBetween('sale_date', [$from, $to]))
            ->sum('grand_total');

        $totalStaff = DB::table('employees')->whereIn('store_id', $storeIds)->where('is_active', true)->count();

        return [
            'total_stores'      => $totalStores,
            'active_stores'     => $activeStores,
            'consolidated_stock_value' => (float) $stockValue,
            'consolidated_sales_range' => (float) $salesRange,
            'total_active_staff' => $totalStaff,
        ];
    }

    /**
     * Action Required: cross-store operational flags.
     */
    public function getActionRequired(array $storeIds): array
    {
        $inactiveStores = DB::table('stores')->whereIn('id', $storeIds)->where('is_active', false)->count();

        $dormantThreshold = Carbon::today()->subDays(3);
        $storesWithRecentSales = DB::table('pos_sales')
            ->whereIn('store_id', $storeIds)
            ->where('sale_date', '>=', $dormantThreshold)
            ->distinct()
            ->pluck('store_id');
        $dormantStores = count(array_diff($storeIds, $storesWithRecentSales->all()));

        $openRegisters = DB::table('cash_register_sessions')
            ->whereIn('store_id', $storeIds)
            ->whereNull('closed_at')
            ->where('opened_at', '<', Carbon::today())
            ->count();

        $lowStockStores = DB::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id')
            ->whereIn('stocks.store_id', $storeIds)
            ->whereRaw('stocks.available_quantity <= COALESCE(products.min_stock, 10)')
            ->distinct('stocks.store_id')
            ->count('stocks.store_id');

        return [
            [
                'key'          => 'inactive_stores',
                'label'        => 'Inactive Stores',
                'count'        => $inactiveStores,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/settings/configure-local-server',
                'filter_param' => 'filter=inactive',
            ],
            [
                'key'          => 'stale_registers',
                'label'        => 'Cash Registers Open Overnight',
                'count'        => $openRegisters,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/sales/cash-closing',
                'filter_param' => 'filter=stale',
            ],
            [
                'key'          => 'dormant_stores',
                'label'        => 'Stores With No Sales (3+ days)',
                'count'        => $dormantStores,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/sales/pos-sales',
                'filter_param' => 'filter=dormant',
            ],
            [
                'key'          => 'stores_low_stock',
                'label'        => 'Stores With Low-Stock Items',
                'count'        => $lowStockStores,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/warehouse/stock-item',
                'filter_param' => 'stock_filter=low_stock',
            ],
        ];
    }

    /**
     * Per-store comparison table -- the centerpiece of this tab.
     */
    public function getStoreComparison(array $storeIds, ?Carbon $from, ?Carbon $to): array
    {
        if (empty($storeIds)) {
            return [];
        }

        $stores = DB::table('stores')->whereIn('id', $storeIds)->select('id', 'name', 'code', 'is_active')->get();

        $salesByStore = DB::table('pos_sales')
            ->whereIn('store_id', $storeIds)
            ->when($from && $to, fn ($q) => $q->whereBetween('sale_date', [$from, $to]))
            ->selectRaw('store_id, COUNT(*) as bills, COALESCE(SUM(grand_total), 0) as amount')
            ->groupBy('store_id')
            ->get()
            ->keyBy('store_id');

        $stockByStore = DB::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id')
            ->whereIn('stocks.store_id', $storeIds)
            ->selectRaw('stocks.store_id, COALESCE(SUM(stocks.quantity * products.selling_price), 0) as value')
            ->groupBy('stocks.store_id')
            ->get()
            ->keyBy('store_id');

        $staffByStore = DB::table('employees')
            ->whereIn('store_id', $storeIds)
            ->where('is_active', true)
            ->selectRaw('store_id, COUNT(*) as count')
            ->groupBy('store_id')
            ->get()
            ->keyBy('store_id');

        return $stores->map(function ($store) use ($salesByStore, $stockByStore, $staffByStore) {
            $sales = $salesByStore->get($store->id);
            $stock = $stockByStore->get($store->id);
            $staff = $staffByStore->get($store->id);

            return [
                'store_id'     => $store->id,
                'store_name'   => $store->name,
                'store_code'   => $store->code,
                'is_active'    => (bool) $store->is_active,
                'sales_amount' => (float) ($sales->amount ?? 0),
                'bills_count'  => (int) ($sales->bills ?? 0),
                'stock_value'  => (float) ($stock->value ?? 0),
                'staff_count'  => (int) ($staff->count ?? 0),
            ];
        })->sortByDesc('sales_amount')->values()->toArray();
    }

    /**
     * Sales amount by store, for a simple comparison chart.
     */
    public function getSalesByStoreChart(array $storeIds, ?Carbon $from, ?Carbon $to): array
    {
        if (empty($storeIds)) {
            return [];
        }

        $rows = DB::table('pos_sales as s')
            ->join('stores as st', 'st.id', '=', 's.store_id')
            ->whereIn('s.store_id', $storeIds)
            ->when($from && $to, fn ($q) => $q->whereBetween('s.sale_date', [$from, $to]))
            ->selectRaw('st.id as store_id, st.name as store_name, COALESCE(SUM(s.grand_total), 0) as amount')
            ->groupBy('st.id', 'st.name')
            ->orderByDesc('amount')
            ->get()
            ->map(fn ($row) => ['store_name' => $row->store_name, 'amount' => (float) $row->amount]);

        return $rows->toArray();
    }
}
