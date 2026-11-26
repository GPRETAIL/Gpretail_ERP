<?php

namespace Tests\Feature\Sales;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** POS Old prices include the tax: the customer pays qty x price less the discount, and the bill records the tax that is inside it. */
class PosOldTaxTest extends TestCase
{
    use RefreshDatabase;

    private array $item;

    protected function setUp(): void
    {
        parent::setUp();
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $this->item = $fixture['items'][0];
    }

    private function sell(float $qty, float $price, float $discount, float $tax, float $paid)
    {
        return $this->postJson('/api/pos-old-sales', ['customerMode' => 'walkin', 'paymentMode' => 'cash', 'shipping' => 0, 'paidCash' => $paid, 'isExchange' => false,
            'items' => [['barcodeId' => $this->item['productId'], 'variantId' => $this->item['variantId'], 'barcode' => 'TEMP-PERF-0001', 'productName' => 'Item', 'mrp' => $price,
                'qty' => $qty, 'price' => $price, 'discountAmt' => $discount, 'tax' => $tax, 'taxName' => 'GST', 'taxType' => 'GST']]])->assertCreated()->json('data.id');
    }

    public static function cases(): array
    {
        // qty, price (tax included), discount, rate, customer pays, tax inside, bill without tax
        return [
            'exempt' => [2, 100, 0, 0, 200.00, 0.00, 200.00],
            'GST 5% with a discount' => [3, 100, 30, 5, 270.00, 12.86, 257.14],
            'GST 12%' => [1, 112, 0, 12, 112.00, 12.00, 100.00],
            'GST 18% two pieces' => [2, 118, 0, 18, 236.00, 36.00, 200.00],
            'GST 28% with a discount' => [4, 128, 28, 28, 484.00, 105.88, 378.12],
        ];
    }

    #[DataProvider('cases')]
    public function test_the_customer_pays_the_price_on_the_tag_and_the_tax_inside_it_is_recorded(float $qty, float $price, float $discount, float $rate, float $pays, float $tax, float $net): void
    {
        $saleId = $this->sell($qty, $price, $discount, $rate, $pays);
        $sale = DB::table('pos_sales')->where('id', $saleId)->first();

        $this->assertEqualsWithDelta($pays, (float) $sale->grand_total, 0.0001, 'the bill total is what the customer pays');
        $this->assertEqualsWithDelta($tax, (float) $sale->tax_amount, 0.0001, 'the tax inside the price');
        $this->assertEqualsWithDelta($net, (float) $sale->subtotal, 0.0001, 'the bill without the tax');
        $this->assertEqualsWithDelta($pays, (float) $sale->paid_amount, 0.0001);
        $this->assertEqualsWithDelta(0.0, (float) $sale->change_amount, 0.0001);
        $item = DB::table('pos_sale_items')->where('pos_sale_id', $saleId)->first();
        $this->assertEqualsWithDelta($rate, (float) $item->tax_rate, 0.0001);
        $this->assertEqualsWithDelta($tax, (float) $item->tax_amount, 0.0001);
        $this->assertEqualsWithDelta($pays, (float) $item->subtotal, 0.0001, 'the line total includes the tax, as the customer paid it');
        $this->assertSame(1000.0 - $qty, (float) DB::table('stocks')->where('variant_id', $this->item['variantId'])->value('quantity'));
    }

    public function test_returning_a_pos_old_bill_refunds_what_was_paid_and_puts_the_stock_back(): void
    {
        $saleId = $this->sell(2, 118, 0, 18, 236);
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $saleId, 'items' => [['productId' => $this->item['productId'], 'variantId' => $this->item['variantId'], 'qty' => 1, 'price' => 118]]])->assertSuccessful();

        $this->assertEqualsWithDelta(118.0, (float) DB::table('pos_returns')->sum('total_refund'), 0.0001);
        $this->assertSame(999.0, (float) DB::table('stocks')->where('variant_id', $this->item['variantId'])->value('quantity'));
    }
}
