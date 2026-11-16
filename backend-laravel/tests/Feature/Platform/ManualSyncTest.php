<?php

namespace Tests\Feature\Platform;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use App\Services\Platform\ManualSync;
use App\Services\Platform\SyncCycleService;
use App\Services\Platform\SyncProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Sync now / Re-copy run in a background process, so the web request (and the counters' health checks) never wait on the cloud. */
class ManualSyncTest extends TestCase
{
    use RefreshDatabase;

    public array $spawned = [];

    protected function setUp(): void
    {
        parent::setUp();
        config(['sync.node_role' => 'local', 'sync.manual_inline' => false]);
        $store = Store::create(['name' => 'Main Store', 'code' => 'STR-001']);
        StoreLocalNode::create(['store_id' => $store->id, 'tenant_key' => 't', 'sync_token' => 's', 'enabled' => true]);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.com', 'password' => 'secret123',
            'role' => 'admin', 'store_id' => $store->id, 'is_active' => true]));
        $test = $this;
        $this->app->instance(ManualSync::class, new class($test) extends ManualSync
        {
            public function __construct(private $test) {}

            protected function spawn(array $args): void
            {
                $this->test->spawned[] = $args;
            }
        });
    }

    public function test_sync_now_starts_a_background_job_and_answers_at_once(): void
    {
        $this->postJson('/api/local-server-config/sync-now')->assertStatus(202)->assertJsonPath('message', fn ($m) => str_starts_with($m, 'Sync started'));
        $this->postJson('/api/local-server-config/recopy')->assertStatus(202);

        $this->assertSame([['sync:manual', 'sync'], ['sync:manual', 'recopy']], $this->spawned);
        $this->assertNotNull(SyncProgress::current(), 'the footer shows the sync at once');
    }

    public function test_a_running_sync_is_not_started_twice(): void
    {
        $lock = Cache::lock(SyncCycleService::LOCK, 60);
        $lock->get();
        try {
            $this->postJson('/api/local-server-config/sync-now')->assertStatus(409);
        } finally {
            $lock->release();
        }
        $this->assertSame([], $this->spawned);
    }

    public function test_the_job_keeps_its_result_for_the_page(): void
    {
        config(['sync.node_role' => 'local', 'sync.cloud_api_base_url' => null]);
        StoreLocalNode::query()->update(['cloud_server_url' => null]);

        $this->artisan('sync:manual', ['kind' => 'sync']);

        $result = ManualSync::lastResult();
        $this->assertSame('sync', $result['kind']);
        $this->assertFalse($result['ok']);
        $this->getJson('/api/local-server-config')->assertJsonPath('data.manual_sync.kind', 'sync');
        $this->assertNull(SyncProgress::current(), 'the footer stops when the job ends');
    }
}
