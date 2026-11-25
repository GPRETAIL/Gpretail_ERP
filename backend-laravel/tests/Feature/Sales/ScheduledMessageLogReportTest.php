<?php

namespace Tests\Feature\Sales;

use App\Models\ReportSchedule;
use App\Models\ReportScheduleRun;
use App\Models\User;
use App\Services\Reports\Scheduled\ScheduledReportCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

/** Sales Reports > Scheduled Message Log: the Scheduler's delivery history as a report. */
class ScheduledMessageLogReportTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixture = PosPerformanceFixture::create(1);
        Sanctum::actingAs($this->fixture['user']);
    }

    private function schedule(string $name, int $store): ReportSchedule
    {
        return ReportSchedule::create(['store_id' => $store, 'name' => $name, 'report_key' => 'finance.trial_balance', 'period' => 'yesterday', 'frequency' => 'daily',
            'send_time' => '07:00', 'formats' => ['xlsx'], 'skip_empty' => false, 'is_active' => true]);
    }

    public function test_each_sending_is_listed_newest_first_with_who_got_it_and_what_failed(): void
    {
        $store = $this->fixture['store']->id;
        $morning = $this->schedule('Morning trial balance', $store);
        ReportScheduleRun::create(['report_schedule_id' => $morning->id, 'store_id' => $store, 'trigger' => 'schedule', 'period_from' => '2026-11-24', 'period_to' => '2026-11-24',
            'status' => 'sent', 'rows' => 42, 'recipients' => ['owner@example.test', 'accounts@example.test'],
            'files' => ['trial-balance-24-nov-2026.xlsx' => '/server/path/never/shown.xlsx'], 'started_at' => now()->subHour()]);
        ReportScheduleRun::create(['report_schedule_id' => $morning->id, 'store_id' => $store, 'trigger' => 'manual', 'period_from' => '2026-11-20', 'period_to' => '2026-11-25',
            'status' => 'failed', 'rows' => 0, 'recipients' => [], 'skipped_recipients' => ['bounced@example.test'], 'error' => 'Mail server refused the message.', 'started_at' => now()]);

        $rows = $this->getJson('/api/sales-reports/store/scheduled_messages')->assertOk()->json('data');

        $this->assertCount(2, $rows);
        $this->assertSame(['Failed', 'Sent by hand', '2026-11-20 to 2026-11-25', 'Mail server refused the message.', 'bounced@example.test'],
            [$rows[0]['status'], $rows[0]['trigger'], $rows[0]['period'], $rows[0]['error'], $rows[0]['skipped_recipients']]);
        $this->assertSame(['Sent', 'On schedule', '2026-11-24', 2, 'owner@example.test, accounts@example.test', 'Morning trial balance', 'Trial Balance', 'trial-balance-24-nov-2026.xlsx'],
            [$rows[1]['status'], $rows[1]['trigger'], $rows[1]['period'], $rows[1]['recipient_count'], $rows[1]['recipients'], $rows[1]['schedule'], $rows[1]['report'], $rows[1]['files']]);
        $this->assertStringNotContainsString('/server/path', json_encode($rows), 'a server path is never shown');
    }

    public function test_it_shows_only_this_stores_sendings(): void
    {
        $store = $this->fixture['store']->id;
        $mine = $this->schedule('Mine', $store);
        ReportScheduleRun::create(['report_schedule_id' => $mine->id, 'store_id' => $store, 'status' => 'sent', 'rows' => 1, 'recipients' => ['a@example.test'], 'started_at' => now()]);
        $otherStore = DB::table('stores')->insertGetId(['name' => 'TEMP Other Store', 'code' => 'TEMP-OTHER', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $theirs = $this->schedule('Theirs', $otherStore);
        ReportScheduleRun::withoutGlobalScopes()->create(['report_schedule_id' => $theirs->id, 'store_id' => $otherStore, 'status' => 'sent', 'rows' => 1, 'recipients' => ['b@example.test'], 'started_at' => now()]);

        $rows = $this->getJson('/api/sales-reports/store/scheduled_messages')->assertOk()->json('data');

        $this->assertSame(['Mine'], array_column($rows, 'schedule'));
    }

    public function test_it_needs_permission_to_export_reports(): void
    {
        $store = $this->fixture['store']->id;
        Sanctum::actingAs(User::create(['name' => 'TEMP Cashier', 'username' => 'temp-log-cashier', 'email' => 'log-cashier@example.test',
            'password' => 'temporary-test-only', 'role' => 'cashier', 'store_id' => $store, 'is_active' => true]));

        $this->getJson('/api/sales-reports/store/scheduled_messages')->assertForbidden();
    }

    public function test_it_is_not_offered_in_the_scheduler(): void
    {
        $this->assertArrayNotHasKey('store.scheduled_messages', app(ScheduledReportCatalog::class)->all());
    }
}
