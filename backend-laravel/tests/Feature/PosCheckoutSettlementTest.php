<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\PosPayment;
use App\Models\PosSale;
use App\Models\Product;
use App\Models\Settlement;
use App\Models\Stock;
use App\Models\Store;
use App\Models\SystemConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PosCheckoutSettlementTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private User $user;

    private Product $product;

    private SystemConfiguration $counter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'Coffee', 'code' => 'COFFEE', 'is_active' => true]);
        $this->counter = SystemConfiguration::create(['store_id' => $this->store->id, 'key' => 'counter', 'value' => 'Till One', 'is_active' => true]);
        $this->user = User::create(['name' => 'Manager', 'username' => 'manager', 'email' => 'manager@example.test', 'password' => 'secret123', 'role' => 'admin', 'store_id' => $this->store->id, 'is_active' => true, 'counter_id' => $this->counter->id]);
        $this->product = Product::create(['company_id' => $this->store->id, 'name' => 'Coffee', 'code' => 'P1', 'selling_price' => 100, 'is_active' => true]);
        Stock::create(['store_id' => $this->store->id, 'product_id' => $this->product->id, 'quantity' => 100, 'available_quantity' => 100]);
        Sanctum::actingAs($this->user);
    }

    private function sale(string $mode, float $cash = 0, array $extra = [])
    {
        return $this->postJson('/api/pos-sales', array_merge(['saleSaveAs' => $mode, 'cashAmount' => $cash,
            'items' => [['productId' => $this->product->id, 'qty' => 1, 'price' => 100]]], $extra));
    }

    public function test_summary_report_uses_saved_discount_tax_and_gstin_fields(): void
    {
        $customer = Customer::create(['store_id' => $this->store->id, 'code' => 'SUMMARY-CUSTOMER', 'name' => 'Tax customer', 'gstin' => '33TEST1234A1Z5']);
        $sale = PosSale::create(['store_id' => $this->store->id, 'user_id' => $this->user->id, 'customer_id' => $customer->id, 'invoice_no' => 'SUMMARY-ONE',
            'sale_date' => now(), 'discount_amount' => 10, 'tax_amount' => 18, 'grand_total' => 108, 'status' => 'PAID']);
        $sale->items()->create(['product_id' => $this->product->id, 'quantity' => 1, 'unit_mrp' => 100,
            'selling_price' => 100, 'discount' => 10, 'tax_rate' => 20, 'tax_amount' => 18, 'subtotal' => 108]);
        $this->getJson('/api/pos-sales/summary-report?mode=gst_bill_summary')->assertOk()
            ->assertJsonCount(1, 'data.rows')->assertJsonPath('data.rows.0.discount', 10)
            ->assertJsonPath('data.rows.0.sale_tax', 18)->assertJsonPath('data.rows.0.gst_id', '33TEST1234A1Z5');
        $this->getJson('/api/pos-sales/summary-report?mode=discount_bills')->assertOk()
            ->assertJsonCount(1, 'data.rows')->assertJsonPath('data.rows.0.total_discount', 10);
        $this->getJson('/api/pos-sales/summary-report?mode=bill_detail&billNo=SUMMARY-ONE')->assertOk()
            ->assertJsonPath('data.rows.0.price', 100)->assertJsonPath('data.rows.0.discount', 10)
            ->assertJsonPath('data.rows.0.total', 108);
    }

    public function test_paid_invoice_keeps_counter_snapshot_and_is_not_open(): void
    {
        $id = $this->sale('paid_settled', 100)->assertCreated()->assertJsonPath('data.status', 'PAID')->assertJsonPath('data.counter_name', 'Till One')->json('data.id');
        $this->counter->update(['value' => 'Renamed']);
        $this->getJson('/api/pos-sales?all=true')->assertJsonPath('data.0.counter_name', 'Till One');
        $this->getJson('/api/settlements/unpaid-bills')->assertJsonCount(0, 'data');
        $this->getJson('/api/settlements/unpaid-bills?status=all')->assertJsonCount(1, 'data');
        $this->postJson('/api/settlements', ['action' => 'settle', 'billIds' => [$id], 'cashAmount' => 100])->assertUnprocessable();
        $this->sale('paid_settled', 0)->assertUnprocessable();
        $this->assertSame(1, PosSale::count());
    }

    public function test_unsettled_invoice_can_be_settled_once_with_server_calculated_change(): void
    {
        $id = $this->sale('unsettled')->assertCreated()->assertJsonPath('data.status', 'UNSETTLED')->json('data.id');
        $this->getJson('/api/settlements/unpaid-bills')->assertJsonPath('data.0.remaining_amount', 100);
        $this->postJson('/api/settlements', ['action' => 'settle', 'billIds' => [$id], 'cashAmount' => 99])->assertUnprocessable();
        $payload = ['action' => 'settle', 'billIds' => [$id], 'cashAmount' => 120];
        $this->postJson('/api/settlements', $payload)->assertCreated()->assertJsonPath('data.return_amount', 20)->assertJsonPath('data.net_amount', 100);
        $this->assertDatabaseHas('pos_sales', ['id' => $id, 'status' => 'SETTLED', 'paid_amount' => 100]);
        $this->postJson('/api/settlements', $payload)->assertUnprocessable();
        $this->assertSame(1, Settlement::count());
        $this->assertEquals(100, PosPayment::sum('amount'));
        $this->getJson('/api/settlements/unpaid-bills')->assertJsonCount(0, 'data');
    }

    public function test_multiple_bills_allocate_split_tenders_without_double_collection(): void
    {
        $one = $this->sale('unsettled', 20)->assertCreated()->json('data.id');
        $two = $this->sale('unsettled')->assertCreated()->json('data.id');
        $this->postJson('/api/settlements', ['action' => 'settle', 'billIds' => [$one, $two], 'cashAmount' => 80, 'cardAmount' => 100, 'cardTypeId' => 1])->assertCreated();
        $this->assertEquals(100, PosPayment::where('pos_sale_id', $one)->sum('amount'));
        $this->assertEquals(100, PosPayment::where('pos_sale_id', $two)->sum('amount'));
    }

    public function test_foreign_store_invoice_and_counter_are_rejected(): void
    {
        $other = Store::create(['name' => 'Other', 'code' => 'OTHER', 'is_active' => true]);
        $counter = SystemConfiguration::create(['store_id' => $other->id, 'key' => 'counter', 'value' => 'Foreign', 'is_active' => true]);
        $this->postJson('/api/auth/counter', ['counterId' => $counter->id])->assertUnprocessable();
        $this->assertEquals($this->counter->id, $this->user->fresh()->counter_id);
        $this->postJson('/api/auth/counter', ['counterId' => $this->counter->id])->assertOk()->assertJsonPath('data.user.counter_name', 'Till One');
        $foreignId = $this->sale('unsettled')->assertCreated()->json('data.id');
        DB::table('pos_sales')->where('id', $foreignId)->update(['store_id' => $other->id]);
        $this->postJson('/api/settlements', ['action' => 'settle', 'billIds' => [$foreignId], 'cashAmount' => 100])->assertUnprocessable();
        $this->assertDatabaseHas('pos_sales', ['id' => $foreignId, 'status' => 'UNSETTLED']);
        $this->assertSame(0, Settlement::count());
    }

    public function test_credit_invoice_settlement_reconciles_customer_balance(): void
    {
        $customer = Customer::create(['name' => 'Customer', 'code' => 'C1', 'store_id' => $this->store->id, 'current_balance' => 0]);
        $id = $this->sale('unsettled', 0, ['customerId' => $customer->id, 'isCredit' => true])->assertCreated()->json('data.id');
        $this->assertEquals(100, $customer->fresh()->current_balance);
        $this->postJson('/api/settlements', ['action' => 'settle', 'billIds' => [$id], 'cashAmount' => 100])->assertCreated();
        $this->assertEquals(0, $customer->fresh()->current_balance);
    }

    public function test_short_bill_number_lookup_and_settlement_list_fields_remain_consistent(): void
    {
        $created = $this->sale('unsettled')->assertCreated();
        $bill = $created->json('data.bill_no');
        $id = $created->json('data.id');
        $this->assertMatchesRegularExpression('/^\d{6}-C?\d{4,}$/', $bill);
        $this->getJson('/api/settlements/bill/'.$bill)->assertOk()->assertJsonPath('data.id', $id)->assertJsonPath('data.sale_type', 'POS Sale')->assertJsonPath('data.amount', 100);
        $this->getJson('/api/pos-sales?search='.$bill)->assertOk()->assertJsonPath('data.0.id', $id);
        $this->getJson('/api/pos-old-sales/lookup-sale?bill_no='.$bill)->assertOk()->assertJsonPath('data.id', $id);
        $this->getJson('/api/pos-returns/source-bill?billNo='.$bill)->assertOk()->assertJsonPath('data.id', $id)->assertJsonPath('data.billNo', $bill);
        $settlementNo = $this->postJson('/api/settlements', ['action' => 'settle', 'billIds' => [$id], 'cashAmount' => 100])->assertCreated()->json('data.settlement_no');
        $this->getJson('/api/settlements/unpaid-bills?status=all')->assertOk()->assertJsonPath('data.0.settlement_no', $settlementNo)->assertJsonPath('data.0.amount', 100)->assertJsonPath('data.0.remaining_amount', 0);
        $this->assertNotEmpty($this->getJson('/api/settlements/next-settlement-number')->assertOk()->json('data.settlementNo'));
    }

    public function test_cloud_short_bill_marker_preserves_independent_offline_numbering(): void
    {
        $sale = new PosSale(['invoice_no' => 'INV-STR-ABC-20261024-C0001']);
        $this->assertSame('261024-C0001', $sale->bill_no);
        $sale->invoice_no = 'INV-STR-ABC-20261024-0001';
        $this->assertSame('261024-0001', $sale->bill_no);
        $sale->invoice_no = 'SB/29';
        $this->assertSame('SB/29', $sale->bill_no);
    }

    public function test_combined_store_scope_never_guesses_between_matching_short_bill_numbers(): void
    {
        $created = $this->sale('unsettled')->assertCreated();
        $bill = $created->json('data.bill_no');
        $other = Store::create(['name' => 'Second', 'code' => 'SECOND', 'is_active' => true]);
        $row = (array) DB::table('pos_sales')->find($created->json('data.id'));
        unset($row['id']);
        $row['store_id'] = $other->id;
        $row['invoice_no'] = str_replace('INV-COFFEE-', 'INV-SECOND-', $row['invoice_no']);
        DB::table('pos_sales')->insert($row);
        $this->user->update(['role' => 'super_admin', 'store_id' => null]);
        Sanctum::actingAs($this->user->fresh());
        $this->getJson('/api/settlements/bill/'.$bill)->assertUnprocessable();
        $this->getJson('/api/pos-old-sales/lookup-sale?bill_no='.$bill)->assertUnprocessable();
        $this->getJson('/api/pos-returns/source-bill?billNo='.$bill)->assertUnprocessable();
    }
}
