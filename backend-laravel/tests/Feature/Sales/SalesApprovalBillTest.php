<?php

namespace Tests\Feature\Sales;

use App\Models\ApprovalLimit;
use App\Models\Customer;
use App\Models\User;
use App\Services\Notifications\NotificationInbox;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** A sales approval is the step before the bill: saving, approving or rejecting moves nothing; the sales user makes the POS bill once approved. */
class SalesApprovalBillTest extends TestCase
{
    use RefreshDatabase;

    private array $item;

    private int $customerId;

    protected function setUp(): void
    {
        parent::setUp();
        $fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($fixture['user']);
        $this->item = $fixture['items'][0];
        $this->customerId = Customer::create(['store_id' => $fixture['store']->id, 'code' => 'APPROVAL-1', 'name' => 'Approval Customer'])->id;
    }

    private function stock(): float
    {
        return (float) DB::table('stocks')->where('variant_id', $this->item['variantId'])->value('quantity');
    }

    /** What SalesOnApproval.jsx sends. */
    private function request(float $qty, array $customer = [], float $discount = 10): int
    {
        return $this->postJson('/api/sales-on-approval', [
            'customerMode' => 'existing', 'customerId' => $this->customerId, ...$customer,
            'items' => [['barcodeId' => $this->item['barcodeId'], 'qty' => $qty, 'price' => 100, 'tax' => 5, 'discount' => $discount]],
        ])->assertCreated()->json('data.id');
    }

    private function cashier(string $name, string $role = 'cashier'): User
    {
        $slug = strtolower(str_replace(' ', '-', $name));

        return User::create(['name' => $name, 'username' => $slug, 'email' => $slug.'@example.test',
            'password' => 'temporary-test-only', 'role' => $role, 'store_id' => auth()->user()->store_id, 'is_active' => true]);
    }

    public function test_with_discount_limits_on_the_managers_approval_covers_the_bill_up_to_the_managers_own_limit(): void
    {
        $admin = auth()->user();
        $storeId = $admin->store_id;
        ApprovalLimit::create(['store_id' => $storeId, 'role' => 'cashier', 'max_discount_percent' => 0, 'max_refund_amount' => 0]);
        ApprovalLimit::create(['store_id' => $storeId, 'role' => 'manager', 'max_discount_percent' => 10, 'max_refund_amount' => 0]);
        $manager = $this->cashier('Floor Manager', 'manager');
        $cashier = $this->cashier('Limit Cashier');

        Sanctum::actingAs($cashier);
        $within = $this->request(2, [], 10);   // 5% off: inside the manager's 10%
        $beyond = $this->request(2, [], 60);   // 30% off: beyond it
        Sanctum::actingAs($manager);
        $this->postJson("/api/sales-on-approval/$within/accept")->assertOk();
        $this->postJson("/api/sales-on-approval/$beyond/accept")->assertUnprocessable();
        $this->assertSame('PENDING', DB::table('sales_approvals')->where('id', $beyond)->value('status'), 'still waiting for someone who may approve it');

        Sanctum::actingAs($cashier);
        $this->postJson("/api/sales-on-approval/$within/bill")->assertOk()->assertJsonPath('data.status', 'BILLED');
        $this->assertSame(998.0, $this->stock(), 'the manager approval covers the cashier\'s 0% limit');

        Sanctum::actingAs($admin);
        $this->postJson("/api/sales-on-approval/$beyond/accept")->assertOk();
        Sanctum::actingAs($cashier);
        $this->postJson("/api/sales-on-approval/$beyond/bill")->assertOk()->assertJsonPath('data.status', 'BILLED');
        $this->assertSame(996.0, $this->stock());
    }

    public function test_approving_moves_nothing_and_the_sales_user_then_creates_the_bill_that_deducts_stock(): void
    {
        $id = $this->request(2);
        $this->assertSame(1000.0, $this->stock(), 'an approval request moves no stock');
        $this->postJson("/api/sales-on-approval/$id/bill")->assertUnprocessable(); // not approved yet

        $this->postJson("/api/sales-on-approval/$id/accept")->assertOk()->assertJsonPath('data.status', 'APPROVED')->assertJsonPath('data.pos_sale_id', null);
        $this->assertSame(1000.0, $this->stock(), 'approving makes no bill');

        $saleId = $this->postJson("/api/sales-on-approval/$id/bill")->assertOk()->assertJsonPath('data.status', 'BILLED')->json('data.pos_sale_id');
        $this->assertNotNull($saleId);
        $this->assertSame(998.0, $this->stock(), 'the bill deducts stock');
        $this->assertDatabaseHas('pos_sales', ['id' => $saleId, 'customer_id' => $this->customerId]);
        $this->assertSame(199.5, (float) DB::table('pos_sales')->where('id', $saleId)->value('grand_total')); // (2 x 100 - 10) + 5% GST
        $this->assertSame(199.5, (float) DB::table('sales_approvals')->where('id', $id)->value('total_amount'), 'the approval showed the same amount');
        $this->assertDatabaseHas('vouchers', ['source_type' => 'pos_sale', 'source_id' => $saleId]);

        $this->postJson("/api/sales-on-approval/$id/bill")->assertUnprocessable();
        $this->postJson("/api/sales-on-approval/$id/accept")->assertUnprocessable();
        $this->assertSame(998.0, $this->stock(), 'billing twice does not bill twice');

        $row = collect($this->getJson('/api/sales-on-approval?page=1&limit=20')->assertOk()->json('data'))->firstWhere('id', $id);
        $this->assertSame(199.5, (float) $row['amount']);
        $this->assertSame('Approval Customer', $row['customer_name']);
        $this->assertSame(2.0, (float) $row['total_qty']);
        $this->assertNotEmpty($row['bill_no']);
        $this->assertNotEmpty($row['items'][0]['product_name']);
    }

