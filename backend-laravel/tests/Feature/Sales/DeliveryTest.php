<?php

namespace Tests\Feature\Sales;

use App\Models\ApprovalRequest;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Sales > Delivery: every item of a bill is checked at handover; extra items are refused, missing ones need approval. */
class DeliveryTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private array $items;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        $this->items = $this->fixture['items'];
        Sanctum::actingAs($this->fixture['user']);
    }

    private function posBill(array $lines): array
    {
        $items = array_map(fn ($line) => [...$this->items[$line[0]], 'qty' => $line[1]], $lines);
        $total = array_sum(array_map(fn ($item) => $item['qty'] * 100, $items));
        $saleId = $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => $total, 'items' => $items])
            ->assertCreated()->json('data.id');

        return $this->getJson('/api/deliveries/bill?no='.$saleId)->assertOk()->json('data');
    }

    private function counted(int $index, float $qty): array
    {
        return ['product_id' => $this->items[$index]['productId'], 'variant_id' => $this->items[$index]['variantId'], 'qty' => $qty];
    }

    private function stock(int $index): float
    {
        return (float) DB::table('stocks')->where('variant_id', $this->items[$index]['variantId'])->value('quantity');
    }

    private function cashier(): User
    {
        return User::create(['name' => 'TEMP Delivery Cashier', 'username' => 'temp-delivery-cashier', 'email' => 'delivery-cashier@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $this->fixture['store']->id, 'is_active' => true]);
    }

    public function test_a_pos_bill_is_handed_over_when_every_item_is_counted_and_stock_is_untouched(): void
    {
        $bill = $this->posBill([[0, 2], [1, 1]]);
        $this->assertSame('POS bill', $bill['bill_type']);
        $this->assertSame('Walk-in Customer', $bill['customer']);
        $this->assertSame([2, 1], array_map(fn ($line) => (int) $line['expected_qty'], $bill['lines']));
        $this->assertNull($bill['delivery']);
        $stock = [$this->stock(0), $this->stock(1)];

        $this->postJson('/api/deliveries', ['source_type' => 'pos_sale', 'source_id' => $bill['source_id'],
            'items' => [[...$this->counted(0, 1), 'barcodes' => ['TEMP-PERF-0001']], $this->counted(0, 1), $this->counted(1, 1)]])
            ->assertCreated()->assertJsonPath('data.status', 'delivered')->assertJsonPath('data.delivered_qty', 3);

        $this->assertSame($stock, [$this->stock(0), $this->stock(1)], 'delivery does not move stock');
        $this->assertSame('delivered', $this->getJson('/api/deliveries/bill?no='.$bill['bill_no'])->json('data.delivery.status'), 'found by its bill number too');
        $this->getJson('/api/deliveries')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.status_label', 'Delivered');
    }

    public function test_a_dealer_invoice_is_delivered_and_its_returned_units_are_not_expected(): void
    {
        $customerId = Customer::create(['store_id' => $this->fixture['store']->id, 'code' => 'DEALER-1', 'name' => 'Dealer One'])->id;
        $line = ['barcodeId' => $this->items[0]['barcodeId'], 'qty' => 3, 'price' => 100, 'tax' => 0, 'discount' => 0];
        $invoice = $this->postJson('/api/dealer-invoices', ['customerId' => $customerId, 'addlDiscount' => 0, 'addlCharge' => 0, 'taxLines' => [], 'items' => [$line]])
            ->assertCreated()->json('data');
        $this->postJson('/api/dealer-invoice-returns', ['customerId' => $customerId, 'dealerInvoiceId' => $invoice['id'], 'addlDiscount' => 0, 'addlCharge' => 0,
            'taxLines' => [], 'items' => [[...$line, 'qty' => 1]]])->assertCreated();

        $bill = $this->getJson('/api/deliveries/bill?no='.$invoice['invoice_no'])->assertOk()->json('data');
        $this->assertSame('Dealer invoice', $bill['bill_type']);
        $this->assertSame('Dealer One', $bill['customer']);
        $this->assertEquals(['billed_qty' => 3, 'returned_qty' => 1, 'expected_qty' => 2], array_intersect_key($bill['lines'][0], array_flip(['billed_qty', 'returned_qty', 'expected_qty'])));

        $this->postJson('/api/deliveries', ['source_type' => 'dealer_invoice', 'source_id' => $invoice['id'], 'items' => [$this->counted(0, 3)]])
            ->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->postJson('/api/deliveries', ['source_type' => 'dealer_invoice', 'source_id' => $invoice['id'], 'items' => [$this->counted(0, 2)]])
            ->assertCreated()->assertJsonPath('data.status', 'delivered');
    }

    public function test_an_item_not_on_the_bill_is_refused(): void
    {
        $bill = $this->posBill([[0, 1]]);
        $this->postJson('/api/deliveries', ['source_type' => 'pos_sale', 'source_id' => $bill['source_id'], 'items' => [$this->counted(0, 1), $this->counted(1, 1)]])
            ->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->assertSame(0, Delivery::count());
    }

    public function test_a_short_handover_needs_a_reason_and_a_cashier_needs_a_supervisors_approval(): void
    {
        $bill = $this->posBill([[0, 2], [1, 1]]);
        $cashier = $this->cashier();
        Sanctum::actingAs($cashier);
        $short = ['source_type' => 'pos_sale', 'source_id' => $bill['source_id'], 'items' => [$this->counted(0, 2)]];

        $this->postJson('/api/deliveries', $short)->assertUnprocessable()->assertJsonValidationErrors('short_reason');
        $this->postJson('/api/deliveries', [...$short, 'short_reason' => 'Out of stock at counter'])
            ->assertStatus(428)->assertJsonPath('code', 'APPROVAL_REQUIRED')->assertJsonPath('action', 'delivery_short')
            ->assertJsonPath('details.short_units', 1)->assertJsonPath('details.lines.0.expected', 1);

        // A supervisor approves at the counter with their PIN; the token hands over this bill once.
        User::create(['name' => 'TEMP Delivery Supervisor', 'username' => 'temp-delivery-super', 'email' => 'delivery-super@example.test', 'password' => 'temporary-test-only',
            'role' => 'supervisor', 'store_id' => $this->fixture['store']->id, 'is_active' => true])->forceFill(['approval_pin_hash' => Hash::make('4821')])->save();
        $token = $this->postJson('/api/approvals/pin-approve', ['action' => 'delivery_short', 'reason_code' => 'item_missing', 'note' => 'Out of stock at counter',
            'approver' => 'temp-delivery-super', 'pin' => '4821'])->assertOk()->json('data.token');

        $this->postJson('/api/deliveries', [...$short, 'short_reason' => 'Out of stock at counter', 'approvalToken' => $token])
            ->assertCreated()->assertJsonPath('data.status', 'short')->assertJsonPath('data.approved_by', 'TEMP Delivery Supervisor')
            ->assertJsonPath('data.short_reason', 'Out of stock at counter');
        $this->assertSame('used', ApprovalRequest::sole()->status);
        $this->getJson('/api/deliveries')->assertJsonPath('data.0.status_label', 'Short delivered')->assertJsonPath('data.0.short_qty', 1);
    }

    public function test_a_supervisor_hands_over_short_on_their_own_authority(): void
    {
        $bill = $this->posBill([[0, 2]]);
        $this->postJson('/api/deliveries', ['source_type' => 'pos_sale', 'source_id' => $bill['source_id'], 'items' => [$this->counted(0, 1)], 'short_reason' => 'One damaged'])
            ->assertCreated()->assertJsonPath('data.status', 'short')->assertJsonPath('data.approved_by', 'TEMP Performance Operator');
    }

    public function test_a_bill_is_handed_over_once(): void
    {
        $bill = $this->posBill([[0, 1]]);
        $body = ['source_type' => 'pos_sale', 'source_id' => $bill['source_id'], 'items' => [$this->counted(0, 1)]];
        $this->postJson('/api/deliveries', $body)->assertCreated();
        $this->postJson('/api/deliveries', $body)->assertStatus(409)->assertJsonPath('message', fn ($m) => str_contains($m, 'already handed over'));
        $this->assertSame(1, Delivery::count());
    }

    public function test_another_stores_bill_is_not_found(): void
    {
        $bill = $this->posBill([[0, 1]]);
        $other = Store::create(['name' => 'TEMP Other Store', 'code' => 'TEMP-OTHER', 'is_active' => true]);
        Sanctum::actingAs(User::create(['name' => 'TEMP Other Cashier', 'username' => 'temp-other', 'email' => 'other@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $other->id, 'is_active' => true]));

        $this->getJson('/api/deliveries/bill?no='.$bill['bill_no'])->assertNotFound();
        $this->postJson('/api/deliveries', ['source_type' => 'pos_sale', 'source_id' => $bill['source_id'], 'items' => [$this->counted(0, 1)]])->assertNotFound();
    }

    public function test_a_scanned_sticker_resolves_to_its_product_and_size(): void
    {
        $this->getJson('/api/deliveries/scan?barcode=TEMP-PERF-0002')->assertOk()
            ->assertJsonPath('data.product_id', $this->items[1]['productId'])->assertJsonPath('data.variant_id', $this->items[1]['variantId'])
            ->assertJsonPath('data.unique', false); // PACK items share one barcode, so each scan counts
        $this->getJson('/api/deliveries/scan?barcode=NOPE-123')->assertNotFound();
    }
}
