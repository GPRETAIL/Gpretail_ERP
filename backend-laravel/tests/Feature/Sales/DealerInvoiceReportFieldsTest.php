<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** The B2B tax and HSN reports are built in the browser from the dealer invoice list, which must carry HSN and GSTIN. */
class DealerInvoiceReportFieldsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dealer_invoice_list_carries_the_line_hsn_and_the_dealer_gstin(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $barcodeId = $fixture['items'][0]['barcodeId'];
        Product::query()->whereKey($fixture['items'][0]['productId'] ?? Product::query()->value('id'))->update(['hsn_code' => '6109']);
        $customerId = Customer::create(['store_id' => $fixture['store']->id, 'code' => 'DEALER-9', 'name' => 'Dealer Nine', 'gstin' => '33ABCDE1234F1Z5'])->id;
        $line = ['barcodeId' => $barcodeId, 'qty' => 2, 'price' => 500, 'tax' => 5, 'discount' => 0];
        $this->postJson('/api/dealer-invoices', ['customerId' => $customerId, 'addlDiscount' => 0, 'addlCharge' => 0, 'taxLines' => [], 'items' => [$line]])->assertCreated();

        $row = $this->getJson('/api/dealer-invoices?all=true')->assertOk()->json('data.0');

        $this->assertSame('33ABCDE1234F1Z5', $row['customer_gstin']);
        $this->assertSame('6109', $row['items'][0]['hsn_code']);
        $this->assertEquals(50.0, (float) $row['items'][0]['tax_amount'], 'tax is charged on quantity x price, so the report derives 5%');
        $this->assertEquals(1000.0, (float) $row['items'][0]['quantity'] * (float) $row['items'][0]['price']);
    }
}
