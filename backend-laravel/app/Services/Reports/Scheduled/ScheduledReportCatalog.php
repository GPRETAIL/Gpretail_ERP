<?php

namespace App\Services\Reports\Scheduled;

use App\Services\Accounting\AccountingReports;
use App\Services\Dashboards\FastMovingProducts;
use App\Services\Reports\ReportSummaryService;
use App\Services\Reports\StoreReports;
use App\Services\Reports\SummaryDatasets;
use App\Services\Reports\WarehouseReports;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Settings > Scheduler: the reports that can be emailed, all built on the server from what the report pages already
 * use (Summary layouts, warehouse and store reports, the books, the dashboard). Each knows the page a recipient must be
 * allowed to view. Building runs inside the schedule's store context (ScheduledReportRunner sets it).
 */
class ScheduledReportCatalog
{
    private const DATE_KEYS = ['date', 'sale_date', 'invoice_date', 'purchase_date', 'po_date', 'bill_date', 'return_date', 'dispatch_date', 'transfer_date', 'payment_date', 'received_at', 'created_at'];

    private const WAREHOUSE_LABELS = ['po_lines' => 'Purchase order lines', 'po_summary' => 'Purchase order summary', 'purchase_tax' => 'Purchase tax (bill-wise)',
        'purchase_tax_summary' => 'Purchase tax summary', 'section_purchase' => 'Section-wise purchase', 'section_returns' => 'Section-wise purchase returns',
        'cancelled_returns' => 'Cancelled purchase returns', 'outwards' => 'Stock transfers out', 'outward_lines' => 'Stock transfer lines',
        'stock_movement' => 'Stock movement', 'pending_inward' => 'Pending inward transfers', 'pending_outward' => 'Pending outward transfers', 'retail_stock' => 'Retail stock'];

    private const STORE_LABELS = ['stock_aging' => 'Stock ageing', 'shelf_period' => 'Shelf period', 'stock_audit' => 'Stock audit',
        'loyalty_redemptions' => 'Loyalty redemptions', 'incentives' => 'Salesperson incentives',
        'gift_credit_issues' => 'Gift vouchers and credit notes issued', 'gift_credit_uses' => 'Gift voucher and credit note use',
        'coupon_issues' => 'Coupons issued', 'coupon_uses' => 'Coupon use', 'gift_issues' => 'Gift items issued'];

    /** The ERP's menu modules, in menu order: the Scheduler lists its report library this way. */
    public const MODULES = ['Dashboard', 'Sales', 'Warehouse', 'Store', 'Finance', 'CRM', 'HR'];

    /** Summary layouts by their report name, and the module each belongs to when not its dataset's own. */
    private const SUMMARY_LABELS = ['direct_purchase_lines' => 'Direct purchases', 'invoice_lines' => 'Purchase invoices', 'purchase_returns' => 'Purchase returns',
        'stock' => 'Warehouse stock', 'outward_lines' => 'Stock transfers out', 'po_lines' => 'Purchase orders', 'inventory_entries' => 'Inventory entries',
        'stock_transactions' => 'Stock movements', 'products' => 'Products', 'supplier_payments' => 'Supplier payments', 'suppliers' => 'Suppliers', 'agents' => 'Agents',
        'taxes' => 'Purchase tax', 'sale_lines' => 'Sales (items)', 'sale_margin' => 'Sales margin', 'sale_tax' => 'Sales tax', 'sale_payments' => 'Sale payments',
        'unsettled_bills' => 'Unsettled bills', 'credit_bills' => 'Credit bills', 'cancelled_bills' => 'Cancelled bills', 'approvals' => 'Sales on approval',
        'customer_orders' => 'Customer orders', 'settlements' => 'Settlements', 'cash_sessions' => 'Cash opening & closing', 'pos_returns' => 'Sales returns',
        'dealer_lines' => 'Dealer sales', 'dealer_returns' => 'Dealer returns', 'store_stock' => 'Store stock', 'stock_audits' => 'Stock audits', 'employees' => 'Employees',
        'customers' => 'Customers', 'voucher_lines' => 'Day Book entries'];

