<?php

namespace Tests\Feature;

use App\Models\PosSale;
use App\Models\PosSaleItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Guards DashboardController::overview()'s query-consolidation refactor (sum()+count() pairs and
 * per-store loops collapsed into single grouped/conditional-aggregation queries -- see the
 * comments in DashboardController.php) against silently changing any returned value. Every
 * expected figure below is hand-computed from the fixture, not re-derived from the same code
 * path being tested.
 */
class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;
    protected User $user;
    protected Carbon $from;
    protected Carbon $to;

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

        $this->from = Carbon::parse('2026-01-10');
        $this->to = Carbon::parse('2026-01-12');

        $widgetA = Product::create([
            'name' => 'Widget A', 'code' => 'WGT-A', 'sku' => 'SKU-A', 'barcode' => 'BC-A',
            'selling_price' => 100, 'is_active' => true,
        ]);
        $widgetB = Product::create([
            'name' => 'Widget B', 'code' => 'WGT-B', 'sku' => 'SKU-B', 'barcode' => 'BC-B',
            'selling_price' => 500, 'is_active' => true,
        ]);

        // Stock: one low-stock row (qty 3, <= 5) and one healthy row (qty 100).
        DB::table('stocks')->insert([
            ['store_id' => $this->store->id, 'product_id' => $widgetA->id, 'quantity' => 3, 'created_at' => now(), 'updated_at' => now()],
            ['store_id' => $this->store->id, 'product_id' => $widgetB->id, 'quantity' => 100, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Four sales inside the date range, one of each settlement bucket the endpoint reports.
        $cash = PosSale::create([
            'store_id' => $this->store->id, 'user_id' => $this->user->id, 'invoice_no' => 'INV-CASH',
            'sale_date' => $this->from->copy()->addHours(2), 'grand_total' => 1000, 'total_qty' => 5,
            'discount_amount' => 50, 'tax_amount' => 90, 'payment_mode' => 'CASH', 'is_credit' => false,
            'status' => 'COMPLETED',
        ]);
        PosSale::create([
            'store_id' => $this->store->id, 'user_id' => $this->user->id, 'invoice_no' => 'INV-CARD',
            'sale_date' => $this->from->copy()->addHours(3), 'grand_total' => 500, 'total_qty' => 2,
            'discount_amount' => 0, 'tax_amount' => 45, 'payment_mode' => 'CARD', 'is_credit' => false,
            'status' => 'COMPLETED',
        ]);
        PosSale::create([
            'store_id' => $this->store->id, 'user_id' => $this->user->id, 'invoice_no' => 'INV-UPI',
            'sale_date' => $this->from->copy()->addHours(4), 'grand_total' => 300, 'total_qty' => 1,
            'discount_amount' => 10, 'tax_amount' => 27, 'payment_mode' => 'UPI', 'is_credit' => false,
            'status' => 'COMPLETED',
        ]);
        PosSale::create([
            'store_id' => $this->store->id, 'user_id' => $this->user->id, 'invoice_no' => 'INV-CREDIT',
            'sale_date' => $this->from->copy()->addHours(5), 'grand_total' => 200, 'total_qty' => 1,
            'discount_amount' => 0, 'tax_amount' => 18, 'payment_mode' => 'CREDIT', 'is_credit' => true,
            'status' => 'COMPLETED',
        ]);

        // One sale item WITH a cost_price (contributes to gross profit) and one WITHOUT (contributes
        // to itemsMissingCost instead) -- exercises the conditional-aggregation profit query.
        PosSaleItem::create([
            'pos_sale_id' => $cash->id, 'product_id' => $widgetA->id, 'quantity' => 2,
            'selling_price' => 100, 'cost_price' => 50, 'subtotal' => 200,
        ]);
        PosSaleItem::create([
            'pos_sale_id' => $cash->id, 'product_id' => $widgetB->id, 'quantity' => 1,
            'selling_price' => 500, 'cost_price' => null, 'subtotal' => 500,
        ]);

        DB::table('pos_returns')->insert([
            'store_id' => $this->store->id, 'pos_sale_id' => $cash->id, 'return_no' => 'RET-1',
            'return_date' => $this->from->copy()->addHours(6), 'total_refund' => 100,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        // Outside the date range -- must NOT be counted in any of the figures below.
        PosSale::create([
            'store_id' => $this->store->id, 'user_id' => $this->user->id, 'invoice_no' => 'INV-OUTSIDE',
            'sale_date' => $this->to->copy()->addDays(5), 'grand_total' => 99999, 'total_qty' => 99,
            'payment_mode' => 'CASH', 'is_credit' => false, 'status' => 'COMPLETED',
        ]);
    }

    private function fetchOverview()
    {
        return $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->getJson('/api/dashboard?from=' . $this->from->toDateString() . '&to=' . $this->to->toDateString());
    }

    public function test_core_metrics_match_hand_computed_totals(): void
    {
        $res = $this->fetchOverview();
        $res->assertOk();
        $res->assertJsonPath('success', true);

        // 1000 + 500 + 300 + 200, the out-of-range sale excluded. Whole-number floats round-trip
        // through JSON without a decimal point, so the expected values here are plain numbers.
        $res->assertJsonPath('data.metrics.totalBills.amount', 2000);
        $res->assertJsonPath('data.metrics.totalBills.count', 4);
        // 90 + 45 + 27 + 18
        $res->assertJsonPath('data.metrics.gst.amount', 180);
    }

    public function test_gross_profit_and_missing_cost_use_conditional_aggregation_correctly(): void
    {
        $res = $this->fetchOverview();
        $res->assertOk();

        // Only the cost_price=50 line item counts: 2 * (100 - 50) = 100. The null-cost item
        // contributes nothing to profit and increments itemsMissingCost instead.
        $res->assertJsonPath('data.metrics.profitLoss.amount', 100);
        $res->assertJsonPath('data.metrics.profitLoss.itemsMissingCost', 1);
    }

    public function test_stock_metrics_use_conditional_aggregation_correctly(): void
    {
        $res = $this->fetchOverview();
        $res->assertOk();

        // 3 + 100 total quantity; only the qty=3 row is <= 5.
        $res->assertJsonPath('data.overview.total_stock_qty', 103);
        $res->assertJsonPath('data.overview.low_stock_alerts', 1);
    }

    public function test_daily_sales_summary_matches_grouped_query(): void
    {
        $res = $this->fetchOverview();
        $res->assertOk();

        $row = collect($res->json('data.tables.dailySalesSummary.rows'))->first();
        $this->assertSame('Test Flagship Store', $row['company']);
        $this->assertEquals(2000.0, $row['value']);
        $this->assertSame(4, $row['count']);
        // 5 + 2 + 1 + 1
        $this->assertEquals(9.0, $row['quantity']);
    }

    public function test_settlement_details_split_by_payment_method_and_store(): void
    {
        $res = $this->fetchOverview();
        $res->assertOk();

        $rows = collect($res->json('data.tables.settlementDetails.rows'))->keyBy('key');
        $colKey = 'store_' . $this->store->id;

        $this->assertEquals(1000.0, $rows['cash']['values'][$colKey]);
        $this->assertEquals(500.0, $rows['card']['values'][$colKey]);
        $this->assertEquals(300.0, $rows['upi']['values'][$colKey]);
        $this->assertEquals(200.0, $rows['credit']['values'][$colKey]);
        // Returns and discounts are reported as negative adjustments.
        $this->assertEquals(-100.0, $rows['return']['values'][$colKey]);
        // 50 + 0 + 10 + 0 = 60
        $this->assertEquals(-60.0, $rows['discount']['values'][$colKey]);

        // Grand total across every row = 1000+500+300+200-100-60 = 1840
        $this->assertEquals(1840.0, $res->json('data.tables.settlementDetails.grandTotal'));
    }

    public function test_overview_query_count_does_not_scale_with_store_count(): void
    {
        // The bug this consolidation fixed was per-store loops issuing individual queries
        // (up to 3 for the daily summary + up to 6 for settlement details, per store), which
        // scaled O(number of stores) and was the main contributor to "Failed to load dashboard"
        // timeouts under this app's known slow-MariaDB dev conditions on a multi-store "All
        // Stores" view. A regression that reintroduces any such loop would make query count grow
        // with store count; this test proves it no longer does, rather than asserting an
        // arbitrary absolute number.
        DB::enableQueryLog();
        $this->fetchOverview()->assertOk();
        $oneStoreQueryCount = count(DB::getQueryLog());
        DB::disableQueryLog();
        DB::flushQueryLog();

        $secondStore = Store::create(['name' => 'Second Store', 'code' => 'STR-002']);
        PosSale::create([
            'store_id' => $secondStore->id, 'user_id' => $this->user->id, 'invoice_no' => 'INV-STORE2',
            'sale_date' => $this->from->copy()->addHours(2), 'grand_total' => 700, 'total_qty' => 3,
            'payment_mode' => 'CASH', 'is_credit' => false, 'status' => 'COMPLETED',
        ]);

        // Request scoped to "all" so both stores are aggregated together, exercising the
        // per-store loops (dailySalesSummary, settlementDetails) with N=2 instead of N=1.
        DB::enableQueryLog();
        $this->withHeader('X-Company-Scope-Id', 'all')
            ->getJson('/api/dashboard?from=' . $this->from->toDateString() . '&to=' . $this->to->toDateString())
            ->assertOk();
        $twoStoreQueryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertSame(
            $oneStoreQueryCount,
            $twoStoreQueryCount,
            "Expected query count to stay flat as store count grows (got {$oneStoreQueryCount} for 1 store vs "
            . "{$twoStoreQueryCount} for 2 stores) -- a per-store loop issuing individual queries appears to "
            . "have been reintroduced."
        );
    }
}
