<?php

namespace Tests\Feature\Sales;

use App\Models\Customer;
use App\Models\Store;
use App\Models\User;
use App\Services\Approvals\ApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Sales > Bill Reprint: one search over every sales document, the reprint log, reason and cashier approval rules. */
class BillReprintTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $store;

    private int $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        $this->store = $this->fixture['store']->id;
        Sanctum::actingAs($this->fixture['user']);
        $this->customer = Customer::create(['store_id' => $this->store, 'code' => 'RAVI-1', 'name' => 'Ravi Traders', 'phone' => '9876543210'])->id;
    }

    /** One of each document, dated $day (Y-m-d, business day), in $store. Returns type => id. */
    private function documents(string $day, ?int $store = null, string $seq = '0001'): array
    {
        $store ??= $this->store;
        $ymd = str_replace('-', '', $day);
        $stamp = $day.' 06:00:00'; // 11:30 IST, same business day
        $customer = $store === $this->store ? $this->customer
            : Customer::create(['store_id' => $store, 'code' => 'OTHER-'.$seq, 'name' => 'Other Store Customer', 'phone' => '9876543210'])->id;
        $common = ['store_id' => $store, 'customer_id' => $customer, 'created_at' => $stamp, 'updated_at' => $stamp];

        return [
            'pos_sale' => DB::table('pos_sales')->insertGetId([...$common, 'user_id' => $this->fixture['user']->id, 'invoice_no' => "INV-S{$store}-{$ymd}-{$seq}",
                'sale_date' => $stamp, 'subtotal' => 100, 'grand_total' => 100, 'paid_amount' => 100, 'status' => 'COMPLETED']),
            'pos_return' => DB::table('pos_returns')->insertGetId([...$common, 'return_no' => "RET-S{$store}-{$ymd}-{$seq}", 'return_date' => $stamp,
                'total_refund' => 40, 'status' => 'COMPLETED']),
            'dealer_invoice' => DB::table('dealer_invoices')->insertGetId([...$common, 'invoice_no' => "DINV-S{$store}-{$ymd}-{$seq}", 'invoice_date' => $day,
                'subtotal' => 500, 'grand_total' => 500, 'status' => 'COMPLETED']),
            'dealer_return' => DB::table('dealer_invoice_returns')->insertGetId([...$common, 'return_no' => "DRET-S{$store}-{$ymd}-{$seq}", 'return_date' => $day,
                'subtotal' => 50, 'grand_total' => 50, 'status' => 'COMPLETED']),
            'dealer_receipt' => DB::table('dealer_receipts')->insertGetId([...$common, 'receipt_no' => "RCPT-S{$store}-{$ymd}-{$seq}", 'receipt_date' => $day,
                'mode' => 'CASH', 'amount' => 300, 'status' => 'ACTIVE']),
            'customer_order' => DB::table('customer_orders')->insertGetId([...$common, 'order_no' => "CO-{$store}-{$seq}", 'order_date' => $day,
                'total_amount' => 900, 'net_amount' => 900, 'status' => 'pending']),
        ];
    }

    private function cashier(): User
    {
        return User::create(['name' => 'TEMP Reprint Cashier', 'username' => 'temp-reprint-cashier', 'email' => 'reprint-cashier@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $this->store, 'is_active' => true]);
    }

    public function test_search_finds_every_document_type_and_short_numbers_but_not_another_stores(): void
    {
        $today = now(config('app.business_timezone'))->toDateString();
        $ids = $this->documents($today);
        $other = Store::create(['name' => 'TEMP Other Store', 'code' => 'TEMP-OTHER', 'is_active' => true]);
        $this->documents($today, $other->id, '0009');

        $rows = collect($this->getJson('/api/bill-reprints?from='.$today.'&to='.$today)->assertOk()->json('data'));
        $this->assertEqualsCanonicalizing(array_keys($ids), $rows->pluck('type')->all(), 'one of each type, none from the other store');
        $this->assertTrue($rows->every(fn ($r) => (int) $r['store_id'] === $this->store));
        $this->assertSame(0, $rows->firstWhere('type', 'pos_sale')['print_count']);

        $short = 'D'.substr(str_replace('-', '', $today), 2).'-0001';
        $this->getJson('/api/bill-reprints?q='.$short)->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'dealer_invoice')->assertJsonPath('data.0.number', $short);
        $this->getJson('/api/bill-reprints?q=98765&types[]=pos_sale')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.customer_name', 'Ravi Traders');
        $this->getJson('/api/bill-reprints/dealer_return/'.$ids['dealer_return'])->assertOk()->assertJsonPath('data.amount', 50);
        $this->getJson('/api/dealer-invoice-returns/'.$ids['dealer_return'])->assertOk()->assertJsonPath('data.customer_name', 'Ravi Traders');
    }

    public function test_reprints_are_counted_and_a_reason_is_needed_after_the_first(): void
    {
        $sale = $this->documents(now(config('app.business_timezone'))->toDateString())['pos_sale'];

        $this->postJson("/api/bill-reprints/pos_sale/{$sale}/log", ['copy_label' => 'Duplicate'])->assertOk()->assertJsonPath('data.count', 1);
        $this->getJson("/api/bill-reprints/pos_sale/{$sale}")->assertJsonPath('data.print_count', 1)->assertJsonPath('data.reason_required', true);
        $this->postJson("/api/bill-reprints/pos_sale/{$sale}/log", [])->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->postJson("/api/bill-reprints/pos_sale/{$sale}/log", ['reason' => 'Customer lost the bill', 'channel' => 'share'])->assertOk()->assertJsonPath('data.count', 2);

        $this->getJson("/api/bill-reprints/pos_sale/{$sale}/history")->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.reason', 'Customer lost the bill')->assertJsonPath('data.0.channel', 'share')->assertJsonPath('data.0.copy_label', 'Duplicate')->assertJsonPath('data.1.copy_label', 'Duplicate');
        $this->assertSame(2, collect($this->getJson('/api/bill-reprints?types[]=pos_sale')->json('data'))->firstWhere('id', $sale)['print_count']);

        DB::table('stores')->where('id', $this->store)->update(['receipt_customization' => json_encode(['reprintReasonAfter' => 0])]);
        $this->postJson("/api/bill-reprints/pos_sale/{$sale}/log", [])->assertOk()->assertJsonPath('data.count', 3);
    }

    public function test_a_cashier_reprints_today_freely_but_an_older_bill_needs_a_supervisor(): void
    {
        $today = $this->documents(now(config('app.business_timezone'))->toDateString());
        $old = $this->documents(now(config('app.business_timezone'))->subDays(3)->toDateString(), null, '0002');
        $cashier = $this->cashier();
        Sanctum::actingAs($cashier);

        $this->postJson("/api/bill-reprints/dealer_invoice/{$today['dealer_invoice']}/log", [])->assertOk();
        $this->getJson("/api/bill-reprints/dealer_invoice/{$old['dealer_invoice']}")->assertJsonPath('data.approval_required', true);
        $this->postJson("/api/bill-reprints/dealer_invoice/{$old['dealer_invoice']}/log", [])
            ->assertStatus(428)->assertJsonPath('action', 'bill_reprint')->assertJsonPath('details.doc_type', 'dealer_invoice');

        $approvals = app(ApprovalService::class);
        $request = $approvals->createRequest($cashier, $this->store, 'bill_reprint', ['reason_code' => 'bill_lost', 'payload' => ['bill_no' => 'x']]);
        $approvals->approve($request, $this->fixture['user']);
        $token = $approvals->issueToken($request->fresh());

        $this->postJson("/api/bill-reprints/dealer_invoice/{$old['dealer_invoice']}/log", ['approvalToken' => $token])->assertOk()->assertJsonPath('data.count', 1);
        $this->assertSame('used', $request->fresh()->status);
        $this->postJson("/api/bill-reprints/dealer_invoice/{$old['dealer_invoice']}/log", ['approvalToken' => $token, 'reason' => 'again'])->assertUnprocessable();

        Sanctum::actingAs($this->fixture['user']); // admin: no approval needed
        $this->postJson("/api/bill-reprints/dealer_invoice/{$old['dealer_invoice']}/log", ['reason' => 'Office copy'])->assertOk()->assertJsonPath('data.count', 2);
    }
}
