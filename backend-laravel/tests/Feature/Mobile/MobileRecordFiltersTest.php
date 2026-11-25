<?php

namespace Tests\Feature\Mobile;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** The mobile Supplier and Customer pages list only that supplier's purchase bills and that customer's sales. */
class MobileRecordFiltersTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
    }

    private function supplier(string $name): int
    {
        return DB::table('suppliers')->insertGetId(['name' => $name, 'code' => 'SUP-'.Str::upper(Str::random(5)), 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function directPurchase(int $supplierId, string $no): int
    {
        return DB::table('direct_purchases')->insertGetId(['store_id' => $this->fixture['store']->id, 'supplier_id' => $supplierId, 'purchase_no' => $no,
            'purchase_date' => now()->toDateString(), 'total_amount' => 500, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function purchaseInvoice(int $supplierId, string $no): int
    {
        return DB::table('purchase_invoices')->insertGetId(['store_id' => $this->fixture['store']->id, 'supplier_id' => $supplierId, 'invoice_no' => $no,
            'invoice_date' => now()->toDateString(), 'grand_total' => 700, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_a_supplier_page_gets_only_that_suppliers_direct_purchases_and_invoices(): void
    {
        $alpha = $this->supplier('Alpha Traders');
        $beta = $this->supplier('Beta Textiles');
        $this->directPurchase($alpha, 'DP-A1');
        $this->directPurchase($beta, 'DP-B1');
        $this->purchaseInvoice($alpha, 'PI-A1');
        $this->purchaseInvoice($beta, 'PI-B1');

        $direct = $this->getJson('/api/direct-purchases?supplier_id='.$alpha)->assertOk()->json('data');
        $invoices = $this->getJson('/api/invoices?supplier_id='.$alpha)->assertOk()->json('data');

        $this->assertSame(['DP-A1'], array_column($direct, 'purchase_no'));
        $this->assertSame(['PI-A1'], array_column($invoices, 'invoice_no'));
        $this->assertCount(2, $this->getJson('/api/direct-purchases')->assertOk()->json('data'), 'without the filter both suppliers show');
    }

    public function test_a_customer_page_gets_only_that_customers_sales(): void
    {
        $item = [...$this->fixture['items'][0], 'qty' => 1];
        $ids = [];
        foreach ([1, 2] as $_) {
            $ids[] = $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100, 'items' => [$item]])
                ->assertCreated()->json('data.id');
        }
        $customer = Customer::create(['store_id' => $this->fixture['store']->id, 'code' => 'CUST-9', 'name' => 'Regular Customer']);
        DB::table('pos_sales')->where('id', $ids[0])->update(['customer_id' => $customer->id]);

        $rows = $this->getJson('/api/pos-sales?customer_id='.$customer->id)->assertOk()->json('data');

        $this->assertSame([$ids[0]], array_column($rows, 'id'));
        $this->assertCount(2, $this->getJson('/api/pos-sales')->assertOk()->json('data'));
    }
}
