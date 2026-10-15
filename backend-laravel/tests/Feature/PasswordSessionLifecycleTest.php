<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class PasswordSessionLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function account(bool $forced): User
    {
        $store = Store::create(['name' => 'Password branch', 'code' => 'PASSWORD']);

        return User::factory()->create(['username' => 'password-test', 'store_id' => $store->id, 'role' => 'user', 'password' => 'old-password', 'must_change_password' => $forced]);
    }

    public function test_forced_password_change_updates_hash_rotates_token_and_revokes_other_sessions(): void
    {
        $user = $this->account(true);
        $old = $user->createToken('old')->plainTextToken;
        $other = $user->createToken('other')->plainTextToken;
        $response = $this->withToken($old)->postJson('/api/auth/change-password', ['newPassword' => 'new-password-123'])->assertOk();
        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
        $this->assertFalse($user->fresh()->must_change_password);
        $this->assertSame(1, $user->tokens()->count());
        $this->assertNotSame($old, $response->json('data.token'));
        $this->assertNull(PersonalAccessToken::findToken($old));
        $this->assertNull(PersonalAccessToken::findToken($other));
    }

    public function test_regular_password_change_requires_old_password_and_account_changes_revoke_tokens(): void
    {
        $user = $this->account(false);
        $token = $user->createToken('test')->plainTextToken;
        $this->withToken($token)->postJson('/api/auth/change-password', ['newPassword' => 'new-password-123'])->assertUnprocessable();
        $this->postJson('/api/auth/change-password', ['newPassword' => 'new-password-123', 'currentPassword' => 'old-password'])->assertOk();
        $this->assertSame(1, $user->tokens()->count());
        $user->refresh()->update(['is_active' => false]);
        $this->assertSame(0, $user->tokens()->count());
    }
}
