<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\PlatformActivationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreProvisioningTest extends TestCase
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

    private function activation(): PlatformActivation
    {
        config()->set('platform.base_url', 'https://platform.test');

        return PlatformActivation::create(['company_code' => 'CMP-PROVISION', 'sync_token' => 'scoped-token', 'activated' => true,
            'tenant_admin_email' => 'owner@example.test', 'deployment_id' => (string) Str::uuid()]);
    }

    private function snapshot(PlatformActivation $activation, array $store): array
    {
        if (! empty($store['activated_at']) && ! array_key_exists('licence', $store)) {
            $store['active_till'] ??= now()->addMonth()->toIso8601String();
            $store['subscription'] ??= ['status' => 'active'];
            $encode = fn ($value) => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
            $claims = ['iss' => 'vx-admin', 'aud' => 'next-erp', 'kid' => 'dev', 'sub' => $store['code'],
                'company_code' => $activation->company_code, 'store_id' => $store['store_id'], 'deployment_id' => $store['deployment_id'],
                'status' => 'active', 'subscription_status' => 'active', 'iat' => now()->timestamp, 'exp' => now()->addDay()->timestamp,
                'activeTill' => now()->addMonth()->timestamp, 'offline_until' => now()->addDays(2)->timestamp];
            $input = $encode(json_encode(['alg' => 'EdDSA', 'typ' => 'JWT', 'kid' => 'dev'])).'.'.$encode(json_encode($claims));
            openssl_sign($input, $signature, $this->privateKeyPem, null);
            $store['licence'] = $input.'.'.$encode($signature);
        }

        return ['success' => true, 'data' => ['company' => ['company_code' => $activation->company_code, 'status' => 'active', 'tenant_admin_email' => $activation->tenant_admin_email], 'stores' => [$store]]];
    }

    public function test_company_page_sync_pulls_platform_stores_before_any_store_is_assigned(): void
    {
        $activation = $this->activation();
        $owner = User::create(['name' => 'Owner', 'username' => 'sync-owner', 'email' => 'owner@example.test', 'password' => 'Welcome123', 'role' => 'admin', 'platform_company_code' => $activation->company_code]);
        Http::fake(['*/snapshot' => Http::response($this->snapshot($activation, ['store_id' => 991, 'name' => 'Pending branch', 'code' => 'STR-PENDING-991', 'activation_required' => true]))]);
        Sanctum::actingAs($owner);
        $this->postJson('/api/companies/tenant-sync/pull')->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseHas('stores', ['platform_store_id' => 991, 'platform_company_code' => $activation->company_code]);
        $this->getJson('/api/companies/tenant-sync/overview')->assertOk()->assertJsonPath('data.stores.0.code', 'STR-PENDING-991');
    }

    public function test_production_trust_check_rejects_a_missing_or_development_key(): void
    {
        config(['platform.licence_public_keys.prod' => '']);
        $this->artisan('platform:verify-trust --production')->assertFailed();
        config(['platform.licence_public_keys.prod' => 'MCowBQYDK2VwAyEAj5cKxJkJKAyG3zFVAiwZL0xyiWeCvfIzOpUoCrrgvfA=']);
        $this->artisan('platform:verify-trust --production')->assertFailed();
    }

    public function test_pending_store_is_imported_once_and_only_activated_for_this_deployment(): void
    {
        $activation = $this->activation();
        $store = ['store_id' => 123, 'name' => 'Imported', 'code' => 'STR-IMPORT', 'status' => 'active', 'activation_required' => true];
        Http::fake(function () use ($activation, &$store) {
            return Http::response($this->snapshot($activation, $store));
        });
        $service = app(PlatformActivationService::class);
        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertFalse(Store::where('platform_store_id', 123)->firstOrFail()->is_active);
        $store['activated_at'] = now()->toIso8601String();
        $store['deployment_id'] = $activation->deployment_id;

        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertSame(1, Store::where('platform_store_id', 123)->count());
        $this->assertTrue(Store::where('platform_store_id', 123)->firstOrFail()->is_active);
        $store['deployment_id'] = (string) Str::uuid();

        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertFalse(Store::where('platform_store_id', 123)->firstOrFail()->is_active);
    }

    public function test_sync_refuses_to_take_over_a_legacy_store_code(): void
    {
        $activation = $this->activation();
        $legacy = Store::create(['name' => 'Legacy', 'code' => 'STR-LEGACY']);
        Http::fake(['*/snapshot' => Http::response($this->snapshot($activation, ['store_id' => 123, 'name' => 'Imported', 'code' => $legacy->code, 'activation_required' => true]))]);
        $this->assertFalse(app(PlatformActivationService::class)->sync($activation)['ok']);
        $this->assertNull($legacy->fresh()->platform_store_id);
    }

    public function test_sync_does_not_enable_a_store_with_an_invalid_licence(): void
    {
        $activation = $this->activation();
        Http::fake(['*/snapshot' => Http::response($this->snapshot($activation, ['store_id' => 125, 'name' => 'Invalid', 'code' => 'STR-BAD',
            'status' => 'active', 'activation_required' => true, 'activated_at' => now()->toIso8601String(), 'deployment_id' => $activation->deployment_id,
            'active_till' => now()->addMonth()->toIso8601String(), 'subscription' => ['status' => 'active'], 'licence' => 'tampered']))]);
        $this->assertFalse(app(PlatformActivationService::class)->sync($activation)['ok']);
        $this->assertDatabaseMissing('stores', ['platform_store_id' => 125]);
    }

    public function test_expired_store_does_not_stop_a_valid_sibling_from_syncing(): void
    {
        $activation = $this->activation();
        $valid = $this->snapshot($activation, ['store_id' => 200, 'name' => 'Valid', 'code' => 'STR-VALID', 'status' => 'active', 'activation_required' => true,
            'activated_at' => now()->toIso8601String(), 'deployment_id' => $activation->deployment_id]);
        $valid['data']['stores'][] = ['store_id' => 201, 'name' => 'Expired', 'code' => 'STR-EXPIRED-SYNC', 'status' => 'active', 'activation_required' => true,
            'activated_at' => now()->subMonths(2)->toIso8601String(), 'deployment_id' => $activation->deployment_id,
            'active_till' => now()->subDay()->toIso8601String(), 'subscription' => ['status' => 'active'], 'licence' => 'expired-token'];
        $valid['data']['sync_token'] = 'refreshed-sync-token';
        Http::fake(['*/snapshot' => Http::response($valid)]);
        $this->assertTrue(app(PlatformActivationService::class)->sync($activation)['ok']);
        $this->assertTrue(Store::where('platform_store_id', 200)->firstOrFail()->is_active);
        $this->assertFalse(Store::where('platform_store_id', 201)->firstOrFail()->is_active);
        $this->assertSame('refreshed-sync-token', $activation->fresh()->sync_token);
    }

    public function test_warehouse_uses_local_parent_identity_and_follows_store_activation(): void
    {
        $activation = $this->activation();
        $source = ['store_id' => 900, 'name' => 'Parent', 'code' => 'STR-WH', 'status' => 'active', 'activation_required' => true];
        Http::fake(function () use ($activation, &$source) {
            $snapshot = $this->snapshot($activation, $source);
            $snapshot['data']['warehouses'] = [['warehouse_id' => 700, 'store_id' => 900, 'name' => 'Warehouse', 'code' => 'WH-TEST', 'status' => 'active', 'licence_inherited' => true]];

            return Http::response($snapshot);
        });
        $service = app(PlatformActivationService::class);
        $this->assertTrue($service->sync($activation)['ok']);
        $warehouse = Warehouse::withoutGlobalScopes()->where('platform_warehouse_id', 700)->firstOrFail();
        $this->assertFalse($warehouse->is_active);
        $this->assertSame(Store::where('platform_store_id', 900)->firstOrFail()->id, $warehouse->store_id);
        $source['activated_at'] = now()->toIso8601String();
        $source['deployment_id'] = $activation->deployment_id;
        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertTrue($warehouse->fresh()->is_active);
        $owner = User::create(['name' => 'Owner', 'username' => 'warehouse-owner', 'email' => $activation->tenant_admin_email, 'password' => 'secret', 'role' => 'admin', 'platform_company_code' => $activation->company_code]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/companies/tenant-sync/overview')->assertOk()
            ->assertJsonPath('data.stores.0.status', 'active')
            ->assertJsonPath('data.warehouses.0.status', 'active')
            ->assertJsonPath('data.warehouses.0.store_tags.0.name', 'Parent');
        $source['status'] = 'suspended';
        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertFalse($warehouse->fresh()->is_active);
    }

    public function test_owner_can_activate_with_no_store_but_store_admin_cannot(): void
    {
        $activation = $this->activation();
        $owner = User::create(['name' => 'Owner', 'username' => 'owner', 'email' => $activation->tenant_admin_email, 'password' => 'secret', 'role' => 'admin', 'platform_company_code' => $activation->company_code]);
        Http::fake(['*/stores/activate' => Http::response(['success' => true, 'data' => ['activated' => true]]),
            '*/snapshot' => Http::response($this->snapshot($activation, ['store_id' => 123, 'name' => 'Active', 'code' => 'STR-ACTIVE', 'status' => 'active', 'activation_required' => true, 'activated_at' => now()->toIso8601String(), 'deployment_id' => $activation->deployment_id]))]);
        $this->actingAs($owner)->postJson('/api/company-stores/activate', ['store_code' => 'STR-ACTIVE', 'activation_code' => 'code'])->assertOk();
        $owner->update(['store_id' => Store::where('platform_store_id', 123)->firstOrFail()->id]);
        $this->postJson('/api/company-stores/activate', ['store_code' => 'STR-ACTIVE', 'activation_code' => 'code'])->assertForbidden();
    }
}
