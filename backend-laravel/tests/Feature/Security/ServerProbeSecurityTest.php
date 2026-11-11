<?php

namespace Tests\Feature\Security;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use App\Services\Platform\RegisteredServerProbe;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ServerProbeSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_probing_before_first_save_returns_actionable_validation_without_network_access(): void
    {
        Http::fake();
        $node = $this->setupNode();
        $node->delete();
        foreach (['test', 'test-cloud'] as $action) {
            $this->postJson('/api/local-server-config/'.$action)->assertUnprocessable()
                ->assertJsonPath('message', 'Save the server URLs before testing the connection.');
        }
        Http::assertNothingSent();
    }

    public function test_empty_save_is_rejected_and_disabling_requires_explicit_intent(): void
    {
        $node = $this->setupNode();
        $this->putJson('/api/local-server-config', ['local_server_url' => '', 'cloud_server_url' => ''])
            ->assertUnprocessable()->assertJsonValidationErrors('local_server_url');
        $this->assertTrue($node->fresh()->enabled);
        $this->putJson('/api/local-server-config', ['local_server_url' => '', 'cloud_server_url' => '', 'disable_failover' => true])
            ->assertOk()->assertJsonPath('data.enabled', false);
    }

    public function test_frontend_ports_cannot_be_saved_as_backend_addresses(): void
    {
        $node = $this->setupNode();
        $this->putJson('/api/local-server-config', ['local_server_url' => 'http://127.0.0.1:5173/'])
            ->assertUnprocessable()->assertJsonPath('message', 'This is a frontend preview port. Enter the ERP backend address, not the browser app URL.');
        $this->assertSame('http://192.168.10.15', $node->fresh()->local_server_url);
    }

    public function test_loopback_cannot_be_saved_as_a_store_wide_failover_server(): void
    {
        $node = $this->setupNode();
        foreach (['http://127.0.0.1:8000', 'http://localhost:8000', 'http://[::1]:8000'] as $url) {
            $this->putJson('/api/local-server-config', ['local_server_url' => $url])->assertUnprocessable();
        }
        $this->assertSame('http://192.168.10.15', $node->fresh()->local_server_url);
    }

    public function test_local_development_self_probe_reports_setup_required_without_deadlocking_or_claiming_sync_health(): void
    {
        $this->setupNode('http://192.168.10.15:8001');
        $this->app['env'] = 'local';
        config(['sync.probe_allowed_endpoints' => ['http://192.168.10.15:8001'], 'sync.development_server_origin' => 'http://192.168.10.15:8001']);
        Http::fake();
        $result = app(RegisteredServerProbe::class)->check('http://192.168.10.15:8001', '', true);
        $this->assertFalse($result['healthy']);
        $this->assertTrue($result['reachable']);
        Http::assertNothingSent();
    }

    public function test_production_never_uses_the_development_self_probe_shortcut(): void
    {
        $this->setupNode('http://192.168.10.15:8001');
        $this->app['env'] = 'production';
        config(['sync.probe_allowed_endpoints' => ['http://192.168.10.15:8001'], 'sync.development_server_origin' => 'http://192.168.10.15:8001']);
        Http::fake(['*' => Http::response(['data' => ['enabled' => true]])]);
        $this->assertTrue(app(RegisteredServerProbe::class)->check('http://192.168.10.15:8001', '', true)['healthy']);
        Http::assertSentCount(1);
    }

    public function test_development_backend_does_not_advertise_itself_as_a_sync_connector(): void
    {
        $this->setupNode('http://192.168.10.15:8001');
        $this->app['env'] = 'local';
        config(['sync.node_role' => 'cloud', 'sync.development_server_origin' => 'http://192.168.10.15:8001']);
        $this->getJson('/api/local-server-config/runtime')->assertOk()->assertJsonPath('data.enabled', false);
        config(['sync.node_role' => 'local']);
        $this->getJson('/api/local-server-config/runtime')->assertOk()->assertJsonPath('data.enabled', true);
    }

    public function test_disabling_failover_for_a_store_that_never_had_it_creates_no_sync_identity(): void
    {
        $node = $this->setupNode();
        $storeId = $node->store_id;
        $node->delete();
        $this->putJson('/api/local-server-config', ['local_server_url' => '', 'cloud_server_url' => '', 'disable_failover' => true])
            ->assertOk()->assertJsonPath('data.enabled', false)->assertJsonPath('data.tenant_key', null);
        $this->assertSame(0, StoreLocalNode::where('store_id', $storeId)->count());
    }

    public function test_an_address_parse_url_rejects_gets_a_validation_message_not_a_server_error(): void
    {
        $this->setupNode();
        $this->putJson('/api/local-server-config', ['local_server_url' => 'http:///192.168.10.15:8000'])->assertUnprocessable();
    }

    public function test_development_origin_matches_regardless_of_trailing_slash_case_or_default_port(): void
    {
        $this->setupNode('http://Dev-Box.local');
        $this->app['env'] = 'local';
        config(['sync.node_role' => 'cloud', 'sync.development_server_origin' => 'http://dev-box.local:80/']);
        $this->getJson('/api/local-server-config/runtime')->assertOk()->assertJsonPath('data.enabled', false);
    }

    private function setupNode(string $local = 'http://192.168.10.15'): StoreLocalNode
    {
        $store = Store::create(['name' => 'Security branch', 'code' => 'SEC-'.Str::random(10)]);
        Sanctum::actingAs(User::factory()->create(['username' => 'security-'.Str::random(10), 'role' => 'admin', 'store_id' => $store->id]));

        return StoreLocalNode::create(['store_id' => $store->id, 'tenant_key' => 'probe', 'sync_token' => 'test-secret', 'enabled' => true, 'local_server_url' => $local, 'cloud_server_url' => 'https://8.8.8.8']);
    }

    public function test_anonymous_probes_require_authentication_and_cashiers_are_forbidden(): void
    {
        Http::fake();
        $this->getJson('/api/local-server-config/test')->assertUnauthorized();
        $store = Store::create(['name' => 'Security branch', 'code' => 'SEC-'.Str::random(10)]);
        Sanctum::actingAs(User::factory()->create(['username' => 'security-'.Str::random(10), 'role' => 'cashier', 'store_id' => $store->id]));
        $this->postJson('/api/local-server-config/test')->assertForbidden();
        $this->getJson('/api/local-server-config/test-cloud')->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_every_role_reads_connector_status_but_only_admins_save_it(): void
    {
        $node = $this->setupNode();
        foreach (['manager', 'cashier'] as $role) {
            Sanctum::actingAs(User::factory()->create(['username' => "{$role}-".Str::random(10), 'role' => $role, 'store_id' => $node->store_id]));
            $this->getJson('/api/local-server-config')->assertOk()->assertJsonPath('data.tenant_key', 'probe')->assertJsonMissingPath('data.sync_token');
            $this->getJson('/api/local-server-config/runtime')->assertOk()->assertJsonPath('data.enabled', true);
            $this->putJson('/api/local-server-config', ['local_server_url' => 'http://192.168.10.99'])->assertForbidden();
        }
        $this->assertSame('http://192.168.10.15', $node->fresh()->local_server_url);
    }

    public function test_approved_registered_lan_probe_updates_only_selected_node(): void
    {
        $node = $this->setupNode();
        config(['sync.probe_allowed_endpoints' => ['http://192.168.10.15']]);
        Http::fake(['http://192.168.10.15/*' => Http::response(['data' => ['enabled' => true]])]);
        $this->postJson('/api/local-server-config/test')->assertOk()->assertJsonPath('data.status', 'ONLINE');
        $this->assertTrue($node->fresh()->local_healthy);
        Http::assertSentCount(1);
    }

    public function test_unapproved_or_different_targets_are_rejected_without_network_access(): void
    {
        $this->setupNode();
        Http::fake();
        $this->postJson('/api/local-server-config/test')->assertUnprocessable();
        config(['sync.probe_allowed_endpoints' => ['http://192.168.10.15']]);
        $this->postJson('/api/local-server-config/test', ['local_server_url' => 'http://169.254.169.254'])->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_saving_server_urls_rejects_credentials_and_preserves_api_suffix_compatibility(): void
    {
        $node = $this->setupNode();
        $this->putJson('/api/local-server-config', ['local_server_url' => 'http://user@192.168.10.15'])->assertUnprocessable();
        $this->putJson('/api/local-server-config', ['local_server_url' => 'http://192.168.10.15/api', 'cloud_server_url' => 'https://cloud.example.test/api'])->assertOk();
        $this->assertSame('http://192.168.10.15', $node->fresh()->local_server_url);
        $this->getJson('/api/local-server-config/runtime')->assertOk()->assertJsonPath('data.cloud_server_url', 'https://cloud.example.test/api');
    }

    public function test_loopback_metadata_credentials_and_unapproved_ports_are_rejected_even_if_registered(): void
    {
        Http::fake();
        $node = $this->setupNode();
        foreach (['http://127.0.0.1', 'http://169.254.169.254', 'http://localhost', 'http://192.168.10.15:22', 'http://user:pass@192.168.10.15', 'http://192.168.10.15/?target=bad'] as $url) {
            $node->update(['local_server_url' => $url]);
            config(['sync.probe_allowed_endpoints' => [$url]]);
            $this->postJson('/api/local-server-config/test')->assertUnprocessable();
        }
        Http::assertNothingSent();
    }

    public function test_redirects_do_not_report_healthy_or_follow_a_new_destination(): void
    {
        $node = $this->setupNode();
        config(['sync.probe_allowed_endpoints' => ['http://192.168.10.15']]);
        Http::fake(['*' => Http::response('', 302, ['Location' => 'http://169.254.169.254'])]);
        $this->postJson('/api/local-server-config/test')->assertOk()->assertJsonPath('data.status', 'OFFLINE');
        $this->assertFalse($node->fresh()->local_healthy);
        Http::assertSentCount(1);
    }

    public function test_cloud_probe_rejects_dns_resolving_to_private_addresses(): void
    {
        $node = $this->setupNode();
        $node->update(['cloud_server_url' => 'https://cloud.example.test']);
        config(['sync.probe_allowed_endpoints' => ['https://cloud.example.test']]);
        $this->app->instance(RegisteredServerProbe::class, new class extends RegisteredServerProbe
        {
            protected function addresses(string $host): array
            {
                return ['8.8.8.8', '127.0.0.1'];
            }
        });
        Http::fake();
        $this->postJson('/api/local-server-config/test-cloud')->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_approved_cloud_dns_is_pinned_and_redirects_are_disabled(): void
    {
        $node = $this->setupNode();
        $node->update(['cloud_server_url' => 'https://cloud.example.test']);
        config(['sync.probe_allowed_endpoints' => ['https://cloud.example.test']]);
        $this->app->instance(RegisteredServerProbe::class, new class extends RegisteredServerProbe
        {
            protected function addresses(string $host): array
            {
                return ['8.8.8.8'];
            }
        });
        Http::fake(function ($request, $options) {
            $this->assertSame(['cloud.example.test:443:8.8.8.8'], $options['curl'][CURLOPT_RESOLVE]);
            $this->assertFalse($options['allow_redirects']);
            $this->assertSame('', $options['proxy']);

            return Http::response(['success' => true]);
        });
        $this->postJson('/api/local-server-config/test-cloud')->assertOk()->assertJsonPath('data.status', 'ONLINE');
        Http::assertSentCount(1);
    }
}
