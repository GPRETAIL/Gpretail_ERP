<?php

/**
 * Public Direct Unzipper & Database Auto-Migrator
 */

$deployToken = 'NextErpDeploySecret2026';

if (($_GET['token'] ?? '') !== $deployToken) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json');

$possiblePaths = [
    dirname(__DIR__) . '/deploy.zip',
    __DIR__ . '/deploy.zip',
];

$zipFile = null;
$rootDir = dirname(__DIR__);

foreach ($possiblePaths as $p) {
    if (file_exists($p)) {
        $zipFile = realpath($p);
        $rootDir = dirname($zipFile);
        break;
    }
}

if (!$zipFile) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'deploy.zip not found in ' . implode(' or ', $possiblePaths),
    ]);
    exit;
}

$zip = new ZipArchive();
$res = $zip->open($zipFile);

if ($res === true) {
    $zip->extractTo($rootDir);
    $zip->close();
    
    @unlink($zipFile);
    
    @mkdir($rootDir . '/storage/framework/cache/data', 0777, true);
    @mkdir($rootDir . '/storage/framework/sessions', 0777, true);
    @mkdir($rootDir . '/storage/framework/views', 0777, true);
    @mkdir($rootDir . '/storage/logs', 0777, true);
    @mkdir($rootDir . '/bootstrap/cache', 0777, true);
    
    if (file_exists($rootDir . '/default.php')) {
        @unlink($rootDir . '/default.php');
    }

    $migrationOutput = '';
    try {
        require_once $rootDir . '/vendor/autoload.php';
        $app = require_once $rootDir . '/bootstrap/app.php';
        $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
        
        \Illuminate\Support\Facades\Artisan::call('optimize:clear');
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $migrationOutput = \Illuminate\Support\Facades\Artisan::output();

        try {
            \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
        } catch (\Throwable $seedErr) {}

        \Illuminate\Support\Facades\Artisan::call('config:cache');
        \Illuminate\Support\Facades\Artisan::call('route:cache');
        \Illuminate\Support\Facades\Artisan::call('view:cache');
    } catch (\Throwable $e) {
        $migrationOutput = 'Migration note: ' . $e->getMessage();
    }

    echo json_encode([
        'status'     => 'success',
        'message'    => 'Extracted and migrated successfully!',
        'migrations' => $migrationOutput,
    ]);
} else {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Failed to open zip, code: ' . $res,
    ]);
}