    private const SUMMARY_MODULES = ['supplier_payments' => 'Finance', 'voucher_lines' => 'Finance', 'customer_orders' => 'CRM', 'customers' => 'CRM',
        'employees' => 'HR', 'store_stock' => 'Store', 'stock_audits' => 'Store'];

    private const STORE_MODULES = ['loyalty_redemptions' => 'CRM', 'incentives' => 'HR', 'gift_credit_issues' => 'Sales', 'gift_credit_uses' => 'Sales', 'coupon_issues' => 'Sales', 'coupon_uses' => 'Sales', 'gift_issues' => 'Sales'];

    public function __construct(private ReportSummaryService $summaries) {}

    /**
     * Every schedulable report: key => [label, module, page (permission), dated, layouts (Summary reports only)].
     *
     * @return array<string, array{label: string, module: string, page: string, dated: bool, layouts?: array<int, array{value: string, label: string}>}>
     */
    public function all(): array
    {
        $reports = [
            'daily_summary' => ['label' => 'Daily Business Summary', 'module' => 'Dashboard', 'page' => '/dashboard', 'dated' => true],
            'fast_moving' => ['label' => 'Fast Moving Products', 'module' => 'Dashboard', 'page' => '/dashboard', 'dated' => true],
            'finance.trial_balance' => ['label' => 'Trial Balance', 'module' => 'Finance', 'page' => '/finance/trial-balance', 'dated' => true],
            'finance.profit_loss' => ['label' => 'Profit & Loss', 'module' => 'Finance', 'page' => '/finance/p-l-account', 'dated' => true],
            'finance.balance_sheet' => ['label' => 'Balance Sheet', 'module' => 'Finance', 'page' => '/finance/balance-sheet', 'dated' => true],
            'finance.daybook' => ['label' => 'Day Book', 'module' => 'Finance', 'page' => '/finance/daybook', 'dated' => true],
            'finance.receivable' => ['label' => 'Receivable (customers owe)', 'module' => 'Finance', 'page' => '/finance/receivable', 'dated' => true],
            'finance.payable' => ['label' => 'Payable (owed to suppliers)', 'module' => 'Finance', 'page' => '/finance/payable', 'dated' => true],
            'supplier.dues' => ['label' => 'Supplier dues, bill by bill', 'module' => 'Finance', 'page' => '/finance/supplier-payment', 'dated' => false],
        ];
        foreach (WarehouseReports::REPORTS as $report) {
            $reports["warehouse.$report"] = ['label' => self::WAREHOUSE_LABELS[$report] ?? ReportTable::label($report), 'module' => 'Warehouse', 'page' => '/warehouse/reports', 'dated' => true];
        }
        foreach (StoreReports::REPORTS as $report) {
            $reports["store.$report"] = ['label' => self::STORE_LABELS[$report] ?? ReportTable::label($report), 'module' => self::STORE_MODULES[$report] ?? 'Store', 'page' => '/sales/reports', 'dated' => false];
        }
        foreach (SummaryDatasets::all() as $key => $dataset) {
            $module = $dataset['module'];
            $reports["summary.$key"] = [
                'label' => (self::SUMMARY_LABELS[$key] ?? ReportTable::label($key)).' summary',
                'module' => self::SUMMARY_MODULES[$key] ?? (['sales' => 'Sales', 'warehouse' => 'Warehouse', 'finance' => 'Finance'][$module] ?? ucfirst($module)),
                'page' => ['sales' => '/sales/reports', 'warehouse' => '/warehouse/reports', 'finance' => '/finance/daybook'][$module] ?? '/dashboard',
                'dated' => isset($dataset['date']),
                'layouts' => collect($dataset['layouts'])->map(fn ($layout, $value) => ['value' => $value, 'label' => $layout['title']])->values()->all(),
            ];
        }

        return $reports;
    }

