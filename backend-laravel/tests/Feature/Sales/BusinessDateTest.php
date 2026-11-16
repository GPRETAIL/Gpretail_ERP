<?php

namespace Tests\Feature\Sales;

use App\Models\Employee;
use App\Models\PosSale;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Store;
use App\Models\SystemConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Sales Customisation > Billing date after cash closing: late bills go on the next business date, and its cash count. */
class BusinessDateTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private User $user;

    private Product $product;

    private SystemConfiguration $counter;

    private Employee $cashier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'Coffee', 'code' => 'COFFEE', 'is_active' => true]);
        $this->counter = SystemConfiguration::create(['store_id' => $this->store->id, 'key' => 'counter', 'value' => 'Till One', 'is_active' => true]);
        $this->user = User::create(['name' => 'Manager', 'username' => 'manager', 'email' => 'manager@example.test', 'password' => 'secret123',
            'role' => 'admin', 'store_id' => $this->store->id, 'is_active' => true, 'counter_id' => $this->counter->id]);
        $this->product = Product::create(['company_id' => $this->store->id, 'name' => 'Coffee', 'code' => 'P1', 'selling_price' => 100, 'is_active' => true]);
        Stock::create(['store_id' => $this->store->id, 'product_id' => $this->product->id, 'quantity' => 100, 'available_quantity' => 100]);
        $this->cashier = Employee::create(['store_id' => $this->store->id, 'code' => 'E1', 'name' => 'Kavya', 'is_active' => true]);
        Sanctum::actingAs($this->user);
        $this->withHeader('X-Store-Id', (string) $this->store->id);
    }

    /** Shop time (India). */
    private function at(string $localTime): void
    {
        $this->travelTo(Carbon::parse($localTime, 'Asia/Kolkata'));
    }

    private function mode(string $mode): void
    {
        $this->store->forceFill(['receipt_customization' => ['billingDateAfterClosing' => $mode]])->save();
    }

    private function sale(): PosSale
    {
        $id = $this->postJson('/api/pos-sales', ['saleSaveAs' => 'paid_settled', 'cashAmount' => 100,
            'items' => [['productId' => $this->product->id, 'qty' => 1, 'price' => 100]]])->assertSuccessful()->json('data.id');

        return PosSale::findOrFail($id);
    }

    private function open(): void
    {
        $this->postJson('/api/cash-openings', ['counterId' => $this->counter->id, 'paidByEmployeeId' => $this->cashier->id, 'count_100' => 5])->assertCreated();
    }

    private function close(int $counted): void
    {
        $this->postJson('/api/cash-closings', ['counterId' => $this->counter->id, 'receivedByEmployeeId' => $this->cashier->id, 'closing_cash' => $counted])->assertOk();
    }

    private function localDate(PosSale $sale): string
    {
        return $sale->sale_date->copy()->setTimezone('Asia/Kolkata')->toDateString();
    }

    public function test_automatic_bills_after_closing_go_on_tomorrow_and_into_the_next_cash_session(): void
    {
        $this->mode('auto');
        $this->at('2026-11-17 09:00');
        $this->open();
        $this->at('2026-11-17 12:00');
        $day = $this->sale();
        $this->assertSame('2026-11-17', $this->localDate($day));
        $this->assertStringContainsString('-20261117-', $day->invoice_no);

        $this->at('2026-11-17 21:00');
        $this->close(600); // 500 float + 100 sale
        $this->at('2026-11-17 21:30');
        $this->getJson('/api/pos-sales/billing-date')->assertOk()->assertJsonPath('data.shifted', true)->assertJsonPath('data.date', '2026-11-18');
        $late = $this->sale();
        $this->assertSame('2026-11-18', $this->localDate($late), 'a late bill belongs to tomorrow');
        $this->assertStringContainsString('-20261118-0001', $late->invoice_no);
        $this->assertSame('2026-11-17 21:30', $late->billed_at->setTimezone('Asia/Kolkata')->format('Y-m-d H:i'), 'the real time is kept');
        $this->assertSame(0.0, (float) DB::table('cash_register_sessions')->where('status', 'CLOSED')->value('difference'), 'the closed day is untouched');

        // Next morning: Cash Opening shows the late cash, and the new session counts it.
        $this->at('2026-11-18 09:00');
        $this->getJson('/api/pos-sales/billing-date')->assertJsonPath('data.shifted', false)->assertJsonPath('data.date', '2026-11-18');
        $this->getJson('/api/cash-openings/late-bills?counterId='.$this->counter->id)->assertOk()
            ->assertJsonPath('data.bills', 1)->assertJsonPath('data.cash', 100);
        $this->open();
        $this->getJson('/api/cash-closings/opening-amount?counterId='.$this->counter->id)->assertJsonPath('data.cashSales', 100);
        $this->at('2026-11-18 10:00');
        $this->assertSame('2026-11-18', $this->localDate($this->sale()));
    }

    public function test_off_keeps_today_after_closing(): void
    {
        $this->at('2026-11-17 09:00');
        $this->open();
        $this->at('2026-11-17 21:00');
        $this->close(500);
        $this->at('2026-11-17 21:30');
        $this->getJson('/api/pos-sales/billing-date')->assertJsonPath('data.mode', 'off')->assertJsonPath('data.shifted', false);
        $this->assertSame('2026-11-17', $this->localDate($this->sale()));
        $this->postJson('/api/pos-sales/billing-date', ['date' => 'tomorrow'])->assertUnprocessable();
    }

    public function test_manual_a_supervisor_sets_tomorrow_and_a_cashier_cannot(): void
    {
        $this->mode('manual');
        $this->at('2026-11-17 21:15');
        Sanctum::actingAs(User::create(['name' => 'Till', 'username' => 'till', 'email' => 'till@example.test', 'password' => 'secret123',
            'role' => 'cashier', 'store_id' => $this->store->id, 'is_active' => true, 'counter_id' => $this->counter->id]));
        $this->getJson('/api/pos-sales/billing-date')->assertJsonPath('data.can_change', false);
        $this->postJson('/api/pos-sales/billing-date', ['date' => 'tomorrow'])->assertForbidden();

        Sanctum::actingAs($this->user);
        $this->postJson('/api/pos-sales/billing-date', ['date' => 'tomorrow'])->assertOk()->assertJsonPath('data.date', '2026-11-18');
        $this->postJson('/api/pos-sales/billing-date', ['date' => 'yesterday'])->assertUnprocessable();
        $this->assertSame('2026-11-18', $this->localDate($this->sale()));
        $this->assertSame(1, DB::table('counter_billing_dates')->where('set_by', $this->user->id)->count(), 'who set it is kept');

        // A return made now goes on the same date.
        $sale = PosSale::latest('id')->first();
        $this->postJson('/api/pos-returns', ['sourcePosSaleId' => $sale->id, 'items' => [['productId' => $this->product->id, 'qty' => 1, 'price' => 100]]])->assertSuccessful();
        $return = DB::table('pos_returns')->latest('id')->first();
        $this->assertSame('2026-11-18', Carbon::parse($return->return_date)->setTimezone('Asia/Kolkata')->toDateString());
        $this->assertStringContainsString('-20261118-', $return->return_no);

        // Back to today.
        $this->postJson('/api/pos-sales/billing-date', ['date' => 'today'])->assertOk()->assertJsonPath('data.shifted', false);
    }
}
