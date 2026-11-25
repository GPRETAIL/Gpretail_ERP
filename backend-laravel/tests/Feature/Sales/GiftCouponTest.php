<?php

namespace Tests\Feature\Sales;

use App\Models\GiftCredit;
use App\Models\User;
use App\Services\Sales\GiftCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Coupons: earned when a bill is settled (the store's rule), printed on the receipt, used whole on a later bill. */
class GiftCouponTest extends TestCase
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

    private function rule(array $rule): void
    {
        $this->postJson('/api/sales-customization', ['companyId' => $this->store, 'settingsSection' => 'sales', 'couponRule' => $rule])->assertOk();
    }

    private function sale(float $amount, array $extra = []): array
    {
        $item = [...$this->fixture['items'][0], 'price' => $amount];

        return ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => $amount, 'items' => [$item], ...$extra];
    }

    private function bill(float $amount, array $extra = []): array
    {
        return $this->postJson('/api/pos-sales', $this->sale($amount, $extra))->assertCreated()->json('data');
    }

    public function test_the_rule_is_saved_inside_its_ranges_and_missing_parts_fall_back_to_the_default(): void
    {
        $this->rule(['enabled' => true, 'minBill' => 2000, 'valueType' => 'percent', 'value' => 500, 'maxValue' => 300, 'validDays' => 99999, 'redeemMinBill' => -5]);
        $saved = app(GiftCreditService::class)->couponRule($this->store);
        $this->assertSame(['enabled' => true, 'minBill' => 2000.0, 'valueType' => 'percent', 'value' => 100.0, 'maxValue' => 300.0, 'validDays' => 3650, 'redeemMinBill' => 0.0], $saved);

        $this->rule(['enabled' => 'yes', 'valueType' => 'bogus', 'minBill' => 'lots']);
        $saved = app(GiftCreditService::class)->couponRule($this->store);
        $this->assertSame([true, 'amount', 1000.0], [$saved['enabled'], $saved['valueType'], $saved['minBill']]);
    }

    public function test_a_bill_over_the_minimum_earns_a_coupon_that_is_on_the_receipt(): void
    {
        $this->rule(['enabled' => true, 'minBill' => 1000, 'valueType' => 'amount', 'value' => 100, 'validDays' => 30, 'redeemMinBill' => 500]);

        $bill = $this->bill(1200);

        $this->assertCount(1, $bill['coupons_issued']);
        $coupon = GiftCredit::where('source_pos_sale_id', $bill['id'])->firstOrFail();
        $this->assertSame([GiftCredit::COUPON, 100.0, 100.0, 'ACTIVE', 500.0], [$coupon->kind, (float) $coupon->original_amount, (float) $coupon->balance, $coupon->status, (float) $coupon->min_bill_amount]);
        $this->assertSame(now(config('app.business_timezone'))->addDays(30)->toDateString(), $coupon->expires_on->toDateString());
        $this->assertEquals(['number' => $coupon->number, 'display_number' => app(GiftCreditService::class)->displayNumber($coupon), 'amount' => 100, 'expires_on' => $coupon->expires_on->toDateString(), 'min_bill_amount' => 500],
            $bill['coupons_issued'][0]);
        $this->assertMatchesRegularExpression('/^CP\d{6}-C?\d+$/', $bill['coupons_issued'][0]['display_number']);
        $this->assertSame(0, DB::table('vouchers')->where('source_type', 'gift_voucher_sale')->count(), 'a coupon posts nothing until it is used');
    }

    public function test_no_coupon_when_off_below_the_minimum_or_when_the_bill_is_not_paid(): void
    {
        $this->bill(2000);
        $this->assertSame(0, GiftCredit::count(), 'the rule is off by default');

        $this->rule(['enabled' => true, 'minBill' => 1000, 'value' => 100]);
        $this->assertSame([], $this->bill(999)['coupons_issued']);
        $this->assertSame(0, GiftCredit::count());

        $item = [...$this->fixture['items'][0], 'price' => 2000];
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 500, 'items' => [$item]])->assertUnprocessable();
        $this->assertSame(0, GiftCredit::count(), 'a refused bill earns nothing');
    }

    public function test_a_percent_coupon_is_capped(): void
    {
        $this->rule(['enabled' => true, 'minBill' => 1000, 'valueType' => 'percent', 'value' => 10, 'maxValue' => 150, 'validDays' => 0]);

        $small = $this->bill(1000);
        $big = $this->bill(5000);

        $this->assertEquals(100, $small['coupons_issued'][0]['amount']);
        $this->assertEquals(150, $big['coupons_issued'][0]['amount'], 'ten percent would be 500, the cap is 150');
        $this->assertNull($big['coupons_issued'][0]['expires_on'], 'zero days never expires');
    }

    public function test_a_coupon_pays_a_later_bill_whole_and_that_bill_does_not_earn_another(): void
    {
        $this->rule(['enabled' => true, 'minBill' => 1000, 'value' => 100]);
        $first = $this->bill(1500);
        $coupon = GiftCredit::where('source_pos_sale_id', $first['id'])->firstOrFail();

        $second = $this->postJson('/api/pos-sales', $this->sale(1000, ['cashAmount' => 900, 'vouchers' => [['number' => $coupon->number, 'amount' => 100]]]))->assertCreated()->json('data');

        $this->assertSame('USED', $coupon->fresh()->status);
        $this->assertSame([], $second['coupons_issued'], 'a bill of 1000 less the 100 coupon is under the 1000 minimum');
        $this->assertSame(1, GiftCredit::count());

        $third = $this->bill(1100, ['cashAmount' => 1100]);
        $this->assertCount(1, $third['coupons_issued']);
    }

    public function test_cancelling_the_bill_cancels_an_unused_coupon_but_not_one_already_used(): void
    {
        $this->rule(['enabled' => true, 'minBill' => 1000, 'value' => 100]);
        $unused = $this->bill(1500);
        $used = $this->bill(1500);
        $usedCoupon = GiftCredit::where('source_pos_sale_id', $used['id'])->firstOrFail();
        $this->postJson('/api/pos-sales', $this->sale(300, ['cashAmount' => 200, 'vouchers' => [['number' => $usedCoupon->number, 'amount' => 100]]]))->assertCreated();

        $this->deleteJson('/api/pos-sales/'.$unused['id'])->assertOk();
        $this->deleteJson('/api/pos-sales/'.$used['id'])->assertOk();

        $this->assertSame('CANCELLED', GiftCredit::where('source_pos_sale_id', $unused['id'])->value('status'));
        $this->assertSame('USED', $usedCoupon->fresh()->status, 'it was spent on another bill, so it stays');
    }

    public function test_a_supervisor_gives_a_coupon_by_hand_and_the_list_shows_it_with_the_reason(): void
    {
        $this->rule(['enabled' => true, 'minBill' => 1000, 'value' => 100, 'validDays' => 45]);
        $made = $this->postJson('/api/gift-coupons', ['amount' => 250, 'buyer_name' => 'Meena', 'buyer_phone' => '9876500001', 'reason' => 'Late delivery'])
            ->assertCreated()->json('data');

        $this->assertSame('MANUAL', $made['source']);
        $this->assertSame('Late delivery', $made['reason']);
        $this->assertSame(now(config('app.business_timezone'))->addDays(45)->toDateString(), $made['expires_on'], 'the rule sets the days when none are given');
        $this->bill(1500);

        $list = $this->getJson('/api/gift-coupons')->assertOk();
        $list->assertJsonPath('total', 2);
        $this->assertEquals(350, $list->json('outstanding'));
        $this->assertSame([$made['id']], collect($this->getJson('/api/gift-coupons?search=9876500001')->json('data'))->pluck('id')->all());
        $this->getJson('/api/gift-coupons/'.$made['id'])->assertOk()->assertJsonPath('data.amount', 250);
        $this->postJson('/api/gift-coupons', ['amount' => 100])->assertUnprocessable()->assertJsonValidationErrors(['reason' => 'Say why the coupon is given.']);
    }

    public function test_only_a_supervisor_gives_or_cancels_and_a_used_coupon_cannot_be_cancelled(): void
    {
        $made = $this->postJson('/api/gift-coupons', ['amount' => 100, 'reason' => 'Goodwill'])->assertCreated()->json('data');
        $cashier = User::create(['name' => 'Till Cashier', 'username' => 'till-cashier', 'email' => 'till-cashier@example.test', 'password' => 'secret123',
            'role' => 'cashier', 'store_id' => $this->store, 'is_active' => true]);
        Sanctum::actingAs($cashier);
        $this->postJson('/api/gift-coupons', ['amount' => 100, 'reason' => 'Goodwill'])->assertForbidden();
        $this->postJson("/api/gift-coupons/{$made['id']}/cancel", ['reason' => 'x'])->assertForbidden();

        Sanctum::actingAs($this->fixture['user']);
        $this->postJson('/api/pos-sales', $this->sale(300, ['cashAmount' => 200, 'vouchers' => [['number' => $made['number'], 'amount' => 100]]]))->assertCreated();
        $this->postJson("/api/gift-coupons/{$made['id']}/cancel", ['reason' => 'Mistake'])->assertUnprocessable()
            ->assertJsonPath('message', 'This coupon has been used on a bill, so it cannot be cancelled.');

        $fresh = $this->postJson('/api/gift-coupons', ['amount' => 100, 'reason' => 'Goodwill'])->assertCreated()->json('data');
        $this->postJson("/api/gift-coupons/{$fresh['id']}/cancel", ['reason' => 'Wrong customer'])->assertOk()->assertJsonPath('data.state', 'CANCELLED');
    }

    public function test_the_issue_and_use_reports_list_coupons_only(): void
    {
        $this->rule(['enabled' => true, 'minBill' => 1000, 'value' => 100]);
        $bill = $this->bill(1500);
        $coupon = GiftCredit::where('source_pos_sale_id', $bill['id'])->firstOrFail();
        app(GiftCreditService::class)->issue(app('request'), $this->store, GiftCredit::CREDIT_NOTE, 80);
        $this->postJson('/api/pos-sales', $this->sale(300, ['cashAmount' => 200, 'vouchers' => [['number' => $coupon->number, 'amount' => 100]]]))->assertCreated();

        $issues = $this->getJson('/api/sales-reports/store/coupon_issues')->assertOk()->json('data');
        $this->assertCount(1, $issues);
        $this->assertSame(['Coupon', 'Used', 100.0], [$issues[0]['type'], $issues[0]['status'], (float) $issues[0]['amount']]);
        $uses = $this->getJson('/api/sales-reports/store/coupon_uses')->assertOk()->json('data');
        $this->assertCount(1, $uses);
        $this->assertSame(['Coupon', 100.0], [$uses[0]['type'], (float) $uses[0]['amount']]);
    }
}
