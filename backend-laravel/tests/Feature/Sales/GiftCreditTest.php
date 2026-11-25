<?php

namespace Tests\Feature\Sales;

use App\Models\GiftCredit;
use App\Services\Sales\GiftCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Credit notes, gift vouchers and coupons: one engine. A bill uses them as a payment, in parts, and cancelling gives them back. */
class GiftCreditTest extends TestCase
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

    private function note(float $amount, string $kind = GiftCredit::CREDIT_NOTE, array $attributes = []): GiftCredit
    {
        return app(GiftCreditService::class)->issue(app('request'), $this->store, $kind, $amount, $attributes);
    }

    private function shortNo(GiftCredit $credit): string
    {
        return app(GiftCreditService::class)->displayNumber($credit);
    }

    private function sale(float $amount, array $extra = []): array
    {
        $item = [...$this->fixture['items'][0], 'price' => $amount];

        return ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'items' => [$item], ...$extra];
    }

    /** Net debit (+) / credit (−) per account on a document's voucher. */
    private function voucher(string $type, int $id): array
    {
        return DB::table('vouchers as v')->join('voucher_lines as l', 'l.voucher_id', '=', 'v.id')->join('ledger_accounts as a', 'a.id', '=', 'l.ledger_account_id')
            ->where('v.source_type', $type)->where('v.source_id', $id)->get(['a.name', 'l.debit', 'l.credit'])
            ->groupBy('name')->map(fn ($lines) => round($lines->sum(fn ($l) => (float) $l->debit - (float) $l->credit), 2))->all();
    }

    public function test_a_return_refunded_as_a_credit_note_gets_a_number_a_balance_and_an_expiry(): void
    {
        $item = $this->fixture['items'][0];
        $return = $this->postJson('/api/pos-returns', ['standalone' => true, 'refundMode' => 'CREDIT_NOTE',
            'items' => [['productId' => $item['productId'], 'qty' => 2, 'price' => 100, 'tax' => 5]]])->assertCreated()->json('data');

        $this->assertSame('CREDIT_NOTE', $return['refund_mode']);
        $this->assertEquals(210, $return['credit_note']['amount']);
        $this->assertSame(now(config('app.business_timezone'))->addDays(90)->toDateString(), $return['credit_note']['expires_on'], 'ninety days unless the store chose otherwise');
        $this->assertMatchesRegularExpression('/^CN\d{6}-C?\d+$/', $return['credit_note']['display_number']);
        $note = GiftCredit::where('number', $return['credit_note']['number'])->firstOrFail();
        $this->assertSame([GiftCredit::CREDIT_NOTE, 210.0, 210.0, 'ACTIVE', $return['id']], [$note->kind, (float) $note->original_amount, (float) $note->balance, $note->status, $note->source_pos_return_id]);

        $books = $this->voucher('pos_return', $return['id']);
        $this->assertSame(-210.0, $books['Return Credit Notes'], 'the store owes the customer until the note is used');
        $this->assertSame(0.0, round(array_sum($books), 2));

        // A cash refund makes no note.
        $this->postJson('/api/pos-returns', ['standalone' => true, 'items' => [['productId' => $item['productId'], 'qty' => 1, 'price' => 100, 'tax' => 0]]])
            ->assertCreated()->assertJsonPath('data.credit_note', null);
        $this->assertSame(1, GiftCredit::count());
    }

    public function test_a_credit_note_can_be_used_in_parts_across_bills_and_clears_the_liability(): void
    {
        $note = $this->note(210);

        $first = $this->postJson('/api/pos-sales', $this->sale(100, ['cashAmount' => 40, 'vouchers' => [['number' => $this->shortNo($note), 'amount' => 60]]]))
            ->assertCreated()->json('data');
        $this->assertSame(150.0, (float) $note->fresh()->balance);
        $this->assertSame('CASH', $first['payment_mode']);
        $this->assertSame('PAID', $first['status']);
        $this->assertDatabaseHas('pos_payments', ['pos_sale_id' => $first['id'], 'payment_mode' => 'CREDIT_NOTE', 'amount' => 60, 'reference_no' => $note->number]);
        $this->assertEquals([['number' => $note->number, 'display_number' => $this->shortNo($note), 'kind' => 'CREDIT_NOTE', 'amount' => 60, 'balance_after' => 150]],
            $first['vouchers'], 'the receipt gets what was used and what is left');

        $second = $this->postJson('/api/pos-sales', $this->sale(100, ['vouchers' => [['number' => $note->number, 'amount' => 100]]]))->assertCreated()->json('data');
        $this->assertSame('CREDIT_NOTE', $second['payment_mode'], 'a bill paid only by a note is not labelled loyalty');
        $this->assertSame('PAID', $second['status']);
        $this->assertSame(50.0, (float) $note->fresh()->balance);
        $this->assertSame('ACTIVE', $note->fresh()->status);

        $books = $this->voucher('pos_sale', $second['id']);
        $this->assertSame(100.0, $books['Return Credit Notes'], 'using the note clears what the store owed');
        $this->assertSame(0.0, round(array_sum($books), 2), 'the voucher balances');
        $this->assertSame(0.0, (float) DB::table('pos_payments')->where('pos_sale_id', $second['id'])->where('payment_mode', 'CASH')->sum('amount'), 'a note never enters the drawer');

        $this->postJson('/api/pos-sales', $this->sale(50, ['vouchers' => [['number' => $note->number, 'amount' => 50]]]))->assertCreated();
        $this->assertSame('USED', $note->fresh()->status, 'nothing left');
    }

    public function test_it_refuses_wrong_amounts_and_codes_that_cannot_be_used(): void
    {
        $note = $this->note(100);
        $over = fn (float $amount, float $bill = 500) => $this->postJson('/api/pos-sales', $this->sale($bill, ['cashAmount' => $bill, 'vouchers' => [['number' => $note->number, 'amount' => $amount]]]));

        $over(150)->assertUnprocessable()->assertJsonValidationErrors(['vouchers.0.amount']);
        $this->postJson('/api/pos-sales', $this->sale(80, ['vouchers' => [['number' => $note->number, 'amount' => 90]]]))->assertUnprocessable()
            ->assertJsonValidationErrors(['vouchers.0.amount' => 'The bill needs only ₹80.00 more.']);
        $this->postJson('/api/pos-sales', $this->sale(80, ['vouchers' => [['number' => 'CN260101-0099', 'amount' => 10]]]))->assertUnprocessable()
            ->assertJsonValidationErrors(['vouchers.0.number' => 'This code was not found. Check the number and try again.']);
        $this->postJson('/api/pos-sales', $this->sale(80, ['vouchers' => [['number' => $note->number, 'amount' => 10], ['number' => $this->shortNo($note), 'amount' => 10]]]))
            ->assertUnprocessable()->assertJsonValidationErrors(['vouchers.1.number' => 'The same code is on this bill twice.']);

        $note->forceFill(['expires_on' => now()->subDay()->toDateString()])->save();
        $this->postJson('/api/pos-sales', $this->sale(80, ['cashAmount' => 20, 'vouchers' => [['number' => $note->number, 'amount' => 60]]]))->assertUnprocessable()
            ->assertJsonValidationErrors(['vouchers.0.number' => 'This credit note expired on '.now()->subDay()->format('d M Y').'.']);
        $note->forceFill(['expires_on' => null, 'status' => 'USED', 'balance' => 0])->save();
        $this->postJson('/api/pos-sales', $this->sale(80, ['vouchers' => [['number' => $note->number, 'amount' => 60]]]))->assertUnprocessable()
            ->assertJsonValidationErrors(['vouchers.0.number' => 'This credit note is already used.']);
        $this->assertSame(0, DB::table('pos_sales')->count(), 'a refused bill leaves nothing behind');
    }

    public function test_the_same_bill_sent_twice_uses_the_credit_once(): void
    {
        $note = $this->note(100);
        $payload = $this->sale(100, ['vouchers' => [['number' => $note->number, 'amount' => 100]]]);

        $this->postJson('/api/pos-sales', $payload)->assertCreated();
        $this->postJson('/api/pos-sales', $payload)->assertCreated()->assertHeader('X-Pos-Checkout-Replayed', '1');

        $this->assertSame(0.0, (float) $note->fresh()->balance);
        $this->assertSame(1, DB::table('gift_credit_redemptions')->count());
        $this->assertSame(1, DB::table('pos_sales')->count());
    }

    public function test_cancelling_the_bill_gives_the_credit_back(): void
    {
        $note = $this->note(100);
        $sale = $this->postJson('/api/pos-sales', $this->sale(100, ['vouchers' => [['number' => $note->number, 'amount' => 100]]]))->assertCreated()->json('data');
        $this->assertSame('USED', $note->fresh()->status);

        $this->deleteJson('/api/pos-sales/'.$sale['id'])->assertOk();

        $this->assertSame([100.0, 'ACTIVE'], [(float) $note->fresh()->balance, $note->fresh()->status]);
        $this->assertNotNull(DB::table('gift_credit_redemptions')->where('pos_sale_id', $sale['id'])->value('reversed_at'), 'the use is kept, marked reversed');
        // It can be used again.
        $this->postJson('/api/pos-sales', $this->sale(100, ['vouchers' => [['number' => $note->number, 'amount' => 100]]]))->assertCreated();
    }

    public function test_a_coupon_is_used_whole_once_and_only_on_a_big_enough_bill(): void
    {
        $coupon = $this->note(50, GiftCredit::COUPON, ['min_bill_amount' => 200, 'expires_on' => now()->addDays(30)->toDateString()]);

        $this->postJson('/api/pos-sales', $this->sale(150, ['cashAmount' => 150, 'vouchers' => [['number' => $coupon->number]]]))->assertUnprocessable()
            ->assertJsonValidationErrors(['vouchers.0.number' => 'This coupon needs a bill of at least ₹200.00.']);

        $sale = $this->postJson('/api/pos-sales', $this->sale(300, ['cashAmount' => 250, 'vouchers' => [['number' => $this->shortNo($coupon)]]]))->assertCreated()->json('data');
        $this->assertDatabaseHas('pos_payments', ['pos_sale_id' => $sale['id'], 'payment_mode' => 'COUPON', 'amount' => 50]);
        $this->assertSame(['USED', 0.0], [$coupon->fresh()->status, (float) $coupon->fresh()->balance]);
        $this->assertSame(50.0, $this->voucher('pos_sale', $sale['id'])['Coupon Discounts'], 'a coupon is a discount the store carries');

        $this->postJson('/api/pos-sales', $this->sale(300, ['cashAmount' => 250, 'vouchers' => [['number' => $coupon->number]]]))->assertUnprocessable();

        $this->deleteJson('/api/pos-sales/'.$sale['id'])->assertOk();
        $this->assertSame(['ACTIVE', 50.0], [$coupon->fresh()->status, (float) $coupon->fresh()->balance]);
    }

    public function test_the_till_can_ask_what_a_code_is_worth_by_its_short_or_full_number(): void
    {
        $note = $this->note(80);

        $this->getJson('/api/gift-credits/lookup?number='.$this->shortNo($note).'&bill_total=500&due=50')->assertOk()
            ->assertJsonPath('data.number', $note->number)->assertJsonPath('data.balance', 80)->assertJsonPath('data.max_use', 50)
            ->assertJsonPath('data.kind', 'CREDIT_NOTE')->assertJsonPath('data.single_use', false);
        $this->getJson('/api/gift-credits/lookup?number='.$note->number.'&bill_total=500&due=500')->assertOk()->assertJsonPath('data.max_use', 80);
        $this->getJson('/api/gift-credits/lookup?number=CN260101-0099&bill_total=500&due=500')->assertUnprocessable()
            ->assertJsonValidationErrors(['number' => 'This code was not found. Check the number and try again.']);
    }

    public function test_another_stores_code_is_not_found(): void
    {
        $other = DB::table('stores')->insertGetId(['name' => 'TEMP Other Store', 'code' => 'TEMP-OTHER', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('gift_credits')->insert(['store_id' => $other, 'kind' => 'CREDIT_NOTE', 'number' => 'CRN-TEMP-OTHER-20261125-0001', 'issued_on' => now()->toDateString(),
            'original_amount' => 100, 'balance' => 100, 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()]);

        $this->getJson('/api/gift-credits/lookup?number=CRN-TEMP-OTHER-20261125-0001&bill_total=100&due=100')->assertUnprocessable();
        $this->getJson('/api/gift-credits/lookup?number=CN261125-0001&bill_total=100&due=100')->assertUnprocessable();
        $this->postJson('/api/pos-sales', $this->sale(100, ['vouchers' => [['number' => 'CRN-TEMP-OTHER-20261125-0001', 'amount' => 100]]]))->assertUnprocessable();
        $this->assertSame(100.0, (float) DB::table('gift_credits')->where('store_id', $other)->value('balance'));
    }

    public function test_a_return_that_became_a_credit_note_cannot_also_be_used_as_a_plain_return_credit(): void
    {
        $item = $this->fixture['items'][0];
        $return = $this->postJson('/api/pos-returns', ['standalone' => true, 'refundMode' => 'CREDIT_NOTE',
            'items' => [['productId' => $item['productId'], 'qty' => 1, 'price' => 100, 'tax' => 0]]])->assertCreated()->json('data');

        $this->getJson('/api/pos-returns/credit-return?returnNo=RR/'.$return['id'])->assertUnprocessable();
        $this->postJson('/api/pos-sales', $this->sale(100, ['cashAmount' => 100, 'appliedPosReturnId' => $return['id']]))->assertUnprocessable()
            ->assertJsonValidationErrors(['appliedPosReturnId' => 'This return was issued as a credit note. Use the credit note number instead.']);
    }

    public function test_the_expiry_days_follow_the_store_setting(): void
    {
        DB::table('stores')->where('id', $this->store)->update(['receipt_customization' => json_encode(['creditNoteExpiryDays' => 10])]);
        $this->assertSame(now(config('app.business_timezone'))->addDays(10)->toDateString(), $this->note(10)->expires_on->toDateString());

        DB::table('stores')->where('id', $this->store)->update(['receipt_customization' => json_encode(['creditNoteExpiryDays' => 0])]);
        $this->assertNull($this->note(10)->expires_on, '0 means it never expires');
    }

    public function test_the_issue_report_lists_vouchers_and_notes_with_what_was_used_and_what_is_left(): void
    {
        $note = $this->note(200);
        $coupon = $this->note(50, GiftCredit::COUPON);
        $this->postJson('/api/pos-sales', $this->sale(100, ['cashAmount' => 40, 'vouchers' => [['number' => $note->number, 'amount' => 60]]]))->assertCreated();

        $rows = $this->getJson('/api/sales-reports/store/gift_credit_issues')->assertOk()->json('data');

        $this->assertCount(1, $rows, 'coupons have their own pages');
        $this->assertEquals(['Credit note', $this->shortNo($note), 200, 60, 140, 'Active'], [$rows[0]['type'], $rows[0]['number'], $rows[0]['amount'], $rows[0]['used'], $rows[0]['balance'], $rows[0]['status']]);
        $this->assertSame(now(config('app.business_timezone'))->addDays(90)->toDateString(), $rows[0]['expires_on']);

        $note->forceFill(['expires_on' => now()->subDay()->toDateString()])->save();
        $this->assertSame('Expired', $this->getJson('/api/sales-reports/store/gift_credit_issues')->json('data.0.status'));
        $note->forceFill(['status' => 'CANCELLED'])->save();
        $row = $this->getJson('/api/sales-reports/store/gift_credit_issues')->json('data.0');
        $this->assertEquals(['Cancelled', 0, 0], [$row['status'], $row['balance'], $row['used']]);
        $this->assertNotNull($coupon->id);
    }

    public function test_the_use_report_lists_each_use_on_a_bill_and_drops_a_cancelled_bills(): void
    {
        $note = $this->note(200);
        $first = $this->postJson('/api/pos-sales', $this->sale(100, ['vouchers' => [['number' => $note->number, 'amount' => 70]], 'cashAmount' => 30]))->assertCreated()->json('data');
        $second = $this->postJson('/api/pos-sales', $this->sale(100, ['vouchers' => [['number' => $note->number, 'amount' => 50]], 'cashAmount' => 50]))->assertCreated()->json('data');

        $rows = $this->getJson('/api/sales-reports/store/gift_credit_uses')->assertOk()->json('data');
        $this->assertCount(2, $rows);
        $this->assertEquals([50, $second['bill_no'], 80, 'Credit note'], [$rows[0]['amount'], $rows[0]['bill_no'], $rows[0]['balance'], $rows[0]['type']]);

        $this->deleteJson('/api/pos-sales/'.$second['id'])->assertOk();
        $rows = $this->getJson('/api/sales-reports/store/gift_credit_uses')->json('data');
        $this->assertCount(1, $rows);
        $this->assertEquals([70, $first['bill_no'], 130], [$rows[0]['amount'], $rows[0]['bill_no'], $rows[0]['balance']]);
    }

    public function test_another_stores_vouchers_are_not_in_the_reports(): void
    {
        $other = DB::table('stores')->insertGetId(['name' => 'TEMP Other Store', 'code' => 'TEMP-OTHER', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('gift_credits')->insert(['store_id' => $other, 'kind' => 'GIFT_VOUCHER', 'number' => 'GVC-TEMP-OTHER-20261125-0001', 'issued_on' => now()->toDateString(),
            'original_amount' => 500, 'balance' => 500, 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()]);

        $this->assertSame([], $this->getJson('/api/sales-reports/store/gift_credit_issues')->assertOk()->json('data'));
    }
}
