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

/** A POS bill needs the cashier's counter, and (Sales Customisation, on by default) that counter's cash opened first. */
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

    public function test_a_bill_needs_a_counter_and_its_cash_opened(): void
    {
        $store = $this->fixture['store']->id;
        $this->getJson('/api/cash-openings/billing-status')->assertOk()->assertJsonPath('data.block.code', 'CASH_NOT_OPENED')
            ->assertJsonPath('data.counter_name', 'TEMP Performance Till');
        $this->postJson('/api/pos-sales', $this->sale())->assertUnprocessable()->assertJsonPath('code', 'CASH_NOT_OPENED')
            ->assertJsonPath('message', 'Open the cash for TEMP Performance Till (Sales > Cash Opening) before billing.');

        CashRegisterSession::create(['store_id' => $store, 'user_id' => $this->fixture['user']->id, 'counter_id' => $this->fixture['user']->counter_id,
            'opened_at' => now(), 'opening_cash' => 500, 'status' => 'OPEN']);
        $this->getJson('/api/cash-openings/billing-status')->assertJsonPath('data.block', null);
        $this->postJson('/api/pos-sales', $this->sale())->assertCreated();

        // No counter: refused whatever the cash.
        Sanctum::actingAs(User::create(['name' => 'TEMP No Counter', 'username' => 'temp-no-counter', 'email' => 'no-counter@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $store, 'is_active' => true]));
        $this->postJson('/api/pos-sales', $this->sale())->assertUnprocessable()->assertJsonPath('code', 'COUNTER_REQUIRED');
    }

    public function test_cash_opening_can_be_switched_off_in_sales_customisation(): void
    {
        DB::table('stores')->where('id', $this->fixture['store']->id)->update(['receipt_customization' => json_encode(['requireCashOpening' => false])]);
        $this->getJson('/api/cash-openings/billing-status')->assertJsonPath('data.cash_required', false)->assertJsonPath('data.block', null);
        $this->postJson('/api/pos-sales', $this->sale())->assertCreated();
    }
}
