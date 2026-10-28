<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use App\Services\BackupService;
use App\Services\InvoiceOcrService;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class ExternalServiceSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function cloudSettings(): array
    {
        return ['oci_namespace' => 'testnamespace', 'oci_region' => 'ap-mumbai-1',
            'oci_access_key_id' => 'test-access-id', 'oci_secret_access_key' => 'test-secret', 'oci_bucket' => 'test-bucket'];
    }

    public function test_backup_settings_reject_url_parts_before_saving_or_testing_cloud_credentials(): void
    {
        $store = Store::create(['name' => 'Cloud security store', 'code' => 'CLOUD-SECURITY']);
        Sanctum::actingAs(User::factory()->create(['username' => 'cloud-security-admin', 'role' => 'admin', 'store_id' => $store->id]));
        Storage::shouldReceive('build')->never();
        $this->postJson('/api/backups/settings', ['ociNamespace' => 'attacker.example/path'])
            ->assertUnprocessable()->assertJsonValidationErrors('ociNamespace');
        $this->assertNull($store->fresh()->backup_settings);
        $this->postJson('/api/backups/cloud-test', ['ociRegion' => 'region@attacker.example/'])
            ->assertUnprocessable()->assertJsonValidationErrors('ociRegion');
    }

    public static function invalidCloudParts(): array
    {
        return [
            'namespace URL' => ['oci_namespace', 'https://attacker.example'],
            'namespace host and path' => ['oci_namespace', '127.0.0.1:443/'],
            'namespace userinfo' => ['oci_namespace', 'tenant@attacker.example/'],
            'namespace newline' => ['oci_namespace', "tenant\r\nHost: attacker"],
            'region path' => ['oci_region', 'ap-mumbai-1/../../'],
            'region userinfo' => ['oci_region', 'ap-mumbai-1@attacker.example/'],
        ];
    }

    #[DataProvider('invalidCloudParts')]
    public function test_cloud_endpoint_parts_cannot_redirect_signed_backup_requests(string $field, string $value): void
    {
        Storage::shouldReceive('build')->never();
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('without a URL, port or path');
        app(BackupService::class)->buildOciDisk(array_replace($this->cloudSettings(), [$field => $value]));
    }

    public function test_cloud_backups_verify_tls_certificates_on_local_installations(): void
    {
        $this->app->instance('env', 'local');
        $disk = Mockery::mock(Filesystem::class);
        Storage::shouldReceive('build')->once()->with(Mockery::on(function (array $config): bool {
            $this->assertSame('https://testnamespace.compat.objectstorage.ap-mumbai-1.oraclecloud.com', $config['endpoint']);
            $this->assertTrue($config['http']['verify']);

            return true;
        }))->andReturn($disk);
        $this->assertSame($disk, app(BackupService::class)->buildOciDisk($this->cloudSettings()));
    }

    public static function ocrProviders(): array
    {
        return [['services.gemini.key'], ['services.space_ocr.key'], ['services.openai.key'], ['ocr_space.key']];
    }

    #[DataProvider('ocrProviders')]
    public function test_invoice_ocr_never_disables_certificate_verification_in_local_mode(string $key): void
    {
        $this->app->instance('env', 'local');
        foreach (self::ocrProviders() as [$providerKey]) {
            config()->set($providerKey, '');
        }
        config()->set($key, 'test-api-key');
        $calls = 0;
        Http::fake(function ($request, array $options) use (&$calls) {
            $calls++;
            $this->assertNotFalse($options['verify'] ?? true, 'Invoice images and API keys require verified TLS in every environment.');

            return Http::response([
                'candidates' => [['content' => ['parts' => [['text' => '{"supplier":{"name":"Test supplier"},"items":[]}']]]]],
                'choices' => [['message' => ['content' => '{"supplier":{"name":"Test supplier"},"items":[]}']]],
                'data' => ['values' => ['markdown' => 'Test invoice INV-1 Grand Total 100']],
                'IsErroredOnProcessing' => false,
                'ParsedResults' => [['ParsedText' => 'Test invoice INV-1 Grand Total 100']],
            ]);
        });
        $result = app(InvoiceOcrService::class)->extract(UploadedFile::fake()->create('invoice.pdf', 1, 'application/pdf'));
        $this->assertTrue($result['success']);
        $this->assertGreaterThan(0, $calls);
    }
}
