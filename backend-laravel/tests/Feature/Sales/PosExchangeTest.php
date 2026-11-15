<?php

namespace Tests\Feature\Sales;

use App\Models\PosReturn;
use App\Models\PosSale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** POS Old exchange: the returned items come back into stock as a return on the bill, and its credit pays for the new items. */
class PosExchangeTest extends TestCase
{
    use RefreshDatabase;

    private array $items;

    protected function setUp(): void
    {
        parent::setUp();
        $fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($fixture['user']);
        $this->items = $fixture['items'];
    }

    private function stock(int $index): float
    {
        return (float) DB::table('stocks')->where('variant_id', $this->items[$index]['variantId'])->value('quantity');
    }

    private function legacyLine(int $index, float $qty): array
    {
        return ['barcodeId' => $this->items[$index]['productId'], 'variantId' => $this->items[$index]['variantId'], 'qty' => $qty, 'price' => 100];
    }

    private function bill(): int
    {
        return $this->postJson('/api/pos-old-sales', ['paidCash' => 200, 'items' => [$this->legacyLine(0, 2)]])->assertCreated()->json('data.id');
    }

    public function test_an_exchange_returns_the_old_items_and_sells_the_new_ones_paid_by_the_credit(): void
    {
        $billId = $this->bill();
        $this->assertSame(998.0, $this->stock(0));

        $response = $this->postJson('/api/pos-old-sales', [
            'isExchange' => true, 'returnSaleId' => $billId, 'returnSaleType' => 'pos_sale', 'paidCash' => 50,
            'returnItems' => [['productId' => $this->items[0]['productId'], 'variantId' => $this->items[0]['variantId'], 'qty' => 1, 'price' => 100]],
            'items' => [$this->legacyLine(1, 1.5)],
        ])->assertCreated();

        $this->assertSame(999.0, $this->stock(0), 'the returned unit is back in stock');
        $this->assertSame(998.5, $this->stock(1), 'the new item is taken out');
        $return = PosReturn::where('pos_sale_id', $billId)->sole();
        $this->assertSame('EXCHANGE', $return->refund_mode);
        $this->assertSame($response->json('data.id'), $return->credit_applied_to_sale_id, 'the credit paid for the new bill');
    }

    public function test_an_exchange_cannot_return_more_than_the_bill_had(): void
    {
        $billId = $this->bill();
        $this->postJson('/api/pos-old-sales', [
            'isExchange' => true, 'returnSaleId' => $billId, 'returnSaleType' => 'pos_sale', 'paidCash' => 0,
            'returnItems' => [['productId' => $this->items[0]['productId'], 'variantId' => $this->items[0]['variantId'], 'qty' => 3]],
            'items' => [$this->legacyLine(1, 1)],
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'only 2 remains returnable'));
        $this->assertSame(998.0, $this->stock(0));
        $this->assertSame(1000.0, $this->stock(1));
    }

    public function test_a_failed_new_sale_leaves_no_return_behind(): void
    {
        $billId = $this->bill();
        DB::table('stocks')->where('variant_id', $this->items[1]['variantId'])->update(['quantity' => 0, 'available_quantity' => 0]);

        $this->postJson('/api/pos-old-sales', [
            'isExchange' => true, 'returnSaleId' => $billId, 'returnSaleType' => 'pos_sale', 'paidCash' => 0,
            'returnItems' => [['productId' => $this->items[0]['productId'], 'variantId' => $this->items[0]['variantId'], 'qty' => 1]],
            'items' => [$this->legacyLine(1, 1)],
        ])->assertStatus(422);

        $this->assertSame(0, PosReturn::count(), 'the return is undone with the sale');
        $this->assertSame(998.0, $this->stock(0));
        $this->assertSame(1, PosSale::count());
    }

    public function test_an_exchange_needs_the_returned_items(): void
    {
        $this->postJson('/api/pos-old-sales', ['isExchange' => true, 'paidCash' => 0, 'items' => [$this->legacyLine(1, 1)]])
            ->assertStatus(422)->assertJsonPath('message', 'Select the items being returned for this exchange.');
    }
}
