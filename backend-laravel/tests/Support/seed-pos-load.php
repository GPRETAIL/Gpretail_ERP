<?php

use App\Models\PlatformActivation;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\PosPerformanceFixture;

// Explicitly opt-in local load lab. Never use the configured ERP database.
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$database = DB::connection()->getDatabaseName();
if (! $app->environment('testing') || ! preg_match('/^gpretail_pos_load_[0-9]+$/', $database)
    || DB::table('stores')->exists() || DB::table('products')->exists()) {
    throw new RuntimeException('Load fixtures require an empty, disposable gpretail_pos_load_* test database.');
}
$fixture = PosPerformanceFixture::catalog((int) ($argv[1] ?? 10000));
// Exercise actual activation/license checks with an ephemeral, test-only key.
$key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_ED25519, 'config' => __DIR__.'/../Fixtures/openssl.cnf']);
$public = openssl_pkey_get_details($key)['key'];
$activation = PlatformActivation::create(['company_code' => 'TEMP-LOAD-COMPANY', 'activated' => true, 'status' => 'active', 'deployment_id' => (string) Str::uuid(), 'active_till' => now()->addDay(), 'licence_state' => 'TEST', 'last_synced_at' => now(), 'onboarding_required' => false, 'first_erp_login_at' => now()]);
$fixture['user']->forceFill(['platform_company_code' => $activation->company_code])->save();
$store = $fixture['store'];
$store->forceFill(['platform_store_id' => 1, 'platform_company_code' => $activation->company_code, 'activated_at' => now()])->save();
$claims = ['iss' => 'vx-admin', 'aud' => 'next-erp', 'kid' => 'dev', 'sub' => $store->code, 'company_code' => $activation->company_code, 'store_id' => 1, 'deployment_id' => $activation->deployment_id, 'status' => 'active', 'subscription_status' => 'active', 'iat' => now()->timestamp, 'exp' => now()->addHours(12)->timestamp, 'activeTill' => now()->addDay()->timestamp, 'offline_until' => now()->addDay()->timestamp];
$encode = fn ($value) => rtrim(strtr(base64_encode(json_encode($value)), '+/', '-_'), '=');
$input = $encode(['alg' => 'EdDSA', 'typ' => 'JWT', 'kid' => 'dev']).'.'.$encode($claims);
openssl_sign($input, $signature, $key, null);
$store->forceFill(['platform_licence_token' => $input.'.'.rtrim(strtr(base64_encode($signature), '+/', '-_'), '=')])->save();
file_put_contents(sys_get_temp_dir().'/'.$database.'-public.pem', $public);
echo json_encode(['database' => $database, 'products' => count($fixture['items']), 'store_id' => $store->id, 'username' => 'temp-pos-load']), PHP_EOL;
