<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Stock;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * CaptureSyncOutbox is the only thing standing between "wrote to this node"
 * and "the other node will eventually see it" -- if it captures the wrong
 * things (or the right things under the wrong conditions), a local write
 * silently never reaches cloud, or a cloud write gets queued for a store with
 * no local install to receive it. See the live two-node test this suite
 * formalizes for the end-to-end behavior this middleware makes possible.
 */
class CaptureSyncOutboxTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;
    protected User $user;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create(['name' => 'Test Flagship Store', 'code' => 'STR-001']);
        $this->user = User::create([
            'name' => 'Test Admin', 'username' => 'testadmin', 'email' => 'admin@example.com',
            'password' => bcrypt('secret123'), 'role' => 'admin', 'store_id' => $this->store->id,
        ]);
        $this->product = Product::create([
            'name' => 'Test Widget', 'code' => 'WGT-1', 'sku' => 'WGT-SKU', 'barcode' => 'WGT-BC',
            'selling_price' => 100, 'is_active' => true,
        ]);
        Stock::create([
            'store_id' => $this->store->id, 'product_id' => $this->product->id,
            'quantity' => 100, 'available_quantity' => 100,
        ]);
        Sanctum::actingAs($this->user);
    }

    private function makeSale()
    {
        return $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->postJson('/api/pos-sales', [
                'items' => [['productId' => $this->product->id, 'qty' => 1, 'price' => 100]],
                'cashAmount' => 100,
            ]);
    }

    public function test_local_node_queues_a_successful_write(): void
    {
        config(['sync.node_role' => 'local']);

        $this->makeSale()->assertCreated();

        $this->assertSame(1, SyncOutboxEvent::count());
        $event = SyncOutboxEvent::first();
        $this->assertSame('POST', $event->method);
        $this->assertSame('/pos-sales', $event->path);
        $this->assertSame('application/json', $event->headers['Content-Type']);
    }

    public function test_cloud_node_queues_a_write_when_the_store_has_an_enabled_local_node(): void
    {
        config(['sync.node_role' => 'cloud']);
        StoreLocalNode::create([
            'store_id' => $this->store->id, 'tenant_key' => 't1', 'sync_token' => 's1', 'enabled' => true,
        ]);

        $this->makeSale()->assertCreated();

        $this->assertSame(1, SyncOutboxEvent::count());
    }

    public function test_cloud_node_does_not_queue_a_write_when_the_store_has_no_local_node(): void
    {
        config(['sync.node_role' => 'cloud']);

        $this->makeSale()->assertCreated();

        $this->assertSame(0, SyncOutboxEvent::count());
    }

    public function test_cloud_node_does_not_queue_a_write_for_a_disabled_local_node(): void
    {
        config(['sync.node_role' => 'cloud']);
        StoreLocalNode::create([
            'store_id' => $this->store->id, 'tenant_key' => 't1', 'sync_token' => 's1', 'enabled' => false,
        ]);

        $this->makeSale()->assertCreated();

        $this->assertSame(0, SyncOutboxEvent::count());
    }

    public function test_a_failed_write_is_never_queued(): void
    {
        config(['sync.node_role' => 'local']);

        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->postJson('/api/pos-sales', ['items' => []]);

        $res->assertStatus(422);
        $this->assertSame(0, SyncOutboxEvent::count());
    }

    public function test_a_replayed_request_is_never_requeued_to_avoid_infinite_ping_pong(): void
    {
        config(['sync.node_role' => 'local']);

        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->withHeader('X-Sync-Replay', '1')
            ->postJson('/api/pos-sales', [
                'items' => [['productId' => $this->product->id, 'qty' => 1, 'price' => 100]],
                'cashAmount' => 100,
                '_syncDocumentNumbers' => ['INV' => 'INV-STR-001-20260101-0099'],
            ])->assertCreated();

        $this->assertSame(0, SyncOutboxEvent::count());
    }

    public function test_excluded_paths_like_auth_are_never_queued(): void
    {
        config(['sync.node_role' => 'local']);

        $this->postJson('/api/auth/logout')->assertOk();

        $this->assertSame(0, SyncOutboxEvent::count());
    }
}