    public function test_rejected_or_expired_requests_cannot_be_billed_and_short_stock_keeps_it_approved(): void
    {
        $rejected = $this->request(1);
        $this->postJson("/api/sales-on-approval/$rejected/reject")->assertOk()->assertJsonPath('data.status', 'REJECTED');
        $this->postJson("/api/sales-on-approval/$rejected/bill")->assertUnprocessable()
            ->assertJsonPath('message', 'No bill can be made from this request. It was rejected.');

        $expired = $this->request(1);
        $this->postJson("/api/sales-on-approval/$expired/accept")->assertOk();
        DB::table('sales_approvals')->where('id', $expired)->update(['valid_until' => now()->subDay()->toDateString()]);
        $this->postJson("/api/sales-on-approval/$expired/bill")->assertUnprocessable();

        $tooMuch = $this->request(1001);
        $this->postJson("/api/sales-on-approval/$tooMuch/accept")->assertOk();
        $this->postJson("/api/sales-on-approval/$tooMuch/bill")->assertUnprocessable();
        $this->assertSame('APPROVED', DB::table('sales_approvals')->where('id', $tooMuch)->value('status'), 'it can be billed later');
        $this->assertSame(1000.0, $this->stock());
    }

    public function test_a_cashier_can_raise_and_bill_but_not_approve(): void
    {
        $manager = auth()->user();
        $cashier = $this->cashier('Bill Cashier');
        Sanctum::actingAs($cashier);
        $id = $this->request(1);
        $this->postJson("/api/sales-on-approval/$id/accept")->assertForbidden();

        Sanctum::actingAs($manager);
        $this->postJson("/api/sales-on-approval/$id/accept")->assertOk();
        Sanctum::actingAs($cashier);
        $this->postJson("/api/sales-on-approval/$id/bill")->assertOk()->assertJsonPath('data.status', 'BILLED');
        $this->assertSame(999.0, $this->stock());
    }

    public function test_the_sales_user_who_asked_is_notified_of_the_decision_and_nobody_else_is(): void
    {
        $approver = auth()->user();
        $asker = $this->cashier('Asking Cashier');
        $other = $this->cashier('Other Cashier');

        Sanctum::actingAs($asker);
        $approved = $this->request(1);
        $rejected = $this->request(1);
        Sanctum::actingAs($approver);
        $this->postJson("/api/sales-on-approval/$approved/accept")->assertOk();
        $this->postJson("/api/sales-on-approval/$rejected/reject")->assertOk();

        $inbox = app(NotificationInbox::class);
        $titles = $inbox->query($asker)->where('type', 'SALES_APPROVAL_DECIDED')->pluck('message')->all();
        $this->assertCount(2, $titles);
        $this->assertTrue(collect($titles)->contains(fn ($m) => str_starts_with($m, 'Approved: you can now create the bill')));
        $this->assertTrue(collect($titles)->contains(fn ($m) => str_starts_with($m, 'Rejected:')));
        $this->assertSame(0, $inbox->query($other)->where('type', 'SALES_APPROVAL_DECIDED')->count(), 'only the asker sees it');
    }

    public function test_a_new_customer_entered_on_the_request_is_created_with_the_bill(): void
    {
        $id = $this->request(1, ['customerMode' => 'new', 'customerId' => null, 'customer' => ['name' => 'Walk In Buyer', 'mobileNo' => '9000000001']]);
        $this->postJson("/api/sales-on-approval/$id/accept")->assertOk();
        $saleId = $this->postJson("/api/sales-on-approval/$id/bill")->assertOk()->json('data.pos_sale_id');

        $customerId = DB::table('pos_sales')->where('id', $saleId)->value('customer_id');
        $this->assertSame('Walk In Buyer', DB::table('customers')->where('id', $customerId)->value('name'));
    }
}
