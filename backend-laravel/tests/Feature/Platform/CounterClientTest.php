<?php

namespace Tests\Feature\Platform;

use App\Models\Store;
use App\Models\StoreLocalNode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use ZipArchive;

/** The counter client: the on-prem server hands each counter the app, its settings, and newer builds later. */
class CounterClientTest extends TestCase
{
    use RefreshDatabase;

    private string $dist;

    private StoreLocalNode $node;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dist = sys_get_temp_dir().DIRECTORY_SEPARATOR.'counter-dist-'.uniqid();
        mkdir($this->dist.'/assets', 0755, true);
        mkdir($this->dist.'/downloads', 0755, true);
        file_put_contents($this->dist.'/index.html', '<html><head></head><body>app</body></html>');
        file_put_contents($this->dist.'/assets/app.js', 'console.log(1)');
        file_put_contents($this->dist.'/downloads/big.apk', 'not for counters');
        config(['sync.counter_app_dist' => $this->dist, 'sync.node_role' => 'local']);

        $store = Store::create(['name' => 'Main Store', 'code' => 'STR-001']);
        $this->node = StoreLocalNode::create(['store_id' => $store->id, 'tenant_key' => 't', 'sync_token' => 's', 'enabled' => true,
            'counter_url' => 'http://mainserver:5173', 'cloud_server_url' => 'https://dev.gpsoftware.in']);
        Sanctum::actingAs(User::create(['name' => 'Owner', 'username' => 'owner', 'email' => 'owner@example.com', 'password' => 'secret123',
            'role' => 'admin', 'store_id' => $store->id, 'is_active' => true]));
    }

    private function entries(string $zipFile): array
    {
        $zip = new ZipArchive;
        $zip->open($zipFile);
        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $names[$zip->getNameIndex($i)] = $zip->getFromIndex($i);
        }
        $zip->close();

        return $names;
    }

    public function test_counters_can_check_the_app_version_and_download_the_app(): void
    {
        $version = $this->getJson('/api/connector/app-version')->assertOk()->json('data.version');
        $this->assertSame(substr(sha1_file($this->dist.'/index.html'), 0, 16), $version);

        $file = $this->get('/api/connector/app-bundle')->assertOk()->baseResponse->getFile()->getPathname();
        $entries = $this->entries($file);
        $this->assertArrayHasKey('index.html', $entries);
        $this->assertArrayHasKey('assets/app.js', $entries);
        $this->assertArrayNotHasKey('downloads/big.apk', $entries, 'large downloads stay on the server');
    }

    public function test_the_installer_carries_the_connector_the_app_and_this_stores_addresses(): void
    {
        $file = $this->get('/api/local-server-config/counter-installer')->assertOk()->baseResponse->getFile()->getPathname();
        $entries = $this->entries($file);

        $this->assertSame(['upstream' => 'http://mainserver:5173', 'cloud_api' => 'https://dev.gpsoftware.in/api', 'port' => 5050],
            json_decode($entries['counter.json'], true));
        foreach (['server.js', 'counter.js', 'install_autostart.bat', 'app/index.html', 'app/assets/app.js', 'app/.version'] as $name) {
            $this->assertArrayHasKey($name, $entries, $name);
        }
        foreach (array_keys($entries) as $name) {
            $this->assertStringNotContainsString('node_modules/', $name);
            $this->assertFalse(str_starts_with($name, 'test/') || $name === 'printer_config.json' || str_ends_with($name, '.log'), $name);
        }
    }

    public function test_the_installer_needs_the_counter_address_and_an_administrator(): void
    {
        $this->node->forceFill(['counter_url' => null])->save();
        $this->getJson('/api/local-server-config/counter-installer')->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'counter address'));

        Sanctum::actingAs(User::create(['name' => 'Till', 'username' => 'till', 'email' => 'till@example.com', 'password' => 'secret123',
            'role' => 'cashier', 'store_id' => $this->node->store_id, 'is_active' => true]));
        $this->getJson('/api/local-server-config/counter-installer')->assertForbidden();
    }
}
