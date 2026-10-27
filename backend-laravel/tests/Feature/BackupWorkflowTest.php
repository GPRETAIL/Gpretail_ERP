<?php

namespace Tests\Feature;

use App\Models\Backup;
use App\Models\Store;
use App\Models\User;
use App\Services\BackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Support\PosPerformanceFixture;
use Tests\TestCase;

class BackupWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): Store
    {
        $store = Store::create(['name' => 'Backup test', 'code' => 'BKP', 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['username' => 'backup-admin', 'role' => 'admin', 'store_id' => $store->id]));

        return $store;
    }

    public function test_overview_redacts_oci_and_schedule_secrets_and_masked_resave_preserves_them(): void
    {
        $store = $this->admin();
        $encrypted = Crypt::encryptString('schedule-secret');
        $store->update(['backup_settings' => ['oci_secret_access_key' => 'oci-secret', 'encryption_password_encrypted' => $encrypted]]);
        $this->getJson('/api/backups/overview')->assertOk()
            ->assertJsonPath('data.setting.oci_secret_access_key', str_repeat('*', 20))
            ->assertJsonPath('data.setting.scheduled_encryption_configured', true)
            ->assertJsonMissingPath('data.setting.encryption_password_encrypted');
        $this->postJson('/api/backups/settings', ['ociSecretAccessKey' => str_repeat('*', 20), 'encryptionPassword' => str_repeat('*', 20)])
            ->assertOk();
        $this->assertSame('oci-secret', $store->fresh()->backup_settings['oci_secret_access_key']);
        $this->assertSame($encrypted, $store->fresh()->backup_settings['encryption_password_encrypted']);
    }

    public function test_invalid_weekday_is_rejected_before_schedule_calculation(): void
    {
        $this->admin();
        $this->postJson('/api/backups/settings', ['scheduleEnabled' => true, 'scheduleFrequency' => 'weekly', 'scheduleDayOfWeek' => 7])
            ->assertUnprocessable()->assertJsonValidationErrors('scheduleDayOfWeek');
    }

    public function test_backup_credentials_are_never_queued_for_another_server(): void
    {
        $this->admin();
        config(['sync.node_role' => 'local']);
        $this->postJson('/api/backups/settings', ['ociSecretAccessKey' => 'do-not-replay', 'encryptionPassword' => 'do-not-replay-either'])->assertOk();
        $this->assertDatabaseCount('sync_outbox', 0);
    }

    public function test_all_store_settings_work_when_stores_have_no_previous_oci_settings(): void
    {
        $this->admin();
        Store::create(['name' => 'Second', 'code' => 'BKP-2', 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['username' => 'backup-root', 'role' => 'super_admin', 'store_id' => null]));
        $this->postJson('/api/backups/settings', ['retentionDaily' => 14])->assertOk();
        $this->assertSame([14, 14], Store::all()->map(fn ($store) => $store->backup_settings['retention_daily'])->all());
    }

    public function test_master_backup_download_and_restore_round_trip_preserves_store_ownership(): void
    {
        $store = $this->admin();
        $id = DB::table('brands')->insertGetId(['name' => 'Before backup', 'code' => 'ROUNDTRIP', 'store_id' => $store->id]);
        $response = $this->postJson('/api/backups', ['backupType' => 'module', 'moduleNames' => ['masters'], 'storageMode' => 'local'])
            ->assertCreated()->assertJsonPath('data.status', 'success');
        $backup = Backup::findOrFail($response->json('data.id'));
        $path = storage_path('app/private/'.$backup->file_path);
        try {
            $this->get('/api/backups/'.$backup->id.'/download')->assertOk();
            DB::table('brands')->where('id', $id)->update(['name' => 'After backup']);
            $this->postJson('/api/backups/'.$backup->id.'/restore', ['restoreType' => 'partial', 'moduleNames' => ['masters']])
                ->assertCreated()->assertJsonPath('data.status', 'success');
            $this->assertDatabaseHas('brands', ['id' => $id, 'name' => 'Before backup', 'store_id' => $store->id]);
        } finally {
            @unlink($path);
        }
    }

    public function test_cloud_only_restore_fetches_archive_and_removes_temporary_download(): void
    {
        $store = $this->admin();
        $service = app(BackupService::class);
        $path = $service->writeBackupArchive(['brands' => []], ['brands' => ['scope' => 'store_id_or_company_id']], 'workflow-cloud-'.bin2hex(random_bytes(8)));
        $backup = Backup::create(['company_id' => $store->id, 'file_name' => 'cloud.zip', 'backup_type' => 'module', 'storage_mode' => 'cloud',
            'cloud_path' => 'backups/cloud.zip', 'file_path' => null, 'module_names' => ['masters'], 'status' => 'success', 'file_size' => 1, 'encryption_enabled' => false]);
        $this->partialMock(BackupService::class, fn ($mock) => $mock->shouldReceive('downloadFromCloud')->once()->with('backups/cloud.zip', [])->andReturn($path));
        try {
            $this->postJson('/api/backups/'.$backup->id.'/restore', ['restoreType' => 'full'])->assertCreated()->assertJsonPath('data.status', 'success');
            $this->assertFileDoesNotExist($path);
        } finally {
            @unlink($path);
        }
    }

    public function test_restore_rejects_an_unauthorized_target_before_reading_archive(): void
    {
        $store = $this->admin();
        $other = Store::create(['name' => 'Other', 'code' => 'BKP-OTHER', 'is_active' => true]);
        $backup = Backup::create(['company_id' => $store->id, 'file_name' => 'test.zip', 'backup_type' => 'module', 'storage_mode' => 'local',
            'module_names' => ['masters'], 'status' => 'success', 'file_size' => 1, 'encryption_enabled' => false]);
        $this->postJson('/api/backups/'.$backup->id.'/restore', ['targetCompanyId' => $other->id])->assertForbidden();
        $this->assertDatabaseCount('backup_restores', 0);
    }

    public function test_full_encrypted_backup_and_restore_support_parent_owned_records(): void
    {
        $store = $this->admin();
        $tax = DB::table('taxes')->insertGetId(['code' => 'BKP-TAX', 'name' => 'Backup tax', 'store_id' => $store->id]);
        $slab = DB::table('tax_slabs')->insertGetId(['tax_id' => $tax, 'rate' => 5]);
        $response = $this->postJson('/api/backups', ['backupType' => 'full', 'storageMode' => 'local', 'encryptionEnabled' => true, 'encryptionPassword' => 'test-password'])
            ->assertCreated();
        $this->assertSame('success', $response->json('data.status'), $response->json('data.summary.status_message') ?? '');
        $backup = Backup::findOrFail($response->json('data.id'));
        $path = storage_path('app/private/'.$backup->file_path);
        try {
            DB::table('tax_slabs')->where('id', $slab)->update(['rate' => 10]);
            $restore = $this->postJson('/api/backups/'.$backup->id.'/restore', ['restoreType' => 'full', 'password' => 'test-password'])->assertCreated();
            $this->assertSame('success', $restore->json('data.status'), $restore->json('data.summary.status_message') ?? '');
            $this->assertDatabaseHas('tax_slabs', ['id' => $slab, 'tax_id' => $tax, 'rate' => 5]);
        } finally {
            @unlink($path);
        }
    }

    public function test_indirect_row_id_cannot_be_moved_from_another_stores_parent(): void
    {
        $store = $this->admin();
        $other = Store::create(['name' => 'Other', 'code' => 'BKP-COLLISION', 'is_active' => true]);
        $tax = DB::table('taxes')->insertGetId(['code' => 'OWN', 'name' => 'Own', 'store_id' => $store->id]);
        $foreignTax = DB::table('taxes')->insertGetId(['code' => 'OTHER', 'name' => 'Other', 'store_id' => $other->id]);
        $slab = DB::table('tax_slabs')->insertGetId(['tax_id' => $foreignTax, 'rate' => 5]);
        $service = app(BackupService::class);
        $path = $service->writeBackupArchive(['tax_slabs' => [['id' => $slab, 'tax_id' => $tax, 'rate' => 10]]], ['tax_slabs' => ['scope' => 'via_parent']], 'workflow-collision-'.bin2hex(random_bytes(8)));
        try {
            $this->expectException(\RuntimeException::class);
            $service->restoreTablesFromArchive($path, null, $store->id, $store->id);
        } finally {
            $this->assertDatabaseHas('tax_slabs', ['id' => $slab, 'tax_id' => $foreignTax, 'rate' => 5]);
            @unlink($path);
        }
    }

    public function test_restore_orders_parents_first_and_does_not_restore_global_permission_definitions(): void
    {
        $store = $this->admin();
        $service = app(BackupService::class);
        $manifest = ['tax_slabs' => [], 'taxes' => [], 'permissions' => []];
        $path = $service->writeBackupArchive([
            'tax_slabs' => [['id' => 990, 'tax_id' => 990, 'rate' => 5]],
            'taxes' => [['id' => 990, 'code' => 'ORDER', 'name' => 'Restore parent first', 'store_id' => $store->id]],
            'permissions' => [['id' => 990, 'name' => 'must-not-install']],
        ], $manifest, 'workflow-order-'.bin2hex(random_bytes(8)));
        try {
            $result = $service->restoreTablesFromArchive($path, null, $store->id, $store->id);
            $this->assertSame(2, $result['restoredRows']);
            $this->assertSame(['permissions'], $result['skippedTables']);
            $this->assertDatabaseHas('tax_slabs', ['id' => 990, 'tax_id' => 990]);
            $this->assertDatabaseMissing('permissions', ['id' => 990]);
        } finally {
            @unlink($path);
        }
    }

    public function test_encrypted_recovery_restores_pos_lines_and_inventory_without_replaying_a_sale(): void
    {
        $fixture = PosPerformanceFixture::create(5);
        Sanctum::actingAs($fixture['user']);
        $sale = $this->postJson('/api/pos-sales', ['items' => $fixture['items'], 'cashAmount' => 500, 'saleSaveAs' => 'paid_settled'])
            ->assertCreated()->json('data');
        $quantity = DB::table('stocks')->sum('quantity');
        $backupResponse = $this->postJson('/api/backups', ['backupType' => 'full', 'storageMode' => 'local', 'encryptionEnabled' => true, 'encryptionPassword' => 'recovery-test'])
            ->assertCreated();
        $this->assertSame('success', $backupResponse->json('data.status'), $backupResponse->json('data.summary.status_message') ?? '');
        $backup = Backup::findOrFail($backupResponse->json('data.id'));
        $path = storage_path('app/private/'.$backup->file_path);
        try {
            DB::table('pos_sale_items')->where('pos_sale_id', $sale['id'])->delete();
            DB::table('stocks')->update(['quantity' => 0]);
            $restore = $this->postJson('/api/backups/'.$backup->id.'/restore', ['restoreType' => 'full', 'password' => 'recovery-test'])->assertCreated();
            $this->assertSame('success', $restore->json('data.status'), $restore->json('data.summary.status_message') ?? '');
            $this->getJson('/api/pos-sales/'.$sale['id'])->assertOk()->assertJsonCount(5, 'data.items');
            $this->assertEquals($quantity, DB::table('stocks')->sum('quantity'));
            $this->assertDatabaseCount('pos_sales', 1);
            $this->assertDatabaseCount('pos_payments', 1);
        } finally {
            @unlink($path);
        }
    }
}
