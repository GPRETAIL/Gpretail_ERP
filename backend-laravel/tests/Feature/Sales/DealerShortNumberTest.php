<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Services\Documents\DocumentNumberService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Dealer invoice and return numbers show short (D261116-C0001), like POS bills; the full number stays stored. */
class DealerShortNumberTest extends TestCase
{
    use RefreshDatabase;

    public function test_short_form_of_document_numbers(): void
    {
        $this->assertSame('D261116-C0001', DocumentNumberService::short('DINV-STR-SMZOW9BT5O-20261116-C0001', 'D'));
        $this->assertSame('DR261116-0007', DocumentNumberService::short('DRET-TEST_01-20261116-0007', 'DR'));
        $this->assertSame('D261116-F2-0003', DocumentNumberService::short('DINV-TEST_01-20261116-F2-0003', 'D'));
        $this->assertSame('MANUAL-42', DocumentNumberService::short('MANUAL-42', 'D')); // another format stays as typed
    }

    public function test_dealer_screens_show_search_and_deliver_by_the_short_number(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $customerId = Customer::create(['store_id' => $fixture['store']->id, 'code' => 'DEALER-1', 'name' => 'Dealer One'])->id;
        $line = ['barcodeId' => $fixture['items'][0]['barcodeId'], 'qty' => 2, 'price' => 100, 'tax' => 0, 'discount' => 0];
        $invoice = $this->postJson('/api/dealer-invoices', ['customerId' => $customerId, 'addlDiscount' => 0, 'addlCharge' => 0, 'taxLines' => [], 'items' => [$line]])
            ->assertCreated()->json('data');

        $short = 'D'.now(config('app.business_timezone'))->format('ymd').'-0001';
        $this->assertSame($short, $invoice['bill_no']);
        $this->assertStringStartsWith('DINV-', $invoice['invoice_no'], 'the stored number is unchanged');
        $this->assertSame($short, $this->getJson('/api/dealer-invoices')->json('data.0.bill_no'));
        $this->assertSame(1, $this->getJson('/api/dealer-invoices?search='.$short)->json('total') ?? count($this->getJson('/api/dealer-invoices?search='.$short)->json('data')));
        $this->assertSame('D'.now(config('app.business_timezone'))->format('ymd').'-0002', $this->getJson('/api/dealer-invoices/next-bill-no')->json('next_bill_no'));
        $this->getJson('/api/deliveries/bill?no='.$short)->assertOk()->assertJsonPath('data.bill_no', $short)->assertJsonPath('data.bill_type', 'Dealer invoice');
    }
}
