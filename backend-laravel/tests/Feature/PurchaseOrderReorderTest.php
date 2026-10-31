<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class PurchaseOrderReorderTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $mill;

    private int $weaver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(3); // 1000 in stock of each item.
        $store = $this->fixture['store']->id;
        $this->mill = $this->supplier('Cotton Mill', 'MILL', $store);
        $this->weaver = $this->supplier('Weaver', 'WEAVER', $store);
        [$first, $second, $third] = array_column($this->fixture['items'], 'productId');
        $this->levels($first, ['auto_po_min' => 1500, 'auto_po_max' => 2000]);                                   // 1000 <= 1500: order 1000.
        $this->levels($second, ['auto_po_min' => 1200, 'auto_po_max' => 1600, 'preferred_supplier_id' => $this->weaver]);
        $this->levels($third, ['auto_po_min' => 1500, 'auto_po_max' => 2000, 'disable_po' => 'Yes']);            // Opted out.
        // The first item was last bought from the mill (an older purchase from the weaver is superseded).
        foreach ([['2026-01-01', $this->weaver, 'IE-OLD'], ['2026-06-01', $this->mill, 'IE-NEW']] as [$date, $supplier, $no]) {
            DB::table('inventory_entries')->insert(['store_id' => $store, 'entry_no' => $no, 'entry_date' => $date, 'supplier_id' => $supplier,
                'product_id' => $first, 'type' => 'PURCHASE', 'status' => 'COMPLETED', 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    private function supplier(string $name, string $code, int $store): int
    {
        return DB::table('suppliers')->insertGetId(['name' => $name, 'code' => $code, 'store_id' => $store, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function levels(int $productId, array $details): void
    {
        $product = Product::withoutGlobalScopes()->findOrFail($productId);
        DB::table('products')->where('id', $productId)->update(['master_details' => json_encode([...($product->master_details ?? []), ...$details])]);
    }

    private function as(string $role): User
    {
        $user = User::create(['name' => ucfirst($role), 'username' => "po-$role", 'email' => "$role@po.test", 'password' => 'secret-pass',
            'role' => $role, 'store_id' => $this->fixture['store']->id, 'is_active' => true]);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_suggests_reorders_with_the_right_supplier_and_never_orders_a_shortage_twice(): void
    {
        $this->as('warehouse');
        $suggestions = collect($this->getJson('/api/purchase-orders/suggestions')->assertOk()->json('data'))->keyBy('product_id');
        [$first, $second, $third] = array_column($this->fixture['items'], 'productId');
        $this->assertEquals(1000, $suggestions[$first]['suggested']);
        $this->assertSame('Cotton Mill', $suggestions[$first]['supplier_name']);      // Last bought from.
        $this->assertEquals(600, $suggestions[$second]['suggested']);
        $this->assertSame('Weaver', $suggestions[$second]['supplier_name']);         // Preferred supplier.
        $this->assertArrayNotHasKey($third, $suggestions->all());                     // Disable PO.

        $drafts = $this->postJson('/api/purchase-orders/generate')->assertOk()->json('data');
        $this->assertEqualsCanonicalizing(['Cotton Mill', 'Weaver'], array_column(array_column($drafts, 'supplier'), 'name'));
        $this->assertSame('AUTO', $drafts[0]['source']);
        $this->assertSame([], $this->getJson('/api/purchase-orders/suggestions')->json('data')); // All of it is on order now.
        $this->postJson('/api/purchase-orders/generate')->assertOk()->assertJsonPath('data', []);
    }

    public function test_drafts_are_edited_then_approved_by_a_manager_and_cancelling_frees_the_quantity(): void
    {
        $this->as('warehouse');
        $item = $this->fixture['items'][0];
        $id = $this->postJson('/api/purchase-orders', ['items' => [['product_id' => $item['productId'], 'variant_id' => $item['variantId'], 'quantity' => 40, 'unit_cost' => 50]]])
            ->assertCreated()->assertJsonPath('data.status', 'DRAFT')->assertJsonPath('data.total_amount', '2000.00')->json('data.uuid');
        $this->postJson("/api/purchase-orders/$id/approve")->assertForbidden(); // Warehouse staff draft; managers approve.

        $this->as('manager');
        $this->postJson("/api/purchase-orders/$id/approve")->assertUnprocessable()->assertJsonValidationErrors('supplier_id');
        $this->putJson("/api/purchase-orders/$id", ['supplier_id' => $this->mill, 'items' => [['product_id' => $item['productId'], 'variant_id' => $item['variantId'], 'quantity' => 60, 'unit_cost' => 50]]])
            ->assertOk()->assertJsonPath('data.total_qty', '60.000');
        $this->postJson("/api/purchase-orders/$id/approve")->assertOk()->assertJsonPath('data.status', 'APPROVED')->assertJsonPath('data.approver.name', 'Manager');
        $this->putJson("/api/purchase-orders/$id", ['items' => [['product_id' => $item['productId'], 'quantity' => 1]]])->assertUnprocessable();
        $this->deleteJson("/api/purchase-orders/$id")->assertUnprocessable();

        $onOrder = collect($this->getJson('/api/purchase-orders/suggestions')->json('data'))->firstWhere('product_id', $item['productId']);
        $this->assertEquals(60, $onOrder['on_order']);
        $this->postJson("/api/purchase-orders/$id/cancel")->assertOk()->assertJsonPath('data.status', 'CANCELLED');
        $this->assertEquals(1000, collect($this->getJson('/api/purchase-orders/suggestions')->json('data'))->firstWhere('product_id', $item['productId'])['suggested']);
    }

    public function test_other_stores_cannot_see_orders_or_use_foreign_records_and_cashiers_cannot_order(): void
    {
        $this->as('manager');
        $id = $this->postJson('/api/purchase-orders/generate')->json('data.0.uuid');
        $other = Store::create(['name' => 'Other', 'code' => 'PO-OTHER', 'is_active' => true]);
        $foreignSupplier = $this->supplier('Foreign', 'FOREIGN', $other->id);
        $this->putJson("/api/purchase-orders/$id", ['supplier_id' => $foreignSupplier, 'items' => [['product_id' => $this->fixture['items'][0]['productId'], 'quantity' => 1]]])
            ->assertUnprocessable()->assertJsonValidationErrors('supplier_id');

        Sanctum::actingAs(User::create(['name' => 'Outsider', 'username' => 'po-outsider', 'email' => 'outsider@po.test', 'password' => 'secret-pass',
            'role' => 'manager', 'store_id' => $other->id, 'is_active' => true]));
        $this->assertSame([], $this->getJson('/api/purchase-orders')->assertOk()->json('data'));
        $this->getJson("/api/purchase-orders/$id")->assertNotFound();

        $this->as('cashier');
        $this->postJson('/api/purchase-orders/generate')->assertForbidden();
    }

    public function test_the_nightly_job_drafts_orders_and_tells_the_store(): void
    {
        $this->artisan('purchase-orders:generate')->assertSuccessful();
        $this->assertSame(2, PurchaseOrder::withoutGlobalScopes()->where('status', 'DRAFT')->where('source', 'AUTO')->count());
        $this->assertDatabaseHas('app_notifications', ['type' => 'PURCHASE_ORDER_DRAFTS', 'store_id' => $this->fixture['store']->id, 'link' => '/store/purchase-order']);
    }
}
