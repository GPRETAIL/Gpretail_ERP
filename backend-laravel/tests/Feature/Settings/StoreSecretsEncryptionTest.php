<?php

namespace Tests\Feature\Settings;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreSecretsEncryptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_e_invoice_password_and_gst_key_are_encrypted_in_the_database_and_read_back_plain(): void
    {
        $store = Store::create(['name' => 'Coffee', 'code' => 'STR-ENC', 'einvoice_password' => 'secret-1', 'gst_access_key' => str_repeat('k', 60)]);

        $raw = DB::table('stores')->where('id', $store->id)->first();
        $this->assertNotSame('secret-1', $raw->einvoice_password);
        $this->assertStringNotContainsString('secret-1', $raw->einvoice_password);
        $this->assertSame('secret-1', Crypt::decryptString($raw->einvoice_password));
        $this->assertSame('secret-1', $store->fresh()->einvoice_password);
        $this->assertSame(str_repeat('k', 60), $store->fresh()->gst_access_key);

        $store->update(['einvoice_password' => '']);
        $this->assertSame('', $store->fresh()->einvoice_password);
        $store->update(['einvoice_password' => null]);
        $this->assertNull($store->fresh()->einvoice_password);
    }

    public function test_a_secret_saved_before_encryption_still_reads_and_the_migration_encrypts_it_once(): void
    {
        $store = Store::create(['name' => 'Old', 'code' => 'STR-OLD']);
        DB::table('stores')->where('id', $store->id)->update(['einvoice_password' => 'plain-pass', 'gst_access_key' => 'plain-key']);
        $this->assertSame('plain-pass', $store->fresh()->einvoice_password);

        $migration = require database_path('migrations/2026_11_26_130000_encrypt_store_secrets.php');
        $migration->up();
        $first = DB::table('stores')->where('id', $store->id)->value('einvoice_password');
        $this->assertNotSame('plain-pass', $first);
        $this->assertSame('plain-pass', $store->fresh()->einvoice_password);
        $this->assertSame('plain-key', $store->fresh()->gst_access_key);

        $migration->up();
        $this->assertSame($first, DB::table('stores')->where('id', $store->id)->value('einvoice_password'));
    }

    public function test_a_company_save_stores_the_secret_encrypted_and_the_admin_sees_it_plain(): void
    {
        $store = Store::create(['name' => 'Coffee', 'code' => 'STR-API', 'is_active' => true]);
        $admin = User::create(['name' => 'Admin', 'username' => 'enc-admin', 'email' => 'enc@example.test', 'password' => 'Welcome123', 'role' => 'admin', 'store_id' => $store->id]);
        Sanctum::actingAs($admin);

        $this->put('/api/companies/'.$store->id, ['einvoicePassword' => 'api-secret'], ['Accept' => 'application/json'])->assertOk();

        $this->assertStringNotContainsString('api-secret', DB::table('stores')->where('id', $store->id)->value('einvoice_password'));
        $this->getJson('/api/companies/'.$store->id)->assertOk()->assertJsonPath('data.einvoice_password', 'api-secret');
    }
}
