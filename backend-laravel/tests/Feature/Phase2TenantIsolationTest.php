<?php

namespace Tests\Feature;

use App\Models\Backup;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SyncOutboxEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase2TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private function createStoreAdmin(Store $store): User
    {
        return User::create([
            'name' => 'Admin '.$store->code,
            'username' => 'admin-'.strtolower($store->code),
            'email' => strtolower($store->code).'@example.test',
            'password' => 'secret123',
            'role' => 'admin',
            'store_id' => $store->id,
            'is_active' => true,
        ]);
    }

    public function test_store_bound_admin_cannot_access_or_delete_another_stores_backup(): void
    {
        $storeOne = Store::create(['name' => 'Store One', 'code' => 'STR-ONE', 'is_active' => true]);
        $storeTwo = Store::create(['name' => 'Store Two', 'code' => 'STR-TWO', 'is_active' => true]);

        $otherBackup = Backup::create([
            'file_name' => 'backup_store_two.zip',
            'backup_type' => 'full',
            'storage_mode' => 'local',
            'module_names' => ['masters'],
            'company_id' => $storeTwo->id,
            'file_path' => 'backups/backup_store_two.zip',
            'file_size' => 1024,
            'file_size_label' => '1 KB',
            'status' => 'success',
            'encryption_enabled' => false,
            'summary' => ['status_message' => 'OK', 'tables' => ['brands' => 1]],
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($this->createStoreAdmin($storeOne));

        $this->getJson('/api/backups/overview')
            ->assertOk()
            ->assertJsonCount(1, 'data.companies')
            ->assertJsonPath('data.companies.0.id', $storeOne->id)
            ->assertJsonCount(0, 'data.backups');

        $this->get('/api/backups/'.$otherBackup->id.'/download')->assertNotFound();
        $this->get('/api/backups/'.$otherBackup->id.'/logs')->assertNotFound();
        $this->postJson('/api/backups/'.$otherBackup->id.'/restore')->assertNotFound();
        $this->deleteJson('/api/backups/'.$otherBackup->id)->assertNotFound();

        $this->assertDatabaseHas('backups', ['id' => $otherBackup->id]);
    }

    public function test_store_bound_admin_saving_backup_settings_without_company_id_only_updates_own_store(): void
    {
        $storeOne = Store::create(['name' => 'Store One', 'code' => 'STR-ONE', 'is_active' => true]);
        $storeTwo = Store::create([
            'name' => 'Store Two',
            'code' => 'STR-TWO',
            'is_active' => true,
            'backup_settings' => ['schedule_frequency' => 'weekly', 'retention_weekly' => 9],
        ]);

        Sanctum::actingAs($this->createStoreAdmin($storeOne));

        $this->postJson('/api/backups/settings', [
            'storageMode' => 'local',
            'scheduleEnabled' => true,
            'scheduleFrequency' => 'daily',
            'retentionDaily' => 14,
        ])->assertOk();

        $this->assertSame('daily', $storeOne->fresh()->backup_settings['schedule_frequency']);
        $this->assertSame('weekly', $storeTwo->fresh()->backup_settings['schedule_frequency']);
    }

    public function test_sales_and_warehouse_customization_reject_cross_store_access(): void
    {
        $storeOne = Store::create(['name' => 'Store One', 'code' => 'STR-ONE', 'is_active' => true]);
        $storeTwo = Store::create([
            'name' => 'Store Two',
            'code' => 'STR-TWO',
            'is_active' => true,
            'receipt_customization' => ['footer' => 'Two Footer'],
            'barcode_customization' => ['marginTopMm' => 5],
        ]);

        Sanctum::actingAs($this->createStoreAdmin($storeOne));

        $this->postJson('/api/sales-customization', [
            'companyId' => $storeTwo->id,
            'footer' => 'Overwritten',
        ])->assertForbidden();

        $this->postJson('/api/warehouse-customisation', [
            'companyId' => $storeTwo->id,
            'marginTopMm' => 99,
        ])->assertForbidden();

        $this->assertSame('Two Footer', $storeTwo->fresh()->receipt_customization['footer']);
        $this->assertSame(5, $storeTwo->fresh()->barcode_customization['marginTopMm']);
    }

    public function test_sync_nodes_outbox_and_store_groups_are_scoped_to_authorized_store(): void
    {
        $storeOne = Store::create(['name' => 'Store One', 'code' => 'STR-ONE', 'is_active' => true]);
        $storeTwo = Store::create(['name' => 'Store Two', 'code' => 'STR-TWO', 'is_active' => true]);

        StoreLocalNode::create(['store_id' => $storeOne->id, 'tenant_key' => 't-one', 'sync_token' => 's-one', 'enabled' => true]);
        $nodeTwo = StoreLocalNode::create(['store_id' => $storeTwo->id, 'tenant_key' => 't-two', 'sync_token' => 's-two', 'enabled' => true]);

        $eventTwo = SyncOutboxEvent::create([
            'store_id' => $storeTwo->id,
            'method' => 'POST',
            'path' => '/pos-sales',
            'payload' => [],
            'headers' => [],
            'idempotency_key' => 'evt-2',
            'status' => 'failed',
            'last_error' => '500 Server Error',
        ]);

        Sanctum::actingAs($this->createStoreAdmin($storeOne));

        $this->getJson('/api/sync/nodes')
            ->assertOk()
            ->assertJsonCount(1, 'data.nodes')
            ->assertJsonPath('data.nodes.0.store_id', $storeOne->id);

        $this->getJson('/api/sync/outbox?store_id='.$storeTwo->id)->assertForbidden();
        $this->postJson('/api/sync/outbox/'.$eventTwo->id.'/retry')->assertNotFound();
        $this->postJson('/api/sync/outbox/retry-all', ['store_id' => $storeTwo->id])->assertForbidden();
        $this->assertSame('failed', $eventTwo->fresh()->status);

        $this->getJson('/api/user-access/store-groups')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $storeOne->id);

        // Node heartbeats authenticate independently of the preceding interactive store session.
        $this->app['auth']->forgetGuards();

        // Heartbeat rejects non-LAN advertised URLs and accepts valid RFC1918 LAN URLs
        $this->withHeaders(['X-Tenant-Key' => $nodeTwo->tenant_key, 'X-Sync-Token' => $nodeTwo->sync_token])
            ->postJson('/api/sync/heartbeat', ['advertised_local_server_url' => 'http://169.254.169.254'])
            ->assertStatus(422);

        $this->withHeaders(['X-Tenant-Key' => $nodeTwo->tenant_key, 'X-Sync-Token' => $nodeTwo->sync_token])
            ->postJson('/api/sync/heartbeat', ['advertised_local_server_url' => 'http://192.168.1.50:8130'])
            ->assertOk();

        $this->assertSame('http://192.168.1.50:8130', $nodeTwo->fresh()->advertised_local_server_url);
    }
}
