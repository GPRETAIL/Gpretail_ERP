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
}
