<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RemoteSupportTest extends TestCase
{
    use RefreshDatabase;

    public function test_support_is_forwarded_with_server_selected_identity_and_without_sync_outbox_credentials(): void
    {
        config(['platform.base_url' => 'https://admin.example.test']);
        PlatformActivation::create(['activated' => true, 'company_code' => 'CMP-ONE', 'deployment_id' => 'deploy-one', 'sync_token' => 'company-token']);
        $store = Store::create(['name' => 'Coffee', 'code' => 'STR-ONE', 'platform_company_code' => 'CMP-ONE', 'is_active' => true]);
        $user = User::create(['name' => 'Cashier', 'username' => 'cashier', 'email' => 'cashier@example.test', 'password' => 'secret', 'role' => 'cashier', 'store_id' => $store->id, 'platform_company_code' => 'CMP-ONE', 'is_active' => true]);
        Sanctum::actingAs($user);
        Http::fake(['admin.example.test/*' => Http::sequence()
            ->push(['success' => true, 'data' => ['id' => 5, 'status' => 'waiting']])
            ->push(['success' => true, 'data' => null])
            ->push(['message' => 'Down'], 500)]);
        $this->postJson('/api/remote-support/request', ['client_id' => '123 456 789', 'client_password' => 'temporary', 'category' => 'printing', 'priority' => 'normal', 'requester_id' => 999])->assertOk()->assertJsonPath('data.id', 5);
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer company-token')
            && $request['requester_id'] === $user->id && $request['store_code'] === 'STR-ONE' && $request['client_id'] === '123456789' && $request['deployment_id'] === 'deploy-one');
        $this->assertDatabaseCount('sync_outbox', 0);
        $this->getJson('/api/remote-support/active')->assertOk()->assertJsonPath('data', null);
        $this->getJson('/api/remote-support/active')->assertStatus(503);
    }

    public function test_unlinked_users_and_cross_store_requests_cannot_forward_support(): void
    {
        Http::preventStrayRequests();
        $one = Store::create(['name' => 'One', 'code' => 'ONE', 'is_active' => true]);
        $two = Store::create(['name' => 'Two', 'code' => 'TWO', 'is_active' => true]);
        $user = User::create(['name' => 'User', 'username' => 'user', 'email' => 'user@example.test', 'password' => 'secret', 'role' => 'cashier', 'store_id' => $one->id, 'is_active' => true]);
        Sanctum::actingAs($user);
        $this->getJson('/api/remote-support/active')->assertForbidden();
        $this->withHeader('X-Store-Id', $two->id)->getJson('/api/remote-support/active')->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_mobile_tokens_can_use_support_without_business_module_or_subscription_access(): void
    {
        config(['platform.base_url' => 'https://admin.example.test']);
        PlatformActivation::create(['activated' => true, 'company_code' => 'CMP-MOBILE', 'deployment_id' => 'mobile-deploy', 'sync_token' => 'company-token']);
        $store = Store::create(['name' => 'Coffee', 'code' => 'STR-MOBILE', 'platform_company_code' => 'CMP-MOBILE', 'is_active' => true]);
        $user = User::factory()->create(['username' => 'mobile-support', 'store_id' => $store->id, 'platform_company_code' => 'CMP-MOBILE', 'role' => 'cashier',
            'mobile_access' => true, 'module_permissions' => [], 'page_permissions' => []]);
        $this->withToken($user->createToken('mobile', ['client:mobile'])->plainTextToken);
        Http::fake(['admin.example.test/*' => Http::response(['success' => true, 'data' => ['id' => 5, 'status' => 'waiting']])]);

        $this->getJson('/api/remote-support/config')->assertOk();
        $this->getJson('/api/remote-support/active')->assertOk();
        $this->getJson('/api/remote-support/sessions')->assertOk();
        $this->postJson('/api/remote-support/request', ['client_id' => '123456789', 'category' => 'general', 'priority' => 'normal'])->assertOk();
        $this->postJson('/api/remote-support/5/cancel')->assertOk();
        $this->postJson('/api/remote-support/5/end')->assertOk();
        Http::assertSentCount(5);
        Http::assertSent(fn ($request) => $request['requester_id'] === $user->id && $request['deployment_id'] === 'mobile-deploy');
        $this->getJson('/api/configurations')->assertForbidden();
    }

    public function test_disabled_mobile_channel_and_unlinked_mobile_users_cannot_forward_support(): void
    {
        Http::preventStrayRequests();
        $store = Store::create(['name' => 'Coffee', 'code' => 'STR-MOBILE', 'is_active' => true]);
        $user = User::factory()->create(['username' => 'disabled-mobile-support', 'store_id' => $store->id, 'role' => 'cashier', 'mobile_access' => false]);
        $this->withToken($user->createToken('mobile', ['client:mobile'])->plainTextToken);
        $this->getJson('/api/remote-support/active')->assertForbidden()->assertJsonPath('code', 'CLIENT_ACCESS_DENIED');
        $user->update(['mobile_access' => true]);
        $this->app['auth']->forgetGuards();
        $this->withToken($user->fresh()->createToken('mobile', ['client:mobile'])->plainTextToken);
        $this->getJson('/api/remote-support/active')->assertForbidden();
        Http::assertNothingSent();
    }
}
