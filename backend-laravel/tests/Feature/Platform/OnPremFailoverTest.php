<?php

namespace Tests\Feature\Platform;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use App\Services\Platform\FailoverIdentity;
use App\Services\Platform\LocalNodeRegistration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * On-prem failover: an on-prem server connects with a cloud admin's sign-in, copies the store's users, gets cloud
 * sign-ins for its counters (locked to the store), and tells counters on the cloud when both sides are caught up.
 */
class OnPremFailoverTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    private Store $otherStore;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->store = Store::create(['name' => 'Main Store', 'code' => 'STR-001', 'platform_store_id' => 'PS-1', 'platform_company_code' => 'CMP-1']);
        $this->otherStore = Store::create(['name' => 'Other Store', 'code' => 'STR-002', 'platform_company_code' => 'CMP-1']);
        $this->admin = User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.com',
            'password' => 'secret123', 'role' => 'admin', 'store_id' => null, 'is_active' => true, 'platform_company_code' => 'CMP-1']);
    }

    private function node(array $attributes = []): StoreLocalNode
    {
        return StoreLocalNode::create($attributes + ['store_id' => $this->store->id, 'tenant_key' => 'tenant-1',
            'sync_token' => 'token-1', 'enabled' => true, 'cloud_server_url' => 'https://cloud.example.test']);
    }

    private function nodeHeaders(): array
    {
        return ['X-Tenant-Key' => 'tenant-1', 'X-Sync-Token' => 'token-1'];
    }

    // ── Cloud side ──────────────────────────────────────────────────────────

    public function test_a_cloud_admin_connects_an_on_prem_server_and_each_connection_rotates_the_sync_token(): void
    {
        $body = ['username' => 'owner', 'password' => 'secret123', 'platform_store_id' => 'PS-1', 'counter_url' => 'http://mainserver:5173'];

        $first = $this->postJson('/api/sync/register-node', $body)->assertOk()->json('data');
        $this->assertSame($this->store->id, $first['store_id']);
        $node = StoreLocalNode::where('store_id', $this->store->id)->firstOrFail();
        $this->assertTrue($node->enabled);
        $this->assertSame('http://mainserver:5173', $node->counter_url);

        // Some installs keep the platform store id as a number.
        $this->store->forceFill(['platform_store_id' => '4417'])->save();
        $second = $this->postJson('/api/sync/register-node', ['platform_store_id' => 4417] + $body)->assertOk()->json('data');
        $this->assertSame($first['tenant_key'], $second['tenant_key']);
        $this->assertNotSame($first['sync_token'], $second['sync_token']);
    }

    public function test_connecting_needs_the_right_password_and_an_admin(): void
    {
        $this->postJson('/api/sync/register-node', ['username' => 'owner', 'password' => 'wrong', 'store_code' => 'STR-001'])
            ->assertStatus(422)->assertJsonPath('errors.username.0', 'Cloud sign-in failed: wrong username or password.');
        User::create(['name' => 'Cashier', 'username' => 'cashier', 'email' => 'c@example.com', 'password' => 'secret123',
            'role' => 'cashier', 'store_id' => $this->store->id, 'is_active' => true]);
        $this->postJson('/api/sync/register-node', ['username' => 'cashier', 'password' => 'secret123', 'store_code' => 'STR-001'])
            ->assertStatus(422);
        $this->assertSame(0, StoreLocalNode::count());
    }

    public function test_the_store_users_go_to_the_on_prem_server_with_their_password_hash(): void
    {
        $this->node();
        $cashier = User::create(['name' => 'Cashier', 'username' => 'cashier', 'email' => 'c@example.com', 'password' => 'secret123',
            'role' => 'cashier', 'store_id' => $this->store->id, 'is_active' => true]);
        User::create(['name' => 'Elsewhere', 'username' => 'elsewhere', 'email' => 'e@example.com', 'password' => 'secret123',
            'role' => 'cashier', 'store_id' => $this->otherStore->id, 'is_active' => true]);

        $this->getJson('/api/sync/users')->assertUnauthorized();
        $users = collect($this->withHeaders($this->nodeHeaders())->getJson('/api/sync/users')->assertOk()->json('data.users'))->keyBy('username');

        $this->assertEqualsCanonicalizing(['owner', 'cashier'], $users->keys()->all());
        $this->assertSame($cashier->fresh()->getRawOriginal('password'), $users['cashier']['password']);
    }

    public function test_a_failover_sign_in_opens_only_its_store_and_survives_a_later_cloud_sign_in(): void
    {
        // Sign-in here needs no platform activation: an unlinked account.
        $this->admin->forceFill(['platform_company_code' => null])->save();
        $this->node();
        $token = $this->withHeaders($this->nodeHeaders())->postJson('/api/sync/failover-session', ['username' => 'owner'])
            ->assertOk()->json('data.token');
        $this->app['auth']->forgetGuards();

        $this->withHeaders(['Authorization' => "Bearer $token", 'X-Company-Scope-Id' => (string) $this->store->id])
            ->getJson('/api/auth/me')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withHeaders(['Authorization' => "Bearer $token", 'X-Company-Scope-Id' => (string) $this->otherStore->id])
            ->getJson('/api/auth/me')->assertForbidden()->assertJsonPath('code', 'STORE_ACCESS_DENIED');

        // Signing in again on the cloud replaces ordinary sessions only.
        $this->app['auth']->forgetGuards();
        $this->withHeaders(['Authorization' => ''])->postJson('/api/auth/login', ['username' => 'owner', 'password' => 'secret123'])->assertOk();
        $this->assertSame(1, $this->admin->tokens()->where('name', FailoverIdentity::TOKEN_NAME)->count());
    }

    public function test_the_cloud_confirms_whose_sign_in_a_token_is(): void
    {
        $this->node();
        $token = $this->admin->createToken('web-token', ['client:web'])->plainTextToken;

        $this->withHeaders($this->nodeHeaders())->postJson('/api/sync/session-user', ['token' => $token])
            ->assertOk()->assertJsonPath('data.username', 'owner');
        $this->withHeaders($this->nodeHeaders())->postJson('/api/sync/session-user', ['token' => '1|not-a-token'])
            ->assertUnauthorized();
    }

    public function test_cloud_cors_allows_a_stores_machine_name_but_not_public_sites(): void
    {
        $preflight = fn (string $origin) => $this->call('OPTIONS', '/api/auth/me', [], [], [], [
            'HTTP_ORIGIN' => $origin, 'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET', 'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization',
        ]);

        $this->assertSame('http://mainserver:5173', $preflight('http://mainserver:5173')->headers->get('Access-Control-Allow-Origin'));
        $this->assertNull($preflight('https://evil.example')->headers->get('Access-Control-Allow-Origin'));
    }

    // ── On-prem side ────────────────────────────────────────────────────────

    public function test_connecting_on_prem_saves_the_node_and_copies_data_and_users(): void
    {
        config(['sync.node_role' => 'local']);
        // No signed store licence in this test; the store is matched by its code instead.
        $this->store->forceFill(['platform_store_id' => null])->save();
        Sanctum::actingAs($this->admin);
        Http::fake([
            'cloud.example.test/api/sync/register-node' => Http::response(['success' => true, 'data' => [
                'tenant_key' => 'tenant-1', 'sync_token' => 'token-1', 'store_id' => $this->store->id, 'store_code' => 'STR-001']]),
            'cloud.example.test/api/sync/catch-up-export' => Http::response(['success' => true, 'data' => ['tables' => []]]),
            'cloud.example.test/api/sync/users' => Http::response(['success' => true, 'data' => ['users' => [
                ['id' => 900, 'name' => 'Cashier', 'username' => 'cashier', 'email' => 'c@example.com', 'password' => Hash::make('cloud-pass'),
                    'role' => 'cashier', 'store_id' => $this->store->id, 'is_active' => true]]]]),
        ]);

        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id)->postJson('/api/local-server-config/connect', [
            'counter_url' => 'http://mainserver:5173', 'cloud_server_url' => 'https://cloud.example.test',
            'username' => 'owner', 'password' => 'x',
        ])->assertOk()->assertJsonPath('data.users_synced', 1)->assertJsonPath('data.counter_url', 'http://mainserver:5173');

        $node = StoreLocalNode::where('store_id', $this->store->id)->firstOrFail();
        $this->assertSame('token-1', $node->sync_token);
        $this->assertNotNull($node->last_catch_up_at);
        $copied = User::where('username', 'cashier')->firstOrFail();
        $this->assertSame(900, $copied->id);
        $this->assertTrue(Hash::check('cloud-pass', $copied->password));
        Http::assertSent(fn ($request) => $request->url() === 'https://cloud.example.test/api/sync/register-node'
            && $request['store_code'] === 'STR-001' && $request['counter_url'] === 'http://mainserver:5173');
    }

    public function test_a_fresh_on_prem_store_is_renumbered_to_the_clouds_number_but_one_with_sales_is_refused(): void
    {
        config(['sync.node_role' => 'local']);
        $registration = app(LocalNodeRegistration::class);
        $align = (new \ReflectionMethod($registration, 'alignStoreId'));

        $renumbered = $align->invoke($registration, $this->otherStore, 77);
        $this->assertSame(77, $renumbered->id);
        $this->assertNull(Store::find($this->otherStore->id));

        \Illuminate\Support\Facades\DB::table('customers')->insert(['store_id' => $this->store->id, 'name' => 'Walk-in', 'code' => 'C1', 'created_at' => now(), 'updated_at' => now()]);
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $align->invoke($registration, $this->store, 78);
    }

    public function test_a_connected_server_continues_the_clouds_document_numbers_and_never_lowers_its_own(): void
    {
        \Illuminate\Support\Facades\DB::table('document_number_counters')->insert(['store_id' => $this->store->id, 'prefix' => 'INV', 'period' => '20261113',
            'origin' => 'normal', 'last_seq' => 9, 'created_at' => now(), 'updated_at' => now()]);

        LocalNodeRegistration::continueNumbering($this->store->id, [
            ['prefix' => 'INV', 'period' => '20261113', 'origin' => 'normal', 'last_seq' => 4],
            ['prefix' => 'INV', 'period' => '20261112', 'origin' => 'normal', 'last_seq' => 31],
        ]);

        $seq = fn ($period) => (int) \Illuminate\Support\Facades\DB::table('document_number_counters')->where(['store_id' => $this->store->id, 'prefix' => 'INV', 'period' => $period])->value('last_seq');
        $this->assertSame(9, $seq('20261113'));
        $this->assertSame(31, $seq('20261112'));

        $this->node();
        $export = $this->withHeaders($this->nodeHeaders())->getJson('/api/sync/catch-up-export')->assertOk()->json('data.counters');
        $this->assertContains(['prefix' => 'INV', 'period' => '20261113', 'origin' => 'normal', 'last_seq' => 9], $export);
    }

    public function test_copied_users_follow_the_cloud_and_local_only_users_are_left_alone(): void
    {
        config(['sync.node_role' => 'local']);
        $node = $this->node();
        $cloudUser = ['id' => 50, 'name' => 'Cashier', 'username' => 'cashier', 'email' => 'c@example.com', 'password' => Hash::make('p1'),
            'role' => 'cashier', 'store_id' => $this->store->id, 'is_active' => true];
        $answers = [['users' => [$cloudUser]], ['users' => []], ['oops' => true]];
        Http::fake(['cloud.example.test/api/sync/users' => function () use (&$answers) {
            return Http::response(['success' => true, 'data' => array_shift($answers)]);
        }]);
        $registration = app(LocalNodeRegistration::class);

        $this->assertSame(1, $registration->copyUsers($node));
        $this->assertTrue(User::where('username', 'cashier')->value('is_active'));

        // Removed on the cloud: switched off here. The on-prem owner, never copied, is untouched.
        $this->assertSame(0, $registration->copyUsers($node));
        $this->assertFalse(User::where('username', 'cashier')->value('is_active'));
        $this->assertTrue($this->admin->fresh()->is_active);

        // A malformed answer changes nothing.
        $this->assertNull($registration->copyUsers($node));
    }

    public function test_counters_on_the_cloud_return_only_once_both_sides_are_caught_up(): void
    {
        config(['sync.node_role' => 'local']);
        $node = $this->node();
        $pending = 2;
        Http::fake(['cloud.example.test/api/sync/outbound/count' => function () use (&$pending) {
            if ($pending < 0) {
                throw new ConnectionException('down');
            }

            return Http::response(['success' => true, 'data' => ['pending' => $pending]]);
        }]);
        $state = fn () => $this->getJson('/api/connector/web-config')->assertOk()->json('data.state');

        $this->assertSame('catching_up', $state());
        $pending = 0;
        $this->assertSame('catching_up', $state(), 'answer is cached for 10 seconds');
        Cache::forget(LocalNodeRegistration::STATE_CACHE_KEY);
        $this->assertSame('ready', $state());

        SyncOutboxEvent::create(['store_id' => $this->store->id, 'method' => 'POST', 'path' => '/pos-sales', 'payload' => [],
            'headers' => [], 'idempotency_key' => 'k1', 'status' => 'pending']);
        Cache::forget(LocalNodeRegistration::STATE_CACHE_KEY);
        $this->assertSame('catching_up', $state(), 'unsent on-prem bills hold the counters too');

        $pending = -1;
        Cache::forget(LocalNodeRegistration::STATE_CACHE_KEY);
        $this->assertSame('cloud_unreachable', $state());
        unset($node);
    }

    public function test_an_admin_can_sync_now_and_re_copy_from_the_cloud_and_the_footer_sees_progress(): void
    {
        config(['sync.node_role' => 'local']);
        $node = $this->node();
        $this->admin->forceFill(['platform_company_code' => null])->save();
        $this->store->forceFill(['platform_store_id' => null])->save(); // No signed licence in this test.
        SyncOutboxEvent::create(['store_id' => $this->store->id, 'method' => 'POST', 'path' => '/customers', 'payload' => [],
            'headers' => [], 'idempotency_key' => 'k1', 'status' => 'pending']);
        Http::fake([
            'cloud.example.test/api/customers' => Http::response(['success' => true], 201),
            'cloud.example.test/api/sync/outbound/next*' => Http::response(['success' => true, 'data' => ['events' => []]]),
            'cloud.example.test/api/sync/users' => Http::response(['success' => true, 'data' => ['users' => []]]),
            'cloud.example.test/api/sync/heartbeat' => Http::response(['success' => true]),
            'cloud.example.test/api/sync/outbound/count' => Http::response(['success' => true, 'data' => ['pending' => 0]]),
            'cloud.example.test/api/sync/catch-up-export' => Http::response(['success' => true, 'data' => ['tables' => [], 'counters' => []]]),
        ]);
        $cashier = User::create(['name' => 'Cashier', 'username' => 'cashier', 'email' => 'c@example.com', 'password' => 'secret123',
            'role' => 'cashier', 'store_id' => $this->store->id, 'is_active' => true]);
        $this->withHeader('X-Company-Scope-Id', (string) $this->store->id); // The page always sends its store.
        Sanctum::actingAs($cashier);
        $this->postJson('/api/local-server-config/sync-now')->assertForbidden();

        Sanctum::actingAs($this->admin);
        $this->postJson('/api/local-server-config/sync-now')->assertOk()
            ->assertJsonPath('message', 'Sent 1 and received 0 change(s).')
            ->assertJsonPath('data.last_sync.pushed.sent', 1);
        $this->postJson('/api/local-server-config/recopy')->assertOk()->assertJsonPath('message', 'Copied from the cloud: 0 record(s), 0 staff account(s).');
        $this->assertNotNull($node->fresh()->last_catch_up_at);

        \App\Services\Platform\SyncProgress::start('recopy', 'Copying store data from the cloud');
        $this->getJson('/api/local-server-config/progress')->assertOk()->assertJsonPath('data.label', 'Copying store data from the cloud');
        $this->postJson('/api/local-server-config/sync-now')->assertOk(); // Progress is not the lock.
        $lock = Cache::lock(\App\Services\Platform\SyncCycleService::LOCK, 60);
        $lock->get();
        try {
            $this->postJson('/api/local-server-config/sync-now')->assertStatus(409);
            $this->postJson('/api/local-server-config/recopy')->assertStatus(422);
        } finally {
            $lock->release();
        }

        config(['sync.node_role' => 'cloud']);
        $this->postJson('/api/local-server-config/sync-now')->assertStatus(409);
    }

    public function test_the_on_prem_server_hands_a_counter_its_cloud_sign_in_and_swaps_one_back(): void
    {
        // Sign-in here needs no platform activation: an unlinked account.
        $this->admin->forceFill(['platform_company_code' => null])->save();
        config(['sync.node_role' => 'local']);
        $this->node();
        Http::fake([
            'cloud.example.test/api/sync/failover-session' => Http::response(['success' => true, 'data' => ['token' => '5|cloud', 'expires_at' => now()->addDay()->toIso8601String()]]),
            'cloud.example.test/api/sync/session-user' => Http::sequence()
                ->push(['success' => true, 'data' => ['username' => 'owner']])
                ->push(['success' => false], 401),
        ]);
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/auth/failover-session')->assertOk()->assertJsonPath('data.token', '5|cloud')
            ->assertJsonPath('data.cloud_api_base_url', 'https://cloud.example.test/api');
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/sync/failover-session') && $request['username'] === 'owner'
            && $request->header('X-Sync-Token')[0] === 'token-1');

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/auth/failover-session/exchange', ['cloud_token' => '5|cloud'])->assertOk()->assertJsonPath('data.user.username', 'owner');
        $this->postJson('/api/auth/failover-session/exchange', ['cloud_token' => '5|cloud'])->assertUnauthorized();
    }
}
