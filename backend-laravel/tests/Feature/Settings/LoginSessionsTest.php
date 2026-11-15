<?php

namespace Tests\Feature\Settings;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** User Access > Login Sessions: the tenant admin sees and ends their stores' sign-ins, and nobody else's. */
class LoginSessionsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $cashier;

    private User $outsider;

    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();
        $activation = PlatformActivation::create(['company_code' => 'CMP-SESS', 'activated' => true, 'status' => 'active',
            'tenant_admin_email' => 'owner@example.test', 'deployment_id' => (string) Str::uuid()]);
        $store = Store::create(['name' => 'Main Branch', 'code' => 'STR-SESS', 'platform_company_code' => 'CMP-SESS', 'is_active' => true]);
        $this->admin = User::factory()->create(['username' => 'owner', 'email' => 'owner@example.test', 'role' => 'admin', 'store_id' => null,
            'platform_company_code' => $activation->company_code]);
        $this->cashier = User::factory()->create(['username' => 'till1', 'role' => 'cashier', 'store_id' => $store->id, 'platform_company_code' => 'CMP-SESS']);
        $other = Store::create(['name' => 'Elsewhere', 'code' => 'STR-OTHER', 'platform_company_code' => 'CMP-OTHER']);
        $this->outsider = User::factory()->create(['username' => 'stranger', 'role' => 'cashier', 'store_id' => $other->id, 'platform_company_code' => 'CMP-OTHER']);
        $this->adminToken = $this->admin->createToken('web-token', ['client:web'])->plainTextToken;
    }

    private function asAdmin()
    {
        return $this->withHeader('Authorization', 'Bearer '.$this->adminToken);
    }

    public function test_a_sign_in_records_its_device_ip_and_store(): void
    {
        $this->app->instance('request', \Illuminate\Http\Request::create('/api/auth/login', 'POST', server: [
            'REMOTE_ADDR' => '192.168.1.21', 'HTTP_USER_AGENT' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36']));
        $token = $this->cashier->createToken('web-token', ['client:web']);
        $this->assertSame(['192.168.1.21', 'Chrome on Windows'], [$token->accessToken->ip_address, \App\Services\Auth\LoginSessions::device($token->accessToken->user_agent)]);

        $this->assertSame($this->cashier->store_id, (int) $token->accessToken->store_id);
        $row = collect($this->asAdmin()->getJson('/api/login-sessions')->assertOk()->json('data'))->firstWhere('user_id', $this->cashier->id);
        $this->assertSame('web', $row['client']);
        $this->assertSame('Main Branch', $row['store_name']);
    }

    public function test_the_tenant_admin_sees_their_stores_sign_ins_only(): void
    {
        $this->cashier->createToken('mobile-token', ['client:mobile']);
        $this->outsider->createToken('web-token', ['client:web']);

        $rows = collect($this->asAdmin()->getJson('/api/login-sessions')->assertOk()->json('data'));

        $this->assertEqualsCanonicalizing(['owner', 'till1'], $rows->pluck('username')->all());
        $this->assertSame('mobile', $rows->firstWhere('username', 'till1')['client']);
        $this->assertTrue($rows->firstWhere('username', 'owner')['is_current']);
    }

    public function test_ending_a_session_signs_that_device_out(): void
    {
        $plain = $this->cashier->createToken('web-token', ['client:web']);

        $this->asAdmin()->deleteJson('/api/login-sessions/'.$plain->accessToken->id)->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$plain->plainTextToken)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_end_all_ends_every_session_of_one_user_but_never_the_admins_own(): void
    {
        $this->cashier->createToken('web-token', ['client:web']);
        $this->cashier->createToken('hr-staff-app', ['client:staff']);

        $this->asAdmin()->deleteJson('/api/login-sessions/user/'.$this->cashier->id)->assertOk()->assertJsonPath('data.ended', 2);
        $this->assertSame(0, $this->cashier->tokens()->count());

        $this->asAdmin()->deleteJson('/api/login-sessions/user/'.$this->admin->id)->assertOk()->assertJsonPath('data.ended', 0);
        $own = $this->admin->tokens()->value('id');
        $this->asAdmin()->deleteJson('/api/login-sessions/'.$own)->assertStatus(422);
    }

    public function test_another_tenants_sessions_cannot_be_ended_and_others_cannot_see_the_list(): void
    {
        $foreign = $this->outsider->createToken('web-token', ['client:web'])->accessToken;
        $this->asAdmin()->deleteJson('/api/login-sessions/'.$foreign->id)->assertNotFound();

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$this->cashier->createToken('web-token', ['client:web'])->plainTextToken)
            ->getJson('/api/login-sessions')->assertForbidden();
    }

    public function test_ending_a_session_is_never_synced_to_the_other_server(): void
    {
        config(['sync.node_role' => 'local']);
        $id = $this->cashier->createToken('web-token', ['client:web'])->accessToken->id;
        $this->asAdmin()->deleteJson('/api/login-sessions/'.$id)->assertOk();

        $this->assertSame(0, SyncOutboxEvent::count());
    }
}
