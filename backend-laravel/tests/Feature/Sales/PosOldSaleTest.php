<?php

namespace Tests\Feature\Sales;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** POS Old posts its own legacy field names; storeLegacy() must still sell through the normal checkout. */
class PosOldSaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_pos_old_bill_deducts_stock_and_its_fifo_batch(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $item = $fixture['items'][0];
        $before = (float) DB::table('stocks')->where('variant_id', $item['variantId'])->value('quantity');

        // The exact shape LegacyPos.jsx sends: barcodeId carries the product id (from /pos-sales/stock-products).
        $saleId = $this->postJson('/api/pos-old-sales', [
            'customerMode' => 'walkin', 'paymentMode' => 'cash', 'shipping' => 0, 'paidCash' => 270, 'isExchange' => false,
            'items' => [['barcodeId' => $item['productId'], 'variantId' => $item['variantId'], 'barcode' => 'TEMP-PERF-0001',
                'productName' => 'TEMP Performance Item 1', 'mrp' => 100, 'qty' => 3, 'price' => 100, 'discountPerc' => 10, 'discountAmt' => 30]],
        ])->assertCreated()->json('data.id');

        $this->assertSame($before - 3, (float) DB::table('stocks')->where('variant_id', $item['variantId'])->value('quantity'));
        $this->assertDatabaseHas('stock_transactions', ['reference_type' => 'POS_SALE', 'reference_id' => $saleId, 'variant_id' => $item['variantId']]);
        $this->assertSame(997.0, (float) DB::table('stock_batches')->where('variant_id', $item['variantId'])->sum('remaining_qty'));
        $this->getJson('/api/pos-sales/'.$saleId)->assertOk()->assertJsonPath('data.items.0.quantity', fn ($qty) => (float) $qty === 3.0);
    }

    public function test_exchange_checkout_is_refused_without_touching_stock(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $item = $fixture['items'][0];

        $this->postJson('/api/pos-old-sales', ['isExchange' => true, 'paidCash' => 0,
            'items' => [['barcodeId' => $item['productId'], 'variantId' => $item['variantId'], 'qty' => 1, 'price' => 100]]])->assertUnprocessable();
        $this->assertSame(1000.0, (float) DB::table('stocks')->where('variant_id', $item['variantId'])->value('quantity'));
    }
}
