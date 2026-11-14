<?php

namespace Tests\Feature\Platform;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use App\Services\Platform\LocalNodeRegistration;
use App\Services\Platform\StoreLicenceVerifier;
use App\Support\RequestMemo;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Vynerix admin allows one ERP installation per company, so a fresh on-prem server is set up from its cloud: the
 * cloud hands over the company activation and the store with its signed licence, and the on-prem server never
 * talks to Vynerix admin. One database plays the cloud first and the fresh on-prem server afterwards.
 */
class OnPremSetupFromCloudTest extends TestCase
{
    use RefreshDatabase;

    private string $privateKeyPem;

    private Store $store;

    private PlatformActivation $activation;

    /** What the faked cloud answers a heartbeat with, when a test changes it after setup. */
    private ?array $heartbeatReply = null;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $keyPair = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519, 'config' => base_path('tests/Fixtures/openssl.cnf')]);
        openssl_pkey_export($keyPair, $privatePem, null, ['config' => base_path('tests/Fixtures/openssl.cnf')]);
        $this->privateKeyPem = $privatePem;
        config()->set('platform.licence_public_keys', ['dev' => preg_replace('/-----.*-----|[\r\n]+/', '', (string) openssl_pkey_get_details($keyPair)['key'])]);
        config(['sync.cloud_api_base_url' => 'https://cloud.example.test/api', 'platform.base_url' => 'https://vynerix-admin.example.test']);

        // The cloud: an activated company, a licensed store and its admin.
        $this->activation = PlatformActivation::create(['company_code' => 'CMP-COFFEE', 'activated' => true, 'status' => 'active',
            'deployment_id' => (string) Str::uuid(), 'sync_token' => 'cloud-only-vynerix-token', 'tenant_admin_email' => 'owner@example.com']);
        $this->store = Store::create(['name' => 'Coffee 2', 'code' => 'STR-COFFEE2', 'platform_company_code' => 'CMP-COFFEE', 'platform_store_id' => 987,
            'is_active' => true, 'activation_required' => true, 'activated_at' => now()]);
        $this->store->forceFill(['platform_licence_token' => $this->licence(), 'admin_password' => 'store-secret', 'gst_access_key' => 'gst-secret'])->save();
        User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.com', 'password' => 'secret123', 'role' => 'admin',
            'store_id' => null, 'is_active' => true, 'platform_company_code' => 'CMP-COFFEE']);
    }

    private function licence(array $overrides = []): string
    {
        $claims = $overrides + ['iss' => 'vx-admin', 'aud' => 'next-erp', 'kid' => 'dev', 'sub' => 'STR-COFFEE2', 'company_code' => 'CMP-COFFEE', 'store_id' => 987,
            'deployment_id' => $this->activation->deployment_id, 'status' => 'active', 'subscription_status' => 'active', 'iat' => now()->subHour()->timestamp,
            'exp' => now()->addDay()->timestamp, 'activeTill' => now()->addMonth()->timestamp, 'offline_until' => now()->addDays(2)->timestamp];
        $encode = fn ($value) => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
        $input = $encode(json_encode(['alg' => 'EdDSA', 'typ' => 'JWT', 'kid' => 'dev'])).'.'.$encode(json_encode($claims));
        openssl_sign($input, $signature, $this->privateKeyPem, null);

        return $input.'.'.$encode($signature);
    }

    /** The cloud's real answers, captured, then the database becomes a fresh on-prem install. */
    private function becomeFreshOnPrem(): array
    {
        $register = $this->postJson('/api/sync/register-node', ['username' => 'owner', 'password' => 'secret123', 'counter_url' => 'http://mainserver:5173'])->assertOk()->json();
        $headers = ['X-Tenant-Key' => $register['data']['tenant_key'], 'X-Sync-Token' => $register['data']['sync_token']];
        $users = $this->withHeaders($headers)->getJson('/api/sync/users')->assertOk()->json();
        $heartbeat = $this->withHeaders($headers)->postJson('/api/sync/heartbeat', ['local_healthy' => true])->assertOk()->json();

        Schema::disableForeignKeyConstraints();
        foreach (['store_local_nodes', 'users', 'stores', 'platform_activations', 'personal_access_tokens'] as $table) {
            DB::table($table)->delete();
        }
        Schema::enableForeignKeyConstraints();
        User::create(['name' => 'Built-in', 'username' => 'admin', 'email' => 'admin@gpretail.uk', 'password' => 'default', 'role' => 'admin', 'is_active' => true]);
        app(RequestMemo::class)->flush();
        Cache::flush();
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
        config(['sync.node_role' => 'local']);

        return compact('register', 'users', 'heartbeat');
    }

    private function fakeCloud(array $cloud): void
    {
        Http::fake([
            'cloud.example.test/api/sync/register-node' => Http::response($cloud['register']),
            'cloud.example.test/api/sync/users' => Http::response($cloud['users']),
            'cloud.example.test/api/sync/catch-up-export' => Http::response(['success' => true, 'data' => ['tables' => [], 'counters' => []]]),
            'cloud.example.test/api/sync/heartbeat' => fn () => Http::response($this->heartbeatReply ?? $cloud['heartbeat']),
            'cloud.example.test/api/sync/outbound/*' => Http::response(['success' => true, 'data' => ['events' => [], 'pending' => 0]]),
        ]);
    }

    public function test_the_cloud_hands_over_the_activation_and_licensed_store_without_any_secret(): void
    {
        $reply = $this->postJson('/api/sync/register-node', ['username' => 'owner', 'password' => 'secret123'])->assertOk();

        $reply->assertJsonPath('data.identity.activation.deployment_id', $this->activation->deployment_id)
            ->assertJsonPath('data.identity.store.code', 'STR-COFFEE2')
            ->assertJsonPath('data.identity.store.platform_licence_token', $this->store->fresh()->platform_licence_token);
        foreach (['cloud-only-vynerix-token', 'store-secret', 'gst-secret'] as $secret) {
            $this->assertStringNotContainsString($secret, $reply->getContent());
        }
    }

    public function test_an_admin_of_several_stores_is_asked_which_one_this_server_runs(): void
    {
        Store::create(['name' => 'Coffee 1', 'code' => 'STR-COFFEE1', 'platform_company_code' => 'CMP-COFFEE', 'is_active' => true]);

        $this->postJson('/api/sync/register-node', ['username' => 'owner', 'password' => 'secret123'])->assertStatus(422)
            ->assertJsonPath('code', 'CHOOSE_STORE')->assertJsonPath('stores.0.code', 'STR-COFFEE1')->assertJsonPath('stores.1.name', 'Coffee 2');
        $this->assertSame(0, StoreLocalNode::count());
        $this->postJson('/api/sync/register-node', ['username' => 'owner', 'password' => 'secret123', 'store_code' => 'STR-COFFEE2'])->assertOk()
            ->assertJsonPath('data.store_code', 'STR-COFFEE2');
    }

    public function test_a_fresh_on_prem_server_is_set_up_from_its_cloud_and_never_asks_vynerix_admin(): void
    {
        $cloud = $this->becomeFreshOnPrem();
        $this->getJson('/api/activation/status')->assertOk()->assertJsonPath('data.activated', false)->assertJsonPath('data.on_prem', true)
            ->assertJsonPath('data.cloud', 'https://cloud.example.test');
        // Signing in before setup points at Connect to cloud, not at Vynerix admin.
        $this->postJson('/api/auth/login', ['username' => 'owner@example.com', 'password' => 'secret123'])->assertStatus(401)
            ->assertJsonPath('message', 'This on-prem server is not set up yet. Reload the page and use Connect to cloud.');
        $this->fakeCloud($cloud);

        $this->postJson('/api/local-server-config/bootstrap', ['username' => 'owner', 'password' => 'secret123', 'counter_url' => 'http://mainserver:5173'])
            ->assertOk()->assertJsonPath('data.store.code', 'STR-COFFEE2')->assertJsonPath('data.users_synced', 1)
            ->assertJsonPath('message', 'This server is set up for Coffee 2. 1 staff account(s) copied. Sign in with your cloud account.');

        $activation = PlatformActivation::current();
        $this->assertTrue($activation->managed_by_cloud);
        $this->assertSame($this->activation->deployment_id, $activation->deployment_id);
        $this->assertNull($activation->sync_token);
        $store = Store::where('code', 'STR-COFFEE2')->firstOrFail();
        $this->assertSame($this->store->id, $store->id);
        $this->assertTrue(app(StoreLicenceVerifier::class)->verify($store, $activation)['ok'], 'the cloud-signed licence is valid on the on-prem server');
        $node = StoreLocalNode::where('store_id', $store->id)->firstOrFail();
        $this->assertSame('https://cloud.example.test', $node->cloud_server_url);
        $this->assertSame('http://mainserver:5173', $node->counter_url);
        $this->assertSame(['owner'], User::pluck('username')->all(), 'the built-in placeholder account is gone');

        // Staff sign in with their cloud account, and nothing here calls Vynerix admin.
        $this->postJson('/api/auth/login', ['username' => 'owner', 'password' => 'secret123'])->assertOk()->assertJsonPath('data.user.username', 'owner');
        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'vynerix-admin.example.test'));
        Http::assertSent(fn ($request) => $request->url() === 'https://cloud.example.test/api/sync/register-node' && ! isset($request['platform_store_id']));

        // A second setup is refused.
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/local-server-config/bootstrap', ['username' => 'owner', 'password' => 'secret123', 'counter_url' => 'http://mainserver:5173'])->assertStatus(409);
    }

    public function test_setup_is_refused_on_a_cloud_server_on_one_with_data_and_passes_on_the_store_choice(): void
    {
        $body = ['username' => 'owner', 'password' => 'secret123', 'counter_url' => 'http://mainserver:5173'];
        $this->postJson('/api/local-server-config/bootstrap', $body)->assertStatus(409); // This is the cloud.

        $this->becomeFreshOnPrem();
        Http::fake(['cloud.example.test/api/sync/register-node' => Http::response(['success' => false, 'code' => 'CHOOSE_STORE',
            'message' => 'Choose the store this server runs.', 'stores' => [['code' => 'A', 'name' => 'Store A'], ['code' => 'B', 'name' => 'Store B']]], 422)]);
        $this->postJson('/api/local-server-config/bootstrap', $body)->assertStatus(422)->assertJsonPath('code', 'CHOOSE_STORE')->assertJsonPath('stores.1.name', 'Store B');
        $this->assertSame(1, User::count(), 'nothing is changed until the cloud accepts');

        DB::table('customers')->insert(['store_id' => 1, 'name' => 'Walk-in', 'code' => 'C1', 'created_at' => now(), 'updated_at' => now()]);
        $this->postJson('/api/local-server-config/bootstrap', $body)->assertStatus(409);
    }

    public function test_a_renewed_licence_arrives_with_the_heartbeat_but_never_switches_company(): void
    {
        $cloud = $this->becomeFreshOnPrem();
        $this->fakeCloud($cloud);
        $this->postJson('/api/local-server-config/bootstrap', ['username' => 'owner', 'password' => 'secret123', 'counter_url' => 'http://mainserver:5173'])->assertOk();
        $node = StoreLocalNode::firstOrFail();
        $registration = app(LocalNodeRegistration::class);
        $identity = $cloud['heartbeat']['data']['identity'];

        $renewed = $this->licence(['activeTill' => now()->addYear()->timestamp]);
        $identity['store']['platform_licence_token'] = $renewed;
        $identity['activation']['status'] = 'suspended';
        $registration->refreshIdentity($node, $identity);
        $this->assertSame($renewed, Store::firstOrFail()->platform_licence_token);
        $this->assertSame('suspended', PlatformActivation::current()->status);

        $identity['activation']['company_code'] = 'CMP-OTHER';
        $identity['activation']['status'] = 'active';
        $registration->refreshIdentity($node, $identity);
        $this->assertSame('suspended', PlatformActivation::current()->status);
        $this->assertSame('CMP-COFFEE', PlatformActivation::current()->company_code);
    }

    public function test_a_lapsed_licence_is_replaced_by_its_renewal_on_the_next_sync(): void
    {
        $cloud = $this->becomeFreshOnPrem();
        $this->fakeCloud($cloud);
        $this->postJson('/api/local-server-config/bootstrap', ['username' => 'owner', 'password' => 'secret123', 'counter_url' => 'http://mainserver:5173'])->assertOk();
        $this->travel(3)->days(); // Past the licence's offline window, with no sync in between.
        $this->assertFalse(app(StoreLicenceVerifier::class)->verify(Store::firstOrFail(), PlatformActivation::current())['ok']);

        // Still lapsed on the cloud: the sync does not run, and says why.
        $result = app(\App\Services\Platform\SyncCycleService::class)->run();
        $this->assertFalse($result['ran']);
        $this->assertStringContainsString('licence', $result['reason']);

        // Renewed on the cloud: the heartbeat brings the new licence and the sync runs again.
        $this->heartbeatReply = $cloud['heartbeat'];
        $this->heartbeatReply['data']['identity']['store']['platform_licence_token'] = $this->licence(['iat' => now()->subMinute()->timestamp,
            'exp' => now()->addDay()->timestamp, 'activeTill' => now()->addMonth()->timestamp, 'offline_until' => now()->addDays(2)->timestamp]);
        $this->assertTrue(app(\App\Services\Platform\SyncCycleService::class)->run()['ran']);
        $this->assertTrue(app(StoreLicenceVerifier::class)->verify(Store::firstOrFail(), PlatformActivation::current())['ok']);
    }

    public function test_a_cloud_managed_server_skips_the_vynerix_admin_jobs(): void
    {
        $due = fn (string $command) => collect(app(Schedule::class)->events())
            ->first(fn ($event) => str_contains((string) $event->command, $command))->filtersPass($this->app);

        $this->assertTrue($due('platform:sync'));
        $this->activation->forceFill(['managed_by_cloud' => true])->save();
        app(RequestMemo::class)->flush();
        $this->assertFalse($due('platform:sync'));
        $this->assertFalse($due('platform:notifications-sync'));
    }
}
