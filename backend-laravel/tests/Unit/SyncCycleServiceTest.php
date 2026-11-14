<?php

namespace Tests\Unit;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use App\Services\Platform\SyncCycleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * SyncCycleService is what actually drains a local install's queued writes to
 * cloud and pulls back whatever cloud queued for this store -- the live
 * two-node test this suite formalizes exercises the real thing end to end,
 * this covers the push/pull edge cases (idempotent replay, partial-batch
 * failure, node-trust headers on both hops) against a faked cloud so they run
 * in CI without two real servers.
 */
class SyncCycleServiceTest extends TestCase
{
    use RefreshDatabase;

    protected Store $store;

    protected StoreLocalNode $node;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'sync.node_role' => 'local',
            'sync.cloud_api_base_url' => 'https://cloud.example.test/api',
        ]);

        $this->store = Store::create(['name' => 'Test Flagship Store', 'code' => 'STR-001']);
        $this->node = StoreLocalNode::create([
            'store_id' => $this->store->id,
            'tenant_key' => 'tenant-abc',
            'sync_token' => 'token-xyz',
            'enabled' => true,
        ]);
    }

    private function fakeIdlePullAndHeartbeat(array $extra = []): void
    {
        Http::fake(array_merge([
            'cloud.example.test/api/sync/outbound/next*' => Http::response(['success' => true, 'data' => ['events' => []]]),
            'cloud.example.test/api/sync/heartbeat' => Http::response(['success' => true]),
        ], $extra));
    }

    public function test_run_does_nothing_when_node_role_is_not_local(): void
    {
        config(['sync.node_role' => 'cloud']);

        $result = app(SyncCycleService::class)->run();

        $this->assertFalse($result['ran']);
    }

    public function test_saved_cloud_origin_is_used_for_sync_instead_of_the_installation_default(): void
    {
        $this->node->update(['cloud_server_url' => 'https://alternate.example.test']);
        Http::fake(['*' => Http::response(['success' => true, 'data' => ['events' => []]])]);
        $this->assertTrue(app(SyncCycleService::class)->run()['ran']);
        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://alternate.example.test/api/sync/'));
        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'cloud.example.test'));
    }

    public function test_run_does_nothing_when_no_enabled_local_node_exists(): void
    {
        $this->node->update(['enabled' => false]);

        $result = app(SyncCycleService::class)->run();

        $this->assertFalse($result['ran']);
    }

    public function test_push_sends_node_trust_headers_and_marks_event_acked_on_success(): void
    {
        $event = SyncOutboxEvent::create([
            'store_id' => $this->store->id, 'method' => 'POST', 'path' => '/pos-sales',
            'payload' => ['items' => []], 'headers' => ['Content-Type' => 'application/json'],
            'idempotency_key' => 'k1', 'status' => 'pending',
        ]);

        $this->fakeIdlePullAndHeartbeat([
            'cloud.example.test/api/pos-sales' => Http::response(['success' => true], 201),
        ]);

        $result = app(SyncCycleService::class)->run();

        $this->assertSame(1, $result['pushed']['sent']);
        $this->assertSame('acked', $event->fresh()->status);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://cloud.example.test/api/pos-sales'
                && $request->hasHeader('X-Tenant-Key', 'tenant-abc')
                && $request->hasHeader('X-Sync-Token', 'token-xyz')
                && $request->hasHeader('X-Sync-Replay', '1');
        });
    }

    public function test_push_treats_409_as_idempotent_success(): void
    {
        $event = SyncOutboxEvent::create([
            'store_id' => $this->store->id, 'method' => 'POST', 'path' => '/pos-sales',
            'payload' => [], 'headers' => [], 'idempotency_key' => 'k1', 'status' => 'pending',
        ]);

        $this->fakeIdlePullAndHeartbeat([
            'cloud.example.test/api/pos-sales' => Http::response(['success' => false, 'message' => 'This record already exists.'], 409),
        ]);

        $result = app(SyncCycleService::class)->run();

        $this->assertSame(1, $result['pushed']['sent']);
        $this->assertSame('acked', $event->fresh()->status);
    }

    public function test_push_treats_a_delete_404_as_idempotent_success(): void
    {
        $event = SyncOutboxEvent::create([
            'store_id' => $this->store->id, 'method' => 'DELETE', 'path' => '/pos-sales/9',
            'payload' => [], 'headers' => [], 'idempotency_key' => 'k1', 'status' => 'pending',
        ]);

        $this->fakeIdlePullAndHeartbeat([
            'cloud.example.test/api/pos-sales/9' => Http::response(['success' => false], 404),
        ]);

        $result = app(SyncCycleService::class)->run();

        $this->assertSame(1, $result['pushed']['sent']);
        $this->assertSame('acked', $event->fresh()->status);
    }

    public function test_push_marks_a_non_5xx_failure_and_continues_to_the_next_event(): void
    {
        $bad = SyncOutboxEvent::create([
            'store_id' => $this->store->id, 'method' => 'POST', 'path' => '/pos-sales',
            'payload' => [], 'headers' => [], 'idempotency_key' => 'k1', 'status' => 'pending',
        ]);
        $good = SyncOutboxEvent::create([
            'store_id' => $this->store->id, 'method' => 'POST', 'path' => '/purchases',
            'payload' => [], 'headers' => [], 'idempotency_key' => 'k2', 'status' => 'pending',
        ]);

        $this->fakeIdlePullAndHeartbeat([
            'cloud.example.test/api/pos-sales' => Http::response(['success' => false, 'errors' => []], 422),
            'cloud.example.test/api/purchases' => Http::response(['success' => true], 201),
        ]);

        $result = app(SyncCycleService::class)->run();

        $this->assertSame(1, $result['pushed']['sent']);
        $this->assertSame(1, $result['pushed']['failed']);
        $this->assertFalse($result['pushed']['stopped_early']);
        $this->assertSame('failed', $bad->fresh()->status);
        $this->assertSame('acked', $good->fresh()->status);
    }

    public function test_push_stops_the_batch_early_on_a_5xx_to_preserve_ordering(): void
    {
        $first = SyncOutboxEvent::create([
            'store_id' => $this->store->id, 'method' => 'POST', 'path' => '/pos-sales',
            'payload' => [], 'headers' => [], 'idempotency_key' => 'k1', 'status' => 'pending',
        ]);
        $second = SyncOutboxEvent::create([
            'store_id' => $this->store->id, 'method' => 'POST', 'path' => '/purchases',
            'payload' => [], 'headers' => [], 'idempotency_key' => 'k2', 'status' => 'pending',
        ]);

        $this->fakeIdlePullAndHeartbeat([
            'cloud.example.test/api/pos-sales' => Http::response(['success' => false], 500),
        ]);

        $result = app(SyncCycleService::class)->run();

        $this->assertTrue($result['pushed']['stopped_early']);
        // The cloud was unhealthy, not the write: it stays queued for the next cycle, with the reason kept.
        $this->assertSame('pending', $first->fresh()->status);
        $this->assertSame(1, $first->fresh()->attempts);
        $this->assertStringContainsString('HTTP 500', $first->fresh()->last_error);
        // Never attempted -- the batch stopped before reaching it.
        $this->assertSame('pending', $second->fresh()->status);

        // If it only ever gets a server error, it is set aside after a few tries and the queue moves on.
        Http::fake(['cloud.example.test/api/purchases' => Http::response(['success' => true], 201)]);
        for ($try = 0; $try < 4; $try++) {
            app(SyncCycleService::class)->run();
        }
        $this->assertSame('failed', $first->fresh()->status);
        $this->assertSame('acked', $second->fresh()->status);
    }

    public function test_an_unreachable_cloud_leaves_writes_queued_and_a_second_sync_waits_for_the_first(): void
    {
        $event = SyncOutboxEvent::create([
            'store_id' => $this->store->id, 'method' => 'POST', 'path' => '/pos-sales',
            'payload' => [], 'headers' => [], 'idempotency_key' => 'k1', 'status' => 'pending',
        ]);
        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('Could not resolve host'));

        app(SyncCycleService::class)->run();
        $this->assertSame('pending', $event->fresh()->status);
        $this->assertNull(\App\Services\Platform\SyncProgress::current(), 'progress ends with the sync');

        $lock = \Illuminate\Support\Facades\Cache::lock(SyncCycleService::LOCK, 60);
        $lock->get();
        try {
            $this->assertTrue(app(SyncCycleService::class)->run()['busy']);
        } finally {
            $lock->release();
        }
    }

    public function test_pull_fetches_applies_and_acks_cloud_origin_events(): void
    {
        Http::fake([
            'cloud.example.test/api/sync/outbound/next*' => Http::response(['success' => true, 'data' => [
                'events' => [
                    ['id' => 55, 'method' => 'POST', 'path' => '/pos-sales', 'payload' => ['items' => []], 'headers' => ['Content-Type' => 'application/json']],
                ],
            ]]),
            'cloud.example.test/api/sync/outbound/ack' => Http::response(['success' => true]),
            'cloud.example.test/api/sync/heartbeat' => Http::response(['success' => true]),
            '*/api/pos-sales' => Http::response(['success' => true], 201),
        ]);

        $result = app(SyncCycleService::class)->run();

        $this->assertSame(1, $result['pulled']['applied']);
        Http::assertSent(fn ($request) => $request->url() === 'https://cloud.example.test/api/sync/outbound/ack'
            && $request->data() === ['event_ids' => [55]]);
    }

    public function test_pull_sends_node_trust_headers_on_the_local_replay_hop(): void
    {
        Http::fake([
            'cloud.example.test/api/sync/outbound/next*' => Http::response(['success' => true, 'data' => [
                'events' => [
                    ['id' => 55, 'method' => 'POST', 'path' => '/pos-sales', 'payload' => [], 'headers' => []],
                ],
            ]]),
            'cloud.example.test/api/sync/outbound/ack' => Http::response(['success' => true]),
            'cloud.example.test/api/sync/heartbeat' => Http::response(['success' => true]),
            '*/api/pos-sales' => Http::response(['success' => true], 201),
        ]);

        app(SyncCycleService::class)->run();

        // AuthenticateSyncReplay authenticates a locally-applied cloud event the
        // same way it authenticates a cross-node push -- without this header, the
        // replay would 401 against auth:sanctum just like the live test caught.
        Http::assertSent(function ($request) {
            return str_ends_with($request->url(), '/api/pos-sales')
                && ! str_contains($request->url(), 'cloud.example.test')
                && $request->hasHeader('X-Tenant-Key', 'tenant-abc')
                && $request->hasHeader('X-Sync-Token', 'token-xyz')
                && $request->hasHeader('X-Sync-Replay', '1');
        });
    }

    public function test_heartbeat_sends_node_trust_headers(): void
    {
        $this->fakeIdlePullAndHeartbeat();

        app(SyncCycleService::class)->run();

        Http::assertSent(fn ($request) => $request->url() === 'https://cloud.example.test/api/sync/heartbeat'
            && $request->hasHeader('X-Tenant-Key', 'tenant-abc')
            && $request->hasHeader('X-Sync-Token', 'token-xyz'));
    }

    public function test_worker_does_not_report_a_stopped_local_http_server_as_healthy(): void
    {
        $this->fakeIdlePullAndHeartbeat([
            rtrim(url('/'), '/').'/api/connector/web-config' => Http::failedConnection(),
        ]);

        $this->assertTrue(app(SyncCycleService::class)->run()['heartbeat_ok']);

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/sync/heartbeat')
            && $request['local_healthy'] === false);
    }

    public function test_worker_checks_the_store_servers_own_address_not_app_url(): void
    {
        // A store install served on port 8080 while APP_URL is still the default.
        config(['app.url' => 'http://localhost:8000']);
        $this->node->update(['advertised_local_server_url' => 'http://192.168.1.25:8080/api', 'local_server_url' => 'http://192.168.1.25:8080']);
        $this->fakeIdlePullAndHeartbeat([
            'http://localhost:8000/*' => Http::failedConnection(),
            '192.168.1.25:8080/api/connector/web-config' => Http::response([
                'success' => true, 'data' => ['enabled' => true, 'tenant_key' => $this->node->tenant_key],
            ]),
        ]);

        app(SyncCycleService::class)->run();

        Http::assertSent(fn ($request) => $request->url() === 'http://192.168.1.25:8080/api/connector/web-config');
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/sync/heartbeat') && $request['local_healthy'] === true);
    }

    public function test_pulled_cloud_writes_are_replayed_on_the_store_servers_own_address(): void
    {
        config(['app.url' => 'http://localhost:8000']);
        $this->node->update(['local_server_url' => 'http://192.168.1.25:8080']);
        Http::fake([
            'cloud.example.test/api/sync/outbound/next*' => Http::response(['success' => true, 'data' => [
                'events' => [['id' => 7, 'method' => 'POST', 'path' => '/pos-sales', 'payload' => [], 'headers' => []]],
            ]]),
            'cloud.example.test/api/sync/outbound/ack' => Http::response(['success' => true]),
            'cloud.example.test/api/sync/heartbeat' => Http::response(['success' => true]),
            '192.168.1.25:8080/api/*' => Http::response(['success' => true], 201),
        ]);

        $this->assertSame(1, app(SyncCycleService::class)->run()['pulled']['applied']);
        Http::assertSent(fn ($request) => $request->url() === 'http://192.168.1.25:8080/api/pos-sales');
    }

    public function test_worker_reports_health_only_for_its_own_enabled_connector(): void
    {
        $this->fakeIdlePullAndHeartbeat([
            rtrim(url('/'), '/').'/api/connector/web-config' => Http::response([
                'success' => true, 'data' => ['enabled' => true, 'tenant_key' => $this->node->tenant_key],
            ]),
        ]);

        app(SyncCycleService::class)->run();

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/sync/heartbeat')
            && $request['local_healthy'] === true);
    }
}
