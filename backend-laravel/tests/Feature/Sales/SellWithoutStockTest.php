<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\User;
use App\Services\Inventory\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Warehouse Customisation's "sell without stock": off, a sale needs the stock; on, stock may go below zero. */
class SellWithoutStockTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private array $item;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
        $this->item = $this->fixture['items'][0];
    }

    private function stock(): float
    {
        return (float) DB::table('stocks')->where('variant_id', $this->item['variantId'])->value('quantity');
    }

    private function onShelf(): float
    {
        return (float) DB::table('stock_batches')->where('variant_id', $this->item['variantId'])->sum('remaining_qty');
    }

    private function sell(float $qty)
    {
        return $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100 * $qty,
            'items' => [[...$this->item, 'qty' => $qty]]]);
    }

    private function switchTo(bool $on): void
    {
        $this->putJson('/api/warehouse-customisation', ['companyId' => $this->fixture['store']->id, 'printMode' => 'direct', 'allowSaleWithoutStock' => $on])->assertOk();
    }

    public function test_with_the_switch_off_a_sale_needs_the_stock(): void
    {
        $this->sell(1001)->assertUnprocessable();
        $customerId = Customer::create(['store_id' => $this->fixture['store']->id, 'code' => 'D-1', 'name' => 'Dealer'])->id;
        $this->postJson('/api/dealer-invoices', ['customerId' => $customerId, 'items' => [['barcodeId' => $this->item['barcodeId'], 'qty' => 1001, 'price' => 100]]])
            ->assertUnprocessable();
        $this->assertSame(1000.0, $this->stock());
        $this->getJson('/api/pos-sales/stock-rules')->assertOk()->assertJsonPath('data.allowSaleWithoutStock', false);
    }

    public function test_with_the_switch_on_stock_goes_negative_the_line_is_marked_and_the_next_receipt_settles_it(): void
    {
        $this->switchTo(true);
        $this->getJson('/api/pos-sales/stock-rules')->assertOk()->assertJsonPath('data.allowSaleWithoutStock', true);

        $saleId = $this->sell(1002)->assertCreated()->json('data.id');
        $this->assertSame(-2.0, $this->stock(), 'two sold that were not in stock');
        $this->assertSame(2.0, (float) DB::table('pos_sale_items')->where('pos_sale_id', $saleId)->value('short_qty'));
        $this->assertSame(0.0, $this->onShelf());

        // A receipt of 5 first covers the 2 already sold; 3 go on the shelf.
        app(StockService::class)->adjust($this->fixture['store']->id, $this->item['productId'], $this->item['variantId'], 5, 'TEST_RECEIPT', 1, 50);
        $this->assertSame(3.0, $this->stock());
        $this->assertSame(3.0, $this->onShelf(), 'shelf batches match the stock');

        // Cancelling the bill puts back everything it took.
        $this->deleteJson("/api/pos-sales/$saleId")->assertOk();
        $this->assertSame(1005.0, $this->stock());
    }

    public function test_dealer_invoices_follow_the_switch_and_mark_the_short_quantity(): void
    {
        $this->switchTo(true);
        $customerId = Customer::create(['store_id' => $this->fixture['store']->id, 'code' => 'D-1', 'name' => 'Dealer'])->id;
        $id = $this->postJson('/api/dealer-invoices', ['customerId' => $customerId, 'items' => [['barcodeId' => $this->item['barcodeId'], 'qty' => 1003, 'price' => 100]]])
            ->assertCreated()->json('data.id');
        $this->assertSame(-3.0, $this->stock());
        $this->assertSame(3.0, (float) DB::table('dealer_invoice_items')->where('dealer_invoice_id', $id)->value('short_qty'));

        $this->deleteJson("/api/dealer-invoices/$id")->assertOk();
        $this->assertSame(1000.0, $this->stock(), 'cancelling restores it');
    }

    public function test_only_an_admin_changes_the_switch_but_every_seller_can_read_it(): void
    {
        $cashier = User::create(['name' => 'Switch Cashier', 'username' => 'switch-cashier', 'email' => 'switch-cashier@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $this->fixture['store']->id, 'is_active' => true]);
        Sanctum::actingAs($cashier);
        $this->putJson('/api/warehouse-customisation', ['companyId' => $this->fixture['store']->id, 'allowSaleWithoutStock' => true])->assertForbidden();
        $this->getJson('/api/pos-sales/stock-rules')->assertOk()->assertJsonPath('data.allowSaleWithoutStock', false);
    }
}
