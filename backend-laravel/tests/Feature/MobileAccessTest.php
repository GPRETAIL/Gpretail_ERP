<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class MobileAccessTest extends TestCase
{
    use RefreshDatabase;

    private string $privateKeyPem = '';

    protected function setUp(): void
    {
        parent::setUp();
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519, 'config' => base_path('tests/Fixtures/openssl.cnf')]);
        openssl_pkey_export($key, $this->privateKeyPem, null, ['config' => base_path('tests/Fixtures/openssl.cnf')]);
        config(['platform.licence_public_keys' => ['dev' => openssl_pkey_get_details($key)['key']]]);
    }

    private function fixture(bool $mobile = true): array
    {
        $activation = PlatformActivation::create(['company_code' => 'CMP-MOBILE', 'activated' => true,
            'status' => 'active', 'tenant_admin_email' => 'tenant@example.test', 'deployment_id' => (string) Str::uuid()]);
        $store = Store::create(['name' => 'Mobile branch', 'code' => 'STR-MOBILE', 'platform_company_code' => $activation->company_code,
            'platform_store_id' => 42, 'activated_at' => now(), 'is_active' => true]);
        $user = User::factory()->create(['username' => Str::random(16), 'store_id' => $store->id, 'platform_company_code' => $activation->company_code,
            'role' => 'user', 'mobile_access' => true, 'module_permissions' => ['masters' => ['view' => true]]]);
        $claims = ['iss' => 'vx-admin', 'aud' => 'next-erp', 'kid' => 'dev', 'sub' => $store->code,
            'company_code' => $activation->company_code, 'store_id' => 42, 'deployment_id' => $activation->deployment_id,
            'status' => 'active', 'subscription_status' => 'active', 'iat' => now()->subHour()->timestamp,
            'exp' => now()->addDay()->timestamp, 'activeTill' => now()->addMonth()->timestamp,
            'offline_until' => now()->addDays(2)->timestamp,
            'entitlements' => ['channels' => ['mobile' => $mobile], 'sections' => ['masters' => 'all', 'sales' => 'all']]];
        $store->update(['platform_licence_token' => $this->sign($claims)]);

        return [$user, $store, $claims, $activation];
    }

    private function sign(array $claims): string
    {
        $encode = fn ($value) => rtrim(strtr(base64_encode(json_encode($value)), '+/', '-_'), '=');
        $input = $encode(['alg' => 'EdDSA', 'typ' => 'JWT', 'kid' => 'dev']).'.'.$encode($claims);
        openssl_sign($input, $signature, $this->privateKeyPem, null);

        return $input.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    }

    private function clientSession(User $user, string $client = 'mobile'): void
    {
        $this->app['auth']->forgetGuards();
        $this->withToken($user->createToken('test', ['client:'.$client])->plainTextToken);
    }

    public function test_mobile_session_requires_signed_subscription_even_if_headers_are_removed_or_forged(): void
    {
        [$user] = $this->fixture(false);
        $this->clientSession($user);
        $this->withHeader('X-Client-Type', 'web')->getJson('/api/products')->assertForbidden()->assertJsonPath('code', 'MOBILE_SUBSCRIPTION_REQUIRED');
        $this->getJson('/api/mobile/access')->assertOk()->assertJsonPath('data.mobile_session', true)
            ->assertJsonPath('data.stores.0.allowed', false)->assertJsonPath('data.stores.0.reason', 'MOBILE_SUBSCRIPTION_REQUIRED');
    }

    public function test_mobile_grants_restrict_reads_writes_and_other_modules(): void
    {
        [$user] = $this->fixture();
        $this->clientSession($user);
        $this->getJson('/api/products')->assertOk();
        $this->postJson('/api/sizes', ['name' => 'Denied'])->assertForbidden()->assertJsonPath('code', 'MODULE_ACCESS_DENIED');
        $this->getJson('/api/pos-sales')->assertForbidden();
        $user->update(['module_permissions' => ['masters' => ['view' => true, 'add' => true]]]);
        $this->clientSession($user->fresh());
        $response = $this->postJson('/api/sizes', ['name' => 'Allowed']);
        $this->assertSame(201, $response->status(), $response->getContent());
    }

    public function test_tampered_expired_suspended_and_wrong_store_licences_fail_closed(): void
    {
        [$user, $store, $claims, $activation] = $this->fixture();
        $this->clientSession($user);
        foreach ([['activeTill' => now()->subSecond()->timestamp], ['store_id' => 999], ['deployment_id' => 'other']] as $change) {
            $store->update(['platform_licence_token' => $this->sign(array_replace($claims, $change))]);
            $this->getJson('/api/products')->assertForbidden()->assertJsonPath('code', 'STORE_SUBSCRIPTION_REQUIRED');
        }
        $store->update(['platform_licence_token' => $this->sign($claims).'tamper']);
        $this->getJson('/api/products')->assertForbidden();
        $store->update(['platform_licence_token' => $this->sign($claims)]);
        $activation->update(['status' => 'suspended']);
        $this->getJson('/api/products')->assertForbidden();
    }

    public function test_offline_grace_uses_verified_claims_and_web_does_not_require_mobile_addon(): void
    {
        [$user, $store, $claims] = $this->fixture(false);
        $claims['exp'] = now()->subMinute()->timestamp;
        $store->update(['platform_licence_token' => $this->sign($claims)]);
        $this->clientSession($user, 'web');
        $this->getJson('/api/products')->assertOk();
        $claims['entitlements']['channels']['mobile'] = true;
        $store->update(['platform_licence_token' => $this->sign($claims)]);
        $this->clientSession($user);
        $this->getJson('/api/products')->assertOk();
        $claims['offline_until'] = now()->subSecond()->timestamp;
        $store->update(['platform_licence_token' => $this->sign($claims)]);
        $this->getJson('/api/products')->assertForbidden();
    }

    public function test_user_access_editor_is_scoped_clamps_modules_and_revokes_old_sessions(): void
    {
        [$user, $store, , $activation] = $this->fixture();
        $oldToken = $user->createToken('old', ['client:mobile']);
        $admin = User::factory()->create(['username' => Str::random(16), 'role' => 'admin', 'store_id' => null,
            'email' => $activation->tenant_admin_email, 'platform_company_code' => $activation->company_code]);
        $this->clientSession($admin, 'web');
        $payload = ['web_access' => true, 'mobile_access' => true, 'module_permissions' => ['finance' => ['view' => true]]];
        $this->putJson('/api/user-access/'.$user->id.'/client-access', $payload)->assertUnprocessable();
        $payload['module_permissions'] = ['masters' => ['view' => true]];
        $this->putJson('/api/user-access/'.$user->id.'/client-access', $payload)->assertOk();
        $payload['mobile_access'] = false;
        $this->putJson('/api/user-access/'.$user->id.'/client-access', $payload)->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $oldToken->accessToken->id]);
        $other = User::factory()->create(['username' => Str::random(16), 'role' => 'user', 'store_id' => Store::create(['name' => 'Other', 'code' => 'OTHER', 'platform_company_code' => 'CMP-OTHER'])->id, 'platform_company_code' => 'CMP-OTHER']);
        $this->getJson('/api/user-access/'.$other->id.'/client-access')->assertNotFound();
    }

    public function test_tenant_admin_can_sign_in_without_stores_to_reach_subscription_management(): void
    {
        $activation = PlatformActivation::create(['company_code' => 'CMP-EMPTY', 'activated' => true, 'status' => 'active', 'tenant_admin_email' => 'owner@example.test']);
        $admin = User::factory()->create(['username' => Str::random(16), 'role' => 'admin', 'store_id' => null, 'email' => $activation->tenant_admin_email,
            'platform_company_code' => $activation->company_code, 'password' => 'Password123']);
        $response = $this->postJson('/api/auth/login', ['email' => $admin->email, 'password' => 'Password123', 'client' => 'mobile'])->assertOk()->assertJsonPath('data.user.auth_client', 'mobile');
        $this->withToken($response->json('data.token'))->getJson('/api/mobile/access')->assertOk()
            ->assertJsonPath('data.tenant_admin', true)->assertJsonCount(0, 'data.stores');
        $this->getJson('/api/products')->assertForbidden();
    }

    public function test_multiple_stores_require_selection_and_validate_each_subscription_separately(): void
    {
        [$user, $store, $claims, $activation] = $this->fixture();
        $other = Store::create(['name' => 'Licensed sibling', 'code' => 'STR-SIBLING', 'is_active' => true,
            'platform_company_code' => $activation->company_code, 'platform_store_id' => 43, 'activated_at' => now()]);
        $other->update(['platform_licence_token' => $this->sign(array_replace($claims, ['sub' => $other->code, 'store_id' => 43]))]);
        $store->update(['platform_licence_token' => $this->sign(array_replace($claims, ['activeTill' => now()->subMinute()->timestamp]))]);
        $user->update(['role' => 'admin', 'store_id' => null, 'email' => $activation->tenant_admin_email, 'module_permissions' => null]);
        $this->clientSession($user->fresh());
        $this->getJson('/api/mobile/access')->assertJsonPath('data.stores.0.allowed', false)->assertJsonPath('data.stores.1.allowed', true);
        $this->getJson('/api/products')->assertForbidden()->assertJsonPath('code', 'STORE_SELECTION_REQUIRED');
        $this->withHeader('X-Store-Id', (string) $store->id)->getJson('/api/products')->assertForbidden();
        $this->withHeader('X-Store-Id', (string) $other->id)->getJson('/api/products')->assertOk();
    }

    public function test_mobile_only_login_preserves_its_channel_after_password_change(): void
    {
        [$user] = $this->fixture();
        $user->update(['web_access' => false, 'password' => 'InitialPassword123']);
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'InitialPassword123'])->assertForbidden();
        $response = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'InitialPassword123', 'client' => 'mobile'])->assertOk();
        $this->withToken($response->json('data.token'));
        $changed = $this->postJson('/api/auth/change-password', ['currentPassword' => 'InitialPassword123', 'newPassword' => 'ChangedPassword123'])->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($changed->json('data.token'))->getJson('/api/auth/me')->assertJsonPath('data.auth_client', 'mobile');
    }
}
