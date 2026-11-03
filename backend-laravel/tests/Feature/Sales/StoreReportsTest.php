<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** The Sales Reports tabs backed by sales-reports/store/{report}: real stock, audit, loyalty and incentive rows. */
class StoreReportsTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($this->fixture['user']);
    }

    private function report(string $name): array
    {
        return $this->getJson("/api/sales-reports/store/$name")->assertOk()->json('data');
    }

    public function test_stock_aging_and_shelf_period_follow_the_batches_and_the_items_stock_age(): void
    {
        [$first] = $this->fixture['items'];
        DB::table('stock_batches')->where('variant_id', $first['variantId'])->update(['received_at' => now()->subDays(40), 'remaining_qty' => 30]);
        $product = Product::withoutGlobalScopes()->find($first['productId']);
        DB::table('products')->where('id', $product->id)->update(['master_details' => json_encode([...($product->master_details ?? []), 'stock_age' => 30])]);

        $aging = collect($this->report('stock_aging'))->keyBy('product_code');
        $this->assertSame(40, $aging[$product->code]['age_days']);
        $this->assertSame('31-60 days', $aging[$product->code]['age_bucket']);
        $this->assertEquals(1500, $aging[$product->code]['stock_value']); // 30 x 50

        $shelf = collect($this->report('shelf_period'))->keyBy('product_code');
        $this->assertSame('Over by 10 days', $shelf[$product->code]['shelf_status']);
        $this->assertSame('No shelf period set', $shelf->except($product->code)->first()['shelf_status']);
        $this->getJson('/api/sales-reports/store/anything')->assertNotFound();
    }

    public function test_stock_audit_loyalty_redemptions_and_incentives(): void
    {
        [$first] = $this->fixture['items'];
        $storeId = $this->fixture['store']->id;
        $auditId = DB::table('physical_stocks')->insertGetId(['store_id' => $storeId, 'audit_no' => 'PS-1', 'audit_date' => now()->toDateString(), 'status' => 'COMPLETED', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('physical_stock_items')->insert(['physical_stock_id' => $auditId, 'product_id' => $first['productId'], 'variant_id' => $first['variantId'],
            'system_qty' => 10, 'counted_qty' => 8, 'difference_qty' => -2, 'created_at' => now(), 'updated_at' => now()]);
        $this->assertSame('Short', $this->report('stock_audit')[0]['result']);

        $customer = Customer::create(['store_id' => $storeId, 'code' => 'LR-1', 'name' => 'Loyal One', 'phone' => '9876543210']);
        DB::table('loyalty_transactions')->insert(['customer_id' => $customer->id, 'type' => 'REDEEM', 'points' => -50, 'amount' => -50, 'balance_after' => 20, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('loyalty_transactions')->insert(['customer_id' => $customer->id, 'type' => 'EARN', 'points' => 70, 'amount' => 0, 'balance_after' => 70, 'created_at' => now(), 'updated_at' => now()]);
        $redemptions = $this->report('loyalty_redemptions');
        $this->assertCount(1, $redemptions);
        $this->assertEquals(50, $redemptions[0]['points']);

        $section = DB::table('hr_departments')->insertGetId(['name' => 'Sarees', 'code' => 'SAR', 'store_id' => $storeId, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $employee = DB::table('employees')->insertGetId(['store_id' => $storeId, 'name' => 'Ravi', 'code' => 'E1', 'department_id' => $section, 'salary' => 0, 'is_active' => true,
            'master_details' => json_encode(['incentive_pct' => 2]), 'created_at' => now(), 'updated_at' => now()]);
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 500,
            'items' => [[...$first, 'price' => 500, 'salesManId' => $employee, 'salesManName' => 'Ravi']]])->assertCreated();

        $row = $this->report('incentives')[0];
        $this->assertSame(['Ravi', 'Sarees', 1], [$row['employee_name'], $row['section'], $row['bills']]);
        $this->assertEquals(10, $row['incentive_amount']); // 2% of 500
    }
}
