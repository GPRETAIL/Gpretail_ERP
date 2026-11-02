<?php

namespace Tests\Feature\Sales;

use App\Models\ApprovalLimit;
use App\Models\Customer;
use App\Models\User;
use App\Services\Approvals\ApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Dealer invoices follow the POS rule: a discount beyond the user's limit waits for a supervisor/manager approval. */
class DealerDiscountApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_discount_over_the_limit_needs_approval_then_saves_with_the_token(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        $storeId = $fixture['store']->id;
        ApprovalLimit::create(['store_id' => $storeId, 'role' => 'cashier', 'max_discount_percent' => 5, 'max_refund_amount' => 0]);
        $make = fn (string $name, string $role) => User::create(['name' => $name, 'username' => strtolower(str_replace(' ', '-', $name)), 'email' => strtolower(str_replace(' ', '', $name)).'@example.test',
            'password' => 'temporary-test-only', 'role' => $role, 'store_id' => $storeId, 'is_active' => true]);
        $cashier = $make('Dealer Cashier', 'cashier');
        $supervisor = $make('Dealer Supervisor', 'supervisor');
        $customerId = Customer::create(['store_id' => $storeId, 'code' => 'D-1', 'name' => 'Dealer'])->id;
        $item = $fixture['items'][0];
        $bill = fn (array $extra = []) => ['customerId' => $customerId, 'items' => [['barcodeId' => $item['barcodeId'], 'qty' => 1, 'price' => 100, 'discount' => 4]], ...$extra];

        Sanctum::actingAs($cashier);
        $this->postJson('/api/dealer-invoices', $bill())->assertCreated(); // 4%: inside the 5% limit
        $this->postJson('/api/dealer-invoices', $bill(['addlDiscount' => 6]))->assertStatus(428)
            ->assertJsonPath('code', 'APPROVAL_REQUIRED')->assertJsonPath('details.requested_percent', 10);

        $approvals = app(ApprovalService::class);
        $request = $approvals->createRequest($cashier, $storeId, 'pos_discount', ['requested_percent' => 10]);
        $approvals->approve($request, $supervisor);
        $token = $approvals->issueToken($request);

        $this->postJson('/api/dealer-invoices', $bill(['addlDiscount' => 6, 'approvalToken' => $token]))->assertCreated();
    }
}
