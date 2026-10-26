<?php

namespace Tests\Feature;

use App\Models\PosSale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class PosLargeCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_ten_thousand_product_catalog_keeps_search_and_checkout_bounded(): void
    {
        $fixture = PosPerformanceFixture::catalog(10000);
        Sanctum::actingAs($fixture['user']);
        $this->assertDatabaseCount('products', 10000);
        $this->getJson('/api/pos-sales/stock-products')->assertOk()->assertJsonCount(50, 'data');
        $this->getJson('/api/pos-sales/stock-products?search=TEMP-LOAD-10000')->assertOk()->assertJsonPath('data.0.productName', 'TEMP Load Product 10000')->assertJsonCount(1, 'data');
        $this->getJson('/api/pos-sales/barcode-lookup?barcode=TEMP-LOAD-10000')->assertOk()->assertJsonPath('data.stock_qty', 1000);
        foreach ([1, 10, 100, 200, 1000] as $size) {
            $items = array_slice($fixture['items'], -$size);
            $payload = ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => $size * 100, 'items' => $items];
            DB::flushQueryLog();
            DB::enableQueryLog();
            $start = hrtime(true);
            $response = $this->postJson('/api/pos-sales', $payload)->assertCreated()->assertJsonCount($size, 'data.items');
            $queries = count(DB::getQueryLog());
            DB::disableQueryLog();
            fwrite(STDERR, "\nPOS_CATALOG_LOAD ".json_encode(['catalog' => 10000, 'basket' => $size, 'ms' => round((hrtime(true) - $start) / 1e6, 2), 'queries' => $queries])."\n");
            $this->assertLessThan(160, $queries);
            $this->assertEquals($size * 100, $response->json('data.grand_total'));
            $this->postJson('/api/pos-sales', $payload)->assertCreated()->assertJsonPath('data.id', $response->json('data.id'));
            $this->getJson('/api/pos-sales/'.$response->json('data.id'))->assertOk()->assertJsonCount($size, 'data.items');
        }
        $this->assertSame(5, PosSale::count());
        $this->assertDatabaseCount('stock_transactions', 1311);
        $this->assertDatabaseCount('stock_batch_allocations', 1311);
        $this->getJson('/api/pos-sales/latest-document')->assertOk()->assertJsonPath('data.type', 'sale')->assertJsonPath('data.grand_total', 100000);
    }
}
