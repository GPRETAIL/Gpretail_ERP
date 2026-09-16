<?php

namespace App\Services;

use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Finance tab of the main Dashboard -- sibling to the other dashboard
 * services. Payables/receivables are point-in-time balances (like Warehouse's
 * stock valuation); payments/purchases made are date-ranged activity (like
 * Sales). suppliers.current_balance and customers.current_balance are
 * denormalized cache columns this dataset never populated (both read 0 for
 * every row) -- payables/receivables here are computed directly from
 * transaction totals instead, the same "don't trust a stale cached column"
 * standard CrmDashboardService's fix applied to loyalty redemption.
 */
class FinanceDashboardService
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
        $actionRequired = $this->getActionRequired($storeId);
        $breakdown = $this->getFinanceBreakdown($storeId, $from, $to);
        $topPayables = $this->getTopOutstandingSuppliers($storeId, 10);
        $recentPayments = $this->getRecentSupplierPayments($storeId, 10);
        $trendChart = $this->getPurchasePaymentTrendChart($storeId, $from, $to);
        $stores = $this->getAvailableStores($user);

        return [
            'summary'           => $summary,
            'action_required'   => $actionRequired,
            'breakdown'         => $breakdown,
            'top_payables'      => $topPayables,
            'recent_payments'   => $recentPayments,
            'charts'            => [
                'purchase_payment_trend' => $trendChart,
            ],
            'stores'            => $stores,
            'active_store_id'   => $storeId,
            'last_updated'      => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Primary Summary KPI Cards
     */
    public function getSummary(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        // whereRaw('total > paid') before summing -- NOT a bare
        // SUM(total - paid) across every row. A plain sum lets a handful of
        // overpaid documents (paid_amount > total_amount, a real artifact in
        // this data: ~half of direct_purchases) net against genuinely unpaid
        // ones, understating real exposure by two orders of magnitude (a
        // ₹12.4 Cr true payable read as ₹3.8L once overpayments cancelled it
        // out). Outstanding balances are never negative in practice --
        // an overpayment on one document isn't credit against a different
        // document without an explicit reconciliation step this app doesn't
        // have yet.
        $dpOutstanding = DB::table('direct_purchases')
            ->when($storeId, fn ($q) => $q->where(fn ($sq) => $sq->where('store_id', $storeId)->orWhere('company_id', $storeId)))
            ->whereRaw('total_amount > paid_amount')
            ->sum(DB::raw('total_amount - paid_amount'));

        $piOutstanding = DB::table('purchase_invoices')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereRaw('grand_total > paid_amount')
            ->sum(DB::raw('grand_total - paid_amount'));

        $receivablesOutstanding = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->where('is_credit', true)
            ->whereRaw('grand_total > paid_amount')
            ->sum(DB::raw('grand_total - paid_amount'));

        $paymentsRange = DB::table('supplier_payments')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('payment_date', [$from, $to]))
            ->sum('amount');

        $purchaseValueRange = DB::table('direct_purchases')
            ->when($storeId, fn ($q) => $q->where(fn ($sq) => $sq->where('store_id', $storeId)->orWhere('company_id', $storeId)))
            ->when($from && $to, fn ($q) => $q->whereBetween('purchase_date', [$from, $to]))
            ->sum('total_amount');

        $refundsDue = DB::table('purchase_returns')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereIn('status', ['pending', 'PENDING', 'draft', 'DRAFT', 'pending_approval'])
            ->sum('total_amount');

        return [
            'payables_outstanding'     => (float) $dpOutstanding + (float) $piOutstanding,
            'receivables_outstanding'  => (float) $receivablesOutstanding,
            'payments_made_range'      => (float) $paymentsRange,
            'purchase_value_range'     => (float) $purchaseValueRange,
            'refunds_due'              => (float) $refundsDue,
            'net_position'             => (float) $receivablesOutstanding - ((float) $dpOutstanding + (float) $piOutstanding),
        ];
    }

    /**
     * Action Required: accounts payable/receivable follow-ups.
     */
    public function getActionRequired(?int $storeId): array
    {
        $overdueThreshold = Carbon::today()->subDays(30);

        $overduePayables = DB::table('direct_purchases')
            ->when($storeId, fn ($q) => $q->where(fn ($sq) => $sq->where('store_id', $storeId)->orWhere('company_id', $storeId)))
            ->whereRaw('total_amount > paid_amount')
            ->whereDate('purchase_date', '<', $overdueThreshold)
            ->count();

        $unpaidInvoices = DB::table('purchase_invoices')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereRaw('grand_total > paid_amount')
            ->count();

        $customersOverLimit = DB::table('customers')
            ->where('credit_limit', '>', 0)
            ->whereRaw('current_balance > credit_limit')
            ->count();

        $pendingReturns = DB::table('purchase_returns')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereIn('status', ['pending', 'PENDING', 'draft', 'DRAFT', 'pending_approval'])
            ->count();

        $unpaidDealerInvoices = DB::table('dealer_invoices')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereIn('status', ['pending', 'PENDING', 'draft', 'DRAFT'])
            ->count();

        $overdueCredit = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->where('is_credit', true)
            ->whereRaw('grand_total > paid_amount')
            ->whereDate('sale_date', '<', $overdueThreshold)
            ->count();

        return [
            [
                'key'          => 'overdue_payables',
                'label'        => 'Overdue Supplier Payables (30+ days)',
                'count'        => $overduePayables,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/warehouse/direct-purchase',
                'filter_param' => 'filter=overdue_payment',
            ],
            [
                'key'          => 'customers_over_limit',
                'label'        => 'Customers Over Credit Limit',
                'count'        => $customersOverLimit,
                'severity'     => 'critical',
                'color'        => 'red',
                'route'        => '/crm/customer',
                'filter_param' => 'filter=over_limit',
            ],
            [
                'key'          => 'unpaid_invoices',
                'label'        => 'Unpaid Purchase Invoices',
                'count'        => $unpaidInvoices,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/warehouse/purchase-invoice',
                'filter_param' => 'filter=unpaid',
            ],
            [
                'key'          => 'overdue_credit_sales',
                'label'        => 'Overdue Credit Sales (30+ days)',
                'count'        => $overdueCredit,
                'severity'     => 'warning',
                'color'        => 'orange',
                'route'        => '/sales/pos-sales',
                'filter_param' => 'filter=overdue_credit',
            ],
            [
                'key'          => 'pending_returns',
                'label'        => 'Refunds Due (Purchase Returns)',
                'count'        => $pendingReturns,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/warehouse/purchase-return',
                'filter_param' => 'status=pending',
            ],
            [
                'key'          => 'unpaid_dealer_invoices',
                'label'        => 'Unpaid Dealer Invoices',
                'count'        => $unpaidDealerInvoices,
                'severity'     => 'info',
                'color'        => 'yellow',
                'route'        => '/sales/dealer-invoice',
                'filter_param' => 'status=pending',
            ],
        ];
    }

    /**
     * Finance Overview tiles: Payables / Receivables / Payments / Purchases / Credit Sales / Refunds Due
     */
    public function getFinanceBreakdown(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $summary = $this->getSummary($storeId, $from, $to);

        $creditSales = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn ($q) => $q->whereBetween('sale_date', [$from, $to]))
            ->where('is_credit', true)
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(grand_total), 0) as amount')
            ->first();

        return [
            'payables'      => ['amount' => $summary['payables_outstanding'], 'label' => 'Payables Outstanding'],
            'receivables'   => ['amount' => $summary['receivables_outstanding'], 'label' => 'Receivables Outstanding'],
            'payments_made' => ['amount' => $summary['payments_made_range'], 'label' => 'Payments Made'],
            'purchases'     => ['amount' => $summary['purchase_value_range'], 'label' => 'Purchase Value'],
            'credit_sales'  => ['amount' => (float) ($creditSales->amount ?? 0), 'count' => (int) ($creditSales->count ?? 0), 'label' => 'Credit Sales'],
            'refunds_due'   => ['amount' => $summary['refunds_due'], 'label' => 'Refunds Due'],
        ];
    }

    /**
     * Suppliers with the largest outstanding payable balance.
     */
    public function getTopOutstandingSuppliers(?int $storeId, int $limit = 10): array
    {
        $rows = DB::table('direct_purchases as dp')
            ->leftJoin('suppliers as s', 's.id', '=', 'dp.supplier_id')
            ->when($storeId, fn ($q) => $q->where(fn ($sq) => $sq->where('dp.store_id', $storeId)->orWhere('dp.company_id', $storeId)))
            ->whereRaw('dp.total_amount > dp.paid_amount')
            ->selectRaw('
                COALESCE(dp.supplier_id, 0) as supplier_id,
                COALESCE(s.name, dp.supplier_name, "Unknown") as supplier_name,
                COUNT(*) as bills,
                COALESCE(SUM(dp.total_amount - dp.paid_amount), 0) as outstanding
            ')
            ->groupBy('dp.supplier_id', 's.name', 'dp.supplier_name')
            ->orderByDesc('outstanding')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'supplier_id'   => $row->supplier_id,
                'supplier_name' => $row->supplier_name,
                'bills'         => (int) $row->bills,
                'outstanding'   => (float) $row->outstanding,
            ]);

        return $rows->toArray();
    }

    /**
     * Recent supplier payments
     */
    public function getRecentSupplierPayments(?int $storeId, int $limit = 10): array
    {
        $rows = DB::table('supplier_payments as sp')
            ->leftJoin('suppliers as s', 's.id', '=', 'sp.supplier_id')
            ->when($storeId, fn ($q) => $q->where('sp.store_id', $storeId))
            ->select([
                'sp.id',
                'sp.payment_no',
                'sp.payment_date',
                'sp.amount',
                'sp.payment_mode',
                DB::raw('COALESCE(s.name, "-") as supplier_name'),
            ])
            ->orderByDesc('sp.id')
            ->limit($limit)
            ->get();

        return $rows->toArray();
    }

    /**
     * Purchases vs Payments Made daily timeline
     */
    public function getPurchasePaymentTrendChart(?int $storeId, ?Carbon $from, ?Carbon $to): array
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
                'purchases' => 0,
                'payments'  => 0,
            ];
            $current->addDay();
        }

        $purchases = DB::table('direct_purchases')
            ->when($storeId, fn ($q) => $q->where(fn ($sq) => $sq->where('store_id', $storeId)->orWhere('company_id', $storeId)))
            ->whereBetween('purchase_date', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->selectRaw('DATE(purchase_date) as d, COALESCE(SUM(total_amount), 0) as amount')
            ->groupBy(DB::raw('DATE(purchase_date)'))
            ->get();

        foreach ($purchases as $row) {
            if (isset($days[$row->d])) {
                $days[$row->d]['purchases'] = (float) $row->amount;
            }
        }

        $payments = DB::table('supplier_payments')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereBetween('payment_date', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->selectRaw('DATE(payment_date) as d, COALESCE(SUM(amount), 0) as amount')
            ->groupBy(DB::raw('DATE(payment_date)'))
            ->get();

        foreach ($payments as $row) {
            if (isset($days[$row->d])) {
                $days[$row->d]['payments'] = (float) $row->amount;
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