    public function get(string $key): array
    {
        return $this->all()[$key] ?? throw ValidationException::withMessages(['report_key' => 'Choose a report from the list.']);
    }

    /** Builds a report for one store and period. */
    public function build(string $key, int $storeId, string $from, string $to, array $params = []): ReportTable
    {
        $meta = $this->get($key);
        $period = ReportPeriod::describe($from, $to);
        [$kind, $name] = str_contains($key, '.') ? explode('.', $key, 2) : [$key, null];

        return match ($kind) {
            'daily_summary' => $this->dailySummary($storeId, $from, $to, $period),
            'fast_moving' => $this->fastMoving($from, $to, $period),
            'finance' => $this->finance($name, $meta['label'], $storeId, $from, $to, $period),
            'supplier' => new ReportTable($meta['label'], 'As on '.ReportPeriod::describe($to, $to), [ReportTable::section(null, $this->supplierDues($storeId))]),
            'warehouse' => $this->rows($meta['label'], app(WarehouseReports::class)->rows($name, [$storeId]), $from, $to, $period),
            'store' => new ReportTable($meta['label'], 'As on '.ReportPeriod::describe($to, $to), [ReportTable::section(null, app(StoreReports::class)->rows($name))]),
            'summary' => $this->summary($name, $meta, $storeId, $from, $to, $params['layout'] ?? null),
        };
    }

    private function summary(string $dataset, array $meta, int $storeId, string $from, string $to, ?string $layout): ReportTable
    {
        $module = SummaryDatasets::all()[$dataset]['module'];
        $layout = collect($meta['layouts'])->firstWhere('value', $layout)['value'] ?? $meta['layouts'][0]['value'];
        $result = $this->summaries->run($module, $dataset, $layout, $from, $to, [$storeId]);
        $columns = [['key' => 'label', 'label' => $result['group_header'], 'type' => 'text'], ...$result['columns']];
        $rows = array_map(fn ($row) => array_intersect_key($row, array_flip(array_column($columns, 'key'))), $result['rows']);

        return new ReportTable($meta['label'].' by '.strtolower($result['layout_label']), $result['dated'] ? ReportPeriod::describe($from, $to) : 'As on '.ReportPeriod::describe($to, $to),
            [['title' => null, 'columns' => $columns, 'rows' => $rows, 'totals' => $result['totals']]], capped: (bool) $result['capped']);
    }

    /** Plain rows, kept to the period when they carry a date (snapshot reports, without one, are "as on"). */
    private function rows(string $title, Collection $rows, string $from, string $to, string $period): ReportTable
    {
        $first = (array) ($rows->first() ?? []);
        $dateKey = collect(self::DATE_KEYS)->first(fn ($key) => array_key_exists($key, $first));
        if ($dateKey) {
            $rows = $rows->filter(function ($row) use ($dateKey, $from, $to) {
                $day = substr((string) ((array) $row)[$dateKey], 0, 10);

                return $day >= $from && $day <= $to;
            })->values();
        }

        return new ReportTable($title, $dateKey ? $period : 'As on '.ReportPeriod::describe($to, $to), [ReportTable::section(null, $rows)]);
    }

    private function fastMoving(string $from, string $to, string $period): ReportTable
    {
        $rows = collect(app(FastMovingProducts::class)->report($from, $to, null, 200)['rows'])->map(fn ($r) => [
            'product' => $r['name'], 'code' => $r['code'], 'last_purchased' => $r['last_received'], 'purchased' => $r['bought'], 'sold' => $r['net_sold'],
            'last_sold' => $r['last_sold'], 'balance' => $r['balance'], 'per_day' => $r['per_day'], 'days_to_sell' => $r['avg_days_to_sell'],
            'sell_through_percent' => $r['sell_through'], 'stock_lasts_days' => $r['days_of_stock'], 'movement' => $r['movement'],
        ]);

        return new ReportTable('Fast Moving Products', $period, [ReportTable::section(null, $rows, ['per_day' => 'Sold / day', 'days_to_sell' => 'Days to sell', 'stock_lasts_days' => 'Stock lasts (days)'],
            ['purchased' => 'qty', 'sold' => 'qty', 'balance' => 'qty', 'per_day' => 'qty', 'days_to_sell' => 'qty', 'stock_lasts_days' => 'count', 'last_purchased' => 'date', 'last_sold' => 'date'])],
            ['Products sold' => (string) $rows->count(), 'Units sold' => (string) round($rows->sum('sold'), 2)]);
    }

