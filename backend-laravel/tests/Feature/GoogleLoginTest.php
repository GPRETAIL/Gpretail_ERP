<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    private \OpenSSLAsymmetricKey $key;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google.client_id' => 'erp-test.apps.googleusercontent.com']);
        $cnf = file_exists('D:/xampp/php/extras/ssl/openssl.cnf') ? 'D:/xampp/php/extras/ssl/openssl.cnf' : (file_exists('D:/xampp/apache/conf/openssl.cnf') ? 'D:/xampp/apache/conf/openssl.cnf' : null);
        $options = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];
        if ($cnf) {
            $options['config'] = $cnf;
        }
        $this->key = openssl_pkey_new($options);
        Cache::put('google:id-token:certificates', ['fixture' => openssl_pkey_get_details($this->key)['key']], 300);
        Http::preventStrayRequests();
        User::query()->delete();
    }

    private function token(array $claims = [], array $header = []): string
    {
        $encode = fn ($value) => rtrim(strtr(base64_encode(json_encode($value)), '+/', '-_'), '=');
        $input = $encode(array_replace(['alg' => 'RS256', 'kid' => 'fixture'], $header)).'.'.$encode(array_replace([
            'iss' => 'https://accounts.google.com', 'aud' => 'erp-test.apps.googleusercontent.com',
            'sub' => 'google-user-123', 'email' => 'existing@gmail.com', 'email_verified' => true,
            'iat' => time() - 30, 'exp' => time() + 3600,
        ], $claims));
        openssl_sign($input, $signature, $this->key, OPENSSL_ALGO_SHA256);

        return $input.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    }

    private function user(array $attributes = []): User
    {
        return User::factory()->create(array_replace(['username' => 'google-fixture', 'email' => 'existing@gmail.com', 'role' => 'admin', 'is_active' => true], $attributes));
    }

    public function test_existing_user_can_sign_in_and_receives_normal_store_context(): void
    {
        $store = Store::create(['name' => 'Google branch', 'code' => 'GOOGLE']);
        $user = $this->user(['store_id' => $store->id, 'must_change_password' => true]);
        $response = $this->postJson('/api/auth/google', ['id_token' => $this->token()]);
        $response->assertOk()->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.store_ids', [$store->id])
            ->assertJsonPath('data.user.must_change_password', true);
        $this->assertNotEmpty($response->json('data.token'));
        $this->assertSame('google-user-123', $user->fresh()->google_sub);
        $this->assertArrayNotHasKey('google_sub', $user->fresh()->toArray());
        $this->assertDatabaseCount('users', 1);
        $this->postJson('/api/auth/google', ['credential' => $this->token()])->assertOk();
    }

    public function test_invalid_tokens_cannot_link_an_account_or_issue_a_session(): void
    {
        $user = $this->user();
        foreach ([['aud' => 'other-client'], ['iss' => 'attacker.example'], ['exp' => time() - 1],
            ['email_verified' => false], ['iat' => time() + 3600], ['azp' => 'other-client'], ['sub' => '']] as $claims) {
            $this->postJson('/api/auth/google', ['id_token' => $this->token($claims)])->assertUnauthorized();
        }
        $this->postJson('/api/auth/google', ['id_token' => $this->token([], ['alg' => 'HS256'])])->assertUnauthorized();
        $parts = explode('.', $this->token());
        $parts[1] = rtrim(strtr(base64_encode('{"email":"attacker@gmail.com"}'), '+/', '-_'), '=');
        $this->postJson('/api/auth/google', ['id_token' => implode('.', $parts)])->assertUnauthorized();
        $this->assertNull($user->fresh()->google_sub);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_unknown_inactive_and_mismatched_accounts_are_rejected(): void
    {
        $this->postJson('/api/auth/google', ['id_token' => $this->token()])->assertForbidden();
        $this->assertDatabaseCount('users', 0);
        $user = $this->user(['is_active' => false]);
        $this->postJson('/api/auth/google', ['id_token' => $this->token()])->assertForbidden();
        $user->forceFill(['is_active' => true, 'google_sub' => 'different-subject'])->save();
        $this->postJson('/api/auth/google', ['id_token' => $this->token()])->assertForbidden();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_custom_email_requires_workspace_authority_for_first_link(): void
    {
        $user = $this->user(['email' => 'owner@example.com']);
        $this->postJson('/api/auth/google', ['id_token' => $this->token(['email' => $user->email])])->assertForbidden();
        $this->assertNull($user->fresh()->google_sub);
        $this->postJson('/api/auth/google', ['id_token' => $this->token(['email' => $user->email, 'hd' => 'example.com'])])->assertOk();
    }

    public function test_google_login_cannot_bypass_company_activation(): void
    {
        $this->user(['platform_company_code' => 'CMP-NOT-ACTIVE']);
        $this->postJson('/api/auth/google', ['id_token' => $this->token()])->assertForbidden()
            ->assertJsonPath('message', 'Your company ERP activation is not active. Contact your administrator.');
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_missing_configuration_and_payload_fail_clearly(): void
    {
        $this->getJson('/api/auth/config')->assertOk()->assertJsonPath('data.google_enabled', true);
        $this->postJson('/api/auth/google', [])->assertUnprocessable()->assertJsonValidationErrors('id_token');
        config(['services.google.client_id' => '']);
        $this->getJson('/api/auth/config')->assertOk()->assertJsonPath('data.google_enabled', false);
        $this->postJson('/api/auth/google', ['id_token' => $this->token()])->assertStatus(503);
    }

    public function test_denied_mobile_google_login_does_not_link_or_revoke_an_existing_web_session(): void
    {
        $user = $this->user(['mobile_access' => false]);
        $existing = $user->createToken('web', ['client:web']);
        $this->postJson('/api/auth/google', ['id_token' => $this->token(), 'client' => 'mobile'])->assertForbidden();
        $this->assertNull($user->fresh()->google_sub);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $existing->accessToken->id]);
    }
}
