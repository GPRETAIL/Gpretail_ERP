<?php

namespace Tests\Feature\Settings;

use App\Models\Backup;
use App\Models\Employee;
use App\Models\HrLeaveType;
use App\Models\Store;
use App\Services\Backup\BackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;
use ZipArchive;

/** Backup Center schedules run from the ERP's own scheduler and now cover the HRMS records. */
class ScheduledBackupTest extends TestCase
{
    use RefreshDatabase;

    private function storeWithSchedule(array $settings = []): Store
    {
        return Store::create(['name' => 'Scheduled', 'code' => 'SCH-'.Str::random(5), 'is_active' => true,
            'backup_settings' => array_replace(['schedule_enabled' => true, 'schedule_frequency' => 'daily', 'schedule_time' => '02:00',
                'schedule_backup_type' => 'full', 'local_storage_enabled' => true, 'next_scheduled_at' => now()->subMinute()->toIso8601String()], $settings)]);
    }

    /** @return array<string, array<int, array<string, mixed>>> table => rows from the archive */
    private function archiveTables(Backup $backup): array
    {
        $zip = new ZipArchive;
        $this->assertTrue($zip->open(storage_path('app/private/'.$backup->file_path)) === true);
        $tables = [];
        foreach (array_keys(json_decode($zip->getFromName('manifest.json'), true)['tables']) as $table) {
            $tables[$table] = json_decode((string) $zip->getFromName("tables/{$table}.json"), true) ?? [];
        }
        $zip->close();

        return $tables;
    }

    public function test_the_scheduler_runs_due_backups_with_hr_records_and_without_the_staff_pin(): void
    {
        $store = $this->storeWithSchedule();
        $employee = Employee::create(['name' => 'Asha', 'code' => 'E1', 'store_id' => $store->id, 'is_active' => true, 'phone' => '9876543210']);
        Employee::withoutGlobalScopes()->whereKey($employee->id)->update(['app_access' => true, 'app_pin' => Hash::make('482619')]);
        HrLeaveType::create(['store_id' => $store->id, 'code' => 'CL', 'name' => 'Casual Leave', 'is_paid' => true]);
        $other = $this->storeWithSchedule(['next_scheduled_at' => now()->addHour()->toIso8601String()]);

        $this->artisan('backups:run-scheduled')->expectsOutputToContain('ran 1 backup(s)')->assertSuccessful();

        $backup = Backup::where('company_id', $store->id)->sole();
        $this->assertSame('success', $backup->status);
        $this->assertSame('scheduled', $backup->summary['triggered_by']);
        $this->assertContains('hrms', $backup->module_names);
        $tables = $this->archiveTables($backup);
        $this->assertArrayHasKey('hr_payslips', $tables);
        $this->assertSame(['CL'], array_column($tables['hr_leave_types'], 'code'));
        $this->assertSame('Asha', $tables['employees'][0]['name']);
        $this->assertArrayNotHasKey('app_pin', $tables['employees'][0]);
        $this->assertArrayNotHasKey('users', $tables, 'No schedule password, so login accounts stay out.');
        $this->assertTrue(now()->lt($store->fresh()->backup_settings['next_scheduled_at']));
        $this->assertSame(0, Backup::where('company_id', $other->id)->count(), 'Not due yet.');

        // Nothing is due any more: a second check takes no backup.
        $this->artisan('backups:run-scheduled')->expectsOutputToContain('ran 0 backup(s)')->assertSuccessful();
        $this->assertSame(1, Backup::count());
    }

    public function test_the_run_is_on_the_server_schedule_and_the_old_url_uses_the_same_lock(): void
    {
        $this->artisan('schedule:list')->expectsOutputToContain('backups:run-scheduled')->assertSuccessful();

        config(['backup.cron_secret' => 'backup-secret-value']);
        $this->storeWithSchedule();
        $lock = Cache::lock('backups:scheduled-run', 60);
        $lock->get();
        $this->postJson('/api/backups/scheduled-run', [], ['X-Backup-Cron-Token' => 'backup-secret-value'])->assertOk()
            ->assertJsonPath('data.skipped', 'Another scheduled backup run is in progress.');
        $lock->release();
        $this->postJson('/api/backups/scheduled-run', [], ['X-Backup-Cron-Token' => 'backup-secret-value'])->assertOk()
            ->assertJsonPath('data.results.0.ran', true);
    }

    public function test_failover_catch_up_keeps_its_tables_while_backups_gain_hrms(): void
    {
        $backups = app(BackupService::class);
        $catchUp = array_keys($backups->catchUpTableManifest());
        $full = array_keys($backups->fullTableManifest());
        foreach (['employees', 'attendances', 'hr_departments', 'hr_designations', 'pos_sales'] as $table) {
            $this->assertContains($table, $catchUp);
        }
        $this->assertNotContains('hr_payslips', $catchUp);
        $this->assertContains('hr_payslips', $full);
        $this->assertContains('hr_tax_declaration_items', $full);
        $this->assertContains('hrms', $backups->moduleOptions());
    }
}