    private function finance(string $name, string $label, int $storeId, string $from, string $to, string $period): ReportTable
    {
        $money = fn ($v) => round((float) $v, 2);

        return match ($name) {
            'trial_balance' => (function () use ($storeId, $from, $to, $period, $money, $label) {
                $tb = AccountingReports::trialBalance($storeId, $from, $to);
                $rows = collect($tb['rows'])->map(fn ($r) => ['group' => $r['group_name'], 'ledger' => $r['name'], 'opening' => $money($r['opening']), 'debit' => $money($r['debit']),
                    'credit' => $money($r['credit']), 'closing_dr' => $r['closing'] > 0 ? $money($r['closing']) : 0, 'closing_cr' => $r['closing'] < 0 ? $money(-$r['closing']) : 0]);

                return new ReportTable($label, $period, [ReportTable::section(null, $rows, types: ['opening' => 'money', 'debit' => 'money', 'credit' => 'money', 'closing_dr' => 'money', 'closing_cr' => 'money'],
                    totals: ['closing_dr' => $tb['total_debit'], 'closing_cr' => $tb['total_credit']])]);
            })(),
            'profit_loss' => (function () use ($storeId, $from, $to, $period, $label) {
                $pl = AccountingReports::profitAndLoss($storeId, $from, $to);
                $t = $pl['trading'];
                $lines = fn ($items) => collect($items)->map(fn ($i) => ['particulars' => $i['name'], 'amount' => $i['amount']])->all();
                $trading = [['particulars' => 'Opening stock', 'amount' => $t['opening_stock']], ...$lines($t['purchases']), ...$lines($t['direct_expenses']),
                    ['particulars' => 'Less: closing stock', 'amount' => -$t['closing_stock']], ...array_map(fn ($r) => [...$r, 'amount' => -$r['amount']], $lines($t['sales'])),
                    ...array_map(fn ($r) => [...$r, 'amount' => -$r['amount']], $lines($t['direct_incomes']))];

                return new ReportTable($label, $period, [
                    ReportTable::section('Expenses', [...$lines($pl['profit_and_loss']['indirect_expenses'])], types: ['amount' => 'money']),
                    ReportTable::section('Incomes', [...$lines($pl['profit_and_loss']['indirect_incomes'])], types: ['amount' => 'money']),
                    ReportTable::section('Trading (negative = income)', $trading, types: ['amount' => 'money'], totals: ['amount' => -$t['gross_profit']]),
                ], ['Gross profit' => number_format($t['gross_profit'], 2), 'Net profit' => number_format($pl['profit_and_loss']['net_profit'], 2)]);
            })(),
            'balance_sheet' => (function () use ($storeId, $to, $label) {
                $bs = AccountingReports::balanceSheet($storeId, $to);
                $flat = fn ($groups) => collect($groups)->flatMap(fn ($g) => collect($g['accounts'])->map(fn ($a) => ['group' => $g['group'], 'ledger' => $a['name'], 'amount' => $a['amount']]))->all();

                return new ReportTable($label, 'As on '.ReportPeriod::describe($to, $to), [
                    ReportTable::section('Liabilities', [...$flat($bs['liabilities']), ['group' => 'Profit & Loss', 'ledger' => 'Profit & Loss A/c', 'amount' => $bs['profit_and_loss']]], types: ['amount' => 'money'], totals: ['amount' => $bs['total_liabilities']]),
                    ReportTable::section('Assets', [...$flat($bs['assets']), ['group' => 'Stock', 'ledger' => 'Closing stock', 'amount' => $bs['closing_stock']]], types: ['amount' => 'money'], totals: ['amount' => $bs['total_assets']]),
                ]);
            })(),
            'daybook' => new ReportTable($label, $period, [ReportTable::section(null, AccountingReports::daybook($storeId, $from, $to)->map(fn ($v) => [
                'date' => $v['voucher_date'], 'type' => ucfirst(str_replace('_', ' ', $v['voucher_type'])), 'voucher_no' => $v['voucher_no'], 'reference' => $v['reference_no'],
                'narration' => $v['narration'], 'amount' => round((float) $v['amount'], 2),
            ]), types: ['amount' => 'money'])]),
            default => (function () use ($name, $storeId, $to, $label) {
                $rows = AccountingReports::outstanding($storeId, $name === 'payable' ? 'payable' : 'receivable', $to)->map(fn ($r) => ['party' => $r['name'], 'amount' => $r['amount'],
                    'last_entry' => $r['last_entry'], 'days_since' => $r['last_entry'] ? (int) Carbon::parse($r['last_entry'])->diffInDays(Carbon::parse($to)) : null]);

                return new ReportTable($label, 'As on '.ReportPeriod::describe($to, $to), [ReportTable::section(null, $rows, types: ['amount' => 'money', 'last_entry' => 'date', 'days_since' => 'count'], totals: ['amount' => round($rows->sum('amount'), 2)])],
                    ['Total' => number_format($rows->sum('amount'), 2), 'Parties' => (string) $rows->count()]);
            })(),
        };
    }

