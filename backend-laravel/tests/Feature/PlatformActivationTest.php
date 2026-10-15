<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\PlatformActivationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

    public function test_retry_after_snapshot_failure_reuses_the_saved_sync_token(): void
    {
        Http::fake([
            'https://platform.test/api/v1/tenant/register' => Http::response(['success' => true, 'data' => ['sync_token' => 'saved-token']], 200),
            'https://platform.test/api/v1/tenant/CMP-TEST1/snapshot' => Http::sequence()->push([], 500)->push($this->fakeSnapshot(), 200),
        ]);
        $this->postJson('/api/activation/register', ['one_time_password' => 'otp'])->assertStatus(422);
        $this->assertFalse(PlatformActivation::current()->activated);
        $this->postJson('/api/activation/register', ['one_time_password' => 'otp'])->assertOk();
        $this->assertTrue(PlatformActivation::current()->activated);
        $registrations = Http::recorded(fn ($request) => str_ends_with($request->url(), '/register'));
        $this->assertCount(1, $registrations);
    }

    public function test_an_existing_deployment_cannot_be_rebound_to_another_company(): void
    {
        PlatformActivation::create(['company_code' => 'CMP-EXISTING', 'activated' => true, 'sync_token' => 'existing']);
        Http::fake();
        $this->postJson('/api/activation/register', ['company_code' => 'CMP-TEST1', 'client_id' => 'client-test-1', 'one_time_password' => 'otp'])->assertStatus(422);
        Http::assertNothingSent();
        $this->assertSame('CMP-EXISTING', PlatformActivation::current()->company_code);
    }

    public function test_repeat_password_adoption_does_not_overwrite_a_locally_changed_password(): void
    {
        $hash = Hash::make('Welcome-password-123');
        $activation = PlatformActivation::create(['company_code' => 'CMP-TEST1', 'client_id' => 'client-test-1', 'sync_token' => 'tok', 'activated' => true]);
        Http::fake([
            'https://platform.test/api/v1/tenant/CMP-TEST1/snapshot' => Http::response($this->fakeSnapshot([
                'tenant_admin_email' => 'owner@example.test', 'tenant_password_hash' => $hash, 'tenant_password_version' => 2, 'tenant_password_must_change' => false,
            ])),
            'https://platform.test/api/v1/tenant/CMP-TEST1/password-adopted' => Http::response([], 500),
        ]);
        $service = app(PlatformActivationService::class);
        $this->assertTrue($service->sync($activation)['ok']);
        $user = User::where('email', 'owner@example.test')->firstOrFail();
        $this->assertSame('CMP-TEST1', $user->platform_company_code);
        $this->assertNull($user->store_id);
        $user->update(['password' => 'Locally-changed-123']);
        $this->assertTrue($service->sync($activation)['ok']);
        $this->assertTrue(Hash::check('Locally-changed-123', $user->fresh()->password));
    }

    public function test_snapshot_cannot_take_over_an_unrelated_existing_local_account(): void
    {
        $user = User::create(['name' => 'Existing', 'username' => 'existing', 'email' => 'owner@example.test', 'password' => 'Existing-password-123', 'role' => 'super_admin', 'is_active' => true]);
        $activation = PlatformActivation::create(['company_code' => 'CMP-TEST1', 'sync_token' => 'tok']);
        Http::fake(['https://platform.test/api/v1/tenant/CMP-TEST1/snapshot' => Http::response($this->fakeSnapshot([
            'tenant_admin_email' => $user->email, 'tenant_password_hash' => Hash::make('Welcome-password-123'), 'tenant_password_version' => 1,
        ]))]);
        $this->assertFalse(app(PlatformActivationService::class)->sync($activation)['ok']);
        $this->assertTrue(Hash::check('Existing-password-123', $user->fresh()->password));
    }

    public function test_first_tenant_login_validates_with_platform_and_does_not_assign_unlinked_stores(): void
    {
        $activation = PlatformActivation::create(['company_code' => 'CMP-TEST1', 'sync_token' => 'tok', 'activated' => true, 'status' => 'active', 'onboarding_required' => true]);
        User::create(['name' => 'Tenant owner', 'username' => 'tenant-owner', 'email' => 'owner@example.test', 'password' => 'Customer-password-123', 'role' => 'admin', 'is_active' => true, 'platform_company_code' => 'CMP-TEST1']);
        Store::create(['name' => 'Unlinked local store', 'code' => 'UNLINKED']);
        Http::fake(['https://platform.test/api/v1/tenant/CMP-TEST1/first-entry' => Http::response(['success' => true, 'data' => ['first_erp_login_at' => now()->toIso8601String(), 'active_till' => now()->addDays(14)->toIso8601String()]])]);
        $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Wrong-password'])->assertUnauthorized();
        Http::assertNothingSent();
        $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Customer-password-123'])->assertOk()->assertJsonPath('data.user.store_ids', []);
        $this->assertNotNull($activation->fresh()->first_erp_login_at);
        $this->postJson('/api/auth/login', ['email' => 'owner@example.test', 'password' => 'Customer-password-123'])->assertOk();
        Http::assertSentCount(1);
    }

    public function test_first_tenant_login_rejects_platform_failure_without_issuing_a_token(): void
    {
        PlatformActivation::create(['company_code' => 'CMP-TEST1', 'sync_token' => 'tok', 'activated' => true, 'status' => 'active', 'onboarding_required' => true]);
        $user = User::create(['name' => 'Tenant owner', 'username' => 'tenant-owner', 'email' => 'owner@example.test', 'password' => 'Customer-password-123', 'role' => 'admin', 'is_active' => true, 'platform_company_code' => 'CMP-TEST1']);
        Http::fake(['https://platform.test/api/v1/tenant/CMP-TEST1/first-entry' => Http::response([], 500)]);
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Customer-password-123'])->assertStatus(503);
        $this->assertSame(0, $user->tokens()->count());
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

        // Not `$exitCode = $this->artisan(...); $exitCode->assertExitCode(0);` -- PendingCommand
        // is lazy: assertExitCode() only records the expectation, the command itself doesn't
        // actually run until the PendingCommand object is destructed. Assigning it to a variable
        // that stays in scope for the rest of the test defers that destruction (and the real run)
        // until the test method returns -- so a DB assertion made right after would race against a
        // command that hasn't executed yet. Chaining without assigning lets PHP destruct the
        // temporary at the end of this statement, forcing the real run to happen here.
        $this->artisan('platform:sync')->assertExitCode(0);

        $activation = PlatformActivation::current();
        $this->assertEquals('active', $activation->status);
        $this->assertNotNull($activation->last_sync_error);
    }
}
