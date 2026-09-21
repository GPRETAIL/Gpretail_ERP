<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Stock;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Discovered live: a sync-replayed write (local pushing to cloud, or cloud's
 * queued write being applied locally) carries no per-user token -- the
 * original requester's token is never captured and wouldn't be meaningful on
 * the other side anyway, since each node manages its own users independently.
 * Before this middleware existed, every replay 401'd against auth:sanctum and
 * the local<->cloud push direction of sync didn't actually work. This proves
 * the node-trust bridge (tenant_key + sync_token, the same credential
 * SyncController::authenticateNode() already checks for the dedicated
 * /sync/* endpoints) correctly stands in for a user token on business routes,
 * and only when that trust genuinely validates.
 */
class AuthenticateSyncReplayTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;
    protected Product $product;
    protected StoreLocalNode $node;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create(['name' => 'Test Flagship Store', 'code' => 'STR-001']);
        $this->product = Product::create([
            'name' => 'Test Widget', 'code' => 'WGT-1', 'sku' => 'WGT-SKU', 'barcode' => 'WGT-BC',
            'selling_price' => 100, 'is_active' => true,
        ]);
        Stock::create([
            'store_id' => $this->store->id, 'product_id' => $this->product->id,
            'quantity' => 100, 'available_quantity' => 100,
        ]);
        $this->node = StoreLocalNode::create([
            'store_id' => $this->store->id, 'tenant_key' => 'tenant-abc', 'sync_token' => 'token-xyz', 'enabled' => true,
        ]);
    }

    private function replayHeaders(array $overrides = []): array
    {
        return array_merge([
            'X-Sync-Replay' => '1',
            'X-Company-Scope-Id' => (string) $this->store->id,
            'X-Tenant-Key' => 'tenant-abc',
            'X-Sync-Token' => 'token-xyz',
        ], $overrides);
    }

    private function replayPayload(): array
    {
        return [
            'items' => [['productId' => $this->product->id, 'qty' => 1, 'price' => 100]],
            'cashAmount' => 100,
            '_syncDocumentNumbers' => ['INV' => 'INV-STR-001-20260101-C0001'],
        ];
    }

    public function test_valid_node_trust_authenticates_the_request_as_the_stores_sync_user(): void
    {
        $res = $this->withHeaders($this->replayHeaders())->postJson('/api/pos-sales', $this->replayPayload());

        $res->assertCreated();
        $this->assertSame('INV-STR-001-20260101-C0001', $res->json('data.invoice_no'));

        $syncUser = User::where('role', 'sync_system')->first();
        $this->assertNotNull($syncUser);
        $this->assertSame($this->store->id, $syncUser->store_id);
        $this->assertFalse((bool) $syncUser->is_active);
        $this->assertSame($syncUser->id, $res->json('data.user_id'));
    }

    public function test_the_sync_user_is_reused_not_recreated_on_a_second_replay(): void
    {
        $this->withHeaders($this->replayHeaders())->postJson('/api/pos-sales', $this->replayPayload())->assertCreated();

        $secondPayload = $this->replayPayload();
        $secondPayload['_syncDocumentNumbers']['INV'] = 'INV-STR-001-20260101-C0002';
        $this->withHeaders($this->replayHeaders())->postJson('/api/pos-sales', $secondPayload)->assertCreated();

        $this->assertSame(1, User::where('role', 'sync_system')->count());
    }

    public function test_missing_tenant_key_falls_through_to_normal_auth_and_401s(): void
    {
        $res = $this->withHeaders($this->replayHeaders(['X-Tenant-Key' => '']))
            ->postJson('/api/pos-sales', $this->replayPayload());

        $res->assertUnauthorized();
    }

    public function test_wrong_sync_token_falls_through_to_normal_auth_and_401s(): void
    {
        $res = $this->withHeaders($this->replayHeaders(['X-Sync-Token' => 'not-the-real-token']))
            ->postJson('/api/pos-sales', $this->replayPayload());

        $res->assertUnauthorized();
    }

    public function test_a_disabled_node_falls_through_to_normal_auth_and_401s(): void
    {
        $this->node->update(['enabled' => false]);

        $res = $this->withHeaders($this->replayHeaders())->postJson('/api/pos-sales', $this->replayPayload());

        $res->assertUnauthorized();
    }

    public function test_tenant_key_for_a_different_store_does_not_authenticate_this_stores_scope(): void
    {
        $otherStore = Store::create(['name' => 'Other Store', 'code' => 'STR-002']);
        StoreLocalNode::create([
            'store_id' => $otherStore->id, 'tenant_key' => 'other-tenant', 'sync_token' => 'other-token', 'enabled' => true,
        ]);

        $res = $this->withHeaders($this->replayHeaders(['X-Tenant-Key' => 'other-tenant', 'X-Sync-Token' => 'other-token']))
            ->postJson('/api/pos-sales', $this->replayPayload());

        $res->assertUnauthorized();
    }

    public function test_a_non_replay_request_is_unaffected_and_still_requires_a_real_token(): void
    {
        $res = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->postJson('/api/pos-sales', $this->replayPayload());

        $res->assertUnauthorized();
    }
}
