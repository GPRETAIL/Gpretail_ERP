<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\DealerInvoice;
use App\Models\PosSale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Credit sales follow the approval limits: what goes on the customer's account beyond the user's credit limit needs approval. */
class CreditSaleApprovalTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private User $cashier;

    private User $supervisor;

    private int $customerId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        $store = $this->fixture['store'];
        $make = fn (string $role, ?string $pin = null) => tap(User::create(['name' => ucfirst($role), 'username' => "credit-$role", 'email' => "$role@credit.test",
            'password' => 'secret-pass', 'role' => $role, 'store_id' => $store->id, 'counter_id' => $this->fixture['user']->counter_id, 'is_active' => true]),
            fn (User $user) => $user->forceFill(['approval_pin_hash' => $pin ? Hash::make($pin) : null])->save());
        $this->cashier = $make('cashier');
        $this->supervisor = $make('supervisor', '4321');
        $this->customerId = Customer::create(['store_id' => $store->id, 'code' => 'CR-1', 'name' => 'Credit Customer'])->id;

        Sanctum::actingAs($this->fixture['user']); // store admin switches approvals on with the recommended limits
        $this->putJson('/api/approvals/limits', ['enabled' => true])->assertOk()
            ->assertJsonPath('data.limits.0.role', 'cashier')->assertJsonPath('data.limits.0.max_credit_amount', 0);
    }

    private function sale(array $extra = []): array
    {
        return ['checkoutKey' => (string) Str::uuid(), 'customerId' => $this->customerId, 'items' => [[...$this->fixture['items'][0], 'price' => 100]], ...$extra];
    }

    public function test_a_cashier_credit_sale_needs_approval_and_the_token_is_spent_on_the_bill(): void
    {
        Sanctum::actingAs($this->cashier);
        $this->postJson('/api/pos-sales', $this->sale(['saleSaveAs' => 'paid_settled', 'cashAmount' => 100]))->assertCreated(); // paid: no credit

        $this->postJson('/api/pos-sales', $this->sale(['isCredit' => true, 'cashAmount' => 40]))->assertStatus(428)
            ->assertJsonPath('action', 'pos_credit')->assertJsonPath('details.amount', 60)->assertJsonPath('details.your_limit_amount', 0);
        $this->assertSame(1, PosSale::count());

        $token = $this->postJson('/api/approvals/pin-approve', ['action' => 'pos_credit', 'amount' => 60, 'reason_code' => 'loyal_customer',
            'approver' => 'credit-supervisor', 'pin' => '4321'])->assertOk()->json('data.token');
        $saleId = $this->postJson('/api/pos-sales', $this->sale(['isCredit' => true, 'cashAmount' => 40, 'creditApprovalToken' => $token]))->assertCreated()->json('data.id');

        $this->assertDatabaseHas('approval_requests', ['action' => 'pos_credit', 'status' => 'used', 'pos_sale_id' => $saleId]);
        $this->assertSame(60.0, (float) Customer::find($this->customerId)->current_balance);
        $this->postJson('/api/pos-sales', $this->sale(['isCredit' => true, 'cashAmount' => 40, 'creditApprovalToken' => $token]))->assertUnprocessable(); // single use
    }

    public function test_a_supervisor_sells_on_credit_up_to_their_limit_and_cannot_approve_beyond_it(): void
    {
        Sanctum::actingAs($this->supervisor);
        $this->postJson('/api/pos-sales', $this->sale(['isCredit' => true]))->assertCreated(); // ₹100 within ₹5,000

        Sanctum::actingAs($this->cashier);
        $this->postJson('/api/approvals/pin-approve', ['action' => 'pos_credit', 'amount' => 9000, 'reason_code' => 'loyal_customer',
            'approver' => 'credit-supervisor', 'pin' => '4321'])->assertForbidden();
    }

    public function test_a_dealer_invoice_is_credit_and_follows_the_same_limit(): void
    {
        $item = $this->fixture['items'][0];
        $bill = fn (array $extra = []) => ['customerId' => $this->customerId, 'items' => [['barcodeId' => $item['barcodeId'], 'qty' => 1, 'price' => 100]], ...$extra];

        Sanctum::actingAs($this->cashier);
        $this->postJson('/api/dealer-invoices', $bill())->assertStatus(428)->assertJsonPath('action', 'pos_credit')->assertJsonPath('details.amount', 100);
        $this->assertSame(0, DealerInvoice::count());

        $token = $this->postJson('/api/approvals/pin-approve', ['action' => 'pos_credit', 'amount' => 100, 'reason_code' => 'bulk_purchase',
            'approver' => 'credit-supervisor', 'pin' => '4321'])->assertOk()->json('data.token');
        $this->postJson('/api/dealer-invoices', $bill(['creditApprovalToken' => $token]))->assertCreated();
        $this->assertDatabaseHas('approval_requests', ['action' => 'pos_credit', 'status' => 'used']);
    }
}
