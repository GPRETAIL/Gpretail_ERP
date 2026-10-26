<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Loopback-only router for the disposable HTTP/browser load lab, never deployment.
$database = getenv('POS_LOAD_DATABASE') ?: '';
if (PHP_SAPI !== 'cli-server' || ! in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)
    || ! preg_match('/^gpretail_pos_load_[0-9]+$/', $database)) {
    http_response_code(403);
    exit('A loopback server and explicit POS_LOAD_DATABASE test database are required.');
}
$root = dirname(__DIR__, 2);
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path !== '/' && is_file($root.'/public'.$path)) {
    return false;
}
foreach (['APP_ENV' => 'testing', 'TELESCOPE_ENABLED' => 'false'] as $name => $value) {
    putenv($name.'='.$value);
    $_ENV[$name] = $_SERVER[$name] = $value;
}
define('LARAVEL_START', microtime(true));
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->instance('request', Request::capture());
$app->make(Kernel::class)->bootstrap();
$app->detectEnvironment(fn () => 'testing');
$keyPath = sys_get_temp_dir().'/'.$database.'-public.pem';
if (! is_file($keyPath)) {
    throw new RuntimeException('Seed the isolated load lab before starting HTTP tests.');
}
config([
    'app.env' => 'testing', 'app.debug' => false,
    'database.default' => 'mysql', 'database.connections.mysql.host' => '127.0.0.1',
    'database.connections.mysql.port' => 3306, 'database.connections.mysql.database' => $database,
    'database.connections.mysql.username' => 'root', 'database.connections.mysql.password' => '',
    'database.connections.mysql.url' => null, 'database.connections.mysql.unix_socket' => '',
    'cache.default' => 'array', 'store_scope.schema_cache_enabled' => true,
    'platform.licence_public_keys' => ['dev' => file_get_contents($keyPath)],
    'telescope.enabled' => false,
]);
DB::purge('mysql');
$app->handleRequest(Request::capture());
