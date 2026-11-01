<?php

namespace Tests\Feature\Sales;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** A sale takes stock out, a return puts it back, and cancelling a bill puts back whatever is still out. */
class SalesStockRulesTest extends TestCase
{
    use RefreshDatabase;

    private array $item;

    private function stock(): float
    {
        return (float) DB::table('stocks')->where('variant_id', $this->item['variantId'])->value('quantity');
    }

    private function sell(float $qty): int
    {
        return $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100 * $qty,
            'items' => [[...$this->item, 'qty' => $qty]]])->assertCreated()->json('data.id');
    }

    protected function setUp(): void
    {
        parent::setUp();
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $this->item = $fixture['items'][0];
    }

    public function test_sale_return_and_cancel_move_stock_the_right_way(): void
    {
        $saleId = $this->sell(3);
        $this->assertSame(997.0, $this->stock(), 'a sale deducts stock');

        $line = ['productId' => $this->item['productId'], 'variantId' => $this->item['variantId'], 'qty' => 1, 'price' => 100];
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$line]])->assertSuccessful();
        $this->assertSame(998.0, $this->stock(), 'a bill return adds stock back');

        $this->postJson('/api/pos-returns', ['standalone' => true, 'items' => [[...$line, 'qty' => 2]]])->assertSuccessful();
        $this->assertSame(1000.0, $this->stock(), 'a return without a bill adds stock back');

        $otherId = $this->sell(4);
        $this->assertSame(996.0, $this->stock());
        $this->deleteJson('/api/pos-sales/'.$otherId)->assertOk();
        $this->assertSame(1000.0, $this->stock(), 'cancelling a bill restores its stock');
    }

    public function test_cancelling_a_partly_returned_bill_does_not_add_the_returned_units_twice(): void
    {
        $saleId = $this->sell(3);
        $line = ['productId' => $this->item['productId'], 'variantId' => $this->item['variantId'], 'qty' => 1, 'price' => 100];
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$line]])->assertSuccessful();
        $this->assertSame(998.0, $this->stock());

        $status = $this->deleteJson('/api/pos-sales/'.$saleId)->status();

        // Restoring all 3 would count the returned unit twice (1001), so the cancel is refused.
        $this->assertSame(422, $status, 'a bill with returns cannot be cancelled');
        $this->assertSame(998.0, $this->stock(), 'and its stock is untouched');
    }
}
