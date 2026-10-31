<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Store;
use App\Models\User;
use App\Services\RealtimeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class RealtimeChannelsTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private User $cashier;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        $make = fn (string $role) => User::create(['name' => ucfirst($role), 'username' => "rt-$role", 'email' => "$role@realtime.test", 'password' => 'secret-pass',
            'role' => $role, 'store_id' => $this->fixture['store']->id, 'counter_id' => $this->fixture['user']->counter_id, 'is_active' => true]);
        $this->cashier = $make('cashier');
        $this->manager = $make('manager');
    }

    private function auth(string $channel)
    {
        return $this->postJson('/api/realtime/auth', ['socket_id' => '1234.5678', 'channel_name' => $channel]);
    }

    public function test_users_can_only_join_their_own_store_and_personal_channels(): void
    {
        config(['services.pusher' => ['key' => 'test-key', 'secret' => 'test-secret', 'app_id' => '1', 'cluster' => 'ap2']]);
        $foreign = Store::create(['name' => 'Foreign', 'code' => 'RT-FOREIGN', 'is_active' => true]);
        Sanctum::actingAs($this->cashier);

        $signature = $this->auth('private-store-'.$this->fixture['store']->id)->assertOk()->json('auth');
        $this->assertSame('test-key:'.hash_hmac('sha256', '1234.5678:private-store-'.$this->fixture['store']->id, 'test-secret'), $signature);
        $this->auth('private-user-'.$this->cashier->id)->assertOk();
        $this->auth('private-company')->assertOk();

        $this->auth("private-store-{$foreign->id}")->assertForbidden();
        $this->auth('private-user-'.$this->manager->id)->assertForbidden();
        $this->auth('store-'.$this->fixture['store']->id)->assertForbidden();
        $this->postJson('/api/realtime/auth', ['socket_id' => 'not-a-socket', 'channel_name' => 'private-company'])->assertUnprocessable();
    }

    public function test_signed_in_users_get_this_servers_public_push_settings(): void
    {
        Sanctum::actingAs($this->cashier);
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.realtime', null)->assertJsonPath('data.id', $this->cashier->id);
        config(['services.pusher' => ['key' => 'public-key', 'secret' => 'never-sent', 'app_id' => '1', 'cluster' => 'ap2', 'host' => null, 'port' => null, 'scheme' => null]]);
        $me = $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('data.realtime', ['key' => 'public-key', 'cluster' => 'ap2']);
        $this->assertStringNotContainsString('never-sent', $me->getContent());
    }

    public function test_approval_requests_nudge_the_store_and_decisions_reach_the_requester(): void
    {
        $realtime = RealtimeService::fake();
        $store = $this->fixture['store']->id;
        Sanctum::actingAs($this->cashier);
        $id = $this->postJson('/api/approvals/requests', ['action' => 'pos_discount', 'requested_percent' => 8, 'reason_code' => 'other'])->assertCreated()->json('data.id');
        $this->assertContains(['channel' => "private-store-$store", 'name' => 'approvals.updated', 'data' => ['id' => $id]], $realtime->sent());

        Sanctum::actingAs($this->manager);
        $this->postJson("/api/approvals/requests/$id/approve")->assertOk();
        $this->assertContains(['channel' => 'private-user-'.$this->cashier->id, 'name' => 'approval.decided', 'data' => ['id' => $id, 'status' => 'approved']], $realtime->sent());
    }

    public function test_store_alerts_and_sales_send_one_nudge_per_request(): void
    {
        $realtime = RealtimeService::fake();
        $store = $this->fixture['store']->id;
        Notification::create(['type' => 'LOW_STOCK', 'title' => 'Low', 'message' => 'One', 'store_id' => $store]);
        Notification::create(['type' => 'LOW_STOCK', 'title' => 'Low', 'message' => 'Two', 'store_id' => $store]);
        $this->assertSame([['channel' => "private-store-$store", 'name' => 'notifications.updated', 'data' => []]], $realtime->sent());

        Sanctum::actingAs($this->fixture['user']);
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100, 'items' => [$this->fixture['items'][0]]])->assertCreated();
        $this->assertContains(['channel' => "private-store-$store", 'name' => 'dashboard.updated', 'data' => ['reason' => 'sale']], $realtime->sent());
    }
}
