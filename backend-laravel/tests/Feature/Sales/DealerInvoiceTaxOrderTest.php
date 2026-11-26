<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Dealer invoices charge GST on the price less the discount (discount first, then tax), as POS does. */
class DealerInvoiceTaxOrderTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $dealer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($this->fixture['user']);
        $this->dealer = Customer::create(['store_id' => $this->fixture['store']->id, 'code' => 'DEALER-1', 'name' => 'Dealer One'])->id;
    }

    public static function lines(): array
    {
        // qty, price, discount, GST %, expected taxable, expected tax, expected line total
        return [
            'no discount' => [2, 100, 0, 18, 200.0, 36.0, 236.0],
            'discount then 5%' => [2, 100, 10, 5, 190.0, 9.5, 199.5],
            'discount then 18%' => [1, 1000, 100, 18, 900.0, 162.0, 1062.0],
            'discount then 28%' => [3, 250, 50, 28, 700.0, 196.0, 896.0],
            'discount then 0% exempt' => [4, 75, 20, 0, 280.0, 0.0, 280.0],
            'discount then 14.5% VAT' => [1, 800, 80, 14.5, 720.0, 104.4, 824.4],
            'discount larger than the line is capped, nothing is owed' => [1, 100, 150, 18, 0.0, 0.0, 0.0],
        ];
    }

    #[DataProvider('lines')]
    public function test_tax_is_charged_on_the_price_after_the_discount(float $qty, float $price, float $discount, float $rate, float $taxable, float $tax, float $total): void
    {
        $item = $this->fixture['items'][0];
        $payload = ['customerId' => $this->dealer, 'addlDiscount' => 0, 'addlCharge' => 0, 'taxLines' => [],
            'items' => [['barcodeId' => $item['barcodeId'], 'qty' => $qty, 'price' => $price, 'tax' => $rate, 'discount' => $discount]]];

        $invoice = $this->postJson('/api/dealer-invoices', $payload)->assertCreated()->json('data');

        $saved = DB::table('dealer_invoices')->where('id', $invoice['id'])->first();
        $this->assertEqualsWithDelta($tax, (float) $saved->tax_amount, 0.0001, 'tax on the discounted price');
        $this->assertEqualsWithDelta($total, (float) $saved->grand_total, 0.0001, 'the invoice total');
        $this->assertEqualsWithDelta(min($discount, $qty * $price), (float) $saved->discount_amount, 0.0001, 'the discount is capped at the line value');

        $line = DB::table('dealer_invoice_items')->where('dealer_invoice_id', $invoice['id'])->first();
        $this->assertEqualsWithDelta($tax, (float) $line->tax_amount, 0.0001);
        $this->assertEqualsWithDelta($total, (float) $line->total, 0.0001);
    }
}
