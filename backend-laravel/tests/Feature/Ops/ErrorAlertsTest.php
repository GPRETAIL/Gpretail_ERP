<?php

namespace Tests\Feature\Ops;

use App\Models\Notification;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

/** ops:error-alerts: new errors in the logs reach the admins' bell (and email), once per cooldown. */
class ErrorAlertsTest extends TestCase
{
    use RefreshDatabase;

    private string $logs;

    protected function setUp(): void
    {
        parent::setUp();
        $root = sys_get_temp_dir().DIRECTORY_SEPARATOR.'ops-alerts-'.Str::random(8);
        File::ensureDirectoryExists($root.'/logs');
        $this->app->useStoragePath($root);
        $this->logs = $root.'/logs';
        Cache::flush();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(dirname($this->logs));
        parent::tearDown();
    }

    private function log(string $file, string $line): void
    {
        file_put_contents($this->logs.'/'.$file, $line."\n", FILE_APPEND);
    }

    public function test_new_errors_alert_admins_once_per_cooldown_and_old_errors_are_ignored(): void
    {
        config()->set('mail.default', 'array');
        config()->set('services.ops_alerts.email', 'ops@example.com');
        $store = Store::create(['name' => 'Ops', 'code' => 'OPS-'.Str::random(5), 'is_active' => true]);
        $admin = User::factory()->create(['username' => 'admin-'.Str::random(6), 'role' => 'admin', 'store_id' => $store->id]);
        $cashier = User::factory()->create(['username' => 'cashier-'.Str::random(6), 'role' => 'cashier', 'store_id' => $store->id]);
        $tenantAdmin = User::factory()->create(['username' => 'owner-'.Str::random(6), 'role' => 'admin', 'store_id' => null]);

        // Errors from before the first run are history, not news.
        $this->log('laravel.log', '[2026-11-12 09:00:00] production.ERROR: Old failure {"userId":1}');
        $this->artisan('ops:error-alerts')->assertSuccessful();
        $this->assertSame(0, Notification::withoutGlobalScopes()->count());

        $this->log('laravel.log', '[2026-11-12 10:00:00] production.ERROR: SQLSTATE[42S22] Unknown column {"userId":3,"exception":"[object] x"}');
        $this->log('laravel.log', '#0 stack trace line that is not an entry');
        $this->log('laravel.log', '[2026-11-12 10:00:01] production.WARNING: Slow request');
        $this->log('laravel.log', '[2026-11-12 10:00:02] production.ERROR: SQLSTATE[42S22] Unknown column {"userId":4}');
        $this->log('client-errors-2026-11-12.log', '[2026-11-12 10:00:03] production.ERROR: Cannot read properties of undefined {"user_id":5,"where":"dashboard"}');
        $this->artisan('ops:error-alerts')->assertSuccessful();

        $alerts = Notification::withoutGlobalScopes()->where('type', 'SYSTEM_ERRORS')->get();
        $expected = User::query()->where('is_active', true)->whereIn('role', ['admin', 'super_admin'])->pluck('id')->all();
        $this->assertEqualsCanonicalizing($expected, $alerts->pluck('user_id')->all());
        $this->assertContains($admin->id, $expected);
        $this->assertContains($tenantAdmin->id, $expected);
        $this->assertNotContains($cashier->id, $alerts->pluck('user_id')->all());
        $this->assertSame($store->id, (int) $alerts->firstWhere('user_id', $tenantAdmin->id)->store_id);
        $first = $alerts->first();
        $this->assertSame('Errors logged: 2 server error(s), 1 screen crash(es)', $first->title);
        $this->assertStringContainsString('2× Server: SQLSTATE[42S22] Unknown column', $first->message);
        $this->assertStringContainsString('1× Screen crash: Cannot read properties of undefined', $first->message);
        $sent = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $sent);
        $this->assertStringContainsString('Errors logged', $sent[0]->getOriginalMessage()->getSubject());

        // Within the cooldown, new errors wait; after it, they go out together.
        $this->log('laravel.log', '[2026-11-12 10:05:00] production.CRITICAL: Disk full');
        $this->artisan('ops:error-alerts')->assertSuccessful();
        $this->assertSame(count($expected), Notification::withoutGlobalScopes()->count());

        $this->travel(61)->minutes();
        $this->artisan('ops:error-alerts')->assertSuccessful();
        $this->assertSame(2 * count($expected), Notification::withoutGlobalScopes()->count());
        $this->assertSame('Errors logged: 1 server error(s)', Notification::withoutGlobalScopes()->latest('id')->value('title'));

        // Nothing new: no alert.
        $this->travel(61)->minutes();
        $this->artisan('ops:error-alerts')->assertSuccessful();
        $this->assertSame(2 * count($expected), Notification::withoutGlobalScopes()->count());
    }

    public function test_a_rotated_log_is_read_from_the_start(): void
    {
        $store = Store::create(['name' => 'Ops2', 'code' => 'OP2-'.Str::random(5), 'is_active' => true]);
        User::factory()->create(['username' => 'admin-'.Str::random(6), 'role' => 'admin', 'store_id' => $store->id]);
        $this->log('laravel.log', str_repeat("[2026-11-12 09:00:00] production.INFO: filler\n", 20));
        $this->artisan('ops:error-alerts')->assertSuccessful();

        file_put_contents($this->logs.'/laravel.log', "[2026-11-12 11:00:00] production.ERROR: After rotation\n");
        $this->artisan('ops:error-alerts')->assertSuccessful();
        $this->assertStringContainsString('After rotation', (string) Notification::withoutGlobalScopes()->value('message'));
    }
}
