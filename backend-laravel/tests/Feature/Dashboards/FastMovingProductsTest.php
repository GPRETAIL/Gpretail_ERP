<?php

namespace Tests\Feature\Dashboards;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class FastMovingProductsTest extends TestCase
{
    use RefreshDatabase;

    public function test_shows_bought_sold_balance_and_pace_per_product_for_the_period(): void
    {
        $this->travelTo(Carbon::parse('2026-10-01 06:00:00'));
        $fixture = PosPerformanceFixture::create(2);
        $store = $fixture['store']->id;
        [$shirt, $saree] = $fixture['items'];
        Sanctum::actingAs($fixture['user']);
        // 20 more shirts came in on 5 Nov (an inventory entry).
        DB::table('stock_transactions')->insert(['store_id' => $store, 'product_id' => $shirt['productId'], 'variant_id' => $shirt['variantId'],
            'reference_type' => 'INVENTORY_ENTRY', 'reference_id' => 1, 'type' => 'IN', 'quantity' => 20, 'before_qty' => 1000, 'after_qty' => 1020,
            'created_at' => '2026-11-05 05:00:00', 'updated_at' => '2026-11-05 05:00:00']);

        // Ten days after the stock arrived: 6 shirts in two bills, 1 saree.
        $this->travelTo(Carbon::parse('2026-10-11 06:00:00'));
        foreach ([4, 2] as $qty) {
            $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100 * $qty,
                'items' => [[...$shirt, 'qty' => $qty, 'tax' => 0]]])->assertCreated();
        }
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100,
            'items' => [[...$saree, 'qty' => 1, 'tax' => 0]]])->assertCreated();

        $this->travelTo(Carbon::parse('2026-11-10 06:00:00'));
        $data = $this->getJson('/api/dashboard/fast-moving?from=2026-10-01&to=2026-11-10')->assertOk()->json('data');

        $this->assertSame(41, $data['days']);
        $this->assertSame(['TEMP Performance Item 1', 'TEMP Performance Item 2'], array_column($data['rows'], 'name')); // Most sold first.
        $row = $data['rows'][0];
        $this->assertEquals(6, $row['net_sold']);
        $this->assertEquals(20, $row['bought']);
        $this->assertEquals(994, $row['balance']);
        $this->assertSame('2026-10-11', $row['first_sold']);
        $this->assertSame('2026-11-05', $row['last_received']);
        $this->assertEquals(10, $row['avg_days_to_sell']); // Batch received 1 Oct, sold 11 Oct.
        $this->assertEquals(0.15, $row['per_day']);
        $this->assertSame('Slow', $row['movement']); // 994 left at 0.15 a day.

        $search = $this->getJson('/api/dashboard/fast-moving?from=2026-10-01&to=2026-11-10&search=Item 2')->assertOk()->json('data.rows');
        $this->assertSame(['TEMP Performance Item 2'], array_column($search, 'name'));
        $this->assertSame([], $this->getJson('/api/dashboard/fast-moving?from=2026-11-01&to=2026-11-10')->json('data.rows')); // No sales then.
    }
}
