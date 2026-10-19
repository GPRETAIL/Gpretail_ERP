<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use App\Services\NotificationInbox;
use App\Services\PlatformNotificationSync;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlatformNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake(['*' => Http::response(['success' => false], 503)]);
    }

    private function fixture(): array
    {
        $activation = PlatformActivation::create(['company_code' => 'CMP-NOTIFY', 'activated' => true, 'sync_token' => 'sync-only', 'status' => 'active', 'tenant_admin_email' => 'owner@example.test', 'deployment_id' => (string) Str::uuid()]);
        $owner = User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.test', 'password' => 'Welcome123', 'role' => 'admin', 'platform_company_code' => 'CMP-NOTIFY']);

        return [$activation, $owner];
    }

    private function message(array $changes = []): array
    {
        return array_merge(['sequence' => 1, 'uuid' => (string) Str::uuid(), 'revision' => 1, 'active' => true, 'company_code' => 'CMP-NOTIFY', 'audience' => 'admins', 'category' => 'subscription', 'priority' => 'high', 'title' => 'Renewal', 'message' => 'Review your subscription', 'action' => 'subscription', 'expires_at' => now()->addDays(3)->toIso8601String(), 'created_at' => now()->toIso8601String()], $changes);
    }

    public function test_import_is_durable_idempotent_and_advances_only_after_validation(): void
    {
        [$activation,$owner] = $this->fixture();
        config(['platform.base_url' => 'https://admin.example.test']);
        $message = $this->message();
        Http::swap(new Factory);
        Http::fake(['*/notifications/ack' => Http::response(['success' => true]), '*/notifications*' => Http::response(['success' => true, 'data' => ['messages' => [$message], 'cursor' => 1]])]);
        $service = app(PlatformNotificationSync::class);
        $this->assertTrue($service->sync()['ok']);
        $this->assertDatabaseHas('app_notifications', ['platform_message_uuid' => $message['uuid'], 'title' => 'Renewal']);
        $this->assertTrue(app(NotificationInbox::class)->visible($owner)->exists());
        Http::swap(new Factory);
        Http::fake(['*/notifications/ack' => Http::response(['success' => true]), '*/notifications*' => Http::response(['success' => true, 'data' => ['messages' => [], 'cursor' => 1]])]);
        $this->assertTrue($service->sync()['ok']);
        $this->assertDatabaseCount('app_notifications', 1);
        Http::swap(new Factory);
        Http::fake(['*/notifications*' => Http::response(['success' => true, 'data' => ['messages' => [$this->message(['sequence' => 2, 'company_code' => 'CMP-OTHER'])], 'cursor' => 2]])]);
        $this->assertFalse($service->sync()['ok']);
        $this->assertSame(1, (int) DB::table('platform_notification_syncs')->value('cursor'));
    }

    public function test_company_notices_need_no_store_and_read_receipts_are_per_user(): void
    {
        [$activation,$owner] = $this->fixture();
        $id = DB::table('app_notifications')->insertGetId(['type' => 'PLATFORM_SERVICE', 'title' => 'Notice', 'platform_message_uuid' => (string) Str::uuid(), 'platform_company_code' => $activation->company_code, 'audience' => 'all', 'category' => 'service', 'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now()]);
        $second = User::create(['name' => 'Second', 'username' => 'second', 'email' => 'second@example.test', 'password' => 'Welcome123', 'role' => 'user', 'platform_company_code' => $activation->company_code]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/notifications')->assertOk();
        $this->postJson('/api/notifications/'.$id.'/read')->assertOk();
        $inbox = app(NotificationInbox::class);
        $this->assertSame(0, $inbox->unread($owner)->count());
        $this->assertSame(1, $inbox->unread($second)->count());
        $this->assertNull(DB::table('app_notifications')->where('id', $id)->value('read_at'));
    }

    public function test_targets_expiry_and_marketing_consent_are_enforced(): void
    {
        [$activation,$owner] = $this->fixture();
        $store = Store::create(['name' => 'Store', 'code' => 'STR-1', 'platform_company_code' => 'CMP-NOTIFY', 'platform_store_id' => 22]);
        $user = User::create(['name' => 'Staff', 'username' => 'staff', 'email' => 'staff@example.test', 'password' => 'Welcome123', 'role' => 'user', 'platform_company_code' => 'CMP-NOTIFY', 'store_id' => $store->id]);
        foreach ([
            ['title' => 'Visible', 'audience' => 'all', 'platform_store_id' => 22], ['title' => 'Other store', 'audience' => 'all', 'platform_store_id' => 33],
            ['title' => 'Billing', 'audience' => 'admins'], ['title' => 'Wrong company', 'audience' => 'all', 'platform_company_code' => 'CMP-OTHER'],
            ['title' => 'Expired', 'audience' => 'all', 'expires_at' => now()->subMinute()], ['title' => 'Offer', 'audience' => 'admins', 'category' => 'offer'],
        ] as $change) {
            DB::table('app_notifications')->insert(array_merge(['type' => 'PLATFORM_SERVICE', 'title' => 'Base', 'platform_message_uuid' => (string) Str::uuid(), 'platform_company_code' => 'CMP-NOTIFY', 'category' => 'service', 'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now()], $change));
        }
        $inbox = app(NotificationInbox::class);
        $this->assertSame(['Visible'], $inbox->visible($user)->pluck('title')->all());
        $this->assertNotContains('Offer', $inbox->visible($owner)->pluck('title')->all());
        DB::table('notification_preferences')->insert(['user_id' => $owner->id, 'marketing' => true]);
        $this->assertContains('Offer', $inbox->visible($owner)->pluck('title')->all());
    }

    public function test_banner_request_recovers_without_scheduler_and_throttles_feed_checks(): void
    {
        [$activation,$owner] = $this->fixture();
        config(['platform.base_url' => 'https://admin.example.test']);
        $message = $this->message(['priority' => 'normal', 'category' => 'service']);
        Http::swap(new Factory);
        Http::fake(['*/notifications*' => Http::response(['success' => true, 'data' => ['messages' => [$message], 'cursor' => 1]])]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/notifications/banners')->assertOk()->assertJsonPath('data.0.platform_message_uuid', $message['uuid']);
        $this->getJson('/api/notifications/banners')->assertOk();
        Http::assertSentCount(1);
        $this->assertDatabaseHas('platform_notification_syncs', ['company_code' => $activation->company_code, 'cursor' => 1]);
    }

    public function test_closing_a_banner_is_personal_and_keeps_the_message_in_the_inbox(): void
    {
        [$activation,$owner] = $this->fixture();
        $message = $this->message(['category' => 'service']);
        $id = DB::table('app_notifications')->insertGetId(['type' => 'PLATFORM_SERVICE', 'title' => 'Service notice', 'platform_message_uuid' => $message['uuid'], 'platform_company_code' => $activation->company_code, 'audience' => 'all', 'category' => 'service', 'priority' => 'normal', 'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now()]);
        $other = User::create(['name' => 'Other', 'username' => 'banner-other', 'email' => 'other@example.test', 'password' => 'Welcome123', 'role' => 'admin', 'platform_company_code' => $activation->company_code]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/notifications/banners')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/notifications/'.$id.'/read')->assertOk();
        $this->getJson('/api/notifications/banners')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/notifications')->assertOk()->assertJsonCount(1, 'data');
        Sanctum::actingAs($other);
        $this->getJson('/api/notifications/banners')->assertOk()->assertJsonCount(1, 'data');
    }
}
