<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Size;
use App\Models\SizeGroup;
use App\Models\Store;
use App\Models\SystemConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class StoreTransferFlowTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private Store $branch;

    private User $sender;

    private User $receiver;

    protected function setUp(): void
    {
        parent::setUp();
        // Barcode numbering uses MariaDB's REGEXP; give the SQLite test database the same function.
        DB::connection()->getPdo()->sqliteCreateFunction('regexp', fn ($pattern, $value) => (int) preg_match('/'.str_replace('/', '\/', $pattern).'/u', (string) $value), 2);
        $this->fixture = PosPerformanceFixture::create(1); // Warehouse store with 1000 in stock.
        $this->branch = Store::create(['name' => 'Branch', 'code' => 'BRANCH', 'is_active' => true]);
        $counter = SystemConfiguration::create(['store_id' => $this->branch->id, 'key' => 'counter', 'value' => 'Branch Till', 'is_active' => true]);
        $make = fn (string $name, string $role, int $store) => User::create(['name' => $name, 'username' => strtolower($name), 'email' => strtolower($name).'@transfer.test',
            'password' => 'secret-pass', 'role' => $role, 'store_id' => $store, 'counter_id' => $counter->id, 'is_active' => true]);
        $this->sender = $make('Packer', 'warehouse', $this->fixture['store']->id);
        $this->receiver = $make('BranchManager', 'manager', $this->branch->id);
        // The warehouse sells this item in size M; sizes belong to each store.
        $size = $this->makeSize($this->fixture['store']->id);
        ProductVariant::whereKey($this->fixture['items'][0]['variantId'])->update(['size_id' => $size->id, 'design_no' => 'D-1']);
    }

    private function makeSize(int $store): Size
    {
        // After an API call the test request still carries the last selected store, whose ownership
        // hook would stamp these seeded rows with that store; seed them as plain setup instead.
        request()->attributes->remove('store_context_write');
        $group = SizeGroup::create(['name' => 'Apparel', 'code' => 'APP', 'company_id' => $store]);

        return Size::create(['name' => 'M', 'code' => 'M', 'size_group_id' => $group->id, 'company_id' => $store]);
    }

    private function branchSize(): void
    {
        $this->makeSize($this->branch->id);
    }

    private function stock(Store|int $store): float
    {
        return (float) DB::table('stocks')->where('store_id', $store instanceof Store ? $store->id : $store)->sum('quantity');
    }

    private function dispatch(float $qty)
    {
        Sanctum::actingAs($this->sender);
        $item = $this->fixture['items'][0];

        return $this->postJson('/api/stock-outwards', ['target_store_id' => $this->branch->id, 'notes' => 'Weekly replenishment',
            'items' => [['product_id' => $item['productId'], 'variant_id' => $item['variantId'], 'quantity' => $qty, 'unit_price' => 50]]]);
    }

    public function test_dispatched_stock_is_in_transit_until_the_branch_receives_what_arrived(): void
    {
        $this->branch->forceFill(['platform_company_code' => 'CMP-T'])->save();
        $this->fixture['store']->forceFill(['platform_company_code' => 'CMP-T'])->save();
        Store::create(['name' => 'Someone else', 'code' => 'ELSE', 'is_active' => true, 'platform_company_code' => 'CMP-X']);
        Sanctum::actingAs($this->sender);
        $this->assertSame(['Branch'], array_column($this->getJson('/api/stock-outwards/destinations')->assertOk()->json('data'), 'name'));
        $id = $this->dispatch(10)->assertCreated()->assertJsonPath('data.status', 'DISPATCHED')->assertJsonPath('data.total_qty', 10)->json('data.id');
        $this->assertSame(990.0, $this->stock($this->fixture['store']));
        $this->assertSame(0.0, $this->stock($this->branch)); // Not sellable at the branch while on the truck.

        $this->postJson("/api/stock-outwards/$id/receive", [])->assertForbidden(); // The sender cannot receive.

        Sanctum::actingAs($this->receiver);
        $this->getJson('/api/stock-outwards?direction=incoming&status=dispatched')->assertOk()->assertJsonPath('data.0.id', $id);
        $this->postJson("/api/stock-outwards/$id/cancel")->assertForbidden(); // Only the sender can call it back.
        // The branch never sees the warehouse's product, only what the line says was sent.
        $line = $this->getJson("/api/stock-outwards/$id")->assertOk()->assertJsonPath('data.items.0.product', null)
            ->assertJsonPath('data.items.0.product_name', 'TEMP Performance Item 1')->assertJsonPath('data.items.0.size', 'M')->json('data.items.0.id');
        $this->postJson("/api/stock-outwards/$id/receive", [])->assertUnprocessable()->assertJsonValidationErrors('items'); // Branch lacks size M.
        $this->branchSize();
        $this->postJson("/api/stock-outwards/$id/receive", ['items' => [['id' => $line, 'received_qty' => 9, 'damaged_qty' => 2]]])->assertUnprocessable();
        $this->postJson("/api/stock-outwards/$id/receive", ['notes' => 'Carton torn', 'items' => [['id' => $line, 'received_qty' => 8, 'damaged_qty' => 1, 'note' => 'Wet']]])
            ->assertOk()->assertJsonPath('data.status', 'RECEIVED')->assertJsonPath('data.received_total', 8)
            ->assertJsonPath('data.damaged_total', 1)->assertJsonPath('data.shortage_qty', 1)->assertJsonPath('data.receiver.name', 'BranchManager');
        $this->assertSame(8.0, $this->stock($this->branch)); // Only good stock that arrived is added.
        // ...to the branch's own copy of the product (same code, owned by the branch), in its own size M.
        $copy = Product::withoutGlobalScopes()->where('company_id', $this->branch->id)->where('code', 'TEMP-PERF-0001')->firstOrFail();
        $this->assertNotSame($this->fixture['items'][0]['productId'], $copy->id);
        $variant = ProductVariant::withoutGlobalScopes()->where('product_id', $copy->id)->firstOrFail();
        $this->assertSame('M', Size::withoutGlobalScopes()->find($variant->size_id)->name);
        $this->assertSame((int) $this->branch->id, (int) Size::withoutGlobalScopes()->find($variant->size_id)->company_id);
        $this->assertEquals(8, DB::table('stocks')->where('store_id', $this->branch->id)->where('product_id', $copy->id)->sum('quantity'));
        $this->postJson("/api/stock-outwards/$id/receive", [])->assertUnprocessable();

        // The branch prints its own labels for what arrived, once per line; the warehouse never sees them.
        $received = $this->getJson("/api/stock-outwards/$id")->assertOk()->assertJsonPath('data.items.0.received_product_id', $copy->id)->json('data.items.0');
        $labels = ['items' => [['stockOutwardItemId' => $line, 'productId' => $copy->id, 'productName' => $received['product_name'], 'size' => 'M',
            'designNo' => 'D-1', 'qty' => 8, 'mrp' => 100, 'sellingPrice' => 100, 'finalPrice' => 100]]];
        $this->postJson('/api/barcodes/generate', $labels)->assertSuccessful();
        $printed = count($this->getJson("/api/barcodes?stock_outward_id=$id&limit=50")->assertOk()->json('data'));
        $this->assertGreaterThan(0, $printed);
        $this->postJson('/api/barcodes/generate', $labels)->assertSuccessful();
        $this->assertCount($printed, $this->getJson("/api/barcodes?stock_outward_id=$id&limit=50")->json('data'));
        Sanctum::actingAs($this->sender);
        $this->assertSame([], $this->getJson("/api/barcodes?stock_outward_id=$id&limit=50")->assertOk()->json('data'));
    }

    public function test_cancelling_in_transit_returns_stock_and_overdrawn_dispatch_is_refused(): void
    {
        $id = $this->dispatch(25)->assertCreated()->json('data.id');
        $this->dispatch(5000)->assertUnprocessable();
        Sanctum::actingAs(User::create(['name' => 'Boss', 'username' => 'boss', 'email' => 'boss@transfer.test', 'password' => 'secret-pass',
            'role' => 'manager', 'store_id' => $this->fixture['store']->id, 'is_active' => true]));
        $this->postJson("/api/stock-outwards/$id/cancel")->assertOk()->assertJsonPath('data.status', 'CANCELLED');
        $this->assertSame(1000.0, $this->stock($this->fixture['store']));
        $this->postJson("/api/stock-outwards/$id/cancel")->assertUnprocessable();
    }

    public function test_a_retried_dispatch_with_the_same_key_moves_stock_once_and_is_addressed_by_key(): void
    {
        Sanctum::actingAs($this->sender);
        $item = $this->fixture['items'][0];
        $body = ['transfer_key' => '0b6f3a52-5d8e-4a57-9c1e-2f4f7a1c9d10', 'target_store_id' => $this->branch->id,
            'items' => [['product_id' => $item['productId'], 'variant_id' => $item['variantId'], 'quantity' => 4]]];
        $first = $this->postJson('/api/stock-outwards', $body)->assertCreated()->json('data');
        $this->postJson('/api/stock-outwards', $body)->assertOk()->assertJsonPath('data.id', $first['id']);
        $this->assertSame(996.0, $this->stock($this->fixture['store']));
        $this->assertSame($body['transfer_key'], $first['uuid']);

        $this->branchSize();
        Sanctum::actingAs($this->receiver);
        $this->postJson("/api/stock-outwards/{$first['uuid']}/receive", [])->assertOk()->assertJsonPath('data.received_total', 4);
    }

    public function test_other_stores_cannot_see_or_touch_a_transfer(): void
    {
        $id = $this->dispatch(3)->assertCreated()->json('data.id');
        $outsider = User::create(['name' => 'Outsider', 'username' => 'outsider', 'email' => 'outsider@transfer.test', 'password' => 'secret-pass',
            'role' => 'manager', 'store_id' => Store::create(['name' => 'Other', 'code' => 'OTHER', 'is_active' => true])->id, 'is_active' => true]);
        Sanctum::actingAs($outsider);
        $this->assertSame([], $this->getJson('/api/stock-outwards?limit=50')->assertOk()->json('data'));
        $this->getJson("/api/stock-outwards/$id")->assertNotFound();
        $this->postJson("/api/stock-outwards/$id/receive", [])->assertForbidden();
    }
}
