<?php

namespace Tests\Feature\Settings;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** An on-prem server has no platform token: Remote Support goes through the cloud, which forwards it to Vynerix Support. */
class RemoteSupportOnPremTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->store = Store::create(['name' => 'Coffee 1', 'code' => 'STR-ONE', 'platform_company_code' => 'CMP-ONE', 'is_active' => true]);
        StoreLocalNode::create(['store_id' => $this->store->id, 'tenant_key' => 'tenant-1', 'sync_token' => 'token-1', 'enabled' => true,
            'cloud_server_url' => 'https://cloud.example.test']);
    }

    private function cashier(): User
    {
        return User::create(['name' => 'Cashier', 'username' => 'cashier', 'email' => 'cashier@example.test', 'password' => 'secret', 'role' => 'cashier',
            'store_id' => $this->store->id, 'platform_company_code' => 'CMP-ONE', 'is_active' => true]);
    }

    public function test_the_on_prem_server_sends_remote_support_through_the_cloud(): void
    {
        // What an on-prem server holds after taking its identity from the cloud: no platform token.
        PlatformActivation::create(['activated' => true, 'company_code' => 'CMP-ONE', 'deployment_id' => 'deploy-one', 'managed_by_cloud' => true, 'sync_token' => null]);
        Sanctum::actingAs($user = $this->cashier());
        Http::fake(['cloud.example.test/*' => Http::sequence()
            ->push(['success' => true, 'data' => ['id' => 7, 'status' => 'waiting']])
            ->push(['success' => false, 'message' => 'Could not reach Vynerix Support. Please retry.'], 503)]);

        $this->postJson('/api/remote-support/request', ['client_id' => '413 593 273', 'client_password' => 'temporary', 'category' => 'printing', 'priority' => 'normal'])
            ->assertOk()->assertJsonPath('data.id', 7);
        Http::assertSent(fn ($request) => $request->url() === 'https://cloud.example.test/api/sync/remote-support/request'
            && $request->hasHeader('X-Tenant-Key', 'tenant-1') && $request->hasHeader('X-Sync-Token', 'token-1')
            && $request['client_id'] === '413593273' && $request['requester_id'] === $user->id);
        $this->assertDatabaseCount('sync_outbox', 0);

        $this->getJson('/api/remote-support/active')->assertStatus(503)->assertJsonPath('message', 'Could not reach Vynerix Support. Please retry.');
    }

    public function test_the_cloud_forwards_a_nodes_request_for_the_nodes_own_store(): void
    {
        config(['platform.base_url' => 'https://admin.example.test']);
        PlatformActivation::create(['activated' => true, 'company_code' => 'CMP-ONE', 'deployment_id' => 'deploy-cloud', 'sync_token' => 'company-token']);
        Http::fake(['admin.example.test/*' => Http::response(['success' => true, 'data' => ['id' => 9, 'status' => 'waiting']])]);
        $headers = ['X-Tenant-Key' => 'tenant-1', 'X-Sync-Token' => 'token-1'];

        $this->withHeaders($headers)->postJson('/api/sync/remote-support/request', ['client_id' => '413593273', 'requester_id' => 4, 'store_code' => 'SOMEONE-ELSE'])
            ->assertOk()->assertJsonPath('data.id', 9);
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer company-token')
            && $request['store_code'] === 'STR-ONE' && $request['deployment_id'] === 'deploy-cloud' && $request['requester_id'] === 4);

        $this->withHeaders(['X-Tenant-Key' => 'tenant-1', 'X-Sync-Token' => 'wrong'])->postJson('/api/sync/remote-support/active')->assertUnauthorized();
        $this->withHeaders($headers)->postJson('/api/sync/remote-support/delete-everything')->assertNotFound();
    }
}
