<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Wrong passwords and approval PINs lock that account, not only the address they came from. */
class BruteForceProtectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_repeated_wrong_passwords_lock_the_account_from_that_address_and_cap_it_overall(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        User::create(['name' => 'TEMP Guess Target', 'username' => 'guess-target', 'email' => 'target@example.test', 'password' => 'Right-pass-123',
            'role' => 'cashier', 'store_id' => $fixture['store']->id, 'is_active' => true]);
        $from = fn (string $ip) => $this->withServerVariables(['REMOTE_ADDR' => $ip]);

        for ($i = 0; $i < 8; $i++) {
            $from('10.0.0.1')->postJson('/api/auth/login', ['username' => 'guess-target', 'password' => "wrong-$i"])->assertUnauthorized();
        }
        // Locked from that address, even with the right password, and the message says for how long.
        $from('10.0.0.1')->postJson('/api/auth/login', ['username' => 'GUESS-TARGET', 'password' => 'Right-pass-123'])
            ->assertStatus(429)->assertHeader('Retry-After')->assertJsonPath('message', fn ($message) => str_contains($message, 'Try again in'));
        // The owner signing in from elsewhere is not locked out by that run.
        $this->assertNotSame(429, $from('10.0.0.2')->postJson('/api/auth/login', ['username' => 'guess-target', 'password' => 'Right-pass-123'])->status());

        // Spread over many addresses, the hourly cap per account still stops it.
        for ($i = 0; $i < 30; $i++) {
            $from('10.1.0.'.($i % 25))->postJson('/api/auth/login', ['username' => 'guess-target', 'password' => "spread-$i"]);
        }
        $from('10.2.0.1')->postJson('/api/auth/login', ['username' => 'guess-target', 'password' => 'Right-pass-123'])->assertStatus(429);
    }

    public function test_wrong_approval_pins_lock_that_approver_across_cashier_logins(): void
    {
        $fixture = PosPerformanceFixture::create(1);
        $store = $fixture['store']->id;
        $make = fn (string $role, ?string $pin = null) => User::create(['name' => "TEMP $role", 'username' => "temp-$role", 'email' => "$role@example.test",
            'password' => 'temporary-test-only', 'role' => $role, 'store_id' => $store, 'is_active' => true, 'approval_pin_hash' => $pin ? Hash::make($pin) : null]);
        $supervisor = $make('supervisor', '4321');
        $cashiers = [$make('cashier'), $make('sales')];
        $request = ['action' => 'pos_discount', 'requested_percent' => 5, 'reason_code' => 'damaged_item', 'approver' => $supervisor->username];

        foreach (range(0, 4) as $guess) {
            Sanctum::actingAs($cashiers[$guess % 2]); // Switching cashier logins doesn't reset the count.
            $this->postJson('/api/approvals/pin-approve', [...$request, 'pin' => sprintf('%04d', $guess)])->assertUnprocessable();
        }
        $this->postJson('/api/approvals/pin-approve', [...$request, 'pin' => '4321'])->assertStatus(429)
            ->assertJsonPath('message', fn ($message) => str_contains($message, 'PINs for this approver'));
    }
}
