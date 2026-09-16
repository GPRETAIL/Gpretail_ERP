<?php

namespace App\Services;

use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Sales tab of the main Dashboard -- sibling to WarehouseDashboardService and
 * CrmDashboardService, same shape (resolveStoreId/resolveDateRange helpers,
 * one getDashboardData() consolidating a set of independent get*() sections).
 *
 * Sourced from pos_sales/pos_sale_items (the real POS checkout tables), not
 * customer_orders -- see CrmDashboardService for why that distinction matters
 * (customer_orders is a niche custom-order table, not regular retail sales).
 */
class SalesDashboardService
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

        $summary = $this->getSummary($storeId, $from, $to);
        $actionRequired = $this->getActionRequired($storeId, $from, $to);
        $transactionBreakdown = $this->getTransactionBreakdown($storeId, $from, $to);
        $paymentBreakdown = $this->getPaymentModeBreakdown($storeId, $from, $to);
        $topProducts = $this->getTopProducts($storeId, $from, $to, 10);
        $topSalesPersons = $this->getTopSalesPersons($storeId, $from, $to, 5);
        $recentSales = $this->getRecentSales($storeId, 10);
        $returns = $this->getReturnsSummary($storeId, $from, $to);
        $salesApprovals = $this->getSalesApprovalSummary($storeId);
        $cashRegisters = $this->getCashRegisterSummary($storeId);
        $performance = $this->getPerformanceMetrics($storeId, $from, $to);
        $trendChart = $this->getSalesTrendChart($storeId, $from, $to);
        $stores = $this->getAvailableStores($user);

        return [
            'summary'                => $summary,
            'action_required'        => $actionRequired,
            'transaction_breakdown'  => $transactionBreakdown,
            'payment_breakdown'  => $paymentBreakdown,
            'top_products'       => $topProducts,
            'top_sales_persons'  => $topSalesPersons,
            'recent_sales'       => $recentSales,
            'returns'            => $returns,
            'sales_approvals'    => $salesApprovals,
            'cash_registers'     => $cashRegisters,
            'performance'        => $performance,
            'charts'             => [
                'sales_trend' => $trendChart,
            ],
            'stores'             => $stores,
            'active_store_id'    => $storeId,
            'last_updated'       => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Primary Summary KPI Cards
     */
    public function getSummary(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $today = Carbon::today();
        $monthStart = Carbon::now()->startOfMonth();
        $monthEnd = Carbon::now()->endOfMonth();

        $todayQuery = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereDate('sale_date', $today);

        $todayAgg = (clone $todayQuery)->selectRaw('
            COUNT(*) as bills,
            COALESCE(SUM(grand_total), 0) as amount,
            COALESCE(SUM(total_qty), 0) as qty
        ')->first();

        $monthAgg = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereBetween('sale_date', [$monthStart, $monthEnd])
            ->selectRaw('
                COUNT(*) as bills,
                COALESCE(SUM(grand_total), 0) as amount
            ')->first();

        $rangeQuery = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('sale_date', [$from, $to]));

        $rangeAgg = (clone $rangeQuery)->selectRaw('
            COUNT(*) as bills,
            COALESCE(SUM(grand_total), 0) as amount,
            COALESCE(SUM(discount_amount), 0) as discount,
            COALESCE(SUM(total_qty), 0) as qty
        ')->first();

        // Distinct products sold in range -- via pos_sale_items, not pos_sales
        // itself (a bill has no product dimension on its own).
        $distinctProducts = DB::table('pos_sale_items as i')
            ->join('pos_sales as s', 's.id', '=', 'i.pos_sale_id')
            ->when($storeId, fn ($q) => $q->where('s.store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('s.sale_date', [$from, $to]))
            ->distinct('i.product_id')
            ->count('i.product_id');

        $returnsAgg = DB::table('pos_returns')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('return_date', [$from, $to]))
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total_refund), 0) as amount')
            ->first();

        // whereRaw('grand_total > paid_amount') before summing -- see
        // FinanceDashboardService::getSummary() for why a bare SUM(total -
        // paid) is wrong: overpaid rows would net against genuinely unpaid
        // ones and understate what's actually owed.
        $creditPending = (clone $rangeQuery)
            ->where('is_credit', true)
            ->whereRaw('grand_total > paid_amount')
            ->selectRaw('COALESCE(SUM(grand_total - paid_amount), 0) as amount')
            ->value('amount');

        $openRegisters = DB::table('cash_register_sessions')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereNull('closed_at')
            ->count();

        return [
            'today_sales_amount'   => (float) ($todayAgg->amount ?? 0),
            'today_bills_count'    => (int) ($todayAgg->bills ?? 0),
            'today_qty_sold'       => (float) ($todayAgg->qty ?? 0),
            'month_sales_amount'   => (float) ($monthAgg->amount ?? 0),
            'month_bills_count'    => (int) ($monthAgg->bills ?? 0),
            'range_sales_amount'   => (float) ($rangeAgg->amount ?? 0),
            'range_bills_count'    => (int) ($rangeAgg->bills ?? 0),
            'range_qty_sold'       => (float) ($rangeAgg->qty ?? 0),
            'range_discount_total' => (float) ($rangeAgg->discount ?? 0),
            'distinct_products_sold' => (int) $distinctProducts,
            'returns_amount'       => (float) ($returnsAgg->amount ?? 0),
            'returns_count'        => (int) ($returnsAgg->count ?? 0),
            'net_sales_amount'     => (float) ($rangeAgg->amount ?? 0) - (float) ($returnsAgg->amount ?? 0),
            'credit_pending_amount'=> (float) ($creditPending ?? 0),
            'open_registers_count' => $openRegisters,
        ];
    }

    /**
     * Action Required Attention Section
     */
    public function getActionRequired(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $openRegisters = DB::table('cash_register_sessions')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereNull('closed_at')
            ->count();

        $registerVariances = DB::table('cash_register_sessions')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereNotNull('closed_at')
            ->where('difference', '!=', 0)
            ->count();

        $pendingApprovals = DB::table('sales_approvals')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereIn('status', ['pending', 'PENDING'])
            ->count();

        $pendingReturns = DB::table('pos_returns')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereIn('status', ['pending', 'PENDING', 'draft', 'DRAFT'])
            ->count();

        $overdueCredit = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->where('is_credit', true)
            ->whereRaw('grand_total > paid_amount')
            ->whereDate('sale_date', '<', Carbon::today()->subDays(7))
            ->count();

        $pendingDealerInvoices = DB::table('dealer_invoices')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereIn('status', ['pending', 'PENDING', 'draft', 'DRAFT'])
            ->count();

        return [
            [
                'key'          => 'open_registers',
                'label'        => 'Open Cash Registers',
                'count'        => $openRegisters,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/sales/cash-closing',
                'filter_param' => 'status=open',
            ],
            [
                'key'          => 'register_variance',
                'label'        => 'Cash Register Variances',
                'count'        => $registerVariances,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/sales/cash-closing',
                'filter_param' => 'filter=variance',
            ],
            [
                'key'          => 'overdue_credit',
                'label'        => 'Credit Sales Overdue (7+ days)',
                'count'        => $overdueCredit,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/sales/pos-sales',
                'filter_param' => 'filter=overdue_credit',
            ],
            [
                'key'          => 'pending_approvals',
                'label'        => 'Pending Sales Approvals',
                'count'        => $pendingApprovals,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/sales/sales-on-approval',
                'filter_param' => 'status=pending',
            ],
            [
                'key'          => 'pending_returns',
                'label'        => 'Pending Returns',
                'count'        => $pendingReturns,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/sales/pos-sales-return',
                'filter_param' => 'status=pending',
            ],
            [
                'key'          => 'pending_dealer_invoices',
                'label'        => 'Pending Dealer Invoices',
                'count'        => $pendingDealerInvoices,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/sales/dealer-invoice',
                'filter_param' => 'status=pending',
            ],
        ];
    }

    /**
     * Sales Module Breakdown: Sales / Returns / Exchanges / Credit / Refunds.
     *
     * "Exchange" is a real checkout mode in the POS UI (POSOld.jsx's return +
     * new-items-in-one-session flow), but the backend currently rejects
     * isExchange=true checkouts outright ("not supported yet -- record the
     * return and the new sale separately", PosSaleController::store()), so in
     * practice an exchange is two rows: a pos_returns row and a separate
     * pos_sales row, linked only when the return's credit is later applied to
     * that new sale (pos_returns.credit_applied_to_sale_id). That column is
     * therefore the only honest signal for "this return became an exchange"
     * versus "this return became a refund" (credit_applied_to_sale_id is
     * null) -- there's no dedicated exchange table/flag to read instead.
     */
    public function getTransactionBreakdown(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $salesQuery = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('sale_date', [$from, $to]));

        $cashSales = (clone $salesQuery)->where('is_credit', false)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(grand_total), 0) as amount')->first();
        $creditSales = (clone $salesQuery)->where('is_credit', true)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(grand_total), 0) as amount')->first();

        $returnsQuery = DB::table('pos_returns')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('return_date', [$from, $to]));

        $totalReturns = (clone $returnsQuery)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total_refund), 0) as amount')->first();
        $refunds = (clone $returnsQuery)->whereNull('credit_applied_to_sale_id')
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total_refund), 0) as amount')->first();
        $exchanges = (clone $returnsQuery)->whereNotNull('credit_applied_to_sale_id')
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(total_refund), 0) as amount')->first();

        return [
            'sales'     => ['count' => (int) ($cashSales->count ?? 0), 'amount' => (float) ($cashSales->amount ?? 0)],
            'returns'   => ['count' => (int) ($totalReturns->count ?? 0), 'amount' => (float) ($totalReturns->amount ?? 0)],
            'exchanges' => ['count' => (int) ($exchanges->count ?? 0), 'amount' => (float) ($exchanges->amount ?? 0)],
            'credit'    => ['count' => (int) ($creditSales->count ?? 0), 'amount' => (float) ($creditSales->amount ?? 0)],
            'refunds'   => ['count' => (int) ($refunds->count ?? 0), 'amount' => (float) ($refunds->amount ?? 0)],
        ];
    }

    /**
     * Payment Mode Breakdown (Cash / Card / UPI / Credit)
     */
    public function getPaymentModeBreakdown(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $rows = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('sale_date', [$from, $to]))
            ->selectRaw('
                UPPER(COALESCE(payment_mode, "CASH")) as mode,
                COUNT(*) as bills,
                COALESCE(SUM(grand_total), 0) as amount
            ')
            ->groupBy(DB::raw('UPPER(COALESCE(payment_mode, "CASH"))'))
            ->orderByDesc('amount')
            ->get()
            ->map(fn ($row) => [
                'mode'   => $row->mode,
                'bills'  => (int) $row->bills,
                'amount' => (float) $row->amount,
            ]);

        return $rows->toArray();
    }

    /**
     * Top Selling Products by revenue in range
     */
    public function getTopProducts(?int $storeId, ?Carbon $from, ?Carbon $to, int $limit = 10): array
    {
        $rows = DB::table('pos_sale_items as i')
            ->join('pos_sales as s', 's.id', '=', 'i.pos_sale_id')
            ->join('products as p', 'p.id', '=', 'i.product_id')
            ->when($storeId, fn ($q) => $q->where('s.store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('s.sale_date', [$from, $to]))
            ->selectRaw('
                i.product_id,
                p.name as product_name,
                COALESCE(SUM(i.quantity), 0) as qty,
                COALESCE(SUM(i.subtotal), 0) as amount
            ')
            ->groupBy('i.product_id', 'p.name')
            ->orderByDesc('amount')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'product_id'   => $row->product_id,
                'product_name' => $row->product_name,
                'qty'          => (float) $row->qty,
                'amount'       => (float) $row->amount,
            ]);

        return $rows->toArray();
    }

    /**
     * Top Sales Persons by revenue in range (pos_sale_items.sales_man_name is a
     * snapshot at sale time, not a live FK -- rows without a salesperson
     * assigned show under "Unassigned" rather than being silently dropped).
     */
    public function getTopSalesPersons(?int $storeId, ?Carbon $from, ?Carbon $to, int $limit = 5): array
    {
        $rows = DB::table('pos_sale_items as i')
            ->join('pos_sales as s', 's.id', '=', 'i.pos_sale_id')
            ->when($storeId, fn ($q) => $q->where('s.store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('s.sale_date', [$from, $to]))
            ->selectRaw('
                COALESCE(i.sales_man_name, "Unassigned") as sales_man_name,
                COUNT(DISTINCT i.pos_sale_id) as bills,
                COALESCE(SUM(i.subtotal), 0) as amount
            ')
            ->groupBy(DB::raw('COALESCE(i.sales_man_name, "Unassigned")'))
            ->orderByDesc('amount')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'sales_man_name' => $row->sales_man_name,
                'bills'          => (int) $row->bills,
                'amount'         => (float) $row->amount,
            ]);

        return $rows->toArray();
    }

    /**
     * Recent Sales Stream
     */
    public function getRecentSales(?int $storeId, int $limit = 10): array
    {
        $rows = DB::table('pos_sales')
            ->leftJoin('customers', 'pos_sales.customer_id', '=', 'customers.id')
            ->when($storeId, fn ($q) => $q->where('pos_sales.store_id', $storeId))
            ->select([
                'pos_sales.id',
                'pos_sales.invoice_no',
                'pos_sales.sale_date',
                'pos_sales.grand_total',
                'pos_sales.payment_mode',
                'pos_sales.status',
                'pos_sales.is_credit',
                DB::raw('COALESCE(customers.name, "Walk-in") as customer_name'),
            ])
            ->orderByDesc('pos_sales.id')
            ->limit($limit)
            ->get();

        return $rows->toArray();
    }

    /**
     * Returns Monitoring Summary
     */
    public function getReturnsSummary(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $query = DB::table('pos_returns')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId));

        $pending = (clone $query)->whereIn('status', ['pending', 'PENDING', 'draft', 'DRAFT'])->count();
        $completedToday = (clone $query)->whereIn('status', ['completed', 'COMPLETED'])->whereDate('return_date', Carbon::today())->count();
        $rangeValue = (clone $query)
            ->when($from && $to, fn ($q) => $q->whereBetween('return_date', [$from, $to]))
            ->sum('total_refund');

        return [
            'pending'         => $pending,
            'completed_today' => $completedToday,
            'range_value'     => (float) $rangeValue,
        ];
    }

    /**
     * Sales on Approval Summary
     */
    public function getSalesApprovalSummary(?int $storeId): array
    {
        $query = DB::table('sales_approvals')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId));

        $pending = (clone $query)->whereIn('status', ['pending', 'PENDING'])->count();
        $approved = (clone $query)->whereIn('status', ['approved', 'APPROVED', 'converted', 'CONVERTED'])->count();
        $expired = (clone $query)->whereIn('status', ['pending', 'PENDING'])->whereDate('valid_until', '<', Carbon::today())->count();

        return [
            'pending'  => $pending,
            'approved' => $approved,
            'expired'  => $expired,
        ];
    }

    /**
     * Cash Register Sessions Summary
     */
    public function getCashRegisterSummary(?int $storeId): array
    {
        $query = DB::table('cash_register_sessions')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId));

        $open = (clone $query)->whereNull('closed_at')->count();
        $closedToday = (clone $query)->whereNotNull('closed_at')->whereDate('closed_at', Carbon::today())->count();
        $varianceCount = (clone $query)->whereNotNull('closed_at')->where('difference', '!=', 0)->count();
        $varianceAmount = (clone $query)->whereNotNull('closed_at')->sum(DB::raw('ABS(difference)'));

        return [
            'open'            => $open,
            'closed_today'    => $closedToday,
            'variance_count'  => $varianceCount,
            'variance_amount' => (float) $varianceAmount,
        ];
    }

    /**
     * Operational Performance Metrics -- all computed from real data, no
     * placeholder constants (see CrmDashboardService for the same standard
     * applied to CRM's performance metrics, replacing what used to be hardcoded).
     */
    public function getPerformanceMetrics(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $rangeQuery = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('sale_date', [$from, $to]));

        $agg = (clone $rangeQuery)->selectRaw('
            COUNT(*) as bills,
            COALESCE(SUM(grand_total), 0) as amount,
            COALESCE(SUM(subtotal), 0) as subtotal,
            COALESCE(SUM(discount_amount), 0) as discount,
            COALESCE(SUM(CASE WHEN is_credit = 1 THEN grand_total ELSE 0 END), 0) as credit_amount
        ')->first();

        $bills = (int) ($agg->bills ?? 0);
        $amount = (float) ($agg->amount ?? 0);
        $subtotal = (float) ($agg->subtotal ?? 0);
        $discount = (float) ($agg->discount ?? 0);
        $creditAmount = (float) ($agg->credit_amount ?? 0);

        $returnsAmount = (float) DB::table('pos_returns')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('return_date', [$from, $to]))
            ->sum('total_refund');

        $avgBasket = $bills > 0 ? round($amount / $bills, 2) : 0;
        $discountRate = $subtotal > 0 ? round(($discount / $subtotal) * 100, 1) : 0;
        $returnRate = $amount > 0 ? round(($returnsAmount / $amount) * 100, 1) : 0;
        $creditRatio = $amount > 0 ? round(($creditAmount / $amount) * 100, 1) : 0;

        return [
            'avg_basket_value' => $avgBasket,
            'discount_rate'    => "{$discountRate}%",
            'return_rate'      => "{$returnRate}%",
            'credit_sales_ratio' => "{$creditRatio}%",
        ];
    }

    /**
     * Sales vs Returns Daily Timeline Chart
     */
    public function getSalesTrendChart(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $startDate = $from ?: Carbon::today()->subDays(6);
        $endDate = $to ?: Carbon::today();

        $days = [];
        $current = $startDate->copy();
        while ($current->lte($endDate)) {
            $dateStr = $current->toDateString();
            $days[$dateStr] = [
                'date'     => $current->format('M d'),
                'raw_date' => $dateStr,
                'sales'    => 0,
                'returns'  => 0,
            ];
            $current->addDay();
        }

        $sales = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereBetween('sale_date', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->selectRaw('DATE(sale_date) as d, COALESCE(SUM(grand_total), 0) as amount')
            ->groupBy(DB::raw('DATE(sale_date)'))
            ->get();

        foreach ($sales as $row) {
            if (isset($days[$row->d])) {
                $days[$row->d]['sales'] = (float) $row->amount;
            }
        }

        $returns = DB::table('pos_returns')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereBetween('return_date', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->selectRaw('DATE(return_date) as d, COALESCE(SUM(total_refund), 0) as amount')
            ->groupBy(DB::raw('DATE(return_date)'))
            ->get();

        foreach ($returns as $row) {
            if (isset($days[$row->d])) {
                $days[$row->d]['returns'] = (float) $row->amount;
            }
        }

        return array_values($days);
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