    /** Unpaid supplier bills: purchase invoices, direct purchases and opening bills, oldest first. */
    private function supplierDues(int $storeId): Collection
    {
        $names = DB::table('suppliers')->where('store_id', $storeId)->pluck('name', 'id');
        $rows = collect();
        foreach (DB::table('purchase_invoices')->where('store_id', $storeId)->whereColumn('paid_amount', '<', 'grand_total')->get() as $b) {
            $rows->push(['supplier' => $names[$b->supplier_id] ?? '-', 'type' => 'Invoice', 'bill_no' => $b->invoice_no, 'bill_date' => $b->invoice_date, 'amount' => (float) $b->grand_total, 'paid' => (float) $b->paid_amount]);
        }
        foreach (DB::table('direct_purchases')->where('store_id', $storeId)->whereColumn('paid_amount', '<', 'total_amount')->get() as $b) {
            $rows->push(['supplier' => $names[$b->supplier_id] ?? ($b->supplier_name ?? '-'), 'type' => 'Direct purchase', 'bill_no' => $b->purchase_no, 'bill_date' => $b->purchase_date, 'amount' => (float) $b->total_amount, 'paid' => (float) $b->paid_amount]);
        }
        foreach (DB::table('opening_bills')->where('store_id', $storeId)->where('party_type', 'supplier')->whereColumn('paid_amount', '<', 'amount')->get() as $b) {
            $rows->push(['supplier' => $names[$b->party_id] ?? '-', 'type' => 'Opening bill', 'bill_no' => $b->bill_no, 'bill_date' => $b->bill_date, 'amount' => (float) $b->amount, 'paid' => (float) $b->paid_amount]);
        }
        $today = Carbon::now(config('app.business_timezone'))->startOfDay();

        return $rows->map(fn ($r) => [...$r, 'bill_date' => substr((string) $r['bill_date'], 0, 10), 'balance' => round($r['amount'] - $r['paid'], 2),
            'days' => $r['bill_date'] ? (int) Carbon::parse($r['bill_date'])->diffInDays($today) : null])->sortBy('bill_date')->values();
    }

