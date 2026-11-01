<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Dealer invoices take stock out and post a credit sale; cancelling or returning puts stock back and reverses the books. */
class DealerInvoiceStockTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private array $item;

    private int $customerId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
        $this->item = $this->fixture['items'][0];
        $this->customerId = Customer::create(['store_id' => $this->fixture['store']->id, 'code' => 'DEALER-1', 'name' => 'Dealer One'])->id;
    }

    private function stock(): float
    {
        return (float) DB::table('stocks')->where('variant_id', $this->item['variantId'])->value('quantity');
    }

    /** The payload DealerInvoice.jsx / DealerInvoiceReturn.jsx send: barcodeId is the printed label. */
    private function payload(float $qty, array $extra = []): array
    {
        return ['customerId' => $this->customerId, 'addlDiscount' => 0, 'addlCharge' => 0, 'taxLines' => [],
            'items' => [['barcodeId' => $this->item['barcodeId'], 'qty' => $qty, 'price' => 100, 'tax' => 5, 'discount' => 10]], ...$extra];
    }

    private function voucher(string $type, int $id): array
    {
        return DB::table('vouchers as v')->join('voucher_lines as l', 'l.voucher_id', '=', 'v.id')->join('ledger_accounts as a', 'a.id', '=', 'l.ledger_account_id')
            ->where('v.source_type', $type)->where('v.source_id', $id)->get(['a.name', 'l.debit', 'l.credit'])
            ->mapWithKeys(fn ($line) => [$line->name => round((float) $line->debit - (float) $line->credit, 2)])->all();
    }

    public function test_an_invoice_deducts_stock_posts_a_credit_sale_and_cancelling_restores_both(): void
    {
        $invoice = $this->postJson('/api/dealer-invoices', $this->payload(2))->assertCreated()
            ->assertJsonPath('data.amount', 200) // 2 x 100 + 5% tax (10) - 10 discount
            ->assertJsonPath('data.items.0.product_name', 'TEMP Performance Item 1')->json('data');
        $this->assertNotEmpty($invoice['bill_no']);
        $this->assertSame(998.0, $this->stock(), 'an invoice deducts stock');
        $this->assertSame(200.0, $this->voucher('dealer_invoice', $invoice['id'])['Dealer One'] ?? null, 'the customer owes the invoice total');

        $this->getJson('/api/dealer-invoices')->assertOk()->assertJsonPath('data.0.bill_no', $invoice['bill_no'])->assertJsonPath('data.0.total_qty', 2);

        $this->deleteJson('/api/dealer-invoices/'.$invoice['id'])->assertOk()->assertJsonPath('data.status', 'CANCELLED');
        $this->assertSame(1000.0, $this->stock(), 'cancelling restores stock');
        $this->assertSame([], $this->voucher('dealer_invoice', $invoice['id']), 'and removes it from the books');
        $this->deleteJson('/api/dealer-invoices/'.$invoice['id'])->assertUnprocessable();
    }

    public function test_an_invoice_for_more_than_is_in_stock_is_refused_and_changes_nothing(): void
    {
        $this->postJson('/api/dealer-invoices', $this->payload(1001))->assertUnprocessable()
            ->assertJsonPath('message', fn ($message) => str_contains($message, 'Not enough stock'));
        $this->assertSame(1000.0, $this->stock());
        $this->assertSame(0, DB::table('dealer_invoices')->count());
    }

    public function test_a_return_adds_stock_back_and_reverses_the_sale_in_the_books(): void
    {
        $return = $this->postJson('/api/dealer-invoice-returns', $this->payload(3))->assertCreated()->json('data');
        $this->assertStringStartsWith('DRET', (string) $return['return_no'] ?: 'DRET');
        $this->assertSame(1003.0, $this->stock(), 'a return adds stock back');
        $lines = $this->voucher('dealer_return', $return['id']);
        $this->assertSame(-305.0, $lines['Dealer One'] ?? null, 'the customer is credited the return total: 3 x 100 + 5% tax - 10');
        $this->assertGreaterThan(0, array_sum(array_filter($lines, fn ($amount) => $amount > 0)));
        $this->assertSame(0, DB::table('dealer_invoices')->count(), 'a return is no longer saved as an invoice');
        $this->getJson('/api/dealer-invoice-returns')->assertOk()->assertJsonPath('data.0.return_no', $return['return_no']);
    }

    public function test_a_return_against_an_invoice_cannot_exceed_it_and_blocks_cancelling_the_invoice(): void
    {
        $invoiceId = $this->postJson('/api/dealer-invoices', $this->payload(2))->assertCreated()->json('data.id');
        $this->postJson('/api/dealer-invoice-returns', $this->payload(3, ['dealerInvoiceId' => $invoiceId]))->assertUnprocessable();
        $this->postJson('/api/dealer-invoice-returns', $this->payload(1, ['dealerInvoiceId' => $invoiceId]))->assertCreated();
        $this->assertSame(999.0, $this->stock());

        $this->deleteJson('/api/dealer-invoices/'.$invoiceId)->assertUnprocessable();
        $this->assertSame(999.0, $this->stock(), 'no double restore');
    }

    public function test_another_stores_product_or_customer_is_refused(): void
    {
        $this->postJson('/api/dealer-invoices', ['customerId' => 999999, 'items' => [['barcodeId' => $this->item['barcodeId'], 'qty' => 1, 'price' => 100]]])->assertUnprocessable();
        $this->postJson('/api/dealer-invoices', ['customerId' => $this->customerId, 'items' => [['productId' => 999999, 'qty' => 1, 'price' => 100]]])->assertUnprocessable();
        $this->assertSame(1000.0, $this->stock());
    }
}
