<?php

/**
 * Hostinger Instant Deployment Unzipper & Database Auto-Migrator
 */

$allowedTokens = [
    'NextErpDeploySecret2026',
    'GpretailDeploySecret2026',
    'HostingerDeployToken2026',
];

$passedToken = $_GET['token'] ?? $_POST['token'] ?? $_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? '';

if (empty($passedToken) || (!in_array($passedToken, $allowedTokens, true) && $passedToken !== (getenv('HOSTINGER_DEPLOY_TOKEN') ?: ''))) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json');

$zipFile = __DIR__ . '/deploy.zip';

if (!file_exists($zipFile)) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'deploy.zip not found in ' . __DIR__,
    ]);
    exit;
}

$zip = new ZipArchive();
$res = $zip->open($zipFile);

if ($res === true) {
    // Extract all files directly into current directory
    $zip->extractTo(__DIR__);
    $zip->close();
    
    // Delete the zip file after extraction
    @unlink($zipFile);
    
    // Ensure write permissions for storage and cache
    @mkdir(__DIR__ . '/storage/framework/cache/data', 0777, true);
    @mkdir(__DIR__ . '/storage/framework/sessions', 0777, true);
    @mkdir(__DIR__ . '/storage/framework/views', 0777, true);
    @mkdir(__DIR__ . '/storage/logs', 0777, true);
    @mkdir(__DIR__ . '/bootstrap/cache', 0777, true);
    
    // Delete default placeholder if present
    if (file_exists(__DIR__ . '/default.php')) {
        @unlink(__DIR__ . '/default.php');
    }

    $migrationOutput = '';
    // Automatically run database migrations via Laravel Console Kernel
    try {
        $baseDir = file_exists(__DIR__ . '/vendor/autoload.php') ? __DIR__ : dirname(__DIR__);
        require_once $baseDir . '/vendor/autoload.php';
        $app = require_once $baseDir . '/bootstrap/app.php';
        $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
        
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $migrationOutput = \Illuminate\Support\Facades\Artisan::output();
        
        \Illuminate\Support\Facades\Artisan::call('config:clear');
        \Illuminate\Support\Facades\Artisan::call('route:clear');
        \Illuminate\Support\Facades\Artisan::call('cache:clear');
        \Illuminate\Support\Facades\Artisan::call('config:cache');
        \Illuminate\Support\Facades\Artisan::call('route:cache');
        \Illuminate\Support\Facades\Artisan::call('view:cache');
    } catch (\Throwable $e) {
        $migrationOutput = 'Migration note: ' . $e->getMessage();
    }

    echo json_encode([
        'status'     => 'success',
        'message'    => 'Deployment package extracted, storage initialized, and migrations executed!',
        'migrations' => $migrationOutput,
    ]);
} else {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Failed to open deploy.zip, error code: ' . $res,
    ]);
}
