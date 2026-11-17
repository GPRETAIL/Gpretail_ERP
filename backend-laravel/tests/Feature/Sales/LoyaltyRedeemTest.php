<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Models\User;
use App\Services\Approvals\ApprovalService;
use App\Services\Messaging\MessagingSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Loyalty phase 2a: points redeemed at POS (OTP or supervisor), oldest points first, books, cancel and return. */
class LoyaltyRedeemTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $store;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        $this->store = $this->fixture['store']->id;
        Sanctum::actingAs($this->fixture['user']); // admin
        DB::table('stores')->where('id', $this->store)->update(['loyalty_point_value' => 100, 'loyalty_redeem_value' => 1,
            'loyalty_redeem_min_points' => 10, 'loyalty_max_redeem_percent' => 50, 'loyalty_otp_required' => true]);
        $this->customer = Customer::create(['store_id' => $this->store, 'code' => 'LOY-1', 'name' => 'Meena', 'phone' => '9876543210', 'email' => 'meena@example.test']);
    }

    private function sale(float $amount, array $extra = []): array
    {
        $item = [...$this->fixture['items'][0], 'price' => $amount];

        return ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'customerId' => $this->customer->id, 'items' => [$item], ...$extra];
    }

    private function balance(): int
    {
        return (int) $this->customer->fresh()->loyalty_points;
    }

    private function cashier(): User
    {
        return User::create(['name' => 'TEMP Loyalty Cashier', 'username' => 'temp-loy-cashier', 'email' => 'loy-cashier@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $this->store, 'is_active' => true]);
    }

    /** Net debit (+) / credit (−) per account on a bill's voucher. */
    private function voucher(int $saleId): array
    {
        return DB::table('vouchers as v')->join('voucher_lines as l', 'l.voucher_id', '=', 'v.id')->join('ledger_accounts as a', 'a.id', '=', 'l.ledger_account_id')
            ->where('v.source_type', 'pos_sale')->where('v.source_id', $saleId)->get(['a.name', 'l.debit', 'l.credit'])
            ->groupBy('name')->map(fn ($lines) => round($lines->sum(fn ($l) => (float) $l->debit - (float) $l->credit), 2))->all();
    }

    public function test_points_are_earned_redeemed_oldest_first_and_posted_as_a_discount(): void
    {
        $this->postJson('/api/loyalty/adjust', ['customer_id' => $this->customer->id, 'points' => 50, 'reason' => 'Opening'])->assertOk();
        $this->postJson('/api/pos-sales', $this->sale(1000, ['cashAmount' => 1000]))->assertCreated();
        $this->assertSame(60, $this->balance(), '50 opening + 10 earned on ₹1,000');

        $this->getJson("/api/loyalty-redeem/quote?customer_id={$this->customer->id}&amount=200")->assertOk()
            ->assertJsonPath('data.balance', 60)->assertJsonPath('data.max_points', 60)->assertJsonPath('data.min_points', 10);
        $this->postJson('/api/pos-sales', $this->sale(200, ['cashAmount' => 195, 'loyaltyRedeem' => ['points' => 5]]))->assertUnprocessable(); // below the minimum
        $this->getJson("/api/loyalty-redeem/quote?customer_id={$this->customer->id}&amount=60")->assertJsonPath('data.max_points', 30); // 50% of ₹60

        // ₹200 bill: 40 points (₹40) + ₹160 cash. Admin at the counter needs no OTP.
        $sale = $this->postJson('/api/pos-sales', $this->sale(200, ['cashAmount' => 160, 'loyaltyRedeem' => ['points' => 40]]))
            ->assertCreated()->json('data');
        $this->assertSame(21, $this->balance(), '60 − 40 redeemed + 1 earned on the ₹160 paid in money');
        $this->assertSame(10, (int) LoyaltyTransaction::where('customer_id', $this->customer->id)->where('type', 'ADJUST_IN')->value('remaining'), 'the oldest points went first');
        $this->assertSame(10, (int) LoyaltyTransaction::where('customer_id', $this->customer->id)->where('type', 'EARN')->orderBy('id')->value('remaining'));
        $this->assertDatabaseHas('pos_payments', ['pos_sale_id' => $sale['id'], 'payment_mode' => 'LOYALTY', 'amount' => 40]);

        $books = $this->voucher($sale['id']);
        $this->assertSame(40.0, $books['Loyalty Points Redeemed']);
        $this->assertSame(160.0, $books['Cash in Hand']);
        $this->assertSame(0.0, round(array_sum($books), 2), 'the voucher balances');

        // Cancelling gives the 40 points back and takes back the 1 earned.
        $this->deleteJson('/api/pos-sales/'.$sale['id'])->assertOk();
        $this->assertSame(60, $this->balance());
        $this->assertSame(1, LoyaltyTransaction::where('pos_sale_id', $sale['id'])->where('type', 'RESTORE')->count());
    }

    public function test_a_cashier_redeems_with_the_customers_sms_otp_or_a_supervisors_approval(): void
    {
        $this->postJson('/api/loyalty/adjust', ['customer_id' => $this->customer->id, 'points' => 100, 'reason' => 'Opening'])->assertOk();
        app(MessagingSettings::class)->save($this->store, 'sms', ['enabled' => true, 'auth_key' => 'MSG91-SECRET-KEY-123', 'otp_template_id' => 'TPL1', 'sender_id' => 'SHOPPY']);
        Http::fake(['control.msg91.com/*' => Http::response(['type' => 'success', 'message' => 'queued'])]);
        Sanctum::actingAs($this->cashier());

        $this->postJson('/api/pos-sales', $this->sale(200, ['cashAmount' => 150, 'loyaltyRedeem' => ['points' => 50]]))
            ->assertStatus(428)->assertJsonPath('action', 'loyalty_redeem')->assertJsonPath('details.points', 50);

        $this->getJson("/api/loyalty-redeem/quote?customer_id={$this->customer->id}&amount=200")->assertJsonPath('data.channels.0.channel', 'sms')
            ->assertJsonPath('data.channels.0.sent_to', '******3210');
        $otp = $this->postJson('/api/loyalty-redeem/otp', ['customer_id' => $this->customer->id, 'points' => 50, 'amount' => 200])->assertOk()->json('data');
        $sent = Http::recorded()->first()[0];
        $this->assertInstanceOf(HttpRequest::class, $sent);
        $this->assertSame('MSG91-SECRET-KEY-123', $sent->header('authkey')[0]);
        $this->assertSame('TPL1', $sent['template_id']);
        $this->assertSame('919876543210', $sent['recipients'][0]['mobiles']);
        $code = $sent['recipients'][0]['otp'];
        $this->postJson('/api/loyalty-redeem/otp', ['customer_id' => $this->customer->id, 'points' => 50, 'amount' => 200])->assertUnprocessable(); // 30 s cooldown

        $this->postJson("/api/loyalty-redeem/otp/{$otp['otp_id']}/verify", ['code' => '000000'])->assertUnprocessable()->assertJsonValidationErrors('code');
        $token = $this->postJson("/api/loyalty-redeem/otp/{$otp['otp_id']}/verify", ['code' => $code])->assertOk()->json('data.token');

        $this->postJson('/api/pos-sales', $this->sale(200, ['cashAmount' => 150, 'loyaltyRedeem' => ['points' => 60, 'otpToken' => $token]]))->assertUnprocessable(); // more than approved
        $this->postJson('/api/pos-sales', $this->sale(200, ['cashAmount' => 150, 'loyaltyRedeem' => ['points' => 50, 'otpToken' => $token]]))->assertCreated();
        $this->assertSame(51, $this->balance(), '100 − 50 + 1 earned');
        $this->postJson('/api/pos-sales', $this->sale(200, ['cashAmount' => 150, 'loyaltyRedeem' => ['points' => 50, 'otpToken' => $token]]))->assertUnprocessable(); // single use

        // No OTP: a supervisor approves.
        $approvals = app(ApprovalService::class);
        $request = $approvals->createRequest(auth()->user(), $this->store, 'loyalty_redeem', ['reason_code' => 'otp_not_received', 'amount' => 20, 'payload' => ['points' => 20]]);
        $approvals->approve($request, $this->fixture['user']);
        $approvalToken = $approvals->issueToken($request->fresh());
        $this->postJson('/api/pos-sales', $this->sale(100, ['cashAmount' => 80, 'loyaltyRedeem' => ['points' => 20, 'approvalToken' => $approvalToken]]))->assertCreated();
        $this->assertSame('used', $request->fresh()->status);
    }

    public function test_returned_goods_take_back_their_points(): void
    {
        $sale = $this->postJson('/api/pos-sales', $this->sale(1000, ['cashAmount' => 1000]))->assertCreated()->json('data');
        $this->assertSame(10, $this->balance());
        $item = $this->fixture['items'][0];
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $sale['id'], 'customerId' => $this->customer->id,
            'items' => [['productId' => $item['productId'], 'variantId' => $item['variantId'], 'barcodeId' => $item['barcodeId'], 'qty' => 1, 'price' => 1000]]])->assertSuccessful();
        $this->assertSame(0, $this->balance());
        $this->assertSame(10, (int) LoyaltyTransaction::where('type', 'RETURN')->value('points'));
    }

    public function test_messaging_keys_are_masked_and_a_masked_value_never_overwrites_them(): void
    {
        $this->putJson('/api/messaging-settings/whatsapp', ['enabled' => true, 'access_token' => 'EAAG-REAL-TOKEN-1234567', 'phone_number_id' => '1098', 'otp_template' => 'otp_code', 'language' => 'en'])->assertOk();
        $shown = $this->getJson('/api/messaging-settings')->assertOk()->json('data.whatsapp');
        $this->assertStringNotContainsString('REAL-TOKEN', $shown['access_token']);
        $this->putJson('/api/messaging-settings/whatsapp', [...$shown, 'enabled' => true])->assertOk();
        $this->assertSame('EAAG-REAL-TOKEN-1234567', app(MessagingSettings::class)->channel($this->store, 'whatsapp')['secrets']['access_token']);

        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]])]);
        $this->postJson('/api/messaging-settings/whatsapp/test', ['to' => '9876543210'])->assertOk();
        $sent = Http::recorded()->first()[0];
        $this->assertStringContainsString('/1098/messages', $sent->url());
        $this->assertSame('otp_code', $sent['template']['name']);
        $this->assertSame('123456', $sent['template']['components'][0]['parameters'][0]['text']);

        Sanctum::actingAs($this->cashier());
        $this->getJson('/api/messaging-settings')->assertForbidden();
    }
}
