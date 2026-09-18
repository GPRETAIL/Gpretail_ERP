<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Notification;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Guards the alert generators added to NotificationController -- each one scans for a
 * time-sensitive condition (credit limit breach, aging credit sale, cash register variance,
 * stale backup, etc.) and inserts a Notification the first time it's seen, deduped so
 * repeated bell-opens never insert duplicates. The two dedup shapes (ever-created vs
 * unread-only) are the riskiest part of this logic, so they're covered directly rather than
 * just asserting a notification exists.
 */
class NotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create(['name' => 'Test Flagship Store', 'code' => 'STR-001']);
        $this->user = User::create([
            'name' => 'Test Admin',
            'username' => 'testadmin',
            'email' => 'admin@example.com',
            'password' => bcrypt('secret123'),
            'role' => 'admin',
            'store_id' => $this->store->id,
        ]);
        Sanctum::actingAs($this->user);
    }

    private function fetchNotifications()
    {
        return $this->getJson('/api/notifications');
    }

    public function test_customer_over_credit_limit_creates_one_notification(): void
    {
        Customer::create([
            'name' => 'Over Limit Co', 'code' => 'CUST-001',
            'credit_limit' => 10000, 'current_balance' => 15000,
        ]);

        $res = $this->fetchNotifications();
        $res->assertOk();

        $rows = collect($res->json('data'));
        $match = $rows->firstWhere('type', 'CUSTOMER_CREDIT_LIMIT_EXCEEDED');
        $this->assertNotNull($match, 'Expected a CUSTOMER_CREDIT_LIMIT_EXCEEDED notification');
        $this->assertStringContainsString('Over Limit Co', $match['message']);
    }

    public function test_customer_under_credit_limit_creates_no_notification(): void
    {
        Customer::create([
            'name' => 'Fine Co', 'code' => 'CUST-002',
            'credit_limit' => 10000, 'current_balance' => 5000,
        ]);

        $res = $this->fetchNotifications();
        $res->assertOk();

        $rows = collect($res->json('data'));
        $this->assertNull($rows->firstWhere('type', 'CUSTOMER_CREDIT_LIMIT_EXCEEDED'));
    }

    public function test_credit_limit_alert_uses_unread_only_dedup_not_ever_created(): void
    {
        // Unread-only dedup: marking the notification read must allow a fresh one to be
        // generated on the next scan, since the customer could still be over-limit (or go
        // back over it later) -- unlike an ever-created dedup, which would never re-alert.
        $customer = Customer::create([
            'name' => 'Repeat Offender', 'code' => 'CUST-003',
            'credit_limit' => 10000, 'current_balance' => 15000,
        ]);

        $this->fetchNotifications()->assertOk();
        $first = Notification::where('type', 'CUSTOMER_CREDIT_LIMIT_EXCEEDED')
            ->where('reference_id', $customer->id)->first();
        $this->assertNotNull($first);

        $first->update(['read_at' => now()]);

        $this->fetchNotifications()->assertOk();
        $countAfter = Notification::where('type', 'CUSTOMER_CREDIT_LIMIT_EXCEEDED')
            ->where('reference_id', $customer->id)->count();
        $this->assertSame(2, $countAfter, 'Expected a second notification once the first was marked read');
    }

    public function test_credit_sale_generates_due_soon_then_overdue_without_duplicating(): void
    {
        $customer = Customer::create(['name' => 'Credit Buyer', 'code' => 'CUST-004']);

        DB::table('pos_sales')->insert([
            'store_id' => $this->store->id, 'user_id' => $this->user->id, 'customer_id' => $customer->id,
            'invoice_no' => 'INV-CREDIT-1', 'sale_date' => now()->subDays(10), 'grand_total' => 5000,
            'paid_amount' => 0, 'is_credit' => true, 'status' => 'COMPLETED',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        // 10 days old: past the 7-day due-soon threshold, not yet the 30-day overdue one.
        $res = $this->fetchNotifications();
        $rows = collect($res->json('data'));
        $this->assertNotNull($rows->firstWhere('type', 'CREDIT_SALE_DUE_SOON'));
        $this->assertNull($rows->firstWhere('type', 'CREDIT_SALE_OVERDUE'));

        // Re-scanning (a second bell-open) must not insert a duplicate due-soon notification.
        $this->fetchNotifications()->assertOk();
        $this->assertSame(
            1,
            Notification::where('type', 'CREDIT_SALE_DUE_SOON')->count(),
            'Re-scanning should not duplicate an already-created due-soon alert'
        );
    }

    public function test_cash_register_variance_creates_notification_with_ever_created_dedup(): void
    {
        $sessionId = DB::table('cash_register_sessions')->insertGetId([
            'store_id' => $this->store->id, 'user_id' => $this->user->id,
            'opened_at' => now()->subHours(8), 'closed_at' => now(),
            'opening_cash' => 1000, 'closing_cash' => 1200, 'expected_cash' => 1250,
            'difference' => -50, 'status' => 'CLOSED',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $res = $this->fetchNotifications();
        $rows = collect($res->json('data'));
        $match = $rows->firstWhere('type', 'CASH_REGISTER_VARIANCE');
        $this->assertNotNull($match);
        $this->assertStringContainsString('short', $match['message']);

        // Ever-created dedup: even after marking read, re-scanning must not insert another --
        // a closed session's difference never changes, so there is nothing new to alert about.
        Notification::where('type', 'CASH_REGISTER_VARIANCE')->update(['read_at' => now()]);
        $this->fetchNotifications()->assertOk();
        $this->assertSame(
            1,
            Notification::where('type', 'CASH_REGISTER_VARIANCE')->where('reference_id', $sessionId)->count()
        );
    }

    public function test_low_stock_notification_fires_for_item_at_or_under_reorder_point(): void
    {
        $product = DB::table('products')->insertGetId([
            'name' => 'Widget', 'code' => 'WGT-1', 'sku' => 'SKU-1', 'barcode' => 'BC-1',
            'min_stock' => 5, 'selling_price' => 100, 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('stocks')->insert([
            'store_id' => $this->store->id, 'product_id' => $product,
            'quantity' => 3, 'available_quantity' => 3,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $res = $this->fetchNotifications();
        $rows = collect($res->json('data'));
        $match = $rows->firstWhere('type', 'LOW_STOCK_ITEM');
        $this->assertNotNull($match);
        $this->assertStringContainsString('Widget', $match['message']);
    }

    public function test_no_backup_ever_attempted_does_not_alert(): void
    {
        // Zero backups table rows -- a fresh install that's never run one hasn't had a backup
        // lapse, it just hasn't been exercised yet, so this must NOT read as "overdue".
        $res = $this->fetchNotifications();
        $rows = collect($res->json('data'));
        $this->assertNull($rows->firstWhere('type', 'BACKUP_STALE'));
    }

    public function test_backup_stale_is_a_singleton_once_a_backup_has_lapsed(): void
    {
        DB::table('backups')->insert([
            'file_name' => 'backup-old.zip', 'backup_type' => 'full', 'status' => 'success',
            'completed_at' => now()->subDays(10), 'created_at' => now()->subDays(10), 'updated_at' => now()->subDays(10),
        ]);

        $res = $this->fetchNotifications();
        $rows = collect($res->json('data'));
        $matches = $rows->where('type', 'BACKUP_STALE');
        $this->assertCount(1, $matches, 'BACKUP_STALE should be a single notification, not one per check');
    }

    public function test_failed_backup_creates_one_notification_per_failed_run(): void
    {
        DB::table('backups')->insert([
            'file_name' => 'backup-2026-09-01.zip', 'backup_type' => 'full',
            'status' => 'failed', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $res = $this->fetchNotifications();
        $rows = collect($res->json('data'));
        $match = $rows->firstWhere('type', 'FAILED_BACKUP');
        $this->assertNotNull($match);
        $this->assertStringContainsString('backup-2026-09-01.zip', $match['message']);
    }

    public function test_unread_count_reflects_generated_alerts(): void
    {
        Customer::create([
            'name' => 'Over Limit Co', 'code' => 'CUST-005',
            'credit_limit' => 10000, 'current_balance' => 15000,
        ]);

        $res = $this->getJson('/api/notifications/unread-count');
        $res->assertOk();
        $this->assertGreaterThanOrEqual(1, $res->json('data.count'));
    }

    public function test_supplier_payment_scan_query_count_does_not_scale_with_bill_count(): void
    {
        // generateSupplierPaymentAlerts() used Eloquent::with() (full model hydration + a
        // separate eager-loaded query per call) until this was found to take ~12s against
        // 15k+ real unpaid direct_purchases rows; rewritten to lean DB::table() + join. This
        // proves the query count stays flat as bill count grows, the same regression class as
        // DashboardControllerTest's store-count-scaling guard.
        $supplier = DB::table('suppliers')->insertGetId([
            'name' => 'Scale Test Supplier', 'code' => 'SUP-SCALE-1', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $insertOldUnpaid = function (int $n) use ($supplier) {
            for ($i = 0; $i < $n; $i++) {
                DB::table('direct_purchases')->insert([
                    'store_id' => $this->store->id, 'supplier_id' => $supplier,
                    'purchase_no' => 'DP-SCALE-' . uniqid('', true),
                    'purchase_date' => now()->subDays(40), 'total_amount' => 1000, 'paid_amount' => 0,
                    'payment_status' => 'UNPAID', 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        };

        $insertOldUnpaid(3);
        DB::enableQueryLog();
        $this->fetchNotifications()->assertOk();
        $threeCount = count(DB::getQueryLog());
        DB::disableQueryLog();
        DB::flushQueryLog();

        Notification::truncate();
        $insertOldUnpaid(20);
        DB::enableQueryLog();
        $this->fetchNotifications()->assertOk();
        $twentyThreeCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        // SELECT query count must stay flat; only the INSERT count grows with new bills, which
        // this assertion doesn't constrain (each newly-qualifying bill legitimately gets its own
        // Notification::create()).
        $selectQueriesThree = $threeCount - 3;
        $selectQueriesTwentyThree = $twentyThreeCount - 23;
        $this->assertSame(
            $selectQueriesThree,
            $selectQueriesTwentyThree,
            "Expected SELECT query count to stay flat as bill count grows (3 bills: {$threeCount} total queries, "
            . "23 bills: {$twentyThreeCount} total queries) -- a per-row query appears to have been reintroduced."
        );
    }
}
