<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use App\Services\RegisteredServerProbe;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ServerProbeSecurityTest extends TestCase
{
    use RefreshDatabase;

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
