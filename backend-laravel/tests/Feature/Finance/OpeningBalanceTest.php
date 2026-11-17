<?php

namespace Tests\Feature\Finance;

use App\Models\DirectPurchase;
use App\Models\PurchaseInvoice;
use App\Services\Accounting\ChartOfAccounts;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class OpeningBalanceTest extends TestCase
{
    use RefreshDatabase;

    private int $store;

    private int $supplier;

    private int $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $fixture = PosPerformanceFixture::create(1);
        $this->store = $fixture['store']->id;
        Sanctum::actingAs($fixture['user']);
        $this->supplier = DB::table('suppliers')->insertGetId(['name' => 'TEMP Mill', 'code' => 'TEMP-MILL', 'phone' => '9000000001', 'store_id' => $this->store, 'created_at' => now(), 'updated_at' => now()]);
        $this->customer = DB::table('customers')->insertGetId(['name' => 'TEMP Ravi', 'code' => 'TEMP-RAVI', 'phone' => '9000000002', 'store_id' => $this->store, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function partyOpening(string $type, int $id): float
    {
        return (float) DB::table('ledger_accounts')->where('store_id', $this->store)->where('party_type', $type)->where('party_id', $id)->value('opening_balance');
    }

    private function bill(array $overrides = []): array
    {
        return $this->postJson('/api/opening-balances/bills', ['party_type' => 'supplier', 'party_id' => $this->supplier, 'bill_no' => 'OLD-1',
            'bill_date' => '2026-03-20', 'amount' => 5000, ...$overrides])->assertCreated()->json('data');
    }

    public function test_opening_bills_set_the_party_ledger_and_cannot_be_edited_there(): void
    {
        $this->bill();
        $this->bill(['bill_no' => 'OLD-2', 'amount' => 1500]);
        $this->bill(['party_type' => 'customer', 'party_id' => $this->customer, 'bill_no' => 'C-9', 'amount' => 800]);

        $this->assertSame(-6500.0, $this->partyOpening('supplier', $this->supplier)); // Owed to the supplier: a credit.
        $this->assertSame(800.0, $this->partyOpening('customer', $this->customer));
        $this->postJson('/api/opening-balances/bills', ['party_type' => 'supplier', 'party_id' => $this->supplier, 'bill_no' => 'OLD-1',
            'bill_date' => '2026-03-20', 'amount' => 10])->assertUnprocessable()->assertJsonValidationErrors('bill_no');

        $ledgers = $this->getJson('/api/opening-balances/ledgers')->assertOk()->json('data');
        $mill = collect($ledgers['rows'])->firstWhere('name', 'TEMP Mill');
        $this->assertSame(2, $mill['bills']);
        $this->assertEquals(800, $ledgers['total_debit']);
        $this->assertEquals(6500, $ledgers['total_credit']);
        $this->assertEquals(-5700, $ledgers['difference']); // More credit than debit: shown so it can be balanced.
        $this->putJson('/api/opening-balances/ledgers', ['rows' => [['id' => $mill['id'], 'opening_balance' => -100]]])
            ->assertUnprocessable()->assertJsonValidationErrors('rows');

        $payable = collect($this->getJson('/api/accounting/outstanding?side=payable')->assertOk()->json('data'))->firstWhere('name', 'TEMP Mill');
        $this->assertEquals(6500, $payable['amount']);
    }

    public function test_ledger_openings_are_saved_together_and_the_difference_is_shown(): void
    {
        ChartOfAccounts::ensure($this->store);
        $cash = ChartOfAccounts::system($this->store, 'cash');
        $capital = ChartOfAccounts::system($this->store, 'capital');

        $data = $this->putJson('/api/opening-balances/ledgers', ['rows' => [['id' => $cash, 'opening_balance' => 25000], ['id' => $capital, 'opening_balance' => -20000]]])
            ->assertOk()->json('data');

        $this->assertEquals(25000, $data['total_debit']);
        $this->assertEquals(20000, $data['total_credit']);
        $this->assertEquals(5000, $data['difference']);
        $this->assertSame(25000.0, (float) DB::table('ledger_accounts')->where('id', $cash)->value('opening_balance'));
    }

    public function test_excel_import_matches_parties_by_name_or_phone_and_reports_the_rest(): void
    {
        $result = $this->postJson('/api/opening-balances/bills/import', [
            ['party_type' => 'supplier', 'party' => 'temp mill', 'bill_no' => 'X-1', 'bill_date' => '15/03/2026', 'amount' => 1200],
            ['party_type' => 'customer', 'party' => '9000000002', 'bill_no' => 'X-2', 'bill_date' => '2026-03-16', 'due_date' => '2026-04-15', 'amount' => 300],
            ['party_type' => 'customer', 'party' => 'Nobody', 'bill_no' => 'X-3', 'bill_date' => '2026-03-16', 'amount' => 50],
        ])->assertOk()->json('data');

        $this->assertSame(2, $result['added']);
        $this->assertSame(['Row 4: party not found'], $result['skipped']);
        $this->assertSame(-1200.0, $this->partyOpening('supplier', $this->supplier));
        $bills = $this->getJson('/api/opening-balances/bills?party_type=customer')->assertOk()->json('data');
        $this->assertSame('2026-04-15', $bills[0]['due_date']);
    }

    public function test_one_supplier_payment_settles_an_invoice_a_direct_purchase_and_an_opening_bill(): void
    {
        $opening = $this->bill(['amount' => 1000]);
        $invoice = PurchaseInvoice::create(['store_id' => $this->store, 'supplier_id' => $this->supplier, 'invoice_no' => 'PI-T-1', 'invoice_date' => '2026-10-30',
            'subtotal' => 2000, 'tax_amount' => 0, 'grand_total' => 2000, 'status' => 'APPROVED']);
        $direct = DirectPurchase::create(['store_id' => $this->store, 'supplier_id' => $this->supplier, 'purchase_no' => 'DP-T-1', 'purchase_date' => '2026-11-01',
            'total_amount' => 700, 'paid_amount' => 0, 'payment_status' => 'UNPAID']);

        $pending = collect($this->getJson('/api/supplier-payments/pending?limit=50')->assertOk()->json('data'));
        $this->assertEqualsCanonicalizing(['opening', 'invoice', 'direct'], $pending->pluck('invoice_type')->all());

        $payment = $this->postJson('/api/supplier-payments', ['supplier_id' => $this->supplier, 'amount' => 3500, 'payment_mode' => 'CHEQUE',
            'reference_no' => '004512', 'cheque_date' => '2026-11-18', 'payment_date' => '2026-11-18',
            'allocations' => [
                ['invoice_type' => 'opening', 'id' => $opening['id'], 'amount' => 1000],
                ['invoice_type' => 'invoice', 'id' => $invoice->id, 'amount' => 2000],
                ['invoice_type' => 'direct', 'id' => $direct->id, 'amount' => 500],
            ]])->assertCreated()->json('data');

        $this->assertSame('PAID', $invoice->fresh()->payment_status);
        $this->assertSame('PARTIAL', $direct->fresh()->payment_status);
        $this->assertEquals(500, $direct->fresh()->paid_amount);
        $this->assertEquals(1000, DB::table('opening_bills')->where('id', $opening['id'])->value('paid_amount'));
        $this->assertSame(3, DB::table('supplier_payment_items')->where('supplier_payment_id', $payment['id'])->count());
        $this->assertSame('2026-11-18', DB::table('supplier_payments')->where('id', $payment['id'])->value('cheque_date'));
        $voucher = DB::table('vouchers')->where('source_type', 'supplier_payment')->where('source_id', $payment['id'])->first();
        $this->assertEquals(3500, $voucher->amount);

        $left = collect($this->getJson('/api/supplier-payments/pending?limit=50')->json('data'));
        $this->assertSame(['direct'], $left->pluck('invoice_type')->all());
        $this->deleteJson("/api/opening-balances/bills/{$opening['id']}")->assertUnprocessable(); // Paid against: cannot go.
    }

    public function test_pending_bills_can_be_limited_to_one_supplier(): void
    {
        $this->bill(['amount' => 1000]);
        $other = DB::table('suppliers')->insertGetId(['name' => 'TEMP Other', 'code' => 'TEMP-OTHER', 'store_id' => $this->store, 'created_at' => now(), 'updated_at' => now()]);
        $this->bill(['party_id' => $other, 'bill_no' => 'O-1', 'amount' => 300]);
        DirectPurchase::create(['store_id' => $this->store, 'supplier_id' => $other, 'purchase_no' => 'DP-O-1', 'purchase_date' => '2026-11-01',
            'total_amount' => 700, 'paid_amount' => 0, 'payment_status' => 'UNPAID']);

        $rows = collect($this->getJson("/api/supplier-payments/pending?limit=50&supplier_id=$other")->assertOk()->json('data'));

        $this->assertEqualsCanonicalizing(['O-1', 'DP-O-1'], $rows->pluck('invoice_no')->all());
        $this->assertSame([$other], $rows->pluck('supplier_id')->unique()->values()->all());
    }

    public function test_a_payment_cannot_pay_more_than_a_bill_owes_or_another_suppliers_bill(): void
    {
        $opening = $this->bill(['amount' => 1000]);
        $other = DB::table('suppliers')->insertGetId(['name' => 'TEMP Other', 'code' => 'TEMP-OTHER', 'store_id' => $this->store, 'created_at' => now(), 'updated_at' => now()]);

        $this->postJson('/api/supplier-payments', ['supplier_id' => $this->supplier, 'amount' => 1500, 'payment_mode' => 'CASH',
            'allocations' => [['invoice_type' => 'opening', 'id' => $opening['id'], 'amount' => 1500]]])->assertUnprocessable()->assertJsonValidationErrors('allocations');
        $this->postJson('/api/supplier-payments', ['supplier_id' => $other, 'amount' => 100, 'payment_mode' => 'CASH',
            'allocations' => [['invoice_type' => 'opening', 'id' => $opening['id'], 'amount' => 100]]])->assertUnprocessable()->assertJsonValidationErrors('allocations');
        $this->postJson('/api/supplier-payments', ['supplier_id' => $this->supplier, 'amount' => 100, 'payment_mode' => 'CHEQUE'])
            ->assertUnprocessable()->assertJsonValidationErrors('reference_no');
        $this->assertSame(0, DB::table('supplier_payments')->count());
    }
}
