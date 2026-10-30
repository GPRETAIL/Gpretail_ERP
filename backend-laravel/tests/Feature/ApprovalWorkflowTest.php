<?php

namespace Tests\Feature;

use App\Models\ApprovalLimit;
use App\Models\PosSale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class ApprovalWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private User $cashier;

    private User $supervisor;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        $store = $this->fixture['store'];
        $counter = $this->fixture['user']->counter_id;
        $make = fn (string $role, ?string $pin = null) => tap(User::create(['name' => ucfirst($role), 'username' => "approval-$role", 'email' => "$role@approval.test",
            'password' => 'secret-pass', 'role' => $role, 'store_id' => $store->id, 'counter_id' => $counter, 'is_active' => true]),
            fn (User $user) => $user->forceFill(['approval_pin_hash' => $pin ? Hash::make($pin) : null])->save());
        $this->cashier = $make('cashier');
        $this->supervisor = $make('supervisor', '4321');
        $this->manager = $make('manager', '9876');
    }

    private function enable(): void
    {
        Sanctum::actingAs($this->fixture['user']); // store admin
        $this->putJson('/api/approvals/limits', ['enabled' => true])->assertOk()->assertJsonPath('data.enabled', true);
    }

    private function sale(float $price, ?string $token = null): array
    {
        $item = [...$this->fixture['items'][0], 'price' => $price];

        return array_filter(['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => $price, 'items' => [$item], 'approvalToken' => $token]);
    }

    public function test_stores_without_limits_keep_todays_behaviour(): void
    {
        Sanctum::actingAs($this->cashier);
        $this->postJson('/api/pos-sales', $this->sale(70))->assertCreated();
    }

    public function test_discount_above_cashier_limit_needs_approval_and_supervisor_pin_unlocks_it_once(): void
    {
        $this->enable();
        Sanctum::actingAs($this->cashier);
        $this->postJson('/api/pos-sales', $this->sale(96))->assertCreated(); // 4% is within the 5% cashier limit

        $this->postJson('/api/pos-sales', $this->sale(92))->assertStatus(428)
            ->assertJsonPath('code', 'APPROVAL_REQUIRED')->assertJsonPath('details.requested_percent', 8)->assertJsonPath('details.your_limit_percent', 5);
        $this->assertSame(1, PosSale::count());

        $request = ['action' => 'pos_discount', 'requested_percent' => 8, 'reason_code' => 'damaged_item'];
        $this->postJson('/api/approvals/pin-approve', [...$request, 'approver' => 'approval-supervisor', 'pin' => '0000'])->assertUnprocessable();
        $token = $this->postJson('/api/approvals/pin-approve', [...$request, 'approver' => 'approval-supervisor', 'pin' => '4321'])
            ->assertOk()->assertJsonPath('data.status', 'approved')->json('data.token');

        $this->postJson('/api/pos-sales', $this->sale(92, $token))->assertCreated();
        $this->assertDatabaseHas('approval_requests', ['status' => 'used', 'decided_by' => $this->supervisor->id, 'reason_code' => 'damaged_item']);
        // Single use, and an approval for 8% does not cover a deeper cut.
        $this->postJson('/api/pos-sales', $this->sale(92, $token))->assertUnprocessable();
    }

    public function test_supervisor_cannot_approve_above_own_limit_but_manager_can_via_inbox(): void
    {
        $this->enable();
        Sanctum::actingAs($this->cashier);
        $this->postJson('/api/approvals/pin-approve', ['action' => 'pos_discount', 'requested_percent' => 15, 'reason_code' => 'loyal_customer',
            'approver' => 'approval-supervisor', 'pin' => '4321'])->assertForbidden();

        $id = $this->postJson('/api/approvals/requests', ['action' => 'pos_discount', 'requested_percent' => 15, 'reason_code' => 'loyal_customer'])
            ->assertCreated()->assertJsonPath('data.status', 'pending')->json('data.id');
        $this->getJson("/api/approvals/requests/$id")->assertOk()->assertJsonMissingPath('data.token');
        $this->getJson('/api/approvals/inbox')->assertForbidden(); // cashiers do not decide

        Sanctum::actingAs($this->supervisor);
        $this->getJson('/api/approvals/inbox')->assertOk()->assertJsonPath('data.0.can_decide', false);
        $this->postJson("/api/approvals/requests/$id/approve")->assertForbidden();

        Sanctum::actingAs($this->manager);
        $this->getJson('/api/approvals/pending-count')->assertOk()->assertJsonPath('data.count', 1);
        $this->postJson("/api/approvals/requests/$id/approve", ['approved_percent' => 12, 'note' => 'Counter offer'])->assertOk()
            ->assertJsonPath('data.approved_percent', 12);

        Sanctum::actingAs($this->cashier);
        $token = $this->getJson("/api/approvals/requests/$id")->assertOk()->assertJsonPath('data.status', 'approved')->json('data.token');
        $this->postJson('/api/pos-sales', $this->sale(85, $token))->assertStatus(428); // 15% asked, 12% approved
        $token = $this->getJson("/api/approvals/requests/$id")->json('data.token');
        $this->postJson('/api/pos-sales', $this->sale(88, $token))->assertCreated();
    }

    public function test_approver_cannot_approve_own_request_and_tokens_are_bound_to_the_requester(): void
    {
        $this->enable();
        Sanctum::actingAs($this->manager);
        $id = $this->postJson('/api/approvals/requests', ['action' => 'pos_discount', 'requested_percent' => 30, 'reason_code' => 'other'])->json('data.id');
        $this->postJson("/api/approvals/requests/$id/approve")->assertForbidden();

        Sanctum::actingAs($this->cashier);
        $token = $this->postJson('/api/approvals/pin-approve', ['action' => 'pos_discount', 'requested_percent' => 8, 'reason_code' => 'price_match',
            'approver' => 'approval-supervisor', 'pin' => '4321'])->json('data.token');
        Sanctum::actingAs($this->supervisor);
        $this->postJson('/api/pos-sales', $this->sale(80, $token))->assertUnprocessable(); // someone else's token
    }

    public function test_refunds_above_limit_or_without_receipt_need_approval(): void
    {
        $this->enable();
        Sanctum::actingAs($this->cashier);
        $productId = $this->fixture['items'][0]['productId'];
        $return = ['standalone' => true, 'items' => [['productId' => $productId, 'qty' => 1, 'price' => 100]]];
        $this->postJson('/api/pos-returns', $return)->assertStatus(428)->assertJsonPath('action', 'pos_refund')->assertJsonPath('details.without_receipt', true);

        $token = $this->postJson('/api/approvals/pin-approve', ['action' => 'pos_refund', 'amount' => 100, 'reason_code' => 'wrong_item',
            'payload' => ['without_receipt' => true], 'approver' => 'approval-manager', 'pin' => '9876'])->assertOk()->json('data.token');
        $this->postJson('/api/pos-returns', [...$return, 'approvalToken' => $token])->assertSuccessful();
        $this->assertDatabaseHas('approval_requests', ['action' => 'pos_refund', 'status' => 'used']);
    }

    public function test_approval_pin_requires_current_password_and_an_approver_role(): void
    {
        Sanctum::actingAs($this->cashier);
        $this->putJson('/api/approvals/pin', ['pin' => '1234', 'currentPassword' => 'secret-pass'])->assertForbidden();
        Sanctum::actingAs($this->supervisor);
        $this->putJson('/api/approvals/pin', ['pin' => '1234', 'currentPassword' => 'wrong'])->assertUnprocessable();
        $this->putJson('/api/approvals/pin', ['pin' => '1234', 'currentPassword' => 'secret-pass'])->assertOk();
        $this->assertTrue(Hash::check('1234', $this->supervisor->fresh()->approval_pin_hash));
        $this->assertArrayNotHasKey('approval_pin_hash', $this->supervisor->fresh()->toArray());
        $this->assertSame(0, ApprovalLimit::count());
    }
}
