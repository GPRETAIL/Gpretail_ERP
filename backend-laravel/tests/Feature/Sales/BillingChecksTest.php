<?php

namespace Tests\Feature\Sales;

use App\Models\CashRegisterSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** A POS bill needs the cashier's counter, and (Sales Customisation: off, warn (default) or block) that counter's cash opened first. */
class BillingChecksTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        config(['pos.billing_checks' => true]); // switched off for the rest of the suite
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
    }

    private function sale(): array
    {
        return ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100, 'items' => [$this->fixture['items'][0]]];
    }

    private function mode(string $mode): void
    {
        DB::table('stores')->where('id', $this->fixture['store']->id)->update(['receipt_customization' => json_encode(['cashOpeningCheck' => $mode])]);
    }

    private function openCash(): void
    {
        CashRegisterSession::create(['store_id' => $this->fixture['store']->id, 'user_id' => $this->fixture['user']->id, 'counter_id' => $this->fixture['user']->counter_id,
            'opened_at' => now(), 'opening_cash' => 500, 'status' => 'OPEN']);
    }

    public function test_by_default_a_closed_counter_only_warns_and_billing_still_works(): void
    {
        $status = $this->getJson('/api/cash-openings/billing-status')->assertOk()->json('data');
        $this->assertSame('warn', $status['cash_check']);
        $this->assertNull($status['block']);
        $this->assertSame('CASH_NOT_OPENED', $status['warning']['code']);
        $this->assertStringContainsString('TEMP Performance Till', $status['warning']['message']);
        $this->postJson('/api/pos-sales', $this->sale())->assertCreated();

        $this->openCash();
        $this->getJson('/api/cash-openings/billing-status')->assertJsonPath('data.warning', null)->assertJsonPath('data.block', null);
    }

    public function test_block_refuses_a_bill_until_the_cash_is_opened(): void
    {
        $this->mode('block');
        $this->getJson('/api/cash-openings/billing-status')->assertOk()->assertJsonPath('data.block.code', 'CASH_NOT_OPENED')
            ->assertJsonPath('data.warning', null)->assertJsonPath('data.cash_required', true)->assertJsonPath('data.counter_name', 'TEMP Performance Till');
        $this->postJson('/api/pos-sales', $this->sale())->assertUnprocessable()->assertJsonPath('code', 'CASH_NOT_OPENED')
            ->assertJsonPath('message', 'Open the cash for TEMP Performance Till (Sales > Cash Opening) before billing.');

        $this->openCash();
        $this->getJson('/api/cash-openings/billing-status')->assertJsonPath('data.block', null);
        $this->postJson('/api/pos-sales', $this->sale())->assertCreated();
    }

    public function test_off_says_nothing_and_the_old_yes_no_setting_still_counts(): void
    {
        $this->mode('off');
        $this->getJson('/api/cash-openings/billing-status')->assertJsonPath('data.cash_check', 'off')->assertJsonPath('data.warning', null)->assertJsonPath('data.block', null);
        $this->postJson('/api/pos-sales', $this->sale())->assertCreated();

        // A store that only ever switched the old setting off stays off; one that left it on gets the new default.
        DB::table('stores')->where('id', $this->fixture['store']->id)->update(['receipt_customization' => json_encode(['requireCashOpening' => false])]);
        $this->getJson('/api/cash-openings/billing-status')->assertJsonPath('data.cash_check', 'off');
        DB::table('stores')->where('id', $this->fixture['store']->id)->update(['receipt_customization' => json_encode(['requireCashOpening' => true])]);
        $this->getJson('/api/cash-openings/billing-status')->assertJsonPath('data.cash_check', 'warn');
    }

    public function test_the_choice_is_saved_in_sales_customisation_and_a_bad_value_is_ignored(): void
    {
        $store = $this->fixture['store']->id;
        $this->postJson('/api/sales-customization', ['companyId' => $store, 'settingsSection' => 'sales', 'cashOpeningCheck' => 'block'])->assertOk();
        $this->getJson('/api/cash-openings/billing-status')->assertJsonPath('data.cash_check', 'block');
        $this->postJson('/api/sales-customization', ['companyId' => $store, 'settingsSection' => 'sales', 'cashOpeningCheck' => 'sometimes'])->assertOk();
        $this->getJson('/api/cash-openings/billing-status')->assertJsonPath('data.cash_check', 'block'); // The bad value changed nothing.
    }

    public function test_a_bill_always_needs_a_counter(): void
    {
        $this->mode('off');
        Sanctum::actingAs(User::create(['name' => 'TEMP No Counter', 'username' => 'temp-no-counter', 'email' => 'no-counter@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $this->fixture['store']->id, 'is_active' => true]));
        $this->postJson('/api/pos-sales', $this->sale())->assertUnprocessable()->assertJsonPath('code', 'COUNTER_REQUIRED');
    }
}
