<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerOrder;
use App\Models\LoyaltyTransaction;
use App\Models\PosSale;
use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CrmDashboardService
{
    /**
     * Resolve store / company filtering for the authenticated user.
     */
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

    /**
     * Resolve date range bounds.
     */
    protected function resolveDateRange(array $filters): array
    {
        $from = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : null;
        $to = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : null;

        return [$from, $to];
    }

    /**
     * Consolidated CRM Dashboard Payload
     */
    public function getDashboardData(array $filters, $user): array
    {
        $storeId = $this->resolveStoreId($filters, $user);
        [$from, $to] = $this->resolveDateRange($filters);

        $summary = $this->getSummary($storeId, $from, $to);
        $actionRequired = $this->getActionRequired($storeId, $from, $to);
        $segmentation = $this->getCustomerSegmentation($storeId);
        $orderStatusBreakdown = $this->getOrderStatusBreakdown($storeId, $from, $to);
        $topCustomers = $this->getTopCustomers($storeId, 5);
        $recentOrders = $this->getRecentOrders($storeId, 10);
        $upcomingEvents = $this->getUpcomingCustomerEvents($storeId, 7);
        $timelineChart = $this->getCrmTimelineChart($storeId, $from, $to);
        $performance = $this->getPerformanceMetrics($storeId, $from, $to);

        return [
            'summary'          => $summary,
            'action_required'  => $actionRequired,
            'segmentation'     => $segmentation,
            'order_breakdown'  => $orderStatusBreakdown,
            'top_customers'    => $topCustomers,
            'recent_orders'    => $recentOrders,
            'upcoming_events'  => $upcomingEvents,
            'charts'           => [
                'timeline' => $timelineChart,
            ],
            'performance'      => $performance,
            'last_updated'     => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Primary Summary KPI Cards
     */
    public function getSummary(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        // 1. Customers Count
        $totalCustomers = DB::table('customers')->count();
        $activeCustomers = DB::table('customers')->where('is_active', true)->count();
        
        $newCustQuery = DB::table('customers');
        if ($from && $to) {
            $newCustQuery->whereBetween('created_at', [$from, $to]);
        } else {
            $newCustQuery->whereMonth('created_at', Carbon::now()->month)->whereYear('created_at', Carbon::now()->year);
        }
        $newCustomers = $newCustQuery->count();

        // 2. Customer Orders Aggregation
        $ordersQuery = DB::table('customer_orders');
        if ($storeId) {
            $ordersQuery->where('store_id', $storeId);
        }
        if ($from && $to) {
            $ordersQuery->whereBetween('order_date', [$from->toDateString(), $to->toDateString()]);
        }

        $ordersAgg = (clone $ordersQuery)->selectRaw('
            COUNT(*) as total_orders,
            COALESCE(SUM(total_amount), 0) as total_order_value,
            COALESCE(SUM(advance_paid), 0) as advance_received,
            COALESCE(SUM(balance_due), 0) as balance_receivable,
            COALESCE(AVG(total_amount), 0) as avg_order_value
        ')->first();

        // 3. Customer Receivables / Outstanding balance
        $totalReceivables = (float) DB::table('customers')->sum('current_balance');
        $customersWithDues = DB::table('customers')->where('current_balance', '>', 0)->count();

        // 4. Loyalty Program
        $totalLoyaltyPoints = (float) DB::table('customers')->sum('loyalty_points');
        $loyaltyMembersCount = DB::table('customers')->where('loyalty_points', '>', 0)->count();
        // 'REDEEM' (uppercase) is the real type value LoyaltyTransaction rows use
        // (see PosSaleController's EARN write and CustomerController's redemption
        // queries) -- this previously read 'redeemed' and so always summed to 0.
        $totalPointsRedeemed = (float) DB::table('loyalty_transactions')->where('type', 'REDEEM')->sum('points');

        return [
            'total_customers'      => $totalCustomers,
            'active_customers'     => $activeCustomers,
            'new_customers'        => $newCustomers,
            'total_orders'         => (int) ($ordersAgg->total_orders ?? 0),
            'total_order_value'    => (float) ($ordersAgg->total_order_value ?? 0),
            'advance_received'     => (float) ($ordersAgg->advance_received ?? 0),
            'balance_receivable'   => (float) ($ordersAgg->balance_receivable ?? 0),
            'avg_order_value'      => (float) ($ordersAgg->avg_order_value ?? 0),
            'total_receivables'    => $totalReceivables,
            'customers_with_dues'  => $customersWithDues,
            'total_loyalty_points' => $totalLoyaltyPoints,
            'loyalty_members_count'=> $loyaltyMembersCount,
            'total_points_redeemed'=> $totalPointsRedeemed,
        ];
    }

    /**
     * Action Required Attention Section
     */
    public function getActionRequired(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $todayStr = Carbon::today()->toDateString();

        // 1. Orders Overdue / Due Today for Delivery
        $overdueOrdersCount = DB::table('customer_orders')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->whereDate('delivery_date', '<=', $todayStr)
            ->whereNotIn('status', ['delivered', 'completed', 'cancelled'])
            ->count();

        // 2. Pending Balance on Ready Orders
        $readyPendingBalance = DB::table('customer_orders')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('balance_due', '>', 0)
            ->whereIn('status', ['ready', 'confirmed', 'ready_for_delivery'])
            ->count();

        // 3. Customers Over Credit Limit
        $overCreditLimitCount = DB::table('customers')
            ->where('credit_limit', '>', 0)
            ->whereRaw('current_balance > credit_limit')
            ->count();

        // 4. Unconfirmed / Draft Orders
        $draftOrdersCount = DB::table('customer_orders')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->whereIn('status', ['draft', 'pending'])
            ->count();

        // 5. Birthdays / Anniversaries Today
        $now = Carbon::now();
        $celebrationsToday = DB::table('customers')
            ->where(function ($q) use ($now) {
                $q->where(fn($sub) => $sub->whereMonth('date_of_birth', $now->month)->whereDay('date_of_birth', $now->day))
                  ->orWhere(fn($sub) => $sub->whereMonth('marriage_date', $now->month)->whereDay('marriage_date', $now->day));
            })
            ->count();

        // 6. High Points Inactive Customers (> 500 pts, no order in 60 days)
        $inactivePointsMembers = DB::table('customers')
            ->where('loyalty_points', '>=', 500)
            ->where('is_active', true)
            ->count();

        return [
            [
                'key'         => 'orders_due_today',
                'label'       => 'Orders Due for Delivery',
                'count'       => $overdueOrdersCount,
                'severity'    => 'critical',
                'color'       => 'red',
                'route'       => '/crm/customer-orders',
                'filter_param'=> 'delivery_filter=due_today',
            ],
            [
                'key'         => 'over_credit_limit',
                'label'       => 'Credit Limit Exceeded',
                'count'       => $overCreditLimitCount,
                'severity'    => 'critical',
                'color'       => 'red',
                'route'       => '/crm/customer',
                'filter_param'=> 'filter=over_limit',
            ],
            [
                'key'         => 'ready_pending_balance',
                'label'       => 'Balance Due (Ready Orders)',
                'count'       => $readyPendingBalance,
                'severity'    => 'warning',
                'color'       => 'orange',
                'route'       => '/crm/customer-orders',
                'filter_param'=> 'status=ready&has_balance=true',
            ],
            [
                'key'         => 'draft_orders',
                'label'       => 'Unconfirmed Orders',
                'count'       => $draftOrdersCount,
                'severity'    => 'warning',
                'color'       => 'orange',
                'route'       => '/crm/customer-orders',
                'filter_param'=> 'status=pending',
            ],
            [
                'key'         => 'celebrations_today',
                'label'       => 'Birthdays / Anniversaries',
                'count'       => $celebrationsToday,
                'severity'    => 'info',
                'color'       => 'yellow',
                'route'       => '/crm/customer',
                'filter_param'=> 'event=today',
            ],
            [
                'key'         => 'loyalty_club_members',
                'label'       => 'Loyalty Club Members',
                'count'       => $inactivePointsMembers,
                'severity'    => 'info',
                'color'       => 'yellow',
                'route'       => '/crm/loyalty-management',
                'filter_param'=> 'min_points=500',
            ],
        ];
    }

    /**
     * Customer Segmentation Breakdown -- RFM-lite (Recency/Frequency/Monetary),
     * computed from real pos_sales history. Previously 4 hardcoded WHERE-clause
     * buckets (customer_type LIKE, loyalty_points threshold) with no actual
     * behavioral scoring; this replaces them with quartile-ranked RFM segments.
     *
     * Quartiles are computed in PHP over one grouped-by-customer query (row
     * count = distinct customers with sales, not raw transactions, so this
     * stays small even at real scale) rather than via SQL NTILE(), avoiding a
     * MariaDB-version dependency (NTILE needs 10.2+) for a dataset this size.
     */
    public function getCustomerSegmentation(?int $storeId): array
    {
        $rows = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereNotNull('customer_id')
            ->selectRaw('
                customer_id,
                DATEDIFF(NOW(), MAX(sale_date)) as recency_days,
                COUNT(*) as frequency,
                SUM(grand_total) as monetary
            ')
            ->groupBy('customer_id')
            ->get();

        $labels = [
            'champions' => 'Champions',
            'loyal'     => 'Loyal',
            'at_risk'   => 'At Risk',
            'lost'      => 'Lost / Inactive',
        ];
        $counts = ['champions' => 0, 'loyal' => 0, 'at_risk' => 0, 'lost' => 0];
        $total = DB::table('customers')->count() ?: 1;

        if ($rows->isNotEmpty()) {
            $n = $rows->count();
            // 0 = best quartile, 3 = worst, after sorting each metric so index 0
            // is the most desirable value for that metric.
            $quartileOf = function ($sorted) use ($n) {
                $map = [];
                foreach ($sorted->values() as $i => $row) {
                    $map[$row->customer_id] = min(3, (int) floor(($i * 4) / $n));
                }
                return $map;
            };

            $recencyQ = $quartileOf($rows->sortBy('recency_days'));       // lower days = better = rank 0
            $frequencyQ = $quartileOf($rows->sortByDesc('frequency'));    // higher freq = better = rank 0
            $monetaryQ = $quartileOf($rows->sortByDesc('monetary'));      // higher spend = better = rank 0

            foreach ($rows as $row) {
                $r = $recencyQ[$row->customer_id];
                $f = $frequencyQ[$row->customer_id];
                $m = $monetaryQ[$row->customer_id];

                if ($r <= 1 && $f <= 1) {
                    $counts['champions']++;
                } elseif ($f <= 1) {
                    $counts['loyal']++;
                } elseif ($r >= 2 && $m <= 1) {
                    $counts['at_risk']++;
                } else {
                    $counts['lost']++;
                }
            }
        }

        $result = [];
        foreach ($counts as $key => $count) {
            $result[$key] = [
                'label' => $labels[$key],
                'count' => $count,
                'pct'   => round(($count / $total) * 100, 1),
            ];
        }

        return $result;
    }

    /**
     * Orders Breakdown by Status
     */
    public function getOrderStatusBreakdown(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $query = DB::table('customer_orders')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->when($from && $to, fn($q) => $q->whereBetween('order_date', [$from->toDateString(), $to->toDateString()]));

        $pending = (clone $query)->whereIn('status', ['pending', 'draft'])->count();
        $confirmed = (clone $query)->where('status', 'confirmed')->count();
        $inProgress = (clone $query)->where('status', 'in_progress')->count();
        $ready = (clone $query)->whereIn('status', ['ready', 'ready_for_delivery'])->count();
        $delivered = (clone $query)->whereIn('status', ['delivered', 'completed'])->count();
        $cancelled = (clone $query)->where('status', 'cancelled')->count();

        return [
            'pending'     => $pending,
            'confirmed'   => $confirmed,
            'in_progress' => $inProgress,
            'ready'       => $ready,
            'delivered'   => $delivered,
            'cancelled'   => $cancelled,
        ];
    }

    /**
     * Top Valuable Customers -- ranked and valued by actual pos_sales history,
     * not `customer_orders` (a niche custom-order table). The previous version
     * both undercounted nearly every regular retail customer (whose
     * transactions live in pos_sales, not customer_orders) and ignored
     * $storeId entirely despite accepting it as a parameter.
     */
    public function getTopCustomers(?int $storeId, int $limit = 5): array
    {
        $salesSub = $storeId ? 'pos_sales.customer_id = customers.id AND pos_sales.store_id = ' . (int) $storeId : 'pos_sales.customer_id = customers.id';

        $customers = DB::table('customers')
            ->select([
                'customers.id',
                'customers.name',
                'customers.code',
                DB::raw('COALESCE(customers.phone, "-") as phone'),
                'customers.loyalty_points',
                'customers.current_balance',
                'customers.credit_limit',
                'customers.customer_type',
                DB::raw("(SELECT COUNT(*) FROM pos_sales WHERE {$salesSub}) as orders_count"),
                DB::raw("(SELECT COALESCE(SUM(grand_total), 0) FROM pos_sales WHERE {$salesSub}) as total_spent"),
            ])
            ->orderByDesc(DB::raw("(SELECT COALESCE(SUM(grand_total), 0) FROM pos_sales WHERE {$salesSub})"))
            ->limit($limit)
            ->get();

        return $customers->toArray();
    }

    /**
     * Recent Customer Orders Stream
     */
    public function getRecentOrders(?int $storeId, int $limit = 10): array
    {
        $orders = DB::table('customer_orders')
            ->leftJoin('customers', 'customer_orders.customer_id', '=', 'customers.id')
            ->when($storeId, fn($q) => $q->where('customer_orders.store_id', $storeId))
            ->select([
                'customer_orders.id',
                'customer_orders.order_no',
                'customer_orders.order_date',
                'customer_orders.delivery_date',
                DB::raw('customer_orders.total_amount as net_amount'),
                'customer_orders.advance_paid',
                'customer_orders.balance_due',
                'customer_orders.status',
                DB::raw('COALESCE(customers.name, "-") as customer_name'),
                DB::raw('COALESCE(customers.phone, "-") as customer_phone'),
            ])
            ->orderByDesc('customer_orders.id')
            ->limit($limit)
            ->get();

        return $orders->toArray();
    }

    /**
     * Upcoming Birthdays / Anniversaries in next X days
     */
    public function getUpcomingCustomerEvents(?int $storeId, int $daysAhead = 7): array
    {
        $now = Carbon::now();
        $events = DB::table('customers')
            ->where(function ($q) use ($now) {
                $q->whereNotNull('date_of_birth')->orWhereNotNull('marriage_date');
            })
            ->select([
                'id',
                'name',
                DB::raw('COALESCE(phone, "-") as phone'),
                'date_of_birth',
                'marriage_date',
                'loyalty_points',
            ])
            ->limit(10)
            ->get()
            ->map(function ($c) use ($now) {
                $isBday = false;
                $isAnniv = false;
                if (!empty($c->date_of_birth)) {
                    $dob = Carbon::parse($c->date_of_birth);
                    if ($dob->month === $now->month && abs($dob->day - $now->day) <= 3) {
                        $isBday = true;
                    }
                }
                if (!empty($c->marriage_date)) {
                    $m = Carbon::parse($c->marriage_date);
                    if ($m->month === $now->month && abs($m->day - $now->day) <= 3) {
                        $isAnniv = true;
                    }
                }

                return [
                    'id'            => $c->id,
                    'name'          => $c->name,
                    'phone'         => $c->phone,
                    'event_type'    => $isBday ? 'Birthday' : ($isAnniv ? 'Anniversary' : 'Loyalty Reward'),
                    'event_date'    => $isBday ? Carbon::parse($c->date_of_birth)->format('M d') : ($isAnniv ? Carbon::parse($c->marriage_date)->format('M d') : 'Active'),
                    'points'        => (float) $c->loyalty_points,
                ];
            });

        return $events->toArray();
    }

    /**
     * Timeline Chart (Daily New Customers & Orders)
     */
    public function getCrmTimelineChart(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $startDate = $from ?: Carbon::today()->subDays(6);
        $endDate = $to ?: Carbon::today();

        $days = [];
        $current = clone $startDate;
        while ($current->lte($endDate)) {
            $dateStr = $current->toDateString();
            $days[$dateStr] = [
                'date'          => $current->format('M d'),
                'raw_date'      => $dateStr,
                'new_customers' => 0,
                'orders_count'  => 0,
                'order_amount'  => 0,
            ];
            $current->addDay();
        }

        // New customers count
        $custs = DB::table('customers')
            ->whereBetween('created_at', [$startDate->startOfDay(), $endDate->endOfDay()])
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy(DB::raw('DATE(created_at)'))
            ->get();

        foreach ($custs as $c) {
            if (isset($days[$c->d])) {
                $days[$c->d]['new_customers'] = (int) $c->c;
            }
        }

        // Customer orders count & amount
        $orders = DB::table('customer_orders')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->whereBetween('order_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->selectRaw('DATE(order_date) as d, COUNT(*) as c, COALESCE(SUM(total_amount), 0) as amount')
            ->groupBy(DB::raw('DATE(order_date)'))
            ->get();

        foreach ($orders as $o) {
            if (isset($days[$o->d])) {
                $days[$o->d]['orders_count'] = (int) $o->c;
                $days[$o->d]['order_amount'] = (float) $o->amount;
            }
        }

        return array_values($days);
    }

    /**
     * Operational Performance Metrics. loyalty_redemption_rate and
     * customer_retention_rate were previously hardcoded string constants
     * ('34.8%'/'89.4%') -- both now computed from real data.
     * order_conversion_rate stays customer_orders-based (delivered/completed
     * over total) since custom-order conversion genuinely is about that table.
     */
    public function getPerformanceMetrics(?int $storeId, ?Carbon $from, ?Carbon $to): array
    {
        $totalDelivered = DB::table('customer_orders')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('status', 'delivered')
            ->count();

        $onTimeDelivered = DB::table('customer_orders')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->where('status', 'delivered')
            ->whereRaw('updated_at <= delivery_date')
            ->count();

        $deliveryRate = $totalDelivered > 0 ? round(($onTimeDelivered / $totalDelivered) * 100, 1) : 0;

        $totalOrders = DB::table('customer_orders')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->count();
        $convertedOrders = DB::table('customer_orders')
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->whereIn('status', ['delivered', 'completed'])
            ->count();
        $conversionRate = $totalOrders > 0 ? round(($convertedOrders / $totalOrders) * 100, 1) : 0;

        // Real (as opposed to 'redeemed', a type value the app never actually
        // writes -- see getSummary()) -- points redeemed vs. points earned in
        // the same window.
        $pointsQuery = fn ($type) => DB::table('loyalty_transactions')
            ->where('type', $type)
            ->when($from && $to, fn ($q) => $q->whereBetween('created_at', [$from, $to]));
        $pointsEarned = (float) $pointsQuery('EARN')->sum('points');
        $pointsRedeemed = (float) $pointsQuery('REDEEM')->sum('points');
        $redemptionRate = $pointsEarned > 0 ? round(($pointsRedeemed / $pointsEarned) * 100, 1) : 0;

        // Cohort-lite retention: of the customers who bought in the period
        // immediately before this one, what fraction bought again in this one.
        $periodTo = $to ? $to->copy() : Carbon::now();
        $periodFrom = $from ? $from->copy() : $periodTo->copy()->subDays(30);
        $periodLengthDays = max(1, $periodFrom->diffInDays($periodTo));
        $prevTo = $periodFrom->copy()->subSecond();
        $prevFrom = $prevTo->copy()->subDays($periodLengthDays);

        $prevCustomerIds = DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereNotNull('customer_id')
            ->whereBetween('sale_date', [$prevFrom, $prevTo])
            ->distinct()
            ->pluck('customer_id');

        $retainedCount = $prevCustomerIds->isEmpty() ? 0 : DB::table('pos_sales')
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->whereIn('customer_id', $prevCustomerIds)
            ->whereBetween('sale_date', [$periodFrom, $periodTo])
            ->distinct()
            ->count('customer_id');

        $retentionRate = $prevCustomerIds->isNotEmpty() ? round(($retainedCount / $prevCustomerIds->count()) * 100, 1) : 0;

        return [
            'on_time_delivery_rate'   => "{$deliveryRate}%",
            'loyalty_redemption_rate' => "{$redemptionRate}%",
            'customer_retention_rate' => "{$retentionRate}%",
            'order_conversion_rate'   => "{$conversionRate}%",
        ];
    }
}
