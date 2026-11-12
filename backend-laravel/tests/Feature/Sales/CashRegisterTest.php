<?php

namespace Tests\Feature\Sales;

use App\Models\CashRegisterSession;
use App\Models\Employee;
use App\Models\PosReturn;
use App\Models\PosSale;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Store;
use App\Models\SystemConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Cash Opening → bills → Cash Closing on one counter: the screens' payloads save, and closing compares the
 * counted drawer with opening + cash taken (less change) − cash refunds − counter expenses.
 */
class CashRegisterTest extends TestCase
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

    private function sale(array $payment)
    {
        return $this->postJson('/api/pos-sales', array_merge(['saleSaveAs' => 'paid_settled',
            'items' => [['productId' => $this->product->id, 'qty' => 1, 'price' => 100]]], $payment))->assertSuccessful();
    }

    private function open(array $counts = ['count_500' => 2, 'count_100' => 5])
    {
        return $this->postJson('/api/cash-openings', ['counterId' => $this->counter->id, 'paidByEmployeeId' => $this->cashier->id,
            'cashierEmployeeId' => $this->cashier->id] + $counts);
    }

    public function test_the_screens_load_their_options_and_open_a_counter_with_the_counted_float(): void
    {
        $this->getJson('/api/cash-openings/meta')->assertOk()
            ->assertJsonPath('data.counters.0.name', 'Till One')
            ->assertJsonPath('data.cashiers.0.name', 'Kavya')
            ->assertJsonPath('data.cashiers.0.employee_code', 'E1')
            ->assertJsonPath('data.openCounterIds', []);

        $this->open()->assertCreated()->assertJsonPath('data.amount', 1500)->assertJsonPath('data.counter.name', 'Till One')
            ->assertJsonPath('data.cashier.name', 'Kavya')->assertJsonPath('data.cashier.employee_code', 'E1');
        $this->assertSame(['2000' => 0, '500' => 2, '200' => 0, '100' => 5, '50' => 0, '20' => 0, '10' => 0, '5' => 0, '2' => 0, '1' => 0],
            CashRegisterSession::firstOrFail()->opening_denominations);
        $this->getJson('/api/cash-closings/meta')->assertOk()->assertJsonPath('data.openCounterIds', [$this->counter->id]);

        $this->open()->assertUnprocessable()->assertJsonPath('errors.counterId.0', 'Counter Till One is already open. Close it in Cash Closing before opening it again.');
        $this->getJson('/api/cash-openings')->assertOk()->assertJsonPath('data.0.opening_at', fn ($v) => $v !== null)
            ->assertJsonPath('data.0.paidBy.name', 'Kavya');
    }

    public function test_closing_counts_cash_sales_less_change_split_bills_refunds_and_expenses(): void
    {
        $this->open();                                                   // float 1,500
        $this->sale(['cashAmount' => 150]);                              // 100 bill, 50 change → +100 cash
        $this->sale(['cashAmount' => 40, 'cardAmount' => 60, 'cardTypeId' => 1]); // split → +40 cash
        $this->sale(['upiAmount' => 100, 'upiProviderId' => 1]);         // no cash
        $source = PosSale::orderBy('id')->firstOrFail();
        PosReturn::create(['store_id' => $this->store->id, 'counter_id' => $this->counter->id, 'pos_sale_id' => $source->id,
            'return_no' => 'RET-1', 'return_date' => now(), 'total_refund' => 30, 'refund_mode' => 'CASH', 'status' => 'COMPLETED']); // −30

        $this->getJson('/api/cash-closings/opening-amount?counterId='.$this->counter->id)->assertOk()
            ->assertJsonPath('data.openingAmount', 1500)->assertJsonPath('data.cashSales', 140)
            ->assertJsonPath('data.cashRefunds', 30)->assertJsonPath('data.expectedBeforeExpenses', 1610);
        $this->getJson('/api/cash-closings/next-bill-no')->assertOk()->assertJsonPath('data.billNo', 1);

        // Expected 1,610 − 10 expenses = 1,600; counted 1,590 → 10 short.
        $this->postJson('/api/cash-closings', ['counterId' => $this->counter->id, 'receivedByEmployeeId' => $this->cashier->id,
            'cashierEmployeeId' => $this->cashier->id, 'counterExpenses' => 10, 'notes' => 'Evening close',
            'count_500' => 3, 'count_50' => 1, 'count_20' => 2])
            ->assertOk()->assertJsonPath('data.bill_no', 1)->assertJsonPath('data.closing_amount', 1590)
            ->assertJsonPath('data.expected_cash', '1600.00')->assertJsonPath('data.difference', '-10.00')
            ->assertJsonPath('data.receivedBy.employee_code', 'E1');

        $session = CashRegisterSession::firstOrFail();
        $this->assertSame('CLOSED', $session->status);
        $this->assertSame('140.00', $session->cash_sales);
        $this->assertSame('30.00', $session->cash_refunds);
        $this->getJson('/api/cash-closings')->assertOk()->assertJsonPath('data.0.bill_no', 1)
            ->assertJsonPath('data.0.counter.name', 'Till One')->assertJsonPath('data.0.counter_expenses', '10.00');
        $this->getJson('/api/cash-closings/next-bill-no')->assertJsonPath('data.billNo', 2);
        $this->getJson('/api/cash-closings/opening-amount?counterId='.$this->counter->id)->assertJsonPath('data.sessionId', null);
    }

    public function test_closing_a_counter_that_is_not_open_is_refused(): void
    {
        $this->postJson('/api/cash-closings', ['counterId' => $this->counter->id, 'count_100' => 1])
            ->assertUnprocessable()->assertJsonPath('errors.counterId.0', 'Counter Till One is not open. Open it in Cash Opening first.');
    }

    public function test_another_counter_or_store_never_counts(): void
    {
        $this->open();
        $otherCounter = SystemConfiguration::create(['store_id' => $this->store->id, 'key' => 'counter', 'value' => 'Till Two', 'is_active' => true]);
        $this->user->forceFill(['counter_id' => $otherCounter->id])->save();
        $this->sale(['cashAmount' => 100]);                             // billed on Till Two

        $otherStore = Store::create(['name' => 'Other', 'code' => 'OTHER']);
        PosSale::withoutGlobalScopes()->create(['store_id' => $otherStore->id, 'counter_id' => $this->counter->id, 'user_id' => $this->user->id,
            'invoice_no' => 'FOREIGN-1', 'sale_date' => now(), 'grand_total' => 500, 'paid_amount' => 500, 'payment_mode' => 'CASH']);

        $this->getJson('/api/cash-closings/opening-amount?counterId='.$this->counter->id)
            ->assertJsonPath('data.cashSales', 0)->assertJsonPath('data.expectedBeforeExpenses', 1500);
    }

    public function test_an_older_client_can_still_send_the_amounts_directly(): void
    {
        $this->postJson('/api/cash-openings', ['counterId' => $this->counter->id, 'opening_cash' => 800])->assertCreated()->assertJsonPath('data.amount', 800);
        $this->postJson('/api/cash-closings', ['counterId' => $this->counter->id, 'closing_cash' => 800])->assertOk()
            ->assertJsonPath('data.difference', '0.00');
    }
}
