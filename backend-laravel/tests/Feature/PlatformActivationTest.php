<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * ActivationController used to be a stub that always claimed "activated: true" regardless of
 * whether this deployment had ever actually talked to the platform (Gpretail_Admin). These prove
 * the real register -> snapshot round trip: a rejected registration is reported as such, a
 * successful one persists the sync token and immediately reflects the platform's real status/
 * limits/licence, and a platform outage during a later sync doesn't blank out the last-known state.
 */
class PlatformActivationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('platform.base_url', 'https://platform.test');
        config()->set('platform.company_code', 'CMP-TEST1');
        config()->set('platform.client_id', 'client-test-1');
    }

    private function fakeSnapshot(array $overrides = []): array
    {
        return array_merge([
            'success' => true,
            'data' => [
                'version' => 1,
                'company' => array_merge([
                    'company_code' => 'CMP-TEST1',
                    'name' => 'Test Co',
                    'status' => 'active',
                    'active_till' => '2027-01-01T00:00:00+00:00',
                    'limits' => ['maxStores' => 5, 'maxUsers' => 50],
                    'feature_flags' => ['betaBilling' => true],
                ], $overrides),
                'stores' => [],
                'warehouses' => [],
                'notices' => [],
                'licence' => $this->fakeLicenceToken(),
            ],
        ]);
    }

    private function fakeLicenceToken(): string
    {
        $header = rtrim(strtr(base64_encode('{"alg":"EdDSA"}'), '+/', '-_'), '=');
        $payload = rtrim(strtr(base64_encode(json_encode([
            'status' => 'active', 'exp' => now()->addDays(30)->timestamp, 'grace' => 604800,
        ])), '+/', '-_'), '=');

        return $header.'.'.$payload.'.fake-signature';
    }

    public function test_status_reports_not_activated_before_any_registration(): void
    {
        $response = $this->getJson('/api/activation/status');

        $response->assertOk();
        $response->assertJsonPath('data.activated', false);
    }

    public function test_register_rejects_when_the_platform_rejects(): void
    {
        Http::fake([
            'https://platform.test/api/v1/tenant/register' => Http::response([
                'success' => false, 'message' => 'Invalid registration credentials',
            ], 401),
        ]);

        $response = $this->postJson('/api/activation/register', ['one_time_password' => 'wrong-otp']);

        $response->assertStatus(422);
        $this->assertFalse((bool) $response->json('success'));
        $this->assertDatabaseCount('platform_activations', 0);
    }

    public function test_register_persists_the_sync_token_and_immediately_pulls_the_snapshot(): void
    {
        Http::fake([
            'https://platform.test/api/v1/tenant/register' => Http::response([
                'success' => true,
                'data' => ['company_code' => 'CMP-TEST1', 'sync_token' => 'stub-sync-token', 'expires_in_seconds' => 2592000],
            ], 200),
            'https://platform.test/api/v1/tenant/CMP-TEST1/snapshot' => Http::response($this->fakeSnapshot(), 200),
        ]);

        $response = $this->postJson('/api/activation/register', ['one_time_password' => 'correct-otp']);

        $response->assertOk();
        $response->assertJsonPath('data.activated', true);

        $activation = PlatformActivation::current();
        $this->assertNotNull($activation);
        $this->assertTrue($activation->activated);
        $this->assertEquals('stub-sync-token', $activation->sync_token);
        $this->assertEquals('active', $activation->status);
        $this->assertEquals(5, $activation->limits['maxStores']);
        $this->assertTrue($activation->feature_flags['betaBilling']);
        $this->assertEquals('active', $activation->licence_state);
        $this->assertNotNull($activation->licence_expires_at);

        // The snapshot pull must have authenticated with the sync token just issued, not the
        // (absent) platform-service header.
        Http::assertSent(fn ($request) => $request->url() === 'https://platform.test/api/v1/tenant/CMP-TEST1/snapshot'
            && $request->hasHeader('Authorization', 'Bearer stub-sync-token'));
    }

    public function test_status_reflects_real_platform_state_after_registration(): void
    {
        Http::fake([
            'https://platform.test/api/v1/tenant/register' => Http::response([
                'success' => true, 'data' => ['company_code' => 'CMP-TEST1', 'sync_token' => 'tok', 'expires_in_seconds' => 2592000],
            ], 200),
            'https://platform.test/api/v1/tenant/CMP-TEST1/snapshot' => Http::response($this->fakeSnapshot(['status' => 'suspended']), 200),
        ]);
        $this->postJson('/api/activation/register', ['one_time_password' => 'correct-otp'])->assertOk();

        $response = $this->getJson('/api/activation/status');

        $response->assertOk();
        $response->assertJsonPath('data.activated', true);
        $response->assertJsonPath('data.status', 'suspended');
        $response->assertJsonPath('data.limits.maxStores', 5);
    }

    public function test_a_failed_sync_keeps_the_last_known_state_instead_of_blanking_it(): void
    {
        PlatformActivation::create([
            'company_code' => 'CMP-TEST1',
            'sync_token' => 'tok',
            'activated' => true,
            'status' => 'active',
            'limits' => ['maxStores' => 5],
        ]);

        Http::fake([
            'https://platform.test/api/v1/tenant/CMP-TEST1/snapshot' => Http::response([], 500),
        ]);

        $exitCode = $this->artisan('platform:sync');
        $exitCode->assertExitCode(0);

        $activation = PlatformActivation::current();
        $this->assertEquals('active', $activation->status);
        $this->assertNotNull($activation->last_sync_error);
    }
}
