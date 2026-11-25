<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Sales > Delivery: the list of bills still waiting to be handed over, so the counter can pick one instead of typing. */
class DeliveryPendingTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($this->fixture['user']);
    }

    private function posBill(int $itemIndex = 0, int $qty = 1): int
    {
        $item = [...$this->fixture['items'][$itemIndex], 'qty' => $qty];

        return $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => $qty * 100, 'items' => [$item]])
            ->assertCreated()->json('data.id');
    }

    private function pending(string $query = ''): array
    {
        return $this->getJson('/api/deliveries/pending'.$query)->assertOk()->json('data');
    }

    public function test_new_bills_are_listed_newest_first_with_what_the_counter_needs_to_pick_one(): void
    {
        $first = $this->posBill(0, 2);
        $second = $this->posBill(1, 1);

        $rows = $this->pending();

        $this->assertSame([$second, $first], array_column($rows, 'source_id'));
        $this->assertSame(['pos_sale', 'POS bill', 'Walk-in Customer', 2.0, 200.0], [$rows[1]['source_type'], $rows[1]['bill_type'], $rows[1]['customer'], (float) $rows[1]['qty'], (float) $rows[1]['amount']]);
        $this->assertNotEmpty($rows[0]['bill_no']);
        $this->assertSame($first, (int) $this->getJson('/api/deliveries/bill?no='.$rows[1]['bill_no'])->json('data.source_id'), 'the number shown opens the same bill');
    }

    public function test_a_handed_over_bill_a_cancelled_bill_and_an_old_bill_are_not_listed(): void
    {
        $delivered = $this->posBill(0, 1);
        $cancelled = $this->posBill(1, 1);
        $old = $this->posBill(0, 1);
        $waiting = $this->posBill(1, 2);
        $item = $this->fixture['items'][0];
        $this->postJson('/api/deliveries', ['source_type' => 'pos_sale', 'source_id' => $delivered, 'items' => [['product_id' => $item['productId'], 'variant_id' => $item['variantId'], 'qty' => 1]]])->assertCreated();
        DB::table('pos_sales')->where('id', $cancelled)->update(['status' => 'CANCELLED']);
        DB::table('pos_sales')->where('id', $old)->update(['created_at' => Carbon::now()->subDays(10)]);

        $this->assertSame([$waiting], array_column($this->pending(), 'source_id'));
        $this->assertContains($old, array_column($this->pending('?days=14'), 'source_id'), 'a longer period brings older bills back');
    }

    public function test_dealer_invoices_are_listed_too_and_leave_the_list_once_delivered(): void
    {
        $customerId = Customer::create(['store_id' => $this->fixture['store']->id, 'code' => 'DEALER-9', 'name' => 'Dealer Nine'])->id;
        $line = ['barcodeId' => $this->fixture['items'][0]['barcodeId'], 'qty' => 3, 'price' => 100, 'tax' => 0, 'discount' => 0];
        $invoice = $this->postJson('/api/dealer-invoices', ['customerId' => $customerId, 'addlDiscount' => 0, 'addlCharge' => 0, 'taxLines' => [], 'items' => [$line]])
            ->assertCreated()->json('data');

        $rows = $this->pending();
        $this->assertSame(['dealer_invoice', 'Dealer invoice', 'Dealer Nine', 3.0], [$rows[0]['source_type'], $rows[0]['bill_type'], $rows[0]['customer'], (float) $rows[0]['qty']]);

        $item = $this->fixture['items'][0];
        $this->postJson('/api/deliveries', ['source_type' => 'dealer_invoice', 'source_id' => $invoice['id'], 'items' => [['product_id' => $item['productId'], 'variant_id' => $item['variantId'], 'qty' => 3]]])->assertCreated();

        $this->assertSame([], $this->pending());
    }

    public function test_the_period_is_limited_to_a_month(): void
    {
        $this->getJson('/api/deliveries/pending?days=90')->assertUnprocessable();
        $this->getJson('/api/deliveries/pending?days=0')->assertUnprocessable();
    }
}
