<?php

namespace Tests\Unit;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Services\DocumentNumberService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * The C-suffix is the entire mechanism that keeps a cloud-authored write (made
 * during a store's local-server outage) from ever colliding with that store's
 * own independently-numbered local sequence once local comes back and both
 * sides reconcile -- see the live two-node test this suite formalizes. Also
 * covers the replay path (SyncCycleService pushing/pulling a queued write),
 * which must reuse the original number rather than mint a second one.
 */
class DocumentNumberServiceTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->store = Store::create(['name' => 'Test Flagship Store', 'code' => 'STR-001']);
    }

    public function test_local_node_never_gets_cloud_failover_suffix_even_with_an_enabled_local_node_row(): void
    {
        config(['sync.node_role' => 'local']);
        StoreLocalNode::create([
            'store_id' => $this->store->id, 'tenant_key' => 't1', 'sync_token' => 's1', 'enabled' => true,
        ]);

        $number = DocumentNumberService::next($this->store->id, 'INV');

        $this->assertStringNotContainsString('-C', $number);
        $this->assertSame("INV-STR-001-".now()->format('Ymd')."-0001", $number);
    }

    public function test_cloud_node_without_an_enabled_local_node_mints_a_normal_number(): void
    {
        config(['sync.node_role' => 'cloud']);

        $number = DocumentNumberService::next($this->store->id, 'INV');

        $this->assertStringNotContainsString('-C', $number);
    }

    public function test_cloud_node_with_an_enabled_local_node_mints_a_cloud_failover_suffixed_number(): void
    {
        config(['sync.node_role' => 'cloud']);
        StoreLocalNode::create([
            'store_id' => $this->store->id, 'tenant_key' => 't1', 'sync_token' => 's1', 'enabled' => true,
        ]);

        $number = DocumentNumberService::next($this->store->id, 'INV');

        $this->assertSame("INV-STR-001-".now()->format('Ymd')."-C0001", $number);
    }

    public function test_cloud_node_with_a_disabled_local_node_mints_a_normal_number(): void
    {
        config(['sync.node_role' => 'cloud']);
        StoreLocalNode::create([
            'store_id' => $this->store->id, 'tenant_key' => 't1', 'sync_token' => 's1', 'enabled' => false,
        ]);

        $number = DocumentNumberService::next($this->store->id, 'INV');

        $this->assertStringNotContainsString('-C', $number);
    }

    public function test_sequence_increments_per_call_and_is_independent_per_prefix(): void
    {
        config(['sync.node_role' => 'cloud']);

        $this->assertStringEndsWith('-0001', DocumentNumberService::next($this->store->id, 'INV'));
        $this->assertStringEndsWith('-0002', DocumentNumberService::next($this->store->id, 'INV'));
        $this->assertStringEndsWith('-0001', DocumentNumberService::next($this->store->id, 'PO'));
    }

    public function test_replay_reuses_the_supplied_number_instead_of_minting_a_new_one(): void
    {
        $number = DocumentNumberService::next($this->store->id, 'INV', isReplay: true, suppliedNumber: 'INV-STR-001-20260101-C0007');

        $this->assertSame('INV-STR-001-20260101-C0007', $number);
    }

    public function test_replay_without_a_supplied_number_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        DocumentNumberService::next($this->store->id, 'INV', isReplay: true);
    }

    public function test_a_replay_does_not_consume_a_sequence_slot(): void
    {
        config(['sync.node_role' => 'cloud']);

        DocumentNumberService::next($this->store->id, 'INV', isReplay: true, suppliedNumber: 'INV-STR-001-20260101-C9999');

        // The replayed number above was never actually drawn from this store's
        // own counter, so the very first real mint afterwards must still be #1.
        $this->assertStringEndsWith('-0001', DocumentNumberService::next($this->store->id, 'INV'));
    }

    public function test_resolve_reads_the_sync_replay_header_and_stashes_the_result_for_capture_sync_outbox(): void
    {
        $replay = Request::create('/api/pos-sales', 'POST', [
            '_syncDocumentNumbers' => ['INV' => 'INV-STR-001-20260101-C0042'],
        ]);
        $replay->headers->set('X-Sync-Replay', '1');

        $number = DocumentNumberService::resolve($replay, $this->store->id, 'INV');

        $this->assertSame('INV-STR-001-20260101-C0042', $number);
        $this->assertSame(['INV' => 'INV-STR-001-20260101-C0042'], $replay->attributes->get('_mintedDocumentNumbers'));
    }

    public function test_resolve_on_a_normal_request_mints_and_stashes_a_fresh_number(): void
    {
        config(['sync.node_role' => 'cloud']);
        $request = Request::create('/api/pos-sales', 'POST');

        $number = DocumentNumberService::resolve($request, $this->store->id, 'INV');

        $this->assertStringEndsWith('-0001', $number);
        $this->assertSame(['INV' => $number], $request->attributes->get('_mintedDocumentNumbers'));
    }
}
