<?php

namespace Tests\Feature;

use App\Models\PosReturn;
use App\Models\PosReturnItem;
use App\Models\PurchaseInvoice;
use App\Models\SupplierPayment;
use App\Models\User;
use App\Services\Accounting\ChartOfAccounts;
use App\Services\Accounting\LedgerPoster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class AccountingTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        $this->store = $this->fixture['store']->id;
        Sanctum::actingAs($this->fixture['user']);
    }

    /** Two units at 100 with 5% GST: 200 taxable + 10 GST = 210. */
    private function sale(array $overrides = []): array
    {
        return $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 210,
            'items' => [[...$this->fixture['items'][0], 'qty' => 2, 'tax' => 5]], ...$overrides])->assertCreated()->json('data');
    }

    /** The voucher posted for a document, as [ledger name => signed amount (+ debit)]. */
    private function voucher(string $type, int $id): array
    {
        return DB::table('vouchers as v')->join('voucher_lines as l', 'l.voucher_id', '=', 'v.id')->join('ledger_accounts as a', 'a.id', '=', 'l.ledger_account_id')
            ->where('v.source_type', $type)->where('v.source_id', $id)->get(['a.name', 'l.debit', 'l.credit'])
            ->mapWithKeys(fn ($line) => [$line->name => round((float) $line->debit - (float) $line->credit, 2)])->all();
    }

    private function balance(string $systemKey): float
    {
        $account = ChartOfAccounts::system($this->store, $systemKey);

        return round((float) DB::table('voucher_lines')->where('ledger_account_id', $account)->sum(DB::raw('debit - credit')), 2);
    }

    public function test_a_cash_sale_posts_sales_gst_and_cash_net_of_change(): void
    {
        $sale = $this->sale(['cashAmount' => 500]);

        $this->assertSame(['Sales' => -200.0, 'Output CGST' => -5.0, 'Output SGST' => -5.0, 'Cash in Hand' => 210.0], $this->voucher('pos_sale', $sale['id']));
        $this->assertDatabaseHas('vouchers', ['source_type' => 'pos_sale', 'source_id' => $sale['id'], 'voucher_type' => 'sales', 'amount' => 210, 'store_id' => $this->store]);
    }

    public function test_card_and_upi_go_to_their_clearing_ledgers_and_a_deleted_bill_leaves_the_books(): void
    {
        $sale = $this->sale(['cashAmount' => 0, 'cardAmount' => 100, 'upiAmount' => 110]);
        $lines = $this->voucher('pos_sale', $sale['id']);
        $this->assertSame(100.0, $lines['Card Receipts (not yet in bank)']);
        $this->assertSame(110.0, $lines['UPI Receipts (not yet in bank)']);

        $this->deleteJson("/api/pos-sales/{$sale['id']}")->assertOk();
        $this->assertDatabaseMissing('vouchers', ['source_type' => 'pos_sale', 'source_id' => $sale['id']]);
    }

    public function test_an_unsettled_bill_is_receivable_until_credit_sale_collection_settles_it(): void
    {
        $sale = $this->sale(['saleSaveAs' => 'unsettled', 'cashAmount' => 0]);
        $this->assertSame(210.0, $this->voucher('pos_sale', $sale['id'])['Unsettled POS Bills']);

        $settlement = $this->postJson('/api/settlements', ['action' => 'settle', 'billIds' => [$sale['id']], 'cashAmount' => 300])->assertCreated()->json('data');

        $this->assertSame(['Cash in Hand' => 210.0, 'Unsettled POS Bills' => -210.0], $this->voucher('settlement', $settlement['id']));
        $this->assertSame(210.0, $this->voucher('pos_sale', $sale['id'])['Unsettled POS Bills']); // The bill itself is unchanged.
        $this->assertSame(0.0, $this->balance('pos_receivable'));
        $this->assertSame(210.0, $this->balance('cash'));
    }

    public function test_a_return_used_on_a_later_bill_becomes_a_credit_note_not_a_cash_refund(): void
    {
        $first = $this->sale();
        $return = DB::transaction(function () use ($first) { // As PosReturnController saves it.
            $return = PosReturn::create(['store_id' => $this->store, 'pos_sale_id' => $first['id'], 'return_no' => 'RET-T-1', 'return_date' => now(),
                'total_refund' => 105, 'refund_mode' => 'CASH', 'status' => 'COMPLETED']);
            PosReturnItem::create(['pos_return_id' => $return->id, 'product_id' => $this->fixture['items'][0]['productId'], 'quantity' => 1,
                'refund_price' => 100, 'tax_rate' => 5, 'tax_amount' => 5, 'subtotal' => 105]);

            return $return;
        });
        $this->assertSame(['Sales Returns' => 100.0, 'Output CGST' => 2.5, 'Output SGST' => 2.5, 'Cash in Hand' => -105.0], $this->voucher('pos_return', $return->id));

        $second = $this->sale(['appliedPosReturnId' => $return->id, 'cashAmount' => 105]);

        $this->assertSame(-105.0, $this->voucher('pos_return', $return->id)['Return Credit Notes']);
        $this->assertSame(105.0, $this->voucher('pos_sale', $second['id'])['Return Credit Notes']);
        $this->assertSame(0.0, $this->balance('return_credit'));
        $this->assertSame(315.0, $this->balance('cash')); // 210 + 105 in, nothing refunded.
    }

    public function test_a_purchase_and_its_payment_leave_the_supplier_square(): void
    {
        $supplier = DB::table('suppliers')->insertGetId(['name' => 'TEMP Mill', 'code' => 'TEMP-MILL', 'store_id' => $this->store, 'opening_balance' => 500, 'created_at' => now(), 'updated_at' => now()]);
        $invoice = PurchaseInvoice::create(['store_id' => $this->store, 'supplier_id' => $supplier, 'invoice_no' => 'PI-T-1', 'invoice_date' => '2026-10-30',
            'subtotal' => 1000, 'tax_amount' => 120, 'grand_total' => 1120, 'status' => 'APPROVED']);
        $payment = SupplierPayment::create(['store_id' => $this->store, 'supplier_id' => $supplier, 'payment_no' => 'SP-T-1', 'payment_date' => '2026-10-31',
            'amount' => 1620, 'payment_mode' => 'NEFT']);

        $this->assertSame(['Purchases' => 1000.0, 'Input CGST' => 60.0, 'Input SGST' => 60.0, 'TEMP Mill' => -1120.0], $this->voucher('purchase_invoice', $invoice->id));
        $this->assertSame(['TEMP Mill' => 1620.0, 'Bank Account' => -1620.0], $this->voucher('supplier_payment', $payment->id));
        $payable = $this->getJson('/api/accounting/outstanding?side=payable')->assertOk()->json('data');
        $this->assertSame([], $payable); // 500 opening + 1120 bill - 1620 paid.
    }

    public function test_hand_entered_vouchers_must_balance_and_automatic_ones_cannot_be_edited(): void
    {
        $accounts = collect($this->getJson('/api/accounting/accounts')->assertOk()->json('data'))->keyBy('name');
        $rent = $accounts['Rent']['id'];
        $cash = $accounts['Cash in Hand']['id'];
        $bank = $accounts['Bank Account']['id'];

        $this->postJson('/api/accounting/vouchers', ['voucher_type' => 'payment', 'voucher_date' => '2026-10-31',
            'lines' => [['ledger_account_id' => $rent, 'debit' => 1000], ['ledger_account_id' => $cash, 'credit' => 900]]])
            ->assertStatus(422)->assertJsonValidationErrors('lines');
        $this->postJson('/api/accounting/vouchers', ['voucher_type' => 'contra', 'voucher_date' => '2026-10-31',
            'lines' => [['ledger_account_id' => $rent, 'debit' => 1000], ['ledger_account_id' => $cash, 'credit' => 1000]]])
            ->assertStatus(422)->assertJsonValidationErrors('lines');
        $voucher = $this->postJson('/api/accounting/vouchers', ['voucher_type' => 'payment', 'voucher_date' => '2026-10-31', 'narration' => 'October rent',
            'lines' => [['ledger_account_id' => $rent, 'debit' => 1000], ['ledger_account_id' => $cash, 'credit' => 1000]]])->assertCreated()->json('data');
        $this->assertStringStartsWith('PV', $voucher['voucher_no']);
        $this->putJson("/api/accounting/vouchers/{$voucher['id']}", ['voucher_type' => 'contra', 'voucher_date' => '2026-10-31',
            'lines' => [['ledger_account_id' => $bank, 'debit' => 400], ['ledger_account_id' => $cash, 'credit' => 400]]])->assertOk();
        $this->assertSame(-400.0, $this->balance('cash'));

        $sale = $this->sale();
        $automatic = DB::table('vouchers')->where('source_type', 'pos_sale')->where('source_id', $sale['id'])->value('id');
        $this->deleteJson("/api/accounting/vouchers/$automatic")->assertStatus(422);
        $this->deleteJson("/api/accounting/vouchers/{$voucher['id']}")->assertOk();
    }

    public function test_reports_tally_and_value_closing_stock_at_fifo_cost(): void
    {
        $this->sale();
        $rent = collect($this->getJson('/api/accounting/accounts')->json('data'))->firstWhere('name', 'Rent')['id'];
        $cash = ChartOfAccounts::system($this->store, 'cash');
        $this->postJson('/api/accounting/vouchers', ['voucher_type' => 'payment', 'voucher_date' => now(config('app.business_timezone'))->toDateString(),
            'lines' => [['ledger_account_id' => $rent, 'debit' => 50], ['ledger_account_id' => $cash, 'credit' => 50]]])->assertCreated();

        $trial = $this->getJson('/api/accounting/trial-balance')->assertOk()->json('data');
        $this->assertEquals($trial['total_debit'], $trial['total_credit']);
        $this->assertEquals(210, $trial['total_debit']);

        // 998 + 1000 units left, all from batches costing 50; nothing was on hand before today.
        $pl = $this->getJson('/api/accounting/profit-loss')->assertOk()->json('data');
        $this->assertEquals(0, $pl['trading']['opening_stock']);
        $this->assertEquals(99900, $pl['trading']['closing_stock']);
        $this->assertEquals(100100, $pl['trading']['gross_profit']);
        $this->assertEquals(100050, $pl['profit_and_loss']['net_profit']);

        $sheet = $this->getJson('/api/accounting/balance-sheet')->assertOk()->json('data');
        $this->assertEquals(0, $sheet['difference']);
        $this->assertEquals(99900 + 160, $sheet['total_assets']); // Stock + cash 210 - 50 rent.

        $ledger = $this->getJson("/api/accounting/accounts/$cash/ledger")->assertOk()->json('data');
        $this->assertSame([210, 160], array_map('intval', array_column($ledger['entries'], 'balance')));
        $this->assertCount(2, $this->getJson('/api/accounting/daybook')->assertOk()->json('data'));
    }

    public function test_the_catch_up_command_is_safe_to_rerun_and_restores_a_missing_voucher(): void
    {
        $sale = $this->sale();
        DB::table('vouchers')->delete();

        Artisan::call('accounting:post');
        Artisan::call('accounting:post');
        Artisan::call('accounting:post', ['--all' => true]);

        $this->assertSame(1, DB::table('vouchers')->where('source_type', 'pos_sale')->where('source_id', $sale['id'])->count());
        $this->assertSame(4, DB::table('voucher_lines')->count());
    }

    public function test_only_managers_and_accountants_open_the_books(): void
    {
        foreach (['cashier' => 403, 'supervisor' => 403, 'accountant' => 200, 'manager' => 200] as $role => $status) {
            $user = User::create(['name' => "TEMP $role", 'username' => "temp-$role", 'email' => "$role@example.test", 'password' => 'temporary-test-only',
                'role' => $role, 'store_id' => $this->store, 'is_active' => true]);
            Sanctum::actingAs($user);
            $this->getJson('/api/accounting/trial-balance')->assertStatus($status);
        }
    }
}
