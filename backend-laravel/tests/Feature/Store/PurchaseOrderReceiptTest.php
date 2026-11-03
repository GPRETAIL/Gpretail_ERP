<?php

namespace Tests\Feature\Store;

use App\Models\PurchaseOrder;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Direct purchases received against an approved purchase order: ordered vs received, part received, then closed. */
class PurchaseOrderReceiptTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $supplierId;

    private int $orderId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(2);
        Sanctum::actingAs($this->fixture['user']);
        $this->supplierId = $this->postJson('/api/suppliers', ['name' => 'Receipt Mill', 'code' => 'RC-MILL'])->assertCreated()->json('data.id');
        [$first, $second] = $this->fixture['items'];
        $this->orderId = $this->postJson('/api/purchase-orders', ['supplier_id' => $this->supplierId, 'items' => [
            ['product_id' => $first['productId'], 'variant_id' => $first['variantId'], 'quantity' => 10, 'unit_cost' => 60],
            ['product_id' => $second['productId'], 'variant_id' => $second['variantId'], 'quantity' => 5, 'unit_cost' => 40],
        ]])->assertCreated()->json('data.id');
        $this->postJson("/api/purchase-orders/{$this->orderId}/approve")->assertOk();
    }

    /** The shape DirectPurchaseEntry.jsx saves; lines are [item index => qty]. */
    private function purchase(array $lines, array $extra = []): array
    {
        $items = [];
        foreach ($lines as $index => $qty) {
            $items[] = ['sNo' => count($items) + 1, 'productId' => $this->fixture['items'][$index]['productId'], 'productName' => "Item $index",
                'qty' => $qty, 'cost' => 50, 'discount' => 0, 'marginPerc' => 0, 'price' => 100, 'amount' => $qty * 50, 'jumpDetails' => []];
        }

        return ['companyId' => $this->fixture['store']->id, 'supplierId' => $this->supplierId, 'purchaseType' => 'Direct', 'invoiceNo' => 'RC-'.count($items),
            'invoiceDate' => now()->toDateString(), 'taxLines' => [], 'billValue' => 0, 'total' => 0, 'purchaseOrderId' => $this->orderId, 'items' => $items, ...$extra];
    }

    private function order(): array
    {
        return $this->getJson("/api/purchase-orders/{$this->orderId}")->assertOk()->json('data');
    }

    public function test_receipts_fill_the_order_close_it_and_reopen_it_when_taken_back(): void
    {
        $firstId = $this->postJson('/api/direct-purchases', $this->purchase([0 => 4, 1 => 5]))->assertCreated()
            ->assertJsonPath('data.purchase_order_id', $this->orderId)->json('data.id');
        $order = $this->order();
        $this->assertSame('APPROVED', $order['status']);                       // Part received.
        $this->assertEquals([4, 5], array_map('floatval', array_column($order['items'], 'received_qty')));
        $this->assertSame($order['po_no'], DB::table('direct_purchases')->where('id', $firstId)->value('po_no'));
        $this->assertCount(1, $order['receipts']);

        // Reorder counts only what is still to come.
        $this->assertEquals(6, (float) DB::table('purchase_order_items')->where('purchase_order_id', $this->orderId)->get()
            ->sum(fn ($line) => max(0, $line->quantity - $line->received_qty)));

        $secondId = $this->postJson('/api/direct-purchases', $this->purchase([0 => 8]))->assertCreated()->json('data.id');
        $order = $this->order();
        $this->assertSame('CLOSED', $order['status']);                         // Everything arrived (2 more than ordered).
        $this->assertSame('RECEIVED', $order['close_reason']);
        $this->assertEquals([12, 5], array_map('floatval', array_column($order['items'], 'received_qty')));
        $this->postJson('/api/direct-purchases', $this->purchase([0 => 1]))->assertUnprocessable()->assertJsonValidationErrors('purchaseOrderId');

        // Editing the second receipt down, then deleting it, reopens the order.
        $this->putJson("/api/direct-purchases/$secondId", $this->purchase([0 => 3]))->assertOk();
        $this->assertSame('APPROVED', $this->order()['status']);
        $this->assertEquals(7, (float) $this->order()['items'][0]['received_qty']);
        $this->deleteJson("/api/direct-purchases/$secondId")->assertOk();
        $this->assertEquals(4, (float) $this->order()['items'][0]['received_qty']);

        // A status-only PATCH keeps the link.
        $this->putJson("/api/direct-purchases/$firstId", ['invoiceWorkflowStatus' => 'invoice_progress'])->assertOk();
        $this->assertSame($this->orderId, DB::table('direct_purchases')->where('id', $firstId)->value('purchase_order_id'));
    }

    public function test_a_temporary_draft_does_not_count_and_a_closed_by_hand_order_stays_closed(): void
    {
        $draftId = $this->postJson('/api/direct-purchases', $this->purchase([0 => 10, 1 => 5], ['invoiceWorkflowStatus' => 'temporary']))->assertCreated()->json('data.id');
        $this->assertEquals(0, (float) $this->order()['items'][0]['received_qty']);
        $this->putJson("/api/direct-purchases/$draftId", ['invoiceWorkflowStatus' => 'invoice_completed'])->assertOk();
        $this->assertSame('CLOSED', $this->order()['status']);

        $this->deleteJson("/api/direct-purchases/$draftId")->assertOk();
        $this->assertSame('APPROVED', $this->order()['status']);
        $keptId = $this->postJson('/api/direct-purchases', $this->purchase([0 => 2]))->assertCreated()->json('data.id');
        $this->postJson("/api/purchase-orders/{$this->orderId}/close")->assertOk();
        $this->postJson('/api/direct-purchases', $this->purchase([0 => 1]))->assertUnprocessable(); // Closed by hand: no more receipts.
        $this->putJson("/api/direct-purchases/$keptId", $this->purchase([0 => 3]))->assertOk();          // An existing receipt can still be edited.
        $this->assertEquals(3, (float) $this->order()['items'][0]['received_qty']);
        $this->assertSame('CLOSED', $this->order()['status']);
        $this->assertSame('MANUAL', $this->order()['close_reason']);
    }

    public function test_the_order_must_be_this_suppliers_and_this_stores(): void
    {
        $other = $this->postJson('/api/suppliers', ['name' => 'Other Mill', 'code' => 'RC-OTHER'])->assertCreated()->json('data.id');
        $this->postJson('/api/direct-purchases', $this->purchase([0 => 1], ['supplierId' => $other]))->assertUnprocessable()->assertJsonValidationErrors('purchaseOrderId');

        $elsewhere = Store::create(['name' => 'Other Store', 'code' => 'RC-OS', 'is_active' => true]);
        PurchaseOrder::whereKey($this->orderId)->update(['store_id' => $elsewhere->id]);
        $this->postJson('/api/direct-purchases', $this->purchase([0 => 1]))->assertUnprocessable()->assertJsonValidationErrors('purchaseOrderId');
        $this->assertSame(0, DB::table('direct_purchases')->count());
    }
}
