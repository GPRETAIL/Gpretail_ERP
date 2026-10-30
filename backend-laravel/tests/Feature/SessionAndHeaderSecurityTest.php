<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionAndHeaderSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create(['name' => 'Session user', 'username' => 'session-user', 'email' => 'session@example.test',
            'password' => 'secret-pass', 'role' => 'admin', 'is_active' => true]);
    }

    public function test_web_tokens_expire_after_lifetime_and_idle_but_mobile_tokens_do_not(): void
    {
        $user = $this->user();
        $web = $user->createToken('web-token', ['client:web']);
        $this->withToken($web->plainTextToken)->getJson('/api/auth/me')->assertOk();

        $web->accessToken->forceFill(['last_used_at' => now()->subMinutes(241)])->save();
        $this->app['auth']->forgetGuards();
        $this->withToken($web->plainTextToken)->getJson('/api/auth/me')->assertUnauthorized();

        $old = $user->createToken('web-token', ['client:web']);
        $old->accessToken->forceFill(['created_at' => now()->subMinutes(721), 'last_used_at' => now()])->save();
        $this->app['auth']->forgetGuards();
        $this->withToken($old->plainTextToken)->getJson('/api/auth/me')->assertUnauthorized();

        $mobile = $user->createToken('mobile-token', ['client:mobile']);
        $mobile->accessToken->forceFill(['created_at' => now()->subDays(2), 'last_used_at' => now()->subDay()])->save();
        $this->app['auth']->forgetGuards();
        $this->withToken($mobile->plainTextToken)->getJson('/api/auth/me')->assertOk();
    }

    public function test_api_responses_carry_lockdown_headers(): void
    {
        $this->getJson('/api/auth/config')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    }
}
