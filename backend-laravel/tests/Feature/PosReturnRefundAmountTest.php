<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class PosReturnRefundAmountTest extends TestCase
{
    use RefreshDatabase;

    public function test_bill_return_refunds_the_discounted_taxed_amount_paid_per_unit(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $item = $fixture['items'][0];
        // 3 × ₹100 less ₹30 discount = ₹270, plus 5% tax = ₹283.50 paid.
        $saleId = $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 283.5,
            'items' => [[...$item, 'qty' => 3, 'discount' => 30, 'tax' => 5]]])->assertCreated()->assertJsonPath('data.grand_total', '283.50')->json('data.id');

        // The client's price and discount are ignored for a bill return; the bill line decides.
        $line = ['productId' => $item['productId'], 'variantId' => $item['variantId'], 'qty' => 1, 'price' => 100, 'discount' => 30, 'tax' => 0];
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$line]])->assertSuccessful()
            ->assertJsonPath('data.total_refund', '94.50')
            ->assertJsonPath('data.items.0.discount', '10.00')->assertJsonPath('data.items.0.tax_amount', '4.50')->assertJsonPath('data.items.0.subtotal', '94.50');
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [[...$line, 'qty' => 2]]])->assertSuccessful()
            ->assertJsonPath('data.total_refund', '189.00');
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [$line]])->assertUnprocessable();
    }

    public function test_return_without_bill_refunds_catalogue_price_plus_tax(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $this->postJson('/api/pos-returns', ['standalone' => true, 'items' => [['productId' => $fixture['items'][0]['productId'], 'qty' => 2, 'price' => 100, 'tax' => 5]]])
            ->assertSuccessful()->assertJsonPath('data.total_refund', '210.00');
    }
}
