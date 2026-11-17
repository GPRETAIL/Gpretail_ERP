<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use App\Services\Messaging\MessagingSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Loyalty phase 2b: tiers multiply points, bonus rules add BONUS rows, the nightly job expires points and reminds. */
class LoyaltyTiersBonusesTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $store;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-11-18 06:00:00', 'UTC')); // 18 Nov, 11:30 IST
        $this->fixture = PosPerformanceFixture::create(1);
        $this->store = $this->fixture['store']->id;
        Sanctum::actingAs($this->fixture['user']);
        DB::table('stores')->where('id', $this->store)->update(['loyalty_point_value' => 100, 'loyalty_redeem_window_months' => 12]);
        $this->customer = Customer::create(['store_id' => $this->store, 'code' => 'TIER-1', 'name' => 'Lakshmi', 'phone' => '9876500000',
            'email' => 'lakshmi@example.test', 'date_of_birth' => '1990-11-05']);
    }

    private function sell(float $amount): array
    {
        $item = [...$this->fixture['items'][0], 'price' => $amount];

        return $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'customerId' => $this->customer->id,
            'cashAmount' => $amount, 'items' => [$item]])->assertCreated()->json('data');
    }

    private function balance(): int
    {
        return (int) $this->customer->fresh()->loyalty_points;
    }

    public function test_tier_multiplies_points_and_bonus_rules_add_their_own_rows(): void
    {
        $this->putJson('/api/loyalty/tiers', ['tiers' => [['name' => 'Silver', 'min_spend' => 0, 'multiplier' => 1], ['name' => 'Gold', 'min_spend' => 5000, 'multiplier' => 1.5]]])
            ->assertOk()->assertJsonCount(2, 'data');
        $this->postJson('/api/loyalty/bonus-rules', ['name' => 'Welcome', 'type' => 'first_purchase', 'points' => 50])->assertCreated();
        $this->postJson('/api/loyalty/bonus-rules', ['name' => 'Birthday month', 'type' => 'birthday', 'multiplier' => 2])->assertCreated();
        $this->postJson('/api/loyalty/bonus-rules', ['name' => 'Big bill', 'type' => 'min_bill', 'min_bill' => 4000, 'points' => 20])->assertCreated();
        $this->postJson('/api/loyalty/bonus-rules', ['name' => 'Last week', 'type' => 'date_range', 'multiplier' => 3, 'starts_on' => '2026-11-01', 'ends_on' => '2026-11-10'])->assertCreated();
        $this->postJson('/api/loyalty/bonus-rules', ['name' => 'Bad', 'type' => 'date_range', 'multiplier' => 2])->assertUnprocessable(); // dates needed

        // First bill ₹1,000 as Silver: 10 earned + 50 welcome + 10 birthday (double), no big-bill, no expired range.
        $first = $this->sell(1000);
        $this->assertSame(70, $this->balance());
        $this->assertEqualsCanonicalizing(['Welcome', 'Birthday month'], LoyaltyTransaction::where('pos_sale_id', $first['id'])->where('type', 'BONUS')->pluck('reason')->all());

        // ₹5,000 more: now Gold (₹6,000 in 12 months): 50 × 1.5 = 75, + 50 birthday + 20 big bill; no second welcome.
        $second = $this->sell(5000);
        $this->assertSame(70 + 75 + 50 + 20, $this->balance());
        $this->assertSame('Gold tier ×1.5', LoyaltyTransaction::where('pos_sale_id', $second['id'])->where('type', 'EARN')->value('reason'));
        $this->getJson("/api/loyalty-redeem/quote?customer_id={$this->customer->id}&amount=100")->assertJsonPath('data.tier.name', 'Gold');
        $this->getJson('/api/loyalty/balances')->assertJsonPath('data.0.tier', 'Gold');

        // Cancelling the second bill takes back its earned and bonus points.
        $this->deleteJson('/api/pos-sales/'.$second['id'])->assertOk();
        $this->assertSame(70, $this->balance());
    }

    public function test_the_nightly_job_expires_old_points_and_reminds_a_week_ahead(): void
    {
        config(['mail.default' => 'smtp']);
        Mail::fake();
        app(MessagingSettings::class)->save($this->store, 'email', ['enabled' => true, 'from_name' => 'Store']);
        $this->postJson('/api/loyalty/adjust', ['customer_id' => $this->customer->id, 'points' => 40, 'reason' => 'Old points'])->assertOk();
        $this->postJson('/api/loyalty/adjust', ['customer_id' => $this->customer->id, 'points' => 25, 'reason' => 'Soon'])->assertOk();
        $rows = LoyaltyTransaction::where('customer_id', $this->customer->id)->orderBy('id')->get();
        $rows[0]->update(['expires_at' => '2026-11-10']); // already past
        $rows[1]->update(['expires_at' => '2026-11-25']); // in 7 days

        $this->getJson('/api/loyalty/expiring?days=30')->assertOk()->assertJsonPath('data.0.points', 25)->assertJsonPath('data.0.expires_at', '2026-11-25');
        $this->artisan('loyalty:expire', ['--store' => $this->store])
            ->expectsOutputToContain('40 point(s) expired for 1 customer(s), 1 reminder(s) sent')->assertSuccessful();

        $this->assertSame(25, $this->balance());
        $this->assertSame(25, (int) LoyaltyTransaction::where('reason', 'Soon')->value('remaining'), 'points not yet due are untouched');
        $this->assertSame(40, (int) LoyaltyTransaction::where('customer_id', $this->customer->id)->where('type', 'EXPIRE')->value('points'));
        $this->artisan('loyalty:expire', ['--store' => $this->store])->assertSuccessful();
        $this->assertSame(1, LoyaltyTransaction::where('type', 'EXPIRE')->count(), 'nothing expires twice');
    }
}
