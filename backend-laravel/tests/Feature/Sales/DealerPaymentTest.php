<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Dealer invoices paid now (split, part, rest on credit), Dealer Receipts for dues, and dealer outstanding. */
class DealerPaymentTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $dealer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
        $this->dealer = Customer::create(['store_id' => $this->fixture['store']->id, 'code' => 'DEALER-1', 'name' => 'Dealer One'])->id;
    }

    /** ₹200 invoice: 2 × ₹100 + 5% tax − ₹10 discount (as DealerInvoiceStockTest). */
    private function invoice(array $extra = []): array
    {
        return ['customerId' => $this->dealer, 'addlDiscount' => 0, 'addlCharge' => 0, 'taxLines' => [],
            'items' => [['barcodeId' => $this->fixture['items'][0]['barcodeId'], 'qty' => 2, 'price' => 100, 'tax' => 5, 'discount' => 10]], ...$extra];
    }

    /** Net debit (+) / credit (−) per account on a document's voucher. */
    private function voucher(string $type, int $id): array
    {
        return DB::table('vouchers as v')->join('voucher_lines as l', 'l.voucher_id', '=', 'v.id')->join('ledger_accounts as a', 'a.id', '=', 'l.ledger_account_id')
            ->where('v.source_type', $type)->where('v.source_id', $id)->get(['a.name', 'l.debit', 'l.credit'])
            ->groupBy('name')->map(fn ($lines) => round($lines->sum(fn ($l) => (float) $l->debit - (float) $l->credit), 2))->all();
    }

    public function test_an_invoice_paid_in_part_by_cash_and_upi_leaves_the_rest_on_credit(): void
    {
        $invoice = $this->postJson('/api/dealer-invoices', $this->invoice(['payments' => [['mode' => 'CASH', 'amount' => 50], ['mode' => 'UPI', 'amount' => 30, 'reference_no' => 'UTR1']]]))
            ->assertCreated()->assertJsonPath('data.paid_now', 80)->assertJsonPath('data.balance', 120)->assertJsonPath('data.payment_status', 'Part paid')
            ->assertJsonCount(2, 'data.payments')->json('data');

        $books = $this->voucher('dealer_invoice', $invoice['id']);
        $this->assertSame(120.0, $books['Dealer One'], 'only the unpaid part stays on the dealer');
        $this->assertSame(50.0, $books['Cash in Hand']);
        $this->assertSame(0.0, round(array_sum($books), 2), 'the voucher balances');
        $this->getJson('/api/dealer-invoices')->assertJsonPath('data.0.balance', 120)->assertJsonPath('data.0.payment_status', 'Part paid');

        $this->postJson('/api/dealer-invoices', $this->invoice(['payments' => [['mode' => 'CASH', 'amount' => 250]]]))->assertUnprocessable();
        $this->postJson('/api/dealer-invoices', $this->invoice(['payments' => [['mode' => 'CHEQUE', 'amount' => 10]]]))->assertUnprocessable();
        $this->postJson('/api/dealer-invoices', $this->invoice(['payments' => [['mode' => 'CARD', 'amount' => 200]]]))
            ->assertCreated()->assertJsonPath('data.payment_status', 'Paid')->assertJsonPath('data.balance', 0);
    }

    public function test_credit_approval_is_only_for_the_part_left_on_credit(): void
    {
        $this->putJson('/api/approvals/limits', ['enabled' => true])->assertOk(); // cashiers: no credit without approval
        Sanctum::actingAs(User::create(['name' => 'TEMP Cashier', 'username' => 'temp-dp-cashier', 'email' => 'dp-cashier@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $this->fixture['store']->id, 'is_active' => true]));

        $this->postJson('/api/dealer-invoices', $this->invoice(['payments' => [['mode' => 'CASH', 'amount' => 200]]]))->assertCreated();
        $this->postJson('/api/dealer-invoices', $this->invoice(['payments' => [['mode' => 'CASH', 'amount' => 150]]]))
            ->assertStatus(428)->assertJsonPath('action', 'pos_credit')->assertJsonPath('details.amount', 50);
    }

    public function test_receipts_pay_the_oldest_invoices_first_and_cancelling_gives_the_balance_back(): void
    {
        $first = $this->postJson('/api/dealer-invoices', $this->invoice())->assertCreated()->json('data.id');
        $second = $this->postJson('/api/dealer-invoices', $this->invoice())->assertCreated()->json('data.id');
        DB::table('dealer_invoices')->where('id', $first)->update(['invoice_date' => now()->subDays(45)->toDateString()]);

        $this->getJson('/api/dealer-receipts/dealers')->assertOk()->assertJsonPath('data.0.due', 400)->assertJsonPath('data.0.invoices', 2);
        $this->postJson('/api/dealer-receipts', ['customer_id' => $this->dealer, 'amount' => 500, 'mode' => 'CASH'])->assertUnprocessable();

        $receipt = $this->postJson('/api/dealer-receipts', ['customer_id' => $this->dealer, 'amount' => 250, 'mode' => 'BANK', 'reference_no' => 'NEFT9'])
            ->assertCreated()->assertJsonPath('data.allocations.0.dealer_invoice_id', $first)->assertJsonPath('data.allocations.0.amount', 200)
            ->assertJsonPath('data.allocations.1.amount', 50)->json('data');
        $this->assertMatchesRegularExpression('/^R\d{6}-\d{4}$/', $receipt['bill_no']);
        $books = $this->voucher('dealer_receipt', $receipt['id']);
        $this->assertSame(-250.0, $books['Dealer One']);
        $open = collect($this->getJson("/api/dealer-receipts/open-invoices?customer_id={$this->dealer}")->json('data'));
        $this->assertSame([$second => 150.0], $open->pluck('balance', 'id')->map(fn ($v) => (float) $v)->all(), 'the first is paid, the second part paid');

        // Chosen split: must add up and stay within each invoice's balance.
        $this->postJson('/api/dealer-receipts', ['customer_id' => $this->dealer, 'amount' => 100, 'mode' => 'CASH',
            'allocations' => [['dealer_invoice_id' => $second, 'amount' => 60]]])->assertUnprocessable();

        $this->deleteJson("/api/dealer-receipts/{$receipt['id']}")->assertOk()->assertJsonPath('data.status', 'CANCELLED');
        $this->assertSame([], $this->voucher('dealer_receipt', $receipt['id']), 'the voucher is dropped');
        $this->getJson('/api/dealer-receipts/dealers')->assertJsonPath('data.0.due', 400);

        // A dealer return against an invoice lowers what is due on it.
        $this->postJson('/api/dealer-invoice-returns', $this->invoice(['dealerInvoiceId' => $second, 'items' => [[
            'barcodeId' => $this->fixture['items'][0]['barcodeId'], 'qty' => 1, 'price' => 100, 'tax' => 5, 'discount' => 5]]]))->assertCreated();
        $this->assertSame(100.0, (float) collect($this->getJson("/api/dealer-receipts/open-invoices?customer_id={$this->dealer}")->json('data'))->firstWhere('id', $second)['balance']);
    }

    public function test_finance_dashboard_shows_dealer_outstanding_with_ageing(): void
    {
        $old = $this->postJson('/api/dealer-invoices', $this->invoice())->assertCreated()->json('data.id');
        $this->postJson('/api/dealer-invoices', $this->invoice(['payments' => [['mode' => 'CASH', 'amount' => 50]]]))->assertCreated();
        DB::table('dealer_invoices')->where('id', $old)->update(['invoice_date' => now()->subDays(45)->toDateString()]);

        $data = $this->getJson('/api/finance/dashboard')->assertOk()->json('data') ?? $this->getJson('/api/finance/dashboard')->json();
        $outstanding = $data['dealer_outstanding'];
        $this->assertSame([350.0, 2], [(float) $outstanding['total_due'], $outstanding['invoices']]);
        $this->assertSame([150.0, 200.0, 0.0, 0.0], array_map(fn ($b) => (float) $b['amount'], $outstanding['ageing']));
        $this->assertSame('Dealer One', $outstanding['top_dealers'][0]['customer_name']);
        $this->assertSame(2, collect($data['action_required'])->firstWhere('key', 'unpaid_dealer_invoices')['count']);

        // Another store sees none of it.
        $other = Store::create(['name' => 'TEMP Other', 'code' => 'TEMP-OTHER', 'is_active' => true]);
        Sanctum::actingAs(User::create(['name' => 'TEMP Other', 'username' => 'temp-dp-other', 'email' => 'dp-other@example.test',
            'password' => 'temporary-test-only', 'role' => 'admin', 'store_id' => $other->id, 'is_active' => true]));
        $this->getJson("/api/dealer-receipts/open-invoices?customer_id={$this->dealer}")->assertOk()->assertJsonCount(0, 'data');
    }
}
