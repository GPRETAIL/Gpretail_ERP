<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\SystemConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase3AuthAndSecretMaskingTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(Store $store): User
    {
        return User::create([
            'name' => 'Store Admin',
            'username' => 'store-admin-'.$store->id,
            'email' => 'admin-'.$store->id.'@example.test',
            'password' => 'OldPassword123!',
            'role' => 'admin',
            'store_id' => $store->id,
            'is_active' => true,
        ]);
    }

    public function test_sanctum_token_expiration_is_configured_and_password_change_revokes_all_prior_tokens(): void
    {
        $this->assertGreaterThan(0, (int) config('sanctum.expiration'));

        $store = Store::create(['name' => 'Main Store', 'code' => 'STR-MAIN', 'is_active' => true]);
        $user = $this->createAdmin($store);

        $tokenOne = $user->createToken('device-1')->plainTextToken;
        $tokenTwo = $user->createToken('device-2')->plainTextToken;

        $response = $this->withToken($tokenOne)->postJson('/api/auth/change-password', [
            'currentPassword' => 'OldPassword123!',
            'newPassword' => 'NewPassword456!',
        ])->assertOk();

        $newToken = $response->json('data.token');
        $this->assertNotEmpty($newToken);
        $this->assertNull(PersonalAccessToken::findToken($tokenOne));
        $this->assertNull(PersonalAccessToken::findToken($tokenTwo));
        $this->assertNotNull(PersonalAccessToken::findToken($newToken));
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_invoice_ai_keys_are_encrypted_masked_on_read_and_hidden_from_configuration_endpoints(): void
    {
        $store = Store::create(['name' => 'Main Store', 'code' => 'STR-MAIN', 'is_active' => true]);
        Sanctum::actingAs($this->createAdmin($store));

        $rawGeminiKey = 'AIzaSySecretKeyForTesting987654321';

        $this->postJson('/api/v1/invoice-ai/engine-config', [
            'gemini_api_key' => $rawGeminiKey,
            'space_ocr_api_key' => 'short-key',
        ])->assertOk();

        // Stored encrypted in system_configurations
        $record = SystemConfiguration::withoutGlobalScopes()
            ->where('group', 'invoice_ai')
            ->where('key', 'gemini_api_key')
            ->firstOrFail();

        $this->assertNotSame($rawGeminiKey, $record->value);
        $this->assertSame($rawGeminiKey, Crypt::decryptString($record->value));

        // Masked on GET /api/v1/invoice-ai/engine-config (never exposes suffix or short keys)
        $cfgResponse = $this->getJson('/api/v1/invoice-ai/engine-config')->assertOk();
        $this->assertTrue($cfgResponse->json('gemini.configured'));
        $this->assertSame('AIza****************', $cfgResponse->json('gemini.masked_key'));
        $this->assertSame(str_repeat('*', 20), $cfgResponse->json('space_ocr.masked_key'));

        // Submitting masked placeholder back preserves the existing encrypted key
        $this->postJson('/api/v1/invoice-ai/engine-config', [
            'gemini_api_key' => 'AIza****************',
        ])->assertOk();
        $this->assertSame($rawGeminiKey, Crypt::decryptString($record->fresh()->value));

        // ConfigurationController never exposes or modifies internal invoice_ai records
        $this->getJson('/api/configurations')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/configurations/invoice_ai')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/configurations/invoice_ai/'.$record->id)->assertNotFound();
        $this->deleteJson('/api/configurations/invoice_ai/'.$record->id)->assertOk();
        $this->assertDatabaseHas('system_configurations', ['id' => $record->id]);

        $this->postJson('/api/configurations', [
            'group' => 'invoice_ai',
            'key' => 'gemini_api_key',
            'value' => 'overwritten',
        ])->assertForbidden();
    }
}
