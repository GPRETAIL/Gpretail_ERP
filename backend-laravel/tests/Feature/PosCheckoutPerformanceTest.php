<?php

namespace Tests\Feature;

use App\Models\Barcode;
use App\Models\PosSale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class PosCheckoutPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_100_and_200_item_checkouts_preserve_stock_and_receipt_details(): void
    {
        $fixture = PosPerformanceFixture::create();
        Sanctum::actingAs($fixture['user']);
        $metrics = [];
        foreach ([100, 200] as $size) {
            for ($run = 1; $run <= 3; $run++) {
                DB::flushQueryLog();
                DB::enableQueryLog();
                $start = hrtime(true);
                $response = $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => $size * 100, 'items' => array_slice($fixture['items'], 0, $size)]);
                $elapsed = (hrtime(true) - $start) / 1e6;
                $queries = DB::getQueryLog();
                DB::disableQueryLog();
                $metrics[] = ['items' => $size, 'run' => $run, 'elapsed_ms' => round($elapsed, 2), 'queries' => count($queries), 'sql_ms' => round(array_sum(array_column($queries, 'time')), 2), 'schema_queries' => count(array_filter($queries, fn ($q) => preg_match('/pragma|sqlite_master|information_schema|show (?:full )?columns/i', $q['query'])))];
                $response->assertCreated()->assertJsonPath('data.status', 'PAID')->assertJsonPath('data.counter_name', 'TEMP Performance Till')->assertJsonCount($size, 'data.items');
                $this->assertEquals($size * 100, $response->json('data.grand_total'));
                $this->assertNotEmpty($response->json('data.items.0.product.name'));
                $this->assertLessThan(150, count($queries), 'Checkout must use batch queries, not per-item writes.');
                $this->assertLessThan(60, $metrics[array_key_last($metrics)]['schema_queries'], 'Schema metadata must not be queried for every item.');
            }
        }
        $this->assertSame(6, PosSale::count());
        $this->assertEquals(900, DB::table('stock_transactions')->sum('quantity'));
        $this->assertEquals(900, DB::table('stock_batch_allocations')->sum('quantity'));
        $this->assertEquals(994, DB::table('stocks')->where('product_id', $fixture['items'][0]['productId'])->value('quantity'));
        $this->assertEquals(997, DB::table('stocks')->where('product_id', $fixture['items'][199]['productId'])->value('quantity'));
        $this->assertSame(200, Barcode::where('is_active', true)->count());
        fwrite(STDERR, "\nPOS_PERFORMANCE ".json_encode(['driver' => DB::getDriverName(), 'samples' => $metrics])."\n");
    }
}
