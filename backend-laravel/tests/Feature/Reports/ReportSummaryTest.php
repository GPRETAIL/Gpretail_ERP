<?php

namespace Tests\Feature\Reports;

use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Summary layouts: grouped and totalled on the server, per store, each page only reaching its own datasets. */
class ReportSummaryTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($this->fixture['user']);
    }

    private function sell(int $index, float $price, string $date): void
    {
        $id = $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => $price,
            'items' => [[...$this->fixture['items'][$index], 'price' => $price]]])->assertCreated()->json('data.id');
        DB::table('pos_sales')->where('id', $id)->update(['sale_date' => $date]);
    }

    public function test_sales_lines_group_by_item_and_date_with_totals_and_a_date_range(): void
    {
        $this->sell(0, 100, '2026-10-01 10:00:00');
        $this->sell(0, 150, '2026-10-02 11:00:00');
        $this->sell(1, 300, '2026-10-02 12:00:00');
        $this->sell(1, 999, '2026-09-01 12:00:00'); // Outside the range.

        $byItem = $this->getJson('/api/sales-reports/summary/sale_lines?layout=item&from=2026-10-01&to=2026-10-31')->assertOk()->json('data');
        $this->assertSame([300.0, 250.0], array_map('floatval', array_column($byItem['rows'], 'net'))); // Biggest first.
        $this->assertSame([1, 2], array_column($byItem['rows'], 'bills'));
        $this->assertEquals(550, $byItem['totals']['net']);
        $this->assertEquals(3, $byItem['totals']['bills']);

        $byDate = $this->getJson('/api/sales-reports/summary/sale_lines?layout=date&from=2026-10-01&to=2026-10-31')->assertOk()->json('data');
        $this->assertSame(['2026-10-01', '2026-10-02'], array_column($byDate['rows'], 'label')); // Dates in order.
        $this->assertEquals(450, $byDate['rows'][1]['net']);
    }

    public function test_another_stores_rows_never_count_and_pages_reach_only_their_own_datasets(): void
    {
        $this->sell(0, 100, now()->toDateTimeString());
        $other = Store::create(['name' => 'Other Store', 'code' => 'SUM-OS', 'is_active' => true]);
        DB::table('pos_sales')->update(['store_id' => $other->id]);
        $this->getJson('/api/sales-reports/summary/sale_lines?layout=item')->assertOk()->assertJsonPath('data.rows', [])->assertJsonPath('data.totals.bills', 0);

        $this->getJson('/api/sales-reports/summary/voucher_lines?layout=ledger')->assertNotFound();   // A Finance dataset.
        $this->getJson('/api/warehouse-reports/summary/sale_lines?layout=item')->assertNotFound();    // A Sales dataset.
        $this->getJson('/api/sales-reports/summary/sale_lines?layout=nope')->assertUnprocessable();
        $this->getJson('/api/sales-reports/summary-layouts')->assertOk()->assertJsonPath('data.sale_lines.dated', true)->assertJsonPath('data.customers.dated', false);
    }

    public function test_warehouse_stock_and_purchase_order_summaries(): void
    {
        DB::table('products')->update(['cost_price' => 50]);
        $stock = $this->getJson('/api/warehouse-reports/summary/stock?layout=item')->assertOk()->json('data');
        $this->assertCount(2, $stock['rows']);
        $this->assertEquals(2000, $stock['totals']['qty']); // 1000 of each fixture item.
        $this->assertEquals(100000, $stock['totals']['value']); // At cost 50.

        $supplier = $this->postJson('/api/suppliers', ['name' => 'Summary Mill', 'code' => 'SUM-MILL'])->assertCreated()->json('data.id');
        $item = $this->fixture['items'][0];
        $order = $this->postJson('/api/purchase-orders', ['supplier_id' => $supplier, 'items' => [['product_id' => $item['productId'], 'variant_id' => $item['variantId'], 'quantity' => 10, 'unit_cost' => 5]]])
            ->assertCreated()->json('data.id');
        $this->postJson("/api/purchase-orders/$order/approve")->assertOk();
        DB::table('purchase_order_items')->update(['received_qty' => 4]);

        $bySupplier = $this->getJson('/api/warehouse-reports/summary/po_lines?layout=supplier')->assertOk()->json('data.rows.0');
        $this->assertSame(['Summary Mill', 10.0, 4.0, 6.0], [$bySupplier['label'], (float) $bySupplier['ordered'], (float) $bySupplier['received'], (float) $bySupplier['pending']]);
        $line = $this->getJson('/api/warehouse-reports/data/po_lines')->assertOk()->json('data.0');
        $this->assertSame(['Part received', 6.0], [$line['status'], (float) $line['pending']]);
        $this->getJson('/api/warehouse-reports/data/retail_stock')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/warehouse-reports/data/nope')->assertNotFound();
    }

    public function test_finance_daybook_by_voucher_type_and_outstanding_by_age_need_a_store(): void
    {
        $this->sell(0, 100, now()->toDateTimeString());
        $this->artisan('accounting:post', ['--store' => $this->fixture['store']->id]);
        $byType = $this->getJson('/api/accounting/summary/voucher_lines?layout=voucher_type&from='.now(config('app.business_timezone'))->subDay()->toDateString().'&to='.now(config('app.business_timezone'))->toDateString())->assertOk()->json('data');
        $this->assertContains('Sales', array_column($byType['rows'], 'label'));
        $this->assertEquals($byType['totals']['debit'], $byType['totals']['credit']); // Balanced books.

        $this->getJson('/api/accounting/summary/outstanding?layout=age&side=receivable')->assertOk()->assertJsonPath('data.layout', 'age');
        $this->getJson('/api/accounting/summary-layouts')->assertOk()->assertJsonPath('data.outstanding.layouts.0.value', 'age');
    }

    public function test_every_dataset_and_layout_runs_and_stays_within_the_store(): void
    {
        $this->sell(0, 100, now()->toDateTimeString());
        $service = app(\App\Services\Reports\ReportSummaryService::class);
        $ran = 0;
        foreach (\App\Services\Reports\SummaryDatasets::all() as $key => $dataset) {
            foreach (array_keys($dataset['layouts']) as $layout) {
                $result = $service->run($dataset['module'], $key, $layout, null, null, [$this->fixture['store']->id]);
                $this->assertArrayHasKey('totals', $result, "$key/$layout");
                $ran++;
            }
        }
        $this->assertGreaterThan(200, $ran);
        // A store outside the context never counts, on the new datasets too.
        $other = Store::create(['name' => 'Elsewhere', 'code' => 'SUM-ELSE', 'is_active' => true]);
        DB::table('settlements')->insert(['store_id' => $other->id, 'batch_no' => 'ST-1', 'settlement_date' => now(), 'total_sales' => 999, 'cash_total' => 999, 'card_total' => 0, 'upi_total' => 0, 'credit_total' => 0, 'created_at' => now(), 'updated_at' => now()]);
        $this->getJson('/api/sales-reports/summary/settlements?layout=date')->assertOk()->assertJsonPath('data.totals.settlements', 0);
    }

    public function test_margin_tax_split_and_discount_bills(): void
    {
        $this->sell(0, 118, '2026-10-01 10:00:00');
        $this->sell(1, 236, '2026-10-02 10:00:00');
        $first = DB::table('pos_sales')->orderBy('id')->value('id');
        // Bill 1: 118 incl. 18 tax, cost 60, a 10 discount, intra-state. Bill 2: 236 incl. 36 tax, cost 150, IGST.
        DB::table('pos_sale_items')->where('pos_sale_id', $first)->update(['subtotal' => 118, 'tax_amount' => 18, 'quantity' => 1, 'cost_price' => 60, 'discount' => 10]);
        DB::table('pos_sale_items')->where('pos_sale_id', '<>', $first)->update(['subtotal' => 236, 'tax_amount' => 36, 'quantity' => 1, 'cost_price' => 150, 'discount' => 0]);
        DB::table('pos_sales')->update(['discount_amount' => 0]);
        DB::table('pos_sales')->where('id', '<>', $first)->update(['igst' => 1]);
        $range = '&from=2026-10-01&to=2026-10-31';

        $margin = $this->getJson("/api/sales-reports/summary/sale_margin?layout=date$range")->assertOk()->json('data.totals');
        $this->assertEquals([300, 210, 90, 30], [$margin['sales'], $margin['cost'], $margin['margin'], $margin['margin_pct']]); // (100+200) - (60+150).

        // A line that recorded no cost falls back to its variant's, then its product's cost.
        DB::table('pos_sale_items')->where('pos_sale_id', '<>', $first)->update(['cost_price' => 0]);
        DB::table('product_variants')->update(['cost_price' => 0]);
        DB::table('products')->update(['cost_price' => 120]);
        $this->assertEquals(180, $this->getJson("/api/sales-reports/summary/sale_margin?layout=date$range")->json('data.totals.cost')); // 60 + 120.

        $tax = $this->getJson("/api/sales-reports/summary/sale_tax?layout=gst_rate$range")->assertOk()->json('data.totals');
        $this->assertEquals([300, 9, 9, 36, 54, 354], [$tax['taxable'], $tax['cgst'], $tax['sgst'], $tax['igst'], $tax['tax'], $tax['total']]);

        $discounted = $this->getJson("/api/sales-reports/summary/sale_lines?layout=discount_bills$range")->assertOk()->json('data');
        $this->assertCount(1, $discounted['rows']);
        $this->assertEquals(1, $discounted['totals']['bills']); // Only the discounted bill, totals included.
        $this->assertEquals(2, $this->getJson("/api/sales-reports/summary/sale_lines?layout=bill$range")->json('data.totals.bills'));
    }
}
