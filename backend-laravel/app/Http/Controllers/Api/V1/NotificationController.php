<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\StoreLocalNode;
use App\Services\PaginationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    private const DUE_SOON_TYPE = 'SUPPLIER_PAYMENT_DUE_SOON';
    private const OVERDUE_TYPE = 'SUPPLIER_PAYMENT_OVERDUE';
    private const DUE_SOON_DAYS = 30;
    private const OVERDUE_DAYS = 90;
    private const SYNC_STALE_TYPE = 'SYNC_NODE_STALE';
    private const SYNC_STALE_THRESHOLD_MINUTES = 5;

    // Same key/label/route/severity conditions the module dashboards already surface as
    // "Action Required" banner tiles -- promoted to real notifications for the subset that are
    // time-sensitive, per-record events (something crossed a threshold just now) rather than
    // ongoing housekeeping state (a count that's basically always > 0, like "Inactive Suppliers"
    // or "Products Missing HSN Code") that would just sit unread forever and add noise.
    private const CUSTOMER_CREDIT_LIMIT_TYPE = 'CUSTOMER_CREDIT_LIMIT_EXCEEDED';
    private const CREDIT_SALE_DUE_SOON_TYPE = 'CREDIT_SALE_DUE_SOON';
    private const CREDIT_SALE_OVERDUE_TYPE = 'CREDIT_SALE_OVERDUE';
    private const CREDIT_SALE_DUE_SOON_DAYS = 7;
    private const CREDIT_SALE_OVERDUE_DAYS = 30;
    private const UNPAID_DEALER_INVOICE_TYPE = 'UNPAID_DEALER_INVOICE';
    private const PURCHASE_RETURN_REFUND_DUE_TYPE = 'PURCHASE_RETURN_REFUND_DUE';
    private const PHYSICAL_STOCK_VARIANCE_TYPE = 'PHYSICAL_STOCK_VARIANCE';
    private const LOW_STOCK_ITEM_TYPE = 'LOW_STOCK_ITEM';
    private const LOW_STOCK_DEFAULT_MIN = 10;
    private const CASH_REGISTER_VARIANCE_TYPE = 'CASH_REGISTER_VARIANCE';
    private const CASH_REGISTER_OPEN_OVERNIGHT_TYPE = 'CASH_REGISTER_OPEN_OVERNIGHT';
    private const STORE_DORMANT_TYPE = 'STORE_DORMANT';
    private const STORE_DORMANT_DAYS = 3;
    private const BACKUP_STALE_TYPE = 'BACKUP_STALE';
    private const BACKUP_STALE_DAYS = 7;
    private const BACKUP_STALE_SINGLETON_ID = 0;
    private const FAILED_BACKUP_TYPE = 'FAILED_BACKUP';

    public function __construct(private readonly PaginationService $paginationService) {}

    public function index(Request $request)
    {
        $this->generateAllAlerts();

        // orderByRaw() here (not applySorting()'s allowed_sorts) because "unread first, then
        // newest" is fixed product behavior, not a user-choosable column -- the same pattern
        // every other controller's "export all" branch relies on: a query already carrying its
        // own orders is left untouched by PaginationService::applySorting().
        $query = Notification::orderByRaw('read_at IS NOT NULL')
            ->orderByDesc('created_at');

        $result = $this->paginationService->paginate($query, 'notifications', $request);

        return response()->json($result);
    }

    public function unreadCount()
    {
        $this->generateAllAlerts();

        return response()->json(['success' => true, 'data' => ['count' => Notification::unread()->count()]]);
    }

    public function markRead($id)
    {
        $notification = Notification::find($id);
        if (!$notification) {
            return response()->json(['success' => false, 'message' => 'Notification not found'], 404);
        }

        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['success' => true, 'data' => $notification]);
    }

    public function markAllRead()
    {
        Notification::unread()->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    private function generateAllAlerts(): void
    {
        $this->generateSupplierPaymentAlerts();
        $this->generateSyncStaleAlerts();
        $this->generateCustomerCreditLimitAlerts();
        $this->generateCreditSaleAlerts();
        $this->generateUnpaidDealerInvoiceAlerts();
        $this->generatePurchaseReturnRefundAlerts();
        $this->generatePhysicalStockVarianceAlerts();
        $this->generateLowStockAlerts();
        $this->generateCashRegisterVarianceAlerts();
        $this->generateCashRegisterOpenOvernightAlerts();
        $this->generateStoreDormantAlerts();
        $this->generateBackupAlerts();
    }

    /**
     * Lazily scans pending supplier bills for age-based alerts and inserts
     * any newly-qualifying ones - no cron/scheduler dependency. Each
     * (reference, type) pair is only ever inserted once, so re-scanning on
     * every bell open never duplicates a notification; a bill that ages
     * past 90 days gets a second, more urgent notification alongside its
     * original 30-day one rather than replacing it.
     */
    private function generateSupplierPaymentAlerts(): void
    {
        $existing = Notification::whereIn('type', [self::DUE_SOON_TYPE, self::OVERDUE_TYPE])
            ->get(['type', 'reference_id'])
            ->map(fn ($n) => $n->type . ':' . $n->reference_id)
            ->flip();

        // Lean DB::table() + LEFT JOIN instead of Eloquent::with() -- direct_purchases alone runs
        // 15k+ unpaid rows in this dataset (payment_status is effectively unindexed/low-cardinality
        // here, so every row gets scanned either way), and hydrating each into a full model plus a
        // separate eager-loaded supplier query took ~12s for what boils down to a handful of rows
        // actually old enough to alert on. Pushing the age threshold into SQL and selecting only
        // the columns the message needs cuts this to a fraction of that.
        $dueSoonThreshold = now()->subDays(self::DUE_SOON_DAYS);

        $bills = [];
        foreach (
            DB::table('purchase_invoices')
                ->leftJoin('suppliers', 'purchase_invoices.supplier_id', '=', 'suppliers.id')
                ->where('purchase_invoices.payment_status', '!=', 'PAID')
                ->where('purchase_invoices.invoice_date', '<', $dueSoonThreshold)
                ->get([
                    'purchase_invoices.id', 'purchase_invoices.invoice_no', 'purchase_invoices.invoice_date',
                    'purchase_invoices.store_id', 'suppliers.name as supplier_name',
                ]) as $inv
        ) {
            $bills[] = [
                'reference_id' => $inv->id,
                'invoice_no' => $inv->invoice_no,
                'supplier_name' => $inv->supplier_name ?? 'Unknown Supplier',
                'days' => $inv->invoice_date ? (int) now()->diffInDays($inv->invoice_date, true) : 0,
                'link' => "/finance/supplier-payment?openInvoiceType=invoice&openInvoiceId={$inv->id}",
                'store_id' => $inv->store_id,
            ];
        }
        foreach (
            DB::table('direct_purchases')
                ->leftJoin('suppliers', 'direct_purchases.supplier_id', '=', 'suppliers.id')
                ->where('direct_purchases.payment_status', '!=', 'PAID')
                ->where('direct_purchases.purchase_date', '<', $dueSoonThreshold)
                ->get([
                    'direct_purchases.id', 'direct_purchases.invoice_no', 'direct_purchases.purchase_no',
                    'direct_purchases.purchase_date', 'direct_purchases.store_id', 'suppliers.name as supplier_name',
                ]) as $dir
        ) {
            $bills[] = [
                'reference_id' => $dir->id,
                'invoice_no' => $dir->invoice_no ?: $dir->purchase_no,
                'supplier_name' => $dir->supplier_name ?? 'Unknown Supplier',
                'days' => $dir->purchase_date ? (int) now()->diffInDays($dir->purchase_date, true) : 0,
                'link' => "/finance/supplier-payment?openInvoiceType=direct&openInvoiceId={$dir->id}",
                'store_id' => $dir->store_id,
            ];
        }

        foreach ($bills as $bill) {
            if ($bill['days'] >= self::OVERDUE_DAYS && !isset($existing[self::OVERDUE_TYPE . ':' . $bill['reference_id']])) {
                Notification::create([
                    'type' => self::OVERDUE_TYPE,
                    'title' => 'Supplier Payment Overdue',
                    'message' => "{$bill['invoice_no']} ({$bill['supplier_name']}) is {$bill['days']} days old and still unpaid.",
                    'link' => $bill['link'],
                    'reference_type' => 'SUPPLIER_BILL',
                    'reference_id' => $bill['reference_id'],
                    'store_id' => $bill['store_id'],
                ]);
            }

            if ($bill['days'] >= self::DUE_SOON_DAYS && !isset($existing[self::DUE_SOON_TYPE . ':' . $bill['reference_id']])) {
                Notification::create([
                    'type' => self::DUE_SOON_TYPE,
                    'title' => 'Supplier Payment Due Soon',
                    'message' => "{$bill['invoice_no']} ({$bill['supplier_name']}) is {$bill['days']} days old and unpaid.",
                    'link' => $bill['link'],
                    'reference_type' => 'SUPPLIER_BILL',
                    'reference_id' => $bill['reference_id'],
                    'store_id' => $bill['store_id'],
                ]);
            }
        }
    }

    /**
     * Same lazy-scan-on-open pattern as generateSupplierPaymentAlerts() above, for a
     * store's local-server node going stale (enabled but hasn't heartbeated recently --
     * see SyncController::nodes()'s is_stale). Deduped on an UNREAD notification existing
     * for that store rather than "ever created": a node that recovers and later goes
     * stale again is a new incident and should alert again, but re-scanning on every bell
     * open must not spam a fresh row on every request while the first alert sits unread.
     */
    private function generateSyncStaleAlerts(): void
    {
        $staleThreshold = now()->subMinutes(self::SYNC_STALE_THRESHOLD_MINUTES);

        $staleNodes = StoreLocalNode::with('store:id,name,code')
            ->where('enabled', true)
            ->where(function ($q) use ($staleThreshold) {
                $q->whereNull('last_heartbeat_at')->orWhere('last_heartbeat_at', '<', $staleThreshold);
            })
            ->get();

        if ($staleNodes->isEmpty()) {
            return;
        }

        $alreadyAlerted = Notification::where('type', self::SYNC_STALE_TYPE)
            ->whereNull('read_at')
            ->pluck('reference_id')
            ->flip();

        foreach ($staleNodes as $node) {
            if (isset($alreadyAlerted[$node->store_id])) {
                continue;
            }

            $storeName = $node->store?->name ?? "Store #{$node->store_id}";
            $lastSeen = $node->last_heartbeat_at ? $node->last_heartbeat_at->diffForHumans() : 'never';

            Notification::create([
                'type' => self::SYNC_STALE_TYPE,
                'title' => 'Local server not syncing',
                'message' => "{$storeName}'s local server hasn't checked in since {$lastSeen}. It may be down -- sales are running on cloud failover in the meantime.",
                'link' => '/settings/configure-local-server',
                'reference_type' => 'STORE_LOCAL_NODE',
                'reference_id' => $node->store_id,
                'store_id' => $node->store_id,
            ]);
        }
    }

    /**
     * A customer going over their credit limit -- same condition Finance's and CRM's dashboard
     * tiles both compute independently (identical query, just surfaced twice); one shared
     * notification instead of two duplicate alert types. Unread-only dedup: a customer can pay
     * down under the limit and later cross it again, which is a genuinely new incident worth a
     * fresh alert, unlike a bill's overdue-ness which only ever gets worse.
     */
    private function generateCustomerCreditLimitAlerts(): void
    {
        $overLimit = DB::table('customers')
            ->where('credit_limit', '>', 0)
            ->whereRaw('current_balance > credit_limit')
            ->get(['id', 'name', 'current_balance', 'credit_limit']);

        if ($overLimit->isEmpty()) {
            return;
        }

        $alreadyAlerted = Notification::where('type', self::CUSTOMER_CREDIT_LIMIT_TYPE)
            ->whereNull('read_at')
            ->pluck('reference_id')
            ->flip();

        foreach ($overLimit as $customer) {
            if (isset($alreadyAlerted[$customer->id])) {
                continue;
            }

            $over = number_format((float) $customer->current_balance - (float) $customer->credit_limit, 2);

            Notification::create([
                'type' => self::CUSTOMER_CREDIT_LIMIT_TYPE,
                'title' => 'Customer over credit limit',
                'message' => "{$customer->name} is ₹{$over} over their credit limit (balance ₹" . number_format((float) $customer->current_balance, 2) . " / limit ₹" . number_format((float) $customer->credit_limit, 2) . ").",
                'link' => '/crm/customer?filter=has_dues',
                'reference_type' => 'CUSTOMER',
                'reference_id' => $customer->id,
            ]);
        }
    }

    /**
     * Unpaid credit sales aging out -- same two-tier due-soon/overdue pattern as
     * generateSupplierPaymentAlerts(), reusing the two thresholds the Sales tab (7 days) and
     * Finance tab (30 days) already each compute for the identical underlying condition
     * (pos_sales.is_credit with grand_total > paid_amount) instead of picking one and losing
     * the other's signal.
     */
    private function generateCreditSaleAlerts(): void
    {
        $existing = Notification::whereIn('type', [self::CREDIT_SALE_DUE_SOON_TYPE, self::CREDIT_SALE_OVERDUE_TYPE])
            ->get(['type', 'reference_id'])
            ->map(fn ($n) => $n->type . ':' . $n->reference_id)
            ->flip();

        $sales = DB::table('pos_sales')
            ->leftJoin('customers', 'pos_sales.customer_id', '=', 'customers.id')
            ->where('pos_sales.is_credit', true)
            ->whereRaw('pos_sales.grand_total > pos_sales.paid_amount')
            ->whereDate('pos_sales.sale_date', '<', now()->subDays(self::CREDIT_SALE_DUE_SOON_DAYS))
            ->get([
                'pos_sales.id', 'pos_sales.invoice_no', 'pos_sales.sale_date', 'pos_sales.grand_total',
                'pos_sales.paid_amount', 'pos_sales.store_id', 'customers.name as customer_name',
            ]);

        foreach ($sales as $sale) {
            $days = (int) now()->diffInDays($sale->sale_date, true);
            $customerName = $sale->customer_name ?? 'Walk-in customer';
            $due = number_format((float) $sale->grand_total - (float) $sale->paid_amount, 2);

            if ($days >= self::CREDIT_SALE_OVERDUE_DAYS && !isset($existing[self::CREDIT_SALE_OVERDUE_TYPE . ':' . $sale->id])) {
                Notification::create([
                    'type' => self::CREDIT_SALE_OVERDUE_TYPE,
                    'title' => 'Credit sale overdue',
                    'message' => "{$sale->invoice_no} ({$customerName}) is {$days} days old with ₹{$due} still unpaid.",
                    'link' => '/sales/pos-sales?filter=overdue_credit',
                    'reference_type' => 'POS_SALE',
                    'reference_id' => $sale->id,
                    'store_id' => $sale->store_id,
                ]);
            }

            if ($days >= self::CREDIT_SALE_DUE_SOON_DAYS && !isset($existing[self::CREDIT_SALE_DUE_SOON_TYPE . ':' . $sale->id])) {
                Notification::create([
                    'type' => self::CREDIT_SALE_DUE_SOON_TYPE,
                    'title' => 'Credit sale due soon',
                    'message' => "{$sale->invoice_no} ({$customerName}) is {$days} days old with ₹{$due} still unpaid.",
                    'link' => '/sales/pos-sales?filter=overdue_credit',
                    'reference_type' => 'POS_SALE',
                    'reference_id' => $sale->id,
                    'store_id' => $sale->store_id,
                ]);
            }
        }
    }

    /**
     * Unpaid dealer invoices -- same query Finance's and Sales' dashboard tiles both already
     * compute (identical condition), one shared alert instead of two duplicate types.
     * Ever-created dedup: an invoice's pending status only resolves once (paid or cancelled),
     * so there's no "recovers and breaks again" case to re-alert for.
     */
    private function generateUnpaidDealerInvoiceAlerts(): void
    {
        $alreadyAlerted = Notification::where('type', self::UNPAID_DEALER_INVOICE_TYPE)
            ->pluck('reference_id')
            ->flip();

        $invoices = DB::table('dealer_invoices')
            ->leftJoin('customers', 'dealer_invoices.customer_id', '=', 'customers.id')
            ->whereIn('dealer_invoices.status', ['pending', 'PENDING', 'draft', 'DRAFT'])
            ->get(['dealer_invoices.id', 'dealer_invoices.invoice_no', 'dealer_invoices.grand_total', 'dealer_invoices.store_id', 'customers.name as customer_name']);

        foreach ($invoices as $invoice) {
            if (isset($alreadyAlerted[$invoice->id])) {
                continue;
            }

            $customerName = $invoice->customer_name ?? 'Unknown customer';

            Notification::create([
                'type' => self::UNPAID_DEALER_INVOICE_TYPE,
                'title' => 'Dealer invoice unpaid',
                'message' => "{$invoice->invoice_no} ({$customerName}) for ₹" . number_format((float) $invoice->grand_total, 2) . ' is still pending.',
                'link' => '/sales/dealer-invoice',
                'reference_type' => 'DEALER_INVOICE',
                'reference_id' => $invoice->id,
                'store_id' => $invoice->store_id,
            ]);
        }
    }

    /**
     * Purchase returns awaiting refund -- same query Finance's and Warehouse's dashboard tiles
     * both already compute. Ever-created dedup: a return's pending status resolves once.
     */
    private function generatePurchaseReturnRefundAlerts(): void
    {
        $alreadyAlerted = Notification::where('type', self::PURCHASE_RETURN_REFUND_DUE_TYPE)
            ->pluck('reference_id')
            ->flip();

        $returns = DB::table('purchase_returns')
            ->leftJoin('suppliers', 'purchase_returns.supplier_id', '=', 'suppliers.id')
            ->whereIn('purchase_returns.status', ['pending', 'PENDING', 'draft', 'DRAFT', 'pending_approval'])
            ->get(['purchase_returns.id', 'purchase_returns.return_no', 'purchase_returns.total_amount', 'purchase_returns.store_id', 'suppliers.name as supplier_name']);

        foreach ($returns as $return) {
            if (isset($alreadyAlerted[$return->id])) {
                continue;
            }

            $supplierName = $return->supplier_name ?? 'Unknown supplier';

            Notification::create([
                'type' => self::PURCHASE_RETURN_REFUND_DUE_TYPE,
                'title' => 'Purchase return refund due',
                'message' => "{$return->return_no} ({$supplierName}) for ₹" . number_format((float) $return->total_amount, 2) . ' is awaiting refund.',
                'link' => '/warehouse/purchase-return',
                'reference_type' => 'PURCHASE_RETURN',
                'reference_id' => $return->id,
                'store_id' => $return->store_id,
            ]);
        }
    }

    /**
     * Physical stock counts that found a discrepancy on an audit that isn't finished yet.
     * Ever-created dedup: a given audit-item row's counted/system quantities are set once when
     * the count is entered, so the variance itself doesn't change after that.
     */
    private function generatePhysicalStockVarianceAlerts(): void
    {
        $alreadyAlerted = Notification::where('type', self::PHYSICAL_STOCK_VARIANCE_TYPE)
            ->pluck('reference_id')
            ->flip();

        $variances = DB::table('physical_stock_items')
            ->join('physical_stocks', 'physical_stock_items.physical_stock_id', '=', 'physical_stocks.id')
            ->join('products', 'physical_stock_items.product_id', '=', 'products.id')
            ->where('physical_stocks.status', '!=', 'completed')
            ->where('physical_stock_items.difference_qty', '!=', 0)
            ->get([
                'physical_stock_items.id', 'physical_stock_items.difference_qty', 'physical_stocks.audit_no',
                'physical_stocks.store_id', 'products.name as product_name',
            ]);

        foreach ($variances as $variance) {
            if (isset($alreadyAlerted[$variance->id])) {
                continue;
            }

            $diff = (float) $variance->difference_qty;
            $direction = $diff > 0 ? 'over' : 'short';

            Notification::create([
                'type' => self::PHYSICAL_STOCK_VARIANCE_TYPE,
                'title' => 'Physical stock variance found',
                'message' => "{$variance->audit_no}: {$variance->product_name} is " . number_format(abs($diff), 3) . " {$direction} against system quantity.",
                'link' => '/warehouse/physical-stock?status=variance',
                'reference_type' => 'PHYSICAL_STOCK_ITEM',
                'reference_id' => $variance->id,
                'store_id' => $variance->store_id,
            ]);
        }
    }

    /**
     * A product's available stock at or below its reorder point. Unread-only dedup keyed to the
     * stocks row: stock levels genuinely fluctuate (sell down, restock, sell down again), so
     * "ever created" would mean a product that was ever low once could never alert again even
     * after being restocked and depleted many times over.
     */
    private function generateLowStockAlerts(): void
    {
        $lowStock = DB::table('stocks')
            ->join('products', 'stocks.product_id', '=', 'products.id')
            ->join('stores', 'stocks.store_id', '=', 'stores.id')
            ->whereRaw('stocks.available_quantity <= COALESCE(products.min_stock, ' . self::LOW_STOCK_DEFAULT_MIN . ')')
            ->get(['stocks.id', 'stocks.available_quantity', 'stocks.store_id', 'products.name as product_name', 'stores.name as store_name']);

        if ($lowStock->isEmpty()) {
            return;
        }

        $alreadyAlerted = Notification::where('type', self::LOW_STOCK_ITEM_TYPE)
            ->whereNull('read_at')
            ->pluck('reference_id')
            ->flip();

        foreach ($lowStock as $stock) {
            if (isset($alreadyAlerted[$stock->id])) {
                continue;
            }

            Notification::create([
                'type' => self::LOW_STOCK_ITEM_TYPE,
                'title' => 'Low stock',
                'message' => "{$stock->product_name} at {$stock->store_name} is down to " . number_format((float) $stock->available_quantity, 3) . ' available.',
                'link' => '/warehouse/stock-item?stock_filter=low_stock',
                'reference_type' => 'STOCK',
                'reference_id' => $stock->id,
                'store_id' => $stock->store_id,
            ]);
        }
    }

    /**
     * A cash register that closed with a cash-count mismatch. Ever-created dedup: a session's
     * difference is fixed once it's closed.
     */
    private function generateCashRegisterVarianceAlerts(): void
    {
        $alreadyAlerted = Notification::where('type', self::CASH_REGISTER_VARIANCE_TYPE)
            ->pluck('reference_id')
            ->flip();

        $sessions = DB::table('cash_register_sessions')
            ->join('stores', 'cash_register_sessions.store_id', '=', 'stores.id')
            ->leftJoin('users', 'cash_register_sessions.user_id', '=', 'users.id')
            ->whereNotNull('cash_register_sessions.closed_at')
            ->where('cash_register_sessions.difference', '!=', 0)
            ->get([
                'cash_register_sessions.id', 'cash_register_sessions.difference', 'cash_register_sessions.store_id',
                'stores.name as store_name', 'users.name as user_name',
            ]);

        foreach ($sessions as $session) {
            if (isset($alreadyAlerted[$session->id])) {
                continue;
            }

            $diff = (float) $session->difference;
            $direction = $diff > 0 ? 'over' : 'short';
            $userName = $session->user_name ?? 'Unknown user';

            Notification::create([
                'type' => self::CASH_REGISTER_VARIANCE_TYPE,
                'title' => 'Cash register variance',
                'message' => "{$session->store_name} register closed by {$userName} is ₹" . number_format(abs($diff), 2) . " {$direction}.",
                'link' => '/sales/cash-closing?filter=variance',
                'reference_type' => 'CASH_REGISTER_SESSION',
                'reference_id' => $session->id,
                'store_id' => $session->store_id,
            ]);
        }
    }

    /**
     * A cash register still open from a previous day -- should have been closed out at end of
     * day. Ever-created dedup: one alert for the still-open session is enough; it doesn't need
     * to re-fire daily while the same session stays open and unread.
     */
    private function generateCashRegisterOpenOvernightAlerts(): void
    {
        $alreadyAlerted = Notification::where('type', self::CASH_REGISTER_OPEN_OVERNIGHT_TYPE)
            ->pluck('reference_id')
            ->flip();

        $sessions = DB::table('cash_register_sessions')
            ->join('stores', 'cash_register_sessions.store_id', '=', 'stores.id')
            ->leftJoin('users', 'cash_register_sessions.user_id', '=', 'users.id')
            ->whereNull('cash_register_sessions.closed_at')
            ->where('cash_register_sessions.opened_at', '<', now()->startOfDay())
            ->get(['cash_register_sessions.id', 'cash_register_sessions.opened_at', 'cash_register_sessions.store_id', 'stores.name as store_name', 'users.name as user_name']);

        foreach ($sessions as $session) {
            if (isset($alreadyAlerted[$session->id])) {
                continue;
            }

            $userName = $session->user_name ?? 'Unknown user';
            $openedAgo = \Illuminate\Support\Carbon::parse($session->opened_at)->diffForHumans();

            Notification::create([
                'type' => self::CASH_REGISTER_OPEN_OVERNIGHT_TYPE,
                'title' => 'Cash register left open',
                'message' => "{$session->store_name}'s register opened by {$userName} {$openedAgo} was never closed.",
                'link' => '/sales/cash-closing?filter=stale',
                'reference_type' => 'CASH_REGISTER_SESSION',
                'reference_id' => $session->id,
                'store_id' => $session->store_id,
            ]);
        }
    }

    /**
     * A store that WAS making sales and has gone quiet for several days -- could mean the store
     * is closed, its POS is down, or something else needs a look. Scoped to stores with at least
     * one sale more than STORE_DORMANT_DAYS ago: a brand-new store that simply hasn't opened yet
     * has no prior activity to have gone quiet FROM, so it isn't "dormant" in the sense this
     * alert means, just not yet live -- without this, every fresh store would falsely alert from
     * the moment it's created. Unread-only dedup: a store can go quiet, resume, then go quiet
     * again later, which is a new incident each time.
     */
    private function generateStoreDormantAlerts(): void
    {
        $dormantThreshold = now()->subDays(self::STORE_DORMANT_DAYS);

        $everSoldBefore = DB::table('pos_sales')
            ->where('sale_date', '<', $dormantThreshold)
            ->distinct()
            ->pluck('store_id')
            ->flip();

        if ($everSoldBefore->isEmpty()) {
            return;
        }

        $activeStores = DB::table('stores')
            ->where('is_active', true)
            ->whereIn('id', $everSoldBefore->keys())
            ->get(['id', 'name']);
        if ($activeStores->isEmpty()) {
            return;
        }

        $storesWithRecentSales = DB::table('pos_sales')
            ->where('sale_date', '>=', $dormantThreshold)
            ->distinct()
            ->pluck('store_id')
            ->flip();

        $alreadyAlerted = Notification::where('type', self::STORE_DORMANT_TYPE)
            ->whereNull('read_at')
            ->pluck('reference_id')
            ->flip();

        foreach ($activeStores as $store) {
            if (isset($storesWithRecentSales[$store->id]) || isset($alreadyAlerted[$store->id])) {
                continue;
            }

            Notification::create([
                'type' => self::STORE_DORMANT_TYPE,
                'title' => 'Store has no recent sales',
                'message' => "{$store->name} has recorded no sales in the last " . self::STORE_DORMANT_DAYS . ' days.',
                'link' => '/sales/pos-sales?filter=dormant',
                'reference_type' => 'STORE',
                'reference_id' => $store->id,
                'store_id' => $store->id,
            ]);
        }
    }

    /**
     * Database backup health: no successful backup recently (a single ongoing condition, not a
     * per-record list -- unread-only dedup against a fixed placeholder reference_id, same shape
     * as generateSyncStaleAlerts()'s per-store dedup but for a global singleton) and any backup
     * run that failed outright (ever-created dedup per backup record, since a failed run's
     * outcome doesn't change after the fact).
     *
     * Staleness is only evaluated once at least one backup has ever been attempted: a tenant
     * that has never run a backup hasn't had one lapse, it just hasn't been set up or exercised
     * yet -- without this guard, every fresh install would alert "overdue" from minute one, since
     * there being no successful backup is indistinguishable from one that's simply never run.
     */
    private function generateBackupAlerts(): void
    {
        $hasEverAttempted = DB::table('backups')->exists();

        $lastSuccess = $hasEverAttempted
            ? DB::table('backups')->where('status', 'success')->orderByDesc('completed_at')->value('completed_at')
            : null;

        $isStale = $hasEverAttempted
            && (!$lastSuccess || \Illuminate\Support\Carbon::parse($lastSuccess)->lt(now()->subDays(self::BACKUP_STALE_DAYS)));

        if ($isStale) {
            $alreadyAlerted = Notification::where('type', self::BACKUP_STALE_TYPE)
                ->whereNull('read_at')
                ->exists();

            if (!$alreadyAlerted) {
                $lastSeen = $lastSuccess ? \Illuminate\Support\Carbon::parse($lastSuccess)->diffForHumans() : 'never';

                Notification::create([
                    'type' => self::BACKUP_STALE_TYPE,
                    'title' => 'Backup overdue',
                    'message' => "No successful backup has completed since {$lastSeen}. Run one from the Backup Center.",
                    'link' => '/settings/backup?filter=overdue',
                    'reference_type' => 'BACKUP',
                    'reference_id' => self::BACKUP_STALE_SINGLETON_ID,
                ]);
            }
        }

        $alreadyAlertedFailed = Notification::where('type', self::FAILED_BACKUP_TYPE)
            ->pluck('reference_id')
            ->flip();

        $failedBackups = DB::table('backups')->where('status', '!=', 'success')->get(['id', 'file_name', 'company_id', 'status']);

        foreach ($failedBackups as $backup) {
            if (isset($alreadyAlertedFailed[$backup->id])) {
                continue;
            }

            Notification::create([
                'type' => self::FAILED_BACKUP_TYPE,
                'title' => 'Backup failed',
                'message' => "Backup \"{$backup->file_name}\" did not complete successfully (status: {$backup->status}).",
                'link' => '/settings/backup?status=failed',
                'reference_type' => 'BACKUP',
                'reference_id' => $backup->id,
                'store_id' => $backup->company_id,
            ]);
        }
    }
}
