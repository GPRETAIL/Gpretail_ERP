<?php

namespace Tests\Feature;

use App\Models\Barcode;
use App\Models\InventoryEntry;
use App\Models\Product;
use App\Models\Role;
use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\SystemConfiguration;
use App\Models\User;
use App\Services\BackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;
use ZipArchive;

class Phase7FinalHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_catch_up_export_never_exposes_users_table_or_password_hashes(): void
    {
        $store = Store::create(['name' => 'Sync Store', 'code' => 'STR-SYNC', 'is_active' => true]);
        User::create([
            'name' => 'Store Admin',
            'username' => 'sync-store-admin',
            'email' => 'sync-admin@example.test',
            'password' => 'SecretPass123!',
            'role' => 'admin',
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        StoreLocalNode::create([
            'store_id' => $store->id,
            'tenant_key' => 'tk-sync-1',
            'sync_token' => 'st-sync-1',
            'enabled' => true,
        ]);

        $response = $this->withHeaders([
            'X-Tenant-Key' => 'tk-sync-1',
            'X-Sync-Token' => 'st-sync-1',
        ])->getJson('/api/sync/catch-up-export')->assertOk();

        $tables = $response->json('data.tables');
        $this->assertIsArray($tables);
        $this->assertArrayNotHasKey('users', $tables);
    }

    public function test_backup_restore_blocks_super_admin_escalation_and_cross_store_collision_even_when_unmanaged(): void
    {
        $storeOne = Store::create(['name' => 'Store One', 'code' => 'STR-1', 'is_active' => true]);
        $storeTwo = Store::create(['name' => 'Store Two', 'code' => 'STR-2', 'is_active' => true]);

        $superAdmin = User::create([
            'name' => 'Platform Root',
            'username' => 'root-admin',
            'email' => 'root@example.test',
            'password' => 'RootPass123!',
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $service = app(BackupService::class);
        $tmpZip = tempnam(sys_get_temp_dir(), 'bad_backup_');

        $zip = new ZipArchive;
        $zip->open($tmpZip, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('manifest.json', json_encode([
            'app' => 'Vynerix ERP',
            'tables' => ['users' => ['row_count' => 1, 'scope' => 'store_id']],
        ]));
        $zip->addFromString('tables/users.json', json_encode([
            [
                'id' => $superAdmin->id,
                'name' => 'Hijacked Root',
                'username' => 'root-admin',
                'email' => 'root@example.test',
                'password' => '$2y$10$abcdefghijklmnopqrstuv1234567890123456789012345678901',
                'role' => 'admin',
                'store_id' => $storeOne->id,
                'is_active' => 1,
            ],
        ]));
        $zip->close();

        try {
            $this->expectException(RuntimeException::class);
            $service->restoreTablesFromArchive($tmpZip, null, $storeOne->id, $storeTwo->id);
        } finally {
            @unlink($tmpZip);
        }
    }

    public function test_built_in_system_roles_cannot_be_renamed_or_deleted(): void
    {
        $store = Store::create(['name' => 'Store One', 'code' => 'STR-ROLE', 'is_active' => true]);
        $admin = User::create([
            'name' => 'Admin',
            'username' => 'role-admin',
            'email' => 'role-admin@example.test',
            'password' => 'Secret123!',
            'role' => 'admin',
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        $systemRole = Role::create([
            'name' => 'admin',
            'display_name' => 'Administrator',
        ]);

        Sanctum::actingAs($admin);

        $this->putJson('/api/user-access/groups/'.$systemRole->id, [
            'name' => 'custom_name',
        ])->assertForbidden();

        $this->deleteJson('/api/user-access/groups/'.$systemRole->id)
            ->assertForbidden();

        $this->assertDatabaseHas('roles', ['id' => $systemRole->id, 'name' => 'admin']);
    }

    public function test_sales_customization_strips_malformed_payment_qr_image_url(): void
    {
        $store = Store::create(['name' => 'POS Store', 'code' => 'STR-POS', 'is_active' => true]);
        $admin = User::create([
            'name' => 'POS Admin',
            'username' => 'pos-admin',
            'email' => 'pos-admin@example.test',
            'password' => 'Secret123!',
            'role' => 'admin',
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/sales-customization', [
            'companyId' => $store->id,
            'settingsSection' => 'receipt',
            'paymentQrMode' => 'image',
            'paymentQrImageUrl' => 'data:image/png;base64," onerror="alert(1)',
        ])->assertOk();

        $this->assertSame('', $store->fresh()->receipt_customization['paymentQrImageUrl']);
    }

    public function test_merge_ignores_accounts_and_ai_config_even_when_disguised_as_normal_settings(): void
    {
        $user = User::factory()->create(['username' => 'phase7-admin', 'role' => 'admin']);
        $config = SystemConfiguration::create(['key' => 'openai_api_key', 'value' => 'original']);
        app(BackupService::class)->mergeTablesFromExport([
            'users' => [['id' => $user->id, 'role' => 'super_admin']],
            'system_configurations' => [
                ['id' => $config->id, 'key' => 'counter', 'value' => 'replacement'],
                ['id' => 99999, 'key' => 'safe', 'group_name' => 'invoice_ai', 'value' => 'secret'],
            ],
        ]);
        $this->assertSame('admin', $user->fresh()->role);
        $this->assertSame('original', $config->fresh()->value);
        $this->assertDatabaseMissing('system_configurations', ['id' => 99999]);
    }

    public function test_failed_import_removes_uploaded_file_and_backup_record(): void
    {
        $store = Store::create(['name' => 'Import', 'code' => 'IMPORT', 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['username' => 'phase7-admin', 'role' => 'admin', 'store_id' => $store->id]));
        $directory = storage_path('app/private/backups');
        $before = glob($directory.'/imported_*') ?: [];
        $this->postJson('/api/backups/import', ['backupFile' => UploadedFile::fake()->createWithContent('invalid.zip', 'not a zip')])->assertUnprocessable();
        $this->assertDatabaseCount('backups', 0);
        $this->assertSame($before, glob($directory.'/imported_*') ?: []);
        $this->postJson('/api/backups/import', ['backupFile' => UploadedFile::fake()->create('bad.php', 1)])->assertUnprocessable();
        $this->postJson('/api/backups/import', ['backupFile' => UploadedFile::fake()->create('large.zip', 102401)])->assertUnprocessable();
    }

    public function test_transport_barcode_filter_preserves_the_other_source_filter(): void
    {
        Schema::table('inventory_entries', function ($table) {
            $table->unsignedBigInteger('transport_entry_id')->nullable();
        });
        $store = Store::create(['name' => 'Warehouse', 'code' => 'WH', 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['username' => 'phase7-admin', 'role' => 'admin', 'store_id' => $store->id]));
        $product = Product::create(['name' => 'Product', 'code' => 'P', 'company_id' => $store->id]);
        $entry = InventoryEntry::create(['store_id' => $store->id, 'entry_no' => 'E', 'entry_date' => now()]);
        $entry->forceFill(['transport_entry_id' => 15])->save();
        Barcode::create(['product_id' => $product->id, 'barcode' => 'EXCLUDED', 'inventory_entry_id' => $entry->id, 'direct_purchase_id' => 1]);
        $this->getJson('/api/barcodes?all=true&transport_entry_id=15&direct_purchase_id=2')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/barcodes?all=true&transport_entry_id=15&direct_purchase_id=1')->assertOk()->assertJsonCount(1, 'data');
    }
}
