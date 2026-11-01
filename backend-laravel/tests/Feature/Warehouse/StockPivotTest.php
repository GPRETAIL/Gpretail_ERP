<?php

namespace Tests\Feature\Warehouse;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class StockPivotTest extends TestCase
{
    use RefreshDatabase;

    // products also has store_id/quantity columns, so a store-scoped pivot that
    // joins products used to fail with "Column 'store_id' in WHERE is ambiguous".
    public function test_store_scoped_pivot_joining_products_returns_totals(): void
    {
        $fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($fixture['user']);

        foreach (['retail_value', 'cost_value', 'qty'] as $measure) {
            $this->withHeader('X-Company-Scope-Id', (string) $fixture['store']->id)
                ->getJson("/api/stock-pivot?row_by=brand&column_by=store&measure={$measure}")
                ->assertOk()->assertJsonPath('success', true);
        }

        $this->withHeader('X-Company-Scope-Id', (string) $fixture['store']->id)
            ->getJson('/api/stock-pivot?row_by=category&column_by=store&measure=retail_value')
            ->assertOk()->assertJsonPath('grandTotal', 200000);
    }
}
