<?php

namespace Tests\Feature\Ops;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Signed-in API calls have a per-user ceiling (sanctum.signed_in_requests_per_minute). */
class SignedInRateLimitTest extends TestCase
{
    use RefreshDatabase;

    private function admin(Store $store): User
    {
        return User::factory()->create(['username' => 'admin-'.Str::random(6), 'role' => 'admin', 'store_id' => $store->id]);
    }

    public function test_a_user_over_the_limit_gets_429_and_other_users_are_not_affected(): void
    {
        config()->set('sanctum.signed_in_requests_per_minute', 3);
        $store = Store::create(['name' => 'Limits', 'code' => 'LIM-'.Str::random(5), 'is_active' => true]);
        $busy = $this->admin($store);
        $other = $this->admin($store);

        Sanctum::actingAs($busy);
        foreach (range(1, 3) as $ignored) {
            $this->getJson('/api/brands')->assertOk();
        }
        $this->getJson('/api/brands')->assertStatus(429)->assertHeader('Retry-After');
        $this->getJson('/api/v1/brands')->assertStatus(429);

        Sanctum::actingAs($other);
        $this->getJson('/api/brands')->assertOk();
    }

    public function test_zero_turns_the_limit_off(): void
    {
        config()->set('sanctum.signed_in_requests_per_minute', 0);
        $store = Store::create(['name' => 'No limit', 'code' => 'NOL-'.Str::random(5), 'is_active' => true]);
        Sanctum::actingAs($this->admin($store));
        foreach (range(1, 5) as $ignored) {
            $this->getJson('/api/brands')->assertOk();
        }
    }
}
