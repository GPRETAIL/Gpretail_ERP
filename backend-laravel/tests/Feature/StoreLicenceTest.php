<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\PlatformActivationService;
use App\Services\PlatformClient;
use App\Services\StoreLicenceVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use ReflectionClass;
use Tests\TestCase;

class StoreLicenceTest extends TestCase
{
    use RefreshDatabase;

    private string $privateKeyPem = '';

    protected function setUp(): void
    {
        parent::setUp();

        $keyPair = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519, 'config' => base_path('tests/Fixtures/openssl.cnf')]);
        openssl_pkey_export($keyPair, $privatePem, null, ['config' => base_path('tests/Fixtures/openssl.cnf')]);
        $details = openssl_pkey_get_details($keyPair);
        $spkiBase64 = preg_replace('/-----.*-----|[\r\n]+/', '', (string) ($details['key'] ?? ''));

        $this->privateKeyPem = $privatePem;
        config()->set('platform.licence_public_keys', ['dev' => $spkiBase64]);
    }

    private function setupStore(): array
    {
        $activation = PlatformActivation::create(['company_code' => 'CMP-LICENCE', 'activated' => true, 'status' => 'active', 'deployment_id' => (string) Str::uuid()]);
        $store = Store::create(['name' => 'Licensed', 'code' => 'STR-LICENCE', 'platform_company_code' => $activation->company_code, 'platform_store_id' => 987, 'is_active' => true, 'activation_required' => true, 'activated_at' => now()]);
        $claims = ['iss' => 'vx-admin', 'aud' => 'next-erp', 'kid' => 'dev', 'sub' => $store->code, 'company_code' => $activation->company_code, 'store_id' => 987, 'deployment_id' => $activation->deployment_id,
            'status' => 'active', 'subscription_status' => 'active', 'iat' => now()->subHour()->timestamp, 'exp' => now()->addDay()->timestamp,
            'activeTill' => now()->addMonth()->timestamp, 'offline_until' => now()->addDays(2)->timestamp];

        return [$activation, $store, $claims];
    }

    private function token(array $claims): string
    {
        $encode = fn ($value) => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
        $kid = $claims['kid'] ?? 'dev';
        $input = $encode(json_encode(['alg' => 'EdDSA', 'typ' => 'JWT', 'kid' => $kid])).'.'.$encode(json_encode($claims));
        openssl_sign($input, $signature, $this->privateKeyPem, null);

        return $input.'.'.$encode($signature);
    }

    public function test_valid_licence_permits_write_but_tampered_token_blocks_it(): void
    {
        [$activation, $store, $claims] = $this->setupStore();
        $store->update(['platform_licence_token' => $this->token($claims)]);
        $owner = User::create(['name' => 'Owner', 'username' => 'licence-owner', 'email' => 'licence@example.test', 'password' => 'secret', 'role' => 'admin', 'platform_company_code' => $activation->company_code]);
        Sanctum::actingAs($owner);
        $this->postJson('/api/sizes', ['name' => 'Licensed small'])->assertCreated();
        $store->update(['platform_licence_token' => $this->token($claims).'tamper']);
        $this->postJson('/api/sizes', ['name' => 'Invalid'])->assertForbidden()->assertJsonPath('code', 'STORE_LICENCE_INVALID');
        $this->assertDatabaseMissing('sizes', ['name' => 'Invalid']);
    }

    public function test_wrong_company_store_deployment_and_cancelled_subscription_are_rejected(): void
    {
        [$activation, $store, $claims] = $this->setupStore();
        foreach (['company_code' => 'OTHER', 'store_id' => 999, 'deployment_id' => (string) Str::uuid(), 'subscription_status' => 'cancelled'] as $key => $value) {
            $store->platform_licence_token = $this->token(array_replace($claims, [$key => $value]));
            $this->assertFalse(app(StoreLicenceVerifier::class)->verify($store, $activation)['ok']);
        }
    }

    public function test_offline_grace_never_exceeds_commercial_expiry_and_suspension_overrides(): void
    {
        [$activation, $store, $claims] = $this->setupStore();
        $claims['exp'] = now()->subMinute()->timestamp;
        $store->platform_licence_token = $this->token($claims);
        $this->assertTrue(app(StoreLicenceVerifier::class)->verify($store, $activation)['ok']);
        $claims['activeTill'] = now()->subSecond()->timestamp;
        $store->platform_licence_token = $this->token($claims);
        $this->assertFalse(app(StoreLicenceVerifier::class)->verify($store, $activation)['ok']);
        $activation->status = 'suspended';
        $this->assertFalse(app(StoreLicenceVerifier::class)->verify($store, $activation)['ok']);
    }

    public function test_one_expired_store_does_not_block_a_valid_sibling(): void
    {
        [$activation, $store, $claims] = $this->setupStore();
        $other = Store::create(['name' => 'Expired', 'code' => 'STR-EXPIRED', 'platform_company_code' => $activation->company_code, 'platform_store_id' => 986, 'is_active' => true, 'activated_at' => now()]);
        $store->update(['platform_licence_token' => $this->token($claims)]);
        $owner = User::create(['name' => 'Owner', 'username' => 'sibling-owner', 'email' => 'sibling@example.test', 'password' => 'secret', 'role' => 'admin', 'platform_company_code' => $activation->company_code]);
        Sanctum::actingAs($owner);
        $this->withHeader('X-Store-Id', (string) $other->id)->postJson('/api/sizes', ['name' => 'Expired write'])->assertForbidden();
        $this->withHeader('X-Store-Id', (string) $store->id)->postJson('/api/sizes', ['name' => 'Sibling write'])->assertCreated();
    }

    public function test_verifier_has_no_hardcoded_dev_public_key_and_fails_closed_when_unconfigured(): void
    {
        $reflection = new ReflectionClass(StoreLicenceVerifier::class);
        $this->assertFalse($reflection->hasConstant('DEV_PUBLIC_KEY'));

        [$activation, $store, $claims] = $this->setupStore();
        $store->platform_licence_token = $this->token($claims);

        // Clearing configured public keys must fail closed (no embedded fallback key)
        config()->set('platform.licence_public_keys', []);
        $this->assertFalse(app(StoreLicenceVerifier::class)->verify($store, $activation)['ok']);
    }

    public function test_production_environment_rejects_dev_kid_even_when_configured(): void
    {
        [$activation, $store, $claims] = $this->setupStore();
        $store->platform_licence_token = $this->token($claims);

        $origEnv = $this->app['env'];
        try {
            $this->app['env'] = 'production';
            $this->assertFalse(app(StoreLicenceVerifier::class)->verify($store, $activation)['ok']);
        } finally {
            $this->app['env'] = $origEnv;
        }
    }

    public function test_platform_client_requires_sync_token_and_rejects_traversal_company_codes(): void
    {
        Http::fake();
        $client = app(PlatformClient::class);

        $missingToken = $client->pullSnapshot('CMP-LICENCE', null);
        $this->assertFalse($missingToken['ok']);
        $this->assertSame(401, $missingToken['status']);

        $badCode = $client->pullSnapshot('../admin', 'valid-token');
        $this->assertFalse($badCode['ok']);
        $this->assertSame(422, $badCode['status']);

        Http::assertNothingSent();
    }

    public function test_password_adoption_rejects_non_bcrypt_hash_and_revokes_existing_tokens_on_rotation(): void
    {
        config()->set('platform.base_url', 'https://platform.test');
        $activation = PlatformActivation::create([
            'company_code' => 'CMP-LICENCE',
            'sync_token' => 'sync-tok',
            'activated' => true,
            'status' => 'active',
        ]);

        $owner = User::create([
            'name' => 'Tenant Owner',
            'username' => 'tenant-owner-rot',
            'email' => 'owner@example.test',
            'password' => Hash::make('Old-password-123'),
            'role' => 'admin',
            'is_active' => true,
            'platform_company_code' => 'CMP-LICENCE',
            'platform_password_version' => 1,
        ]);
        $oldToken = $owner->createToken('old-session')->plainTextToken;

        // 1. Non-bcrypt hash in snapshot must be rejected
        Http::fake([
            'https://platform.test/api/v1/tenant/CMP-LICENCE/snapshot' => Http::sequence()
                ->push([
                    'success' => true,
                    'data' => [
                        'company' => [
                            'company_code' => 'CMP-LICENCE',
                            'status' => 'active',
                            'tenant_admin_email' => 'owner@example.test',
                            'tenant_password_hash' => 'plaintext-not-bcrypt',
                            'tenant_password_version' => 2,
                        ],
                        'stores' => [],
                        'warehouses' => [],
                    ],
                ], 200)
                ->push([
                    'success' => true,
                    'data' => [
                        'company' => [
                            'company_code' => 'CMP-LICENCE',
                            'status' => 'active',
                            'tenant_admin_email' => 'owner@example.test',
                            'tenant_password_hash' => Hash::make('Rotated-password-456'),
                            'tenant_password_version' => 2,
                        ],
                        'stores' => [],
                        'warehouses' => [],
                    ],
                ], 200),
            'https://platform.test/api/v1/tenant/CMP-LICENCE/password-adopted' => Http::response(['success' => true], 200),
        ]);

        $service = app(PlatformActivationService::class);
        $this->assertFalse($service->sync($activation)['ok']);
        $this->assertNotNull(PersonalAccessToken::findToken($oldToken));

        // 2. Valid bcrypt rotation revokes existing tokens
        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertNull(PersonalAccessToken::findToken($oldToken));
        $this->assertTrue(Hash::check('Rotated-password-456', $owner->fresh()->password));
    }

    public function test_production_client_rejects_http_without_sending_credentials(): void
    {
        Http::fake();
        $this->app['env'] = 'production';
        config(['platform.base_url' => 'http://platform.test']);
        $client = app(PlatformClient::class);
        $activation = new PlatformActivation(['company_code' => 'CMP-SAFE', 'sync_token' => 'per-company-token']);
        foreach ([
            $client->authenticateTenant('owner@example.test', 'password'),
            $client->register('CMP-SAFE', 'client', 'setup', 'ticket'),
            $client->pullSnapshot('CMP-SAFE', 'per-company-token'),
            $client->passwordAdopted('CMP-SAFE', 'per-company-token', 2, 'STR-SAFE'),
            $client->activateStore($activation, 'STR-SAFE', 'activation-code'),
            $client->firstEntry('CMP-SAFE', 'per-company-token'),
        ] as $result) {
            $this->assertFalse($result['ok']);
        }
        Http::assertNothingSent();
    }

    public function test_scoped_sync_preserves_registration_ticket_and_store_password_acknowledgements(): void
    {
        config(['platform.base_url' => 'https://platform.test']);
        Http::fake(['*' => Http::response(['success' => true])]);
        $client = app(PlatformClient::class);
        $this->assertTrue($client->register('CMP-SAFE', 'client', 'setup', 'verified-ticket')['ok']);
        $this->assertTrue($client->passwordAdopted('CMP-SAFE', 'token', 2, 'STR-SAFE')['ok']);
        Http::assertSent(fn ($request) => ($request['registration_ticket'] ?? null) === 'verified-ticket');
        Http::assertSent(fn ($request) => ($request['scope'] ?? null) === 'store' && $request['store_code'] === 'STR-SAFE' && $request->hasHeader('Authorization', 'Bearer token'));
    }
}
