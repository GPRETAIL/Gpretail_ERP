<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\User;
use App\Services\Notifications\NotificationInbox;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** A sales approval is the step before the bill: saving or rejecting moves nothing, accepting makes the POS bill. */
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
    private function request(float $qty, array $customer = []): int
    {
        return $this->postJson('/api/sales-on-approval', [
            'customerMode' => 'existing', 'customerId' => $this->customerId, ...$customer,
            'items' => [['barcodeId' => $this->item['barcodeId'], 'qty' => $qty, 'price' => 100, 'tax' => 5, 'discount' => 10]],
        ])->assertCreated()->json('data.id');
    }

    public function test_saving_moves_no_stock_and_accepting_makes_an_unsettled_bill_that_deducts_it(): void
    {
        $id = $this->request(2);
        $this->assertSame(1000.0, $this->stock(), 'an approval request moves no stock');

        $response = $this->postJson("/api/sales-on-approval/$id/accept")->assertOk()->assertJsonPath('data.status', 'APPROVED');
        $saleId = $response->json('data.pos_sale_id');
        $this->assertNotNull($saleId);
        $this->assertSame(998.0, $this->stock(), 'the bill made on accept deducts stock');
        $this->assertDatabaseHas('pos_sales', ['id' => $saleId, 'customer_id' => $this->customerId]);
        $this->assertSame(199.5, (float) DB::table('pos_sales')->where('id', $saleId)->value('grand_total')); // (2 x 100 - 10) + 5% GST
        $this->assertSame(199.5, (float) DB::table('sales_approvals')->where('id', $id)->value('total_amount'), 'the approval showed the same amount');
        $this->assertDatabaseHas('vouchers', ['source_type' => 'pos_sale', 'source_id' => $saleId]);

        $this->postJson("/api/sales-on-approval/$id/accept")->assertUnprocessable();
        $this->assertSame(998.0, $this->stock(), 'accepting twice does not bill twice');
    }

    public function test_rejecting_moves_nothing_and_short_stock_leaves_the_request_pending(): void
    {
        $rejected = $this->request(1);
        $this->postJson("/api/sales-on-approval/$rejected/reject")->assertOk()->assertJsonPath('data.status', 'REJECTED');
        $this->assertSame(1000.0, $this->stock());

        $tooMuch = $this->request(1001);
        $this->postJson("/api/sales-on-approval/$tooMuch/accept")->assertUnprocessable();
        $this->assertSame('PENDING', DB::table('sales_approvals')->where('id', $tooMuch)->value('status'));
        $this->assertSame(1000.0, $this->stock());
    }

    public function test_the_sales_user_who_asked_is_notified_of_the_decision_and_nobody_else_is(): void
    {
        $approver = auth()->user();
        $make = fn (string $name) => User::create(['name' => $name, 'username' => strtolower(str_replace(' ', '-', $name)), 'email' => strtolower(str_replace(' ', '', $name)).'@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $approver->store_id, 'is_active' => true]);
        $asker = $make('Asking Cashier');
        $other = $make('Other Cashier');

        Sanctum::actingAs($asker);
        $approved = $this->request(1);
        $rejected = $this->request(1);
        Sanctum::actingAs($approver);
        $this->postJson("/api/sales-on-approval/$approved/accept")->assertOk();
        $this->postJson("/api/sales-on-approval/$rejected/reject")->assertOk();

        $inbox = app(NotificationInbox::class);
        $titles = $inbox->query($asker)->where('type', 'SALES_APPROVAL_DECIDED')->pluck('message')->all();
        $this->assertCount(2, $titles);
        $this->assertTrue(collect($titles)->contains(fn ($m) => str_starts_with($m, 'Approved: bill ')));
        $this->assertTrue(collect($titles)->contains(fn ($m) => str_starts_with($m, 'Rejected:')));
        $this->assertSame(0, $inbox->query($other)->where('type', 'SALES_APPROVAL_DECIDED')->count(), 'only the asker sees it');
    }

    public function test_a_new_customer_entered_on_the_request_is_created_with_the_bill(): void
    {
        $id = $this->request(1, ['customerMode' => 'new', 'customerId' => null, 'customer' => ['name' => 'Walk In Buyer', 'mobileNo' => '9000000001']]);
        $saleId = $this->postJson("/api/sales-on-approval/$id/accept")->assertOk()->json('data.pos_sale_id');

        $customerId = DB::table('pos_sales')->where('id', $saleId)->value('customer_id');
        $this->assertSame('Walk In Buyer', DB::table('customers')->where('id', $customerId)->value('name'));
    }
}
