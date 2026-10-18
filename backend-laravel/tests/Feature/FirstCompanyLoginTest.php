<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\PlatformActivationService;
use App\Services\StoreLicenceVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FirstCompanyLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('platform.base_url', 'https://platform.test');
        config()->set('platform.company_code', 'CMP-FIRST');
        config()->set('platform.client_id', 'client-first');
        Http::preventStrayRequests();
    }

    private function fakePlatform(array $snapshot = []): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            'https://platform.test/api/v1/tenant/authenticate' => Http::response(['success' => true, 'data' => [
                'authenticated' => true, 'email' => 'owner@example.test', 'company_code' => 'CMP-FIRST', 'company_name' => 'First Company',
            ]]),
            'https://platform.test/api/v1/tenant/register' => Http::response(['success' => true, 'data' => ['sync_token' => 'registered-sync']]),
            'https://platform.test/api/v1/tenant/CMP-FIRST/snapshot' => Http::response(['success' => true, 'data' => array_replace([
                'company' => ['company_code' => 'CMP-FIRST', 'name' => 'First Company', 'status' => 'active',
                    'tenant_admin_email' => 'owner@example.test', 'tenant_password_hash' => Hash::make('Welcome-12345'), 'tenant_password_version' => 1],
                'stores' => [], 'warehouses' => [],
            ], $snapshot)]),
            'https://platform.test/api/v1/tenant/CMP-FIRST/password-adopted' => Http::response(['success' => true, 'data' => ['acknowledged' => true]]),
        ]);
    }

    private function setupToken(): string
    {
        $response = $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Welcome-12345']);
        $response->assertOk()->assertJsonPath('data.activation_required', true)->assertJsonMissingPath('data.token');

        return $response->json('data.setup_token');
    }

    public function test_first_login_issues_only_setup_access_then_activation_provisions_a_local_login(): void
    {
        $this->fakePlatform();
        $token = $this->setupToken();
        $this->assertDatabaseMissing('users', ['email' => 'owner@example.test']);
        $this->withToken($token)->postJson('/api/sizes', ['name' => 'Forbidden setup write'])->assertUnauthorized();
        $this->withToken($token)->postJson('/api/activation/bootstrap-register', ['one_time_password' => 'company-code'])->assertOk()->assertJsonPath('data.activated', true);
        $this->withToken($token)->postJson('/api/activation/bootstrap-register', ['one_time_password' => 'company-code'])->assertUnauthorized();
        $owner = User::where('email', 'owner@example.test')->firstOrFail();
        $this->assertNull($owner->store_id);
        $this->assertSame('CMP-FIRST', $owner->platform_company_code);
        Http::fake(fn () => throw new \RuntimeException('Normal login must not contact GP Admin'));
        $this->postJson('/api/auth/login', ['email' => $owner->email, 'password' => 'Welcome-12345'])->assertOk()->assertJsonStructure(['data' => ['token', 'user']]);
    }

    public function test_wrong_existing_password_never_falls_back_to_platform_credentials(): void
    {
        User::create(['name' => 'Local', 'username' => 'local', 'email' => 'owner@example.test', 'password' => 'Local-password', 'role' => 'admin']);
        $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Wrong-password'])->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_invalid_platform_credentials_never_grant_setup_access(): void
    {
        Http::fake(['*' => Http::response(['success' => true, 'data' => ['authenticated' => false]])]);
        $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Wrong-password'])
            ->assertUnauthorized()->assertJsonMissingPath('data.setup_token');
        $this->assertDatabaseMissing('users', ['email' => 'owner@example.test']);
    }

    public function test_a_partially_provisioned_owner_can_resume_setup_without_business_access(): void
    {
        PlatformActivation::create(['company_code' => 'CMP-FIRST', 'sync_token' => 'registered-sync', 'activated' => false, 'tenant_admin_email' => 'owner@example.test']);
        User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.test', 'password' => 'Local-password', 'role' => 'admin', 'platform_company_code' => 'CMP-FIRST']);
        $this->postJson('/api/auth/login', ['email' => 'OWNER@example.test', 'password' => 'Local-password'])
            ->assertOk()->assertJsonPath('data.activation_required', true)->assertJsonMissingPath('data.token');
        Http::assertNothingSent();
    }

    public function test_an_activated_installation_never_bootstraps_a_missing_user(): void
    {
        PlatformActivation::create(['company_code' => 'CMP-FIRST', 'activated' => true, 'status' => 'active']);
        $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Welcome-12345'])->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_unreachable_platform_and_wrong_company_never_create_users(): void
    {
        Http::fake(['*' => Http::response([], 503)]);
        $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Welcome-12345'])->assertStatus(503);
        $this->fakePlatform();
        config()->set('platform.company_code', 'CMP-OTHER');
        $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Welcome-12345'])->assertUnauthorized();
        $this->assertDatabaseMissing('users', ['email' => 'owner@example.test']);
    }

    public function test_setup_token_expires_and_cannot_activate_a_different_company(): void
    {
        $this->fakePlatform();
        $token = $this->setupToken();
        $this->withToken($token)->postJson('/api/activation/bootstrap-register', ['license_key' => ['invalid']])->assertUnprocessable();
        $this->withToken($token)->postJson('/api/activation/bootstrap-register', ['company_code' => 'CMP-OTHER', 'client_id' => 'other', 'one_time_password' => 'otp'])->assertForbidden();
        $this->travel(16)->minutes();
        $this->withToken($token)->postJson('/api/activation/bootstrap-register', ['one_time_password' => 'otp'])->assertUnauthorized();
        $this->assertDatabaseCount('platform_activations', 0);
    }

    public function test_snapshot_identity_mismatch_does_not_activate_or_import_accounts(): void
    {
        $this->fakePlatform(['company' => ['company_code' => 'CMP-FIRST', 'status' => 'active', 'tenant_admin_email' => 'other@example.test']]);
        $token = $this->setupToken();
        $this->withToken($token)->postJson('/api/activation/bootstrap-register', ['one_time_password' => 'otp'])->assertStatus(422);
        $this->assertFalse(PlatformActivation::current()->activated);
        $this->assertDatabaseMissing('users', ['email' => 'other@example.test']);
    }

    public function test_plain_http_non_loopback_platform_is_rejected_before_sending_credentials(): void
    {
        config()->set('platform.base_url', 'http://platform.test');
        $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Welcome-12345'])->assertStatus(503);
        Http::assertNothingSent();
    }

    public function test_store_accounts_and_plan_changes_sync_without_reactivation_or_password_regression(): void
    {
        $activation = PlatformActivation::create(['company_code' => 'CMP-FIRST', 'activated' => true, 'status' => 'active', 'sync_token' => 'sync', 'deployment_id' => 'installation-1']);
        $source = ['store_id' => 91, 'code' => 'STORE-91', 'name' => 'Store 91', 'activation_required' => true,
            'activated_at' => now()->toIso8601String(), 'status' => 'active', 'deployment_id' => 'installation-1',
            'active_till' => now()->addMonth()->toIso8601String(), 'licence' => 'verified-store-licence',
            'admin_email' => 'store@example.test', 'admin_username' => 'branch-admin', 'admin_name' => 'Store Administrator', 'admin_password_hash' => Hash::make('Store-password'), 'admin_password_version' => 1,
            'subscription' => ['status' => 'active', 'plan_id' => 1, 'plan_name' => 'Trial', 'entitlements' => ['sections' => ['sales' => 'all']]]];
        $this->mock(StoreLicenceVerifier::class)->shouldReceive('verify')->andReturn(['ok' => true, 'claims' => []]);
        $this->fakePlatform(['stores' => [$source]]);
        $service = app(PlatformActivationService::class);
        $this->assertTrue($service->sync($activation)['ok']);
        $user = User::where('email', 'store@example.test')->firstOrFail();
        $this->assertSame('store:91', $user->platform_identity);
        $this->assertSame('branch-admin', $user->username);
        $this->assertSame(Store::where('code', 'STORE-91')->value('id'), $user->store_id);
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Store-password'])->assertOk();
        $user->update(['password' => 'Local-store-password']);
        foreach (['Basic', 'Standard', 'Pro'] as $index => $plan) {
            $source['subscription'] = ['status' => 'active', 'plan_id' => $index + 2, 'plan_name' => $plan, 'entitlements' => ['sections' => ['sales' => 'all', 'masters' => 'all']]];
            $source['licence'] = 'verified-licence-'.$plan;
            $this->fakePlatform(['stores' => [$source]]);
            $this->assertTrue($service->sync($activation)['ok']);
            $this->assertSame($plan, $user->store->fresh()->platform_subscription['plan_name']);
            $this->assertSame('all', $user->store->fresh()->platform_subscription['entitlements']['sections']['masters']);
            $this->assertSame('verified-licence-'.$plan, $user->store->fresh()->platform_licence_token);
            $this->assertTrue(Hash::check('Local-store-password', $user->fresh()->password));
        }
        $user->createToken('before-reassignment');
        $source['admin_email'] = 'replacement@example.test';
        $source['admin_password_hash'] = null;
        $this->fakePlatform(['stores' => [$source]]);
        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertFalse($user->fresh()->is_active);
        $this->assertSame(0, $user->tokens()->count());
        $source['admin_password_hash'] = Hash::make('New-store-password');
        $source['admin_password_version'] = 2;
        $this->fakePlatform(['stores' => [$source]]);
        $this->assertTrue($service->sync($activation)['ok']);
        $user = $user->fresh();
        $this->assertSame('replacement@example.test', $user->email);
        $this->assertTrue($user->is_active);
        $this->assertTrue(Hash::check('New-store-password', $user->password));
        $user->createToken('existing-session');
        $source['status'] = 'inactive';
        $this->fakePlatform(['stores' => [$source]]);
        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertFalse($user->fresh()->is_active);
        $this->assertSame(0, $user->tokens()->count());
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'New-store-password'])->assertForbidden();
    }

    public function test_store_snapshot_cannot_take_over_an_unrelated_local_email(): void
    {
        $local = User::create(['name' => 'Local', 'username' => 'local', 'email' => 'store@example.test', 'password' => 'Local-password', 'role' => 'super_admin']);
        $activation = PlatformActivation::create(['company_code' => 'CMP-FIRST', 'activated' => true, 'sync_token' => 'sync']);
        $this->fakePlatform(['stores' => [['store_id' => 91, 'code' => 'STORE-91', 'name' => 'Store 91', 'activation_required' => true,
            'admin_email' => $local->email, 'admin_password_hash' => Hash::make('Replacement'), 'admin_password_version' => 1]]]);
        $this->assertFalse(app(PlatformActivationService::class)->sync($activation)['ok']);
        $this->assertTrue(Hash::check('Local-password', $local->fresh()->password));
    }
}
