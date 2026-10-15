<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\StoreLicenceVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreLicenceTest extends TestCase
{
    use RefreshDatabase;

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
        $input = $encode(json_encode(['alg' => 'EdDSA', 'typ' => 'JWT', 'kid' => 'dev'])).'.'.$encode(json_encode($claims));
        $pem = "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEINIdxVHA20b/T5WcZmglwQISdQm5m1Ek8wwKNoH6VO4a\n-----END PRIVATE KEY-----";
        openssl_sign($input, $signature, $pem, null);

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
}
