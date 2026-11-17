<?php

namespace Tests\Feature\Settings;

use App\Mail\ScheduledReportMail;
use App\Models\ReportSchedule;
use App\Models\Store;
use App\Models\User;
use App\Services\Messaging\MailerFactory;
use App\Services\Reports\Scheduled\ScheduledReportCatalog;
use App\Services\Reports\Scheduled\ScheduledReportRunner;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class ScheduledReportsTest extends TestCase
{
    use RefreshDatabase;

    private array $fixture;

    private int $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-11-17 06:00:00')); // 11:30 IST.
        $this->fixture = PosPerformanceFixture::create(2);
        $this->store = $this->fixture['store']->id;
        $this->fixture['user']->forceFill(['email' => 'owner@example.test'])->save();
        Sanctum::actingAs($this->fixture['user']);
    }

    private function user(string $name, string $role, array $extra = []): User
    {
        return User::create(['name' => $name, 'username' => Str::slug($name), 'email' => Str::slug($name).'@example.test', 'password' => 'temporary-test-only',
            'role' => $role, 'store_id' => $this->store, 'is_active' => true, ...$extra]);
    }

    private function sale(int $qty = 2): void
    {
        $this->postJson('/api/pos-sales', ['checkoutKey' => (string) Str::uuid(), 'saleSaveAs' => 'paid_settled', 'cashAmount' => 100 * $qty,
            'items' => [[...$this->fixture['items'][0], 'qty' => $qty, 'tax' => 0]]])->assertCreated();
    }

    private function schedule(array $overrides = []): array
    {
        return $this->postJson('/api/report-schedules', [
            'name' => 'Morning summary', 'report_key' => 'daily_summary', 'period' => 'today', 'frequency' => 'daily', 'send_time' => '09:00',
            'formats' => ['xlsx', 'pdf'], 'recipients' => [['type' => 'email', 'value' => 'auditor@example.test']], ...$overrides,
        ])->assertCreated()->json('data');
    }

    public function test_next_run_is_worked_out_in_the_business_time_zone(): void
    {
        $now = CarbonImmutable::parse('2026-11-17 06:00:00', 'UTC'); // Tue 17 Nov, 11:30 IST.
        $at = fn (array $a) => ScheduledReportRunner::nextRun(new ReportSchedule($a), $now)->setTimezone('Asia/Kolkata')->format('D Y-m-d H:i');

        $this->assertSame('Wed 2026-11-18 09:00', $at(['frequency' => 'daily', 'send_time' => '09:00'])); // 9 am today has passed.
        $this->assertSame('Tue 2026-11-17 21:00', $at(['frequency' => 'daily', 'send_time' => '21:00']));
        $this->assertSame('Mon 2026-11-23 08:00', $at(['frequency' => 'weekly', 'send_time' => '08:00', 'day_of_week' => 1]));
        $this->assertSame('Tue 2026-11-17 12:00', $at(['frequency' => 'weekly', 'send_time' => '12:00', 'day_of_week' => 2]));
        $this->assertSame('Mon 2026-11-30 07:00', $at(['frequency' => 'monthly', 'send_time' => '07:00', 'day_of_month' => 31])); // Last day of a 30-day month.
        $this->assertSame('Tue 2026-12-01 07:00', $at(['frequency' => 'monthly', 'send_time' => '07:00', 'day_of_month' => 1]));
        $this->assertSame('2026-11-18 03:30:00', ScheduledReportRunner::nextRun(new ReportSchedule(['frequency' => 'daily', 'send_time' => '09:00']), $now)->utc()->toDateTimeString());
    }

    public function test_every_report_in_the_catalog_builds(): void
    {
        $this->sale();
        $catalog = app(ScheduledReportCatalog::class);
        request()->attributes->set('store_context_ids', [$this->store]);
        request()->attributes->set('store_context_id', $this->store);
        $failed = [];
        foreach (array_keys($catalog->all()) as $key) {
            try {
                $report = $catalog->build($key, $this->store, '2026-11-01', '2026-11-17');
                $this->assertNotEmpty($report->sections, $key);
            } catch (\Throwable $e) {
                $failed[$key] = $e->getMessage();
            }
        }
        $this->assertSame([], $failed);
        $this->assertGreaterThan(40, count($catalog->all()));
        $this->assertSame([], array_diff(array_unique(array_column($catalog->all(), 'module')), ScheduledReportCatalog::MODULES)); // Every report sits in a menu module.
    }

    public function test_send_now_emails_excel_and_pdf_to_the_resolved_recipients_only(): void
    {
        Mail::fake();
        $this->sale(3);
        $managerA = $this->user('Manager Anu', 'manager');
        $inactive = $this->user('Manager Old', 'manager', ['is_active' => false]);
        $this->user('Manager Staff', 'manager', ['email' => 'm99@staff.invalid']);
        $cashier = $this->user('Cashier Bala', 'cashier', ['page_permissions' => ['/sales/pos-sales' => ['view' => true, 'add' => true, 'edit' => false, 'delete' => false]]]);
        $otherStore = Store::create(['name' => 'Other', 'code' => 'OTHER', 'is_active' => true]);
        $outsider = User::create(['name' => 'Elsewhere', 'username' => 'elsewhere', 'email' => 'elsewhere@example.test', 'password' => 'x', 'role' => 'manager', 'store_id' => $otherStore->id, 'is_active' => true]);
        $group = $this->postJson('/api/report-schedules/groups', ['name' => 'Owners', 'user_ids' => [$managerA->id], 'emails' => ['Partner@Example.test', 'auditor@example.test']])
            ->assertCreated()->json('data');

        $schedule = $this->schedule(['recipients' => [
            ['type' => 'role', 'value' => 'manager'], ['type' => 'group', 'value' => (string) $group['id']], ['type' => 'email', 'value' => 'auditor@example.test'],
            ['type' => 'user', 'value' => (string) $cashier->id], ['type' => 'user', 'value' => (string) $outsider->id], ['type' => 'user', 'value' => (string) $inactive->id],
        ]]);
        $this->assertSame('2026-11-18 09:00', $schedule['next_run_at']);

        $run = $this->postJson("/api/report-schedules/{$schedule['id']}/send-now")->assertOk()->json('data');

        $this->assertSame('sent', $run['status']);
        $this->assertEqualsCanonicalizing(['manager-anu@example.test', 'partner@example.test', 'auditor@example.test'], $run['recipients']);
        $this->assertEqualsCanonicalizing(['inactive user', 'no email address', 'no access to this report', 'not in this store'], array_column($run['skipped'], 'reason'));
        Mail::assertSent(ScheduledReportMail::class, 3);
        Mail::assertSent(ScheduledReportMail::class, function (ScheduledReportMail $mail) {
            $names = array_keys($mail->files);

            return $mail->hasTo('auditor@example.test') && count($names) === 2 && str_ends_with($names[0], '.xlsx') && str_ends_with($names[1], '.pdf')
                && $mail->report->summary['Bills'] === '1' && str_contains($mail->subjectLine, 'Daily Business Summary');
        });
        $this->assertSame('sent', DB::table('report_schedules')->where('id', $schedule['id'])->value('last_status'));
        $this->assertSame([], glob(storage_path('app/scheduled-reports/*'))); // Files are not kept.
    }

    public function test_preview_downloads_a_readable_excel_and_pdf(): void
    {
        $this->sale(2);
        $schedule = $this->schedule(['report_key' => 'summary.sale_payments', 'params' => ['layout' => null]]);

        $xlsx = $this->get("/api/report-schedules/{$schedule['id']}/preview?format=xlsx")->assertOk();
        $path = tempnam(sys_get_temp_dir(), 'xl');
        file_put_contents($path, $xlsx->streamedContent());
        $sheet = IOFactory::load($path)->getActiveSheet();
        $this->assertStringContainsString('Sale payments summary', (string) $sheet->getCell('A1')->getValue());
        unlink($path);

        $pdf = $this->get("/api/report-schedules/{$schedule['id']}/preview?format=pdf")->assertOk();
        $this->assertStringStartsWith('%PDF', $pdf->streamedContent());
    }

    public function test_due_schedules_run_from_the_command_and_a_failure_does_not_stop_the_next(): void
    {
        Mail::fake();
        $broken = $this->schedule(['name' => 'Broken']);
        $good = $this->schedule(['name' => 'Good']);
        DB::table('report_schedules')->where('id', $broken['id'])->update(['report_key' => 'no.such_report', 'next_run_at' => now()->subMinute()]);
        DB::table('report_schedules')->where('id', $good['id'])->update(['next_run_at' => now()->subMinute()]);

        $this->artisan('reports:run-scheduled')->assertSuccessful();

        $this->assertSame('failed', DB::table('report_schedules')->where('id', $broken['id'])->value('last_status'));
        $this->assertSame('sent', DB::table('report_schedules')->where('id', $good['id'])->value('last_status'));
        $this->assertSame('2026-11-18 03:30:00', (string) DB::table('report_schedules')->where('id', $good['id'])->value('next_run_at')); // Moved on.
        Mail::assertSent(ScheduledReportMail::class, 1);
        $runs = $this->getJson('/api/report-schedules/runs')->assertOk()->json('data');
        $this->assertSame(['sent', 'failed'], array_column($runs, 'status'));
    }

    public function test_a_store_only_reports_its_own_sales(): void
    {
        Mail::fake();
        $this->sale(1);
        $other = Store::create(['name' => 'Other', 'code' => 'OTHER', 'is_active' => true]);
        DB::table('pos_sales')->insert(['store_id' => $other->id, 'user_id' => $this->fixture['user']->id, 'invoice_no' => 'X-1', 'sale_date' => now(), 'grand_total' => 99999, 'status' => 'PAID', 'created_at' => now(), 'updated_at' => now()]);
        $schedule = $this->schedule();

        $this->postJson("/api/report-schedules/{$schedule['id']}/send-now")->assertOk();

        Mail::assertSent(ScheduledReportMail::class, fn ($mail) => $mail->report->summary['Net sales'] === '100.00');
    }

    public function test_smtp_password_is_stored_encrypted_and_used_only_when_set(): void
    {
        $factory = app(MailerFactory::class);
        $this->assertFalse($factory->hasOwnSmtp($this->store));

        $this->putJson('/api/messaging-settings/email', ['enabled' => true, 'from_name' => 'TEMP Store', 'from_address' => 'reports@example.test',
            'smtp_host' => 'smtp.example.test', 'smtp_port' => '465', 'smtp_encryption' => 'ssl', 'smtp_username' => 'reports@example.test', 'smtp_password' => 'Sup3r-Secret!'])->assertOk();

        $row = DB::table('system_configurations')->where('store_id', $this->store)->where('group', 'messaging')->where('key', 'email')->first();
        $this->assertStringNotContainsString('Sup3r-Secret', (string) $row->value.$row->extra_data);
        $this->assertTrue($factory->hasOwnSmtp($this->store));
        $this->assertSame(['reports@example.test', 'TEMP Store'], $factory->from($this->store, 'x'));
        $screen = $this->getJson('/api/messaging-settings')->assertOk()->json('data.email');
        $this->assertStringContainsString('****', $screen['smtp_password']);
        $this->assertTrue($this->getJson('/api/report-schedules/options')->assertOk()->json('data.own_smtp'));
    }

    public function test_a_report_the_user_cannot_view_cannot_be_scheduled_and_recipients_are_checked(): void
    {
        $cashier = $this->user('Cashier Two', 'cashier', ['page_permissions' => ['/settings/scheduler' => ['view' => true, 'add' => true, 'edit' => true, 'delete' => true]]]);
        Sanctum::actingAs($cashier);
        $denied = $this->postJson('/api/report-schedules', ['name' => 'x', 'report_key' => 'finance.profit_loss', 'period' => 'yesterday', 'frequency' => 'daily', 'send_time' => '09:00',
            'formats' => ['pdf'], 'recipients' => [['type' => 'email', 'value' => 'a@example.test']]]);
        $this->assertContains($denied->status(), [403, 422]);
        $this->assertSame(0, DB::table('report_schedules')->count());

        Sanctum::actingAs($this->fixture['user']);
        $this->postJson('/api/report-schedules', ['name' => 'x', 'report_key' => 'daily_summary', 'period' => 'yesterday', 'frequency' => 'weekly', 'send_time' => '09:00',
            'formats' => ['pdf'], 'recipients' => [['type' => 'email', 'value' => 'a@example.test']]])->assertUnprocessable()->assertJsonValidationErrors(['day_of_week']);
        $this->postJson('/api/report-schedules', ['name' => 'x', 'report_key' => 'daily_summary', 'period' => 'yesterday', 'frequency' => 'daily', 'send_time' => '09:00',
            'formats' => ['pdf'], 'recipients' => [['type' => 'email', 'value' => 'not-an-email']]])->assertUnprocessable()->assertJsonValidationErrors(['recipients']);
    }
}