    /** The morning email: sales, returns, collections, purchases, payments, cash closings and the top products. */
    private function dailySummary(int $storeId, string $from, string $to, string $period): ReportTable
    {
        $tz = config('app.business_timezone');
        $range = [Carbon::parse($from, $tz)->startOfDay()->utc()->toDateTimeString(), Carbon::parse($to, $tz)->endOfDay()->utc()->toDateTimeString()];
        $sales = DB::table('pos_sales')->where('store_id', $storeId)->whereBetween('sale_date', $range)->where('status', '!=', 'CANCELLED');
        $bills = (clone $sales)->count();
        $salesValue = (float) (clone $sales)->sum('grand_total');
        $returns = DB::table('pos_returns')->where('store_id', $storeId)->whereBetween('return_date', $range)->where('status', '!=', 'CANCELLED');
        $returnValue = (float) (clone $returns)->sum('total_refund');
        $dealer = (float) DB::table('dealer_invoices')->where('store_id', $storeId)->whereBetween('invoice_date', [$from, $to])->where('status', '!=', 'CANCELLED')->sum('grand_total');
        $purchases = (float) DB::table('purchase_invoices')->where('store_id', $storeId)->whereBetween('invoice_date', [$from, $to])->sum('grand_total')
            + (float) DB::table('direct_purchases')->where('store_id', $storeId)->whereBetween('purchase_date', [$from, $to])->sum('total_amount');
        $paid = (float) DB::table('supplier_payments')->where('store_id', $storeId)->whereBetween('payment_date', [$from, $to])->sum('amount');
        $closings = DB::table('cash_register_sessions')->where('store_id', $storeId)->whereBetween('closed_at', $range)->where('status', 'CLOSED')
            ->selectRaw('COUNT(*) as n, SUM(closing_cash) as cash, SUM(difference) as diff')->first();
        $tenders = DB::table('pos_payments as p')->join('pos_sales as s', 's.id', '=', 'p.pos_sale_id')->where('s.store_id', $storeId)->whereBetween('s.sale_date', $range)
            ->where('s.status', '!=', 'CANCELLED')->groupBy('p.payment_mode')->selectRaw('p.payment_mode as mode, COUNT(DISTINCT s.id) as bills, SUM(p.amount) as amount')->get()
            ->map(fn ($t) => ['mode' => ucfirst(strtolower((string) $t->mode)), 'bills' => (int) $t->bills, 'amount' => round((float) $t->amount, 2)]);
        $top = collect(app(FastMovingProducts::class)->report($from, $to, null, 10)['rows'])
            ->map(fn ($r) => ['product' => $r['name'], 'sold' => $r['net_sold'], 'balance' => $r['balance'], 'movement' => $r['movement']]);
        $metric = fn ($label, $value, $type = 'money') => ['metric' => $label, 'value' => $type === 'money' ? number_format((float) $value, 2) : (string) $value];
        $net = $salesValue - $returnValue;

        return new ReportTable('Daily Business Summary', $period, [
            ReportTable::section('Summary', [
                $metric('POS sales', $salesValue), $metric('Bills', $bills, 'count'), $metric('Average bill', $bills ? $salesValue / $bills : 0), $metric('Returns', $returnValue),
                $metric('Net POS sales', $net), $metric('Dealer sales', $dealer), $metric('Purchases', $purchases), $metric('Paid to suppliers', $paid),
                $metric('Cash closings', (int) ($closings->n ?? 0), 'count'), $metric('Cash counted at closing', (float) ($closings->cash ?? 0)), $metric('Cash difference', (float) ($closings->diff ?? 0)),
            ], ['metric' => 'Metric', 'value' => 'Value'], ['metric' => 'text', 'value' => 'text'], ['value' => null]),
            ReportTable::section('Collections by mode', $tenders, types: ['bills' => 'count', 'amount' => 'money']),
            ReportTable::section('Top selling products', $top, types: ['sold' => 'qty', 'balance' => 'qty']),
        ], ['Net sales' => number_format($net, 2), 'Bills' => (string) $bills, 'Dealer sales' => number_format($dealer, 2), 'Purchases' => number_format($purchases, 2)]);
    }
}
