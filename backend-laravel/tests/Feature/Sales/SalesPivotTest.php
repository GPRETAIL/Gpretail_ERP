<?php

namespace Tests\Feature\Sales;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class SalesPivotTest extends TestCase
{
    use RefreshDatabase;

    // The store and date filters name pos_sales so a joined table can't make them ambiguous.
    public function test_store_scoped_pivot_returns_totals(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 200,
            'items' => [[...$fixture['items'][0], 'qty' => 2]]])->assertCreated();

        $this->withHeader('X-Company-Scope-Id', (string) $fixture['store']->id)
            ->getJson('/api/sales-pivot?row_by=payment_mode&column_by=store&measure=revenue&dateFrom='.now()->subDay()->toDateString().'&dateTo='.now()->addDay()->toDateString())
            ->assertOk()->assertJsonPath('success', true)->assertJsonPath('grandTotal', 200);
    }
}
