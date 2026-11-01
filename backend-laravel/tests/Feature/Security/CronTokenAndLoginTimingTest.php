<?php

namespace Tests\Feature\Security;

use App\Models\PlatformActivation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CronTokenAndLoginTimingTest extends TestCase
{
    use RefreshDatabase;

    // A token in the URL lands in access logs, so the cron endpoints only take it from a header or POST body.
    public function test_cron_endpoints_refuse_a_token_in_the_url(): void
    {
        config(['backup.cron_secret' => 'backup-secret-value', 'sync.cron_secret' => 'sync-secret-value']);

        $this->getJson('/api/backups/scheduled-run?token=backup-secret-value')->assertStatus(400)
            ->assertJsonPath('message', fn ($message) => str_contains($message, 'X-Backup-Cron-Token'));
        $this->postJson('/api/backups/scheduled-run', [], ['X-Backup-Cron-Token' => 'wrong'])->assertForbidden();
        $this->postJson('/api/backups/scheduled-run', [], ['X-Backup-Cron-Token' => 'backup-secret-value'])->assertOk();
        $this->postJson('/api/backups/scheduled-run', ['token' => 'backup-secret-value'])->assertOk();

        $this->getJson('/api/sync/run-cycle?token=sync-secret-value')->assertStatus(400);
        $this->postJson('/api/sync/run-cycle', [], ['X-Sync-Cron-Token' => 'wrong'])->assertForbidden();
    }

    // Unknown usernames pay for a hash check too, so response time doesn't reveal which accounts exist.
    public function test_unknown_username_still_runs_a_password_hash_check(): void
    {
        PlatformActivation::create(['company_code' => 'CMP-TIMING', 'activated' => true, 'status' => 'active']);
        $key = 'auth:timing-dummy-hash:'.config('hashing.bcrypt.rounds');
        Cache::forget($key);

        $this->postJson('/api/auth/login', ['username' => 'nobody-here', 'password' => 'whatever-123'])->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid username or password.');

        $this->assertTrue(Hash::isHashed((string) Cache::get($key)), 'the unknown-user path checked against a real hash');
    }
}
