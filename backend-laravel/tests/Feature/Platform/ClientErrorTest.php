<?php

namespace Tests\Feature\Platform;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Front-end crash reports: signed-in only, validated and capped, throttled, written to the client_errors log. */
class ClientErrorTest extends TestCase
{
    use RefreshDatabase;

    private function report(array $override = []): array
    {
        return array_replace(['reference' => 'E-7F3K2', 'message' => 'Cannot read properties of undefined', 'name' => 'TypeError',
            'stack' => 'TypeError: x\n at Widget', 'component_stack' => 'at TodayAttendance', 'where' => 'dashboard:hrms:today',
            'path' => '/dashboard', 'build' => '2026-11-12T00:00:00Z', 'user_agent' => 'Mozilla/5.0'], $override);
    }

    public function test_a_signed_in_user_can_report_a_crash_and_it_is_logged_with_who_and_where(): void
    {
        $this->postJson('/api/client-errors', $this->report())->assertUnauthorized();

        $store = Store::create(['name' => 'Errors', 'code' => 'ERR-'.Str::random(5), 'is_active' => true]);
        $user = User::factory()->create(['username' => 'cashier-'.Str::random(6), 'role' => 'cashier', 'store_id' => $store->id]);
        Sanctum::actingAs($user, ['client:web']);
        $channel = Log::spy();
        $channel->shouldReceive('channel')->andReturnSelf();
        $this->postJson('/api/client-errors', $this->report())->assertStatus(202)->assertJsonPath('reference', 'E-7F3K2');
        $channel->shouldHaveReceived('channel')->with('client_errors');
        $channel->shouldHaveReceived('error')->withArgs(fn ($message, $context) => $message === 'Cannot read properties of undefined'
            && $context['user_id'] === $user->id && $context['where'] === 'dashboard:hrms:today' && $context['path'] === '/dashboard');
    }

    public function test_reports_are_validated_capped_and_throttled(): void
    {
        $store = Store::create(['name' => 'Errors', 'code' => 'ERR-'.Str::random(5), 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['username' => 'mgr-'.Str::random(6), 'role' => 'manager', 'store_id' => $store->id]), ['client:web']);
        Log::spy()->shouldReceive('channel')->andReturnSelf();
        $this->postJson('/api/client-errors', $this->report(['reference' => 'not-a-reference']))->assertUnprocessable()->assertJsonValidationErrors('reference');
        $this->postJson('/api/client-errors', $this->report(['message' => str_repeat('x', 501)]))->assertUnprocessable()->assertJsonValidationErrors('message');
        $this->postJson('/api/client-errors', $this->report(['stack' => str_repeat('y', 4001)]))->assertUnprocessable()->assertJsonValidationErrors('stack');

        for ($i = 0; $i < 17; $i++) {
            $this->postJson('/api/client-errors', $this->report())->assertStatus(202);
        }
        $this->postJson('/api/client-errors', $this->report())->assertStatus(429);
    }
}
