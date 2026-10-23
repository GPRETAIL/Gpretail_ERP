<?php

namespace Tests\Feature;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\SystemConfiguration;
use App\Models\User;
use App\Services\BackupService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Phase6BackupAndSnapshotHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_backup_export_redacts_store_secrets_and_excludes_internal_invoice_ai_keys(): void
    {
        // Historical deployments may still contain these legacy credential columns.
        Schema::table('stores', function (Blueprint $table): void {
            foreach (['admin_password', 'einvoice_password', 'gst_access_key'] as $column) {
                if (! Schema::hasColumn('stores', $column)) {
                    $table->string($column)->nullable();
                }
            }
        });
        $store = Store::create([
            'name' => 'Secure Store',
            'code' => 'STR-SEC',
            'is_active' => true,
            'platform_licence_token' => 'eyJhbGciOiJFZERTQSJ9.secret.sig',
            'admin_password' => 'super-secret-admin-pass',
            'einvoice_password' => 'einvoice-secret',
            'gst_access_key' => 'gst-secret-key',
            'backup_settings' => [
                'oci_secret_access_key' => 'oci-raw-secret-key',
                'schedule_frequency' => 'daily',
            ],
        ]);

        SystemConfiguration::create([
            'store_id' => $store->id,
            'company_id' => $store->id,
            'group' => 'invoice_ai',
            'group_name' => 'invoice_ai',
            'key' => 'gemini_api_key',
            'config_key' => 'gemini_api_key',
            'value' => Crypt::encryptString('AIzaSecretKey'),
        ]);

        SystemConfiguration::create([
            'store_id' => $store->id,
            'company_id' => $store->id,
            'group' => 'counter',
            'group_name' => 'counter',
            'key' => 'counter',
            'config_key' => 'counter',
            'value' => 'POS Counter 1',
        ]);

        $service = app(BackupService::class);
        $manifest = $service->buildTableManifestForModules(['store', 'settings']);
        $exported = $service->exportTablesToJson($manifest, $store->id, null);

        $this->assertNotEmpty($exported['stores']);
        $exportedStore = $exported['stores'][0];
        $this->assertArrayNotHasKey('platform_licence_token', $exportedStore);
        $this->assertArrayNotHasKey('admin_password', $exportedStore);
        $this->assertArrayNotHasKey('einvoice_password', $exportedStore);
        $this->assertArrayNotHasKey('gst_access_key', $exportedStore);
        $this->assertArrayNotHasKey('backup_settings', $exportedStore);

        $this->assertCount(1, $exported['system_configurations']);
        $this->assertSame('counter', $exported['system_configurations'][0]['key']);
    }

    public function test_purge_plaintext_snapshots_command_removes_or_encrypts_legacy_snapshots(): void
    {
        Storage::fake('local');
        $disk = Storage::disk('local');

        $disk->put('config-backups/2026-04-06-pre-remediation/companies.json', '{"secret":"plaintext"}');
        $disk->put('deployment-upgrades/owner-1-before.json', '{"password":"$2y$10$plaintexthash"}');
        $disk->put('backups/tmp/decrypt_stale.zip', 'PK-temp-plaintext');
        touch($disk->path('backups/tmp/decrypt_stale.zip'), now()->subDays(2)->timestamp);
        $disk->put('backups/tmp/current.zip', 'active-job');

        $this->artisan('security:purge-plaintext-snapshots --encrypt')->assertExitCode(0);

        $this->assertFalse($disk->exists('config-backups/2026-04-06-pre-remediation/companies.json'));
        $this->assertTrue($disk->exists('config-backups/2026-04-06-pre-remediation/companies.json.enc'));
        $this->assertSame(
            '{"secret":"plaintext"}',
            Crypt::decryptString($disk->get('config-backups/2026-04-06-pre-remediation/companies.json.enc'))
        );

        $this->assertFalse($disk->exists('deployment-upgrades/owner-1-before.json'));
        $this->assertTrue($disk->exists('deployment-upgrades/owner-1-before.json.enc'));
        $this->assertFalse($disk->exists('backups/tmp/decrypt_stale.zip'));
        $this->assertTrue($disk->exists('backups/tmp/current.zip'));
        $this->artisan('security:purge-plaintext-snapshots --encrypt')->assertExitCode(0);
    }

    public function test_link_legacy_owner_writes_encrypted_snapshot_without_password_hash(): void
    {
        Storage::fake('local');
        config()->set('platform.base_url', 'https://platform.test');
        config()->set('platform.company_code', 'CMP-LEGACY');

        PlatformActivation::create([
            'company_code' => 'CMP-LEGACY',
            'sync_token' => 'sync-token-1',
            'activated' => true,
            'status' => 'active',
        ]);

        $user = User::create([
            'name' => 'Legacy Owner',
            'username' => 'legacy-owner',
            'email' => 'owner@example.test',
            'password' => 'LegacySecret123!',
            'role' => 'admin',
            'is_active' => true,
        ]);

        Http::fake([
            'https://platform.test/api/v1/tenant/CMP-LEGACY/snapshot' => Http::response([
                'success' => true,
                'data' => [
                    'company' => [
                        'company_code' => 'CMP-LEGACY',
                        'status' => 'active',
                        'tenant_admin_email' => 'owner@example.test',
                        'tenant_password_version' => 1,
                    ],
                    'stores' => [],
                    'warehouses' => [],
                ],
            ], 200),
        ]);

        $this->artisan('platform:link-legacy-owner', ['email' => 'owner@example.test'])->assertExitCode(0);

        $disk = Storage::disk('local');
        $this->assertFalse($disk->exists('deployment-upgrades/owner-'.$user->id.'-before.json'));
        $this->assertTrue($disk->exists('deployment-upgrades/owner-'.$user->id.'-before.json.enc'));

        $decrypted = json_decode(Crypt::decryptString($disk->get('deployment-upgrades/owner-'.$user->id.'-before.json.enc')), true);
        $this->assertSame('owner@example.test', $decrypted['email']);
        $this->assertArrayNotHasKey('password', $decrypted);
        $this->assertArrayNotHasKey('remember_token', $decrypted);
    }

    public function test_cleanup_retains_plaintext_when_an_existing_encrypted_copy_does_not_match(): void
    {
        Storage::fake('local');
        $disk = Storage::disk('local');
        $disk->put('deployment-upgrades/before.json', 'newer-data');
        $disk->put('deployment-upgrades/before.json.enc', Crypt::encryptString('older-data'));
        $this->artisan('security:purge-plaintext-snapshots --encrypt')->assertFailed();
        $this->assertSame('newer-data', $disk->get('deployment-upgrades/before.json'));
        $this->assertSame('older-data', Crypt::decryptString($disk->get('deployment-upgrades/before.json.enc')));
    }
}
