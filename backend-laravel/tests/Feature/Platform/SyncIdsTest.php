<?php

namespace Tests\Feature\Platform;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use App\Services\Platform\SyncIds;
use Illuminate\Database\Connection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Same record numbers on the cloud and on-prem. The test database (SQLite) has no id series and no SET INSERT_ID,
 * so a stand-in records the statements MariaDB would get; the real database behaviour is proven in the live
 * two-server test.
 */
class SyncIdsTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'Main Store', 'code' => 'STR-001']);
        $this->admin = User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.com', 'password' => 'secret123',
            'role' => 'admin', 'store_id' => $this->store->id, 'is_active' => true]);
    }

    /** A SyncIds that believes it runs on MariaDB with the given series offset, and records what it would execute. */
    private function fake(int $offset): SyncIds
    {
        $fake = new class($offset) extends SyncIds
        {
            public array $ran = [];

            public function __construct(private int $fakeOffset) {}

            public function seriesOffset(?Connection $connection = null): int
            {
                return $this->fakeOffset;
            }

            protected function supported(Connection $connection): bool
            {
                return true;
            }

            protected function run(Connection $connection, string $sql): void
            {
                $this->ran[] = $sql;
            }
        };
        $this->app->instance(SyncIds::class, $fake);

        return $fake;
    }

    public function test_only_plain_inserts_into_shared_tables_are_tracked(): void
    {
        $this->assertSame('customers', SyncIds::plainInsertTable('insert into `customers` (`name`) values (?)'));
        $this->assertSame('pos_sale_items', SyncIds::plainInsertTable('INSERT INTO pos_sale_items (a) VALUES (?), (?)'));
        $this->assertNull(SyncIds::plainInsertTable('insert into `stocks` (`a`) values (?) on duplicate key update `a` = values(`a`)'));
        $this->assertNull(SyncIds::plainInsertTable('insert ignore into `document_number_counters` (`a`) values (?)'));
        $this->assertNull(SyncIds::plainInsertTable('insert into `sync_outbox` (`a`) values (?)'));
        $this->assertNull(SyncIds::plainInsertTable('update `customers` set `name` = ?'));
    }

    public function test_the_source_records_the_ids_its_write_generated_and_queues_them_with_the_write(): void
    {
        config(['sync.node_role' => 'local']);
        $this->fake(5);
        Sanctum::actingAs($this->admin);

        $created = $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->postJson('/api/customers', ['name' => 'Asha', 'phone' => '9000000001'])->assertSuccessful();

        $event = SyncOutboxEvent::firstOrFail();
        $this->assertSame(SyncIds::STEP, $event->payload['_syncIds']['step']);
        $this->assertSame([(int) DB::table('customers')->where('phone', '9000000001')->value('id')], $event->payload['_syncIds']['ids']['customers']);
        $this->assertArrayNotHasKey('sync_outbox', $event->payload['_syncIds']['ids']);
        unset($created);
    }

    public function test_without_an_id_series_nothing_is_recorded(): void
    {
        config(['sync.node_role' => 'local']);
        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->postJson('/api/customers', ['name' => 'Asha', 'phone' => '9000000001'])->assertSuccessful();
        $this->assertArrayNotHasKey('_syncIds', SyncOutboxEvent::firstOrFail()->payload);
    }

    public function test_a_replay_reuses_the_sources_ids_in_order_and_reports_rows_it_could_not_match(): void
    {
        $ids = $this->fake(1);
        $connection = DB::connection();
        $ids->play(['step' => 1000, 'ids' => ['customers' => [2005], 'pos_sale_items' => [3005, 9005], 'sync_outbox' => [7]]]);

        $ids->beforeQuery('insert into `customers` (`name`) values (?)', $connection);
        $this->assertSame(['SET SESSION auto_increment_increment=1000, auto_increment_offset=1',
            'SET SESSION auto_increment_increment=1000, auto_increment_offset=5', 'SET INSERT_ID=2005'], $ids->ran);

        // The next statement first puts this server's own series back.
        $ids->ran = [];
        $ids->beforeQuery('update `stocks` set `quantity` = ?', $connection);
        $this->assertSame(['SET SESSION auto_increment_increment=1000, auto_increment_offset=1'], $ids->ran);

        $ids->ran = [];
        $ids->beforeQuery('insert into `pos_sale_items` (`a`) values (?), (?)', $connection);
        $this->assertContains('SET INSERT_ID=3005', $ids->ran);
        $ids->beforeQuery('insert into `customers` (`name`) values (?)', $connection); // One more than the source made.
        $ids->beforeQuery('insert into `sync_outbox` (`a`) values (?)', $connection);  // Own bookkeeping: never forced.
        $this->assertNotContains('SET INSERT_ID=7', $ids->ran);

        // customers: an extra row here; pos_sale_items: a source row (9005) this side never inserted.
        $this->assertEqualsCanonicalizing(['customers', 'pos_sale_items'], $ids->drift());
    }

    public function test_ids_sent_by_anyone_but_a_trusted_replay_are_ignored_and_never_reach_the_form(): void
    {
        $ids = $this->fake(1);
        Sanctum::actingAs($this->admin);
        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)
            ->postJson('/api/customers', ['name' => 'Mallory', 'phone' => '9000000002', '_syncIds' => ['step' => 1000, 'ids' => ['customers' => [42]]]])
            ->assertSuccessful()->assertHeaderMissing('X-Sync-Id-Drift');
        $this->assertNotContains('SET INSERT_ID=42', $ids->ran);
    }

    public function test_a_trusted_replay_keeps_the_ids_and_flags_drift_in_its_answer(): void
    {
        $ids = $this->fake(1);
        StoreLocalNode::create(['store_id' => $this->store->id, 'tenant_key' => 'tenant-1', 'sync_token' => 'token-1', 'enabled' => true, 'id_slot' => 4]);
        $headers = ['X-Sync-Replay' => '1', 'X-Tenant-Key' => 'tenant-1', 'X-Sync-Token' => 'token-1', 'X-Company-Scope-Id' => (string) $this->store->id, 'X-Sync-Actor' => 'owner'];

        $this->withHeaders($headers)->postJson('/api/customers', ['name' => 'Asha', 'phone' => '9000000003',
            '_syncIds' => ['step' => 1000, 'ids' => ['customers' => [2005], 'pos_sales' => [8005]]]])
            ->assertSuccessful()->assertHeader('X-Sync-Id-Drift', 'pos_sales');
        $this->assertContains('SET INSERT_ID=2005', $ids->ran);
    }

    public function test_each_on_prem_server_gets_its_own_lowest_free_slot_and_keeps_it(): void
    {
        $other = Store::create(['name' => 'Second Store', 'code' => 'STR-002']);
        $this->admin->forceFill(['store_id' => null])->save();
        StoreLocalNode::create(['store_id' => $other->id, 'tenant_key' => 'tenant-2', 'sync_token' => 'token-2', 'enabled' => true, 'id_slot' => 1]);

        $first = $this->postJson('/api/sync/register-node', ['username' => 'owner', 'password' => 'secret123', 'store_code' => 'STR-001'])->assertOk();
        $first->assertJsonPath('data.id_slot', 2);
        $this->postJson('/api/sync/register-node', ['username' => 'owner', 'password' => 'secret123', 'store_code' => 'STR-001'])
            ->assertOk()->assertJsonPath('data.id_slot', 2);
        $this->assertSame([1, 2], StoreLocalNode::orderBy('id_slot')->pluck('id_slot')->all());
    }
}
