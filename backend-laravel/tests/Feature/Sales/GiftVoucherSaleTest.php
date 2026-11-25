<?php

namespace Tests\Feature\Sales;

use App\Models\CashRegisterSession;
use App\Models\GiftCredit;
use App\Models\User;
use App\Services\Sales\CashRegisterService;
use App\Services\Sales\GiftCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** CRM > Gift Voucher: sold at the counter, a liability until a bill uses it, cancellable while untouched. */
class GiftVoucherSaleTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        $this->store = $this->fixture['store']->id;
        Sanctum::actingAs($this->fixture['user']);
    }

    private function sell(array $extra = []): array
    {
        return $this->postJson('/api/gift-vouchers', ['amount' => 500, 'payment_mode' => 'CASH', 'buyer_name' => 'Meena', ...$extra])->assertCreated()->json('data');
    }

    /** Net debit (+) / credit (−) per account on a document's voucher. */
    private function books(int $id): array
    {
        return DB::table('vouchers as v')->join('voucher_lines as l', 'l.voucher_id', '=', 'v.id')->join('ledger_accounts as a', 'a.id', '=', 'l.ledger_account_id')
            ->where('v.source_type', 'gift_voucher_sale')->where('v.source_id', $id)->get(['a.name', 'l.debit', 'l.credit'])
            ->groupBy('name')->map(fn ($lines) => round($lines->sum(fn ($l) => (float) $l->debit - (float) $l->credit), 2))->all();
    }

    public function test_selling_a_voucher_numbers_it_sets_the_expiry_and_books_the_money_as_owed(): void
    {
        $voucher = $this->sell(['payment_reference' => 'TXN-1']);

        $this->assertMatchesRegularExpression('/^GV\d{6}-C?\d+$/', $voucher['display_number']);
        $this->assertEquals(500, $voucher['balance']);
        $this->assertSame('ACTIVE', $voucher['state']);
        $this->assertSame(now(config('app.business_timezone'))->addDays(365)->toDateString(), $voucher['expires_on'], 'a year unless the store chose otherwise');
        $this->assertSame('Meena', $voucher['buyer_name']);

        $books = $this->books($voucher['id']);
        $this->assertSame(-500.0, $books['Gift Vouchers Outstanding'], 'the store owes the customer until a bill uses it');
        $this->assertSame(500.0, array_sum(array_filter($books, fn ($amount) => $amount > 0)));
        $this->assertSame(0.0, round(array_sum($books), 2));
        $this->assertSame('TXN-1', DB::table('vouchers')->where('source_type', 'gift_voucher_sale')->value('reference_no'));
    }

    public function test_the_store_setting_and_the_seller_choose_how_long_it_lasts(): void
    {
        DB::table('stores')->where('id', $this->store)->update(['receipt_customization' => json_encode(['voucherExpiryDays' => 30])]);
        $this->assertSame(now(config('app.business_timezone'))->addDays(30)->toDateString(), $this->sell()['expires_on']);

        $this->assertSame(now(config('app.business_timezone'))->addDays(7)->toDateString(), $this->sell(['valid_days' => 7])['expires_on']);
        $this->assertNull($this->sell(['valid_days' => 0])['expires_on'], 'zero days never expires');
    }

    public function test_the_validity_is_saved_in_sales_customisation_and_a_bad_value_is_ignored(): void
    {
        $post = fn (mixed $days) => $this->postJson('/api/sales-customization', ['companyId' => $this->store, 'settingsSection' => 'sales', 'voucherExpiryDays' => $days])->assertOk();
        $post(180);
        $this->assertSame(now(config('app.business_timezone'))->addDays(180)->toDateString(), $this->sell()['expires_on']);
        $post('soon');
        $post(99999);
        $this->assertSame(now(config('app.business_timezone'))->addDays(180)->toDateString(), $this->sell()['expires_on'], 'a bad value changed nothing');
    }

    public function test_it_refuses_a_missing_amount_or_payment_mode(): void
    {
        $this->postJson('/api/gift-vouchers', ['payment_mode' => 'CASH'])->assertUnprocessable()->assertJsonValidationErrors(['amount' => 'Enter the voucher amount.']);
        $this->postJson('/api/gift-vouchers', ['amount' => 100])->assertUnprocessable()->assertJsonValidationErrors(['payment_mode' => 'Choose how the customer paid.']);
        $this->postJson('/api/gift-vouchers', ['amount' => 100, 'payment_mode' => 'CREDIT'])->assertUnprocessable()->assertJsonValidationErrors(['payment_mode' => 'Choose cash, card or UPI.']);
        $this->assertSame(0, GiftCredit::count());
    }

    public function test_a_bill_can_use_the_voucher_in_parts_and_the_list_shows_what_is_left(): void
    {
        $voucher = $this->sell();
        $item = [...$this->fixture['items'][0], 'price' => 200];
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'items' => [$item],
            'vouchers' => [['number' => $voucher['display_number'], 'amount' => 200]]])->assertCreated();

        $this->getJson('/api/gift-vouchers/'.$voucher['id'])->assertOk()->assertJsonPath('data.uses.0.amount', 200)->assertJsonPath('data.balance', 300);
        $list = $this->getJson('/api/gift-vouchers')->assertOk();
        $list->assertJsonPath('total', 1)->assertJsonPath('data.0.balance', 300);
        $this->assertEquals(300, $list->json('outstanding'), 'the amount the store still owes on live vouchers');
    }

    public function test_the_list_filters_by_state_and_search(): void
    {
        $live = $this->sell(['buyer_name' => 'Anitha', 'buyer_phone' => '9876500001']);
        $old = $this->sell(['buyer_name' => 'Bala']);
        GiftCredit::whereKey($old['id'])->update(['expires_on' => now()->subDay()->toDateString()]);
        $gone = $this->sell(['buyer_name' => 'Chitra']);
        $this->postJson("/api/gift-vouchers/{$gone['id']}/cancel", ['reason' => 'Wrong amount'])->assertOk();

        $ids = fn (string $status) => collect($this->getJson('/api/gift-vouchers?status='.$status)->assertOk()->json('data'))->pluck('id')->all();
        $this->assertSame([$live['id']], $ids('ACTIVE'));
        $this->assertSame([$old['id']], $ids('EXPIRED'));
        $this->assertSame([$gone['id']], $ids('CANCELLED'));
        $this->assertCount(3, $ids('ALL'));
        $this->assertSame([$live['id']], collect($this->getJson('/api/gift-vouchers?search=9876500001')->json('data'))->pluck('id')->all());
        $this->assertSame([$old['id']], collect($this->getJson('/api/gift-vouchers?search=Bala')->json('data'))->pluck('id')->all());
    }

    public function test_cancelling_an_untouched_voucher_takes_it_out_of_the_books_and_refuses_a_second_cancel(): void
    {
        $voucher = $this->sell();
        $this->postJson("/api/gift-vouchers/{$voucher['id']}/cancel", [])->assertUnprocessable()->assertJsonValidationErrors(['reason' => 'Say why the voucher is cancelled.']);

        $this->postJson("/api/gift-vouchers/{$voucher['id']}/cancel", ['reason' => 'Customer changed their mind'])
            ->assertOk()->assertJsonPath('data.state', 'CANCELLED')->assertJsonPath('data.cancel_reason', 'Customer changed their mind');
        $this->assertSame([], $this->books($voucher['id']), 'a cancelled voucher leaves the books');
        $this->postJson("/api/gift-vouchers/{$voucher['id']}/cancel", ['reason' => 'Again'])->assertUnprocessable()->assertJsonPath('message', 'This gift voucher is already cancelled.');

        // A cancelled voucher cannot pay a bill.
        $item = [...$this->fixture['items'][0], 'price' => 100];
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'items' => [$item],
            'vouchers' => [['number' => $voucher['number'], 'amount' => 100]]])->assertUnprocessable()
            ->assertJsonValidationErrors(['vouchers.0.number' => 'This gift voucher was cancelled.']);
    }

    public function test_a_voucher_that_a_bill_has_used_cannot_be_cancelled(): void
    {
        $voucher = $this->sell();
        $item = [...$this->fixture['items'][0], 'price' => 100];
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'items' => [$item],
            'vouchers' => [['number' => $voucher['number'], 'amount' => 100]]])->assertCreated();

        $this->postJson("/api/gift-vouchers/{$voucher['id']}/cancel", ['reason' => 'Mistake'])->assertUnprocessable()
            ->assertJsonPath('message', 'This gift voucher has been used on a bill, so it cannot be cancelled.');
        $this->assertSame('ACTIVE', GiftCredit::find($voucher['id'])->status);
    }

    public function test_only_a_supervisor_or_above_can_cancel(): void
    {
        $voucher = $this->sell();
        $cashier = User::create(['name' => 'Till Cashier', 'username' => 'till-cashier', 'email' => 'till-cashier@example.test', 'password' => 'secret123',
            'role' => 'cashier', 'store_id' => $this->store, 'is_active' => true]);
        Sanctum::actingAs($cashier);

        $this->postJson("/api/gift-vouchers/{$voucher['id']}/cancel", ['reason' => 'Mistake'])->assertForbidden();
        $this->assertSame('ACTIVE', GiftCredit::find($voucher['id'])->status);
    }

    public function test_another_stores_voucher_is_not_found(): void
    {
        $voucher = $this->sell();
        $otherStore = DB::table('stores')->insertGetId(['name' => 'Other', 'code' => 'OTHER', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        GiftCredit::whereKey($voucher['id'])->update(['store_id' => $otherStore]);

        $this->getJson('/api/gift-vouchers/'.$voucher['id'])->assertNotFound();
        $this->assertSame(0, $this->getJson('/api/gift-vouchers')->json('total'));
    }

    public function test_cash_for_a_voucher_goes_into_the_counters_drawer_and_a_cancel_takes_it_out(): void
    {
        $user = $this->fixture['user'];
        $session = CashRegisterSession::create(['store_id' => $this->store, 'user_id' => $user->id, 'counter_id' => $user->counter_id, 'opened_at' => now()->subMinute(),
            'opening_cash' => 1000, 'status' => 'OPEN']);
        $register = app(CashRegisterService::class);

        $cash = $this->sell(['amount' => 500, 'payment_mode' => 'CASH']);
        $this->sell(['amount' => 300, 'payment_mode' => 'UPI']);
        $position = $register->position($session->fresh());
        $this->assertEquals(500, $position['cash_sales'], 'only the cash voucher counts, not the UPI one');
        $this->assertEquals(1500, $position['expected_before_expenses']);

        $this->postJson("/api/gift-vouchers/{$cash['id']}/cancel", ['reason' => 'Refunded'])->assertOk();
        $position = $register->position($session->fresh());
        $this->assertEquals(500, $position['cash_refunds'], 'the refund leaves the drawer');
        $this->assertEquals(1000, $position['expected_before_expenses']);
    }

    public function test_nightly_posting_skips_credit_notes_and_still_posts_vouchers(): void
    {
        $voucher = $this->sell();
        DB::table('vouchers')->where('source_type', 'gift_voucher_sale')->delete();
        app(GiftCreditService::class)->issue(app('request'), $this->store, GiftCredit::CREDIT_NOTE, 90);

        $this->artisan('accounting:post')->assertSuccessful();

        $this->assertSame(-500.0, $this->books($voucher['id'])['Gift Vouchers Outstanding']);
        $this->assertSame(1, DB::table('vouchers')->where('source_type', 'gift_voucher_sale')->count());
    }
}
