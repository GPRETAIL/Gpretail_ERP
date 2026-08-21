<?php

/**
 * Standalone direct migration & cache runner for Hostinger
 */

header('Content-Type: application/json');

if (($_GET['token'] ?? '') !== 'NextErpDeploySecret2026') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

try {
    $baseDir = file_exists(__DIR__ . '/vendor/autoload.php') ? __DIR__ : dirname(__DIR__);
    require_once $baseDir . '/vendor/autoload.php';
    $app = require_once $baseDir . '/bootstrap/app.php';
    $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    $migrateOutput = \Illuminate\Support\Facades\Artisan::output();

    \Illuminate\Support\Facades\Artisan::call('config:clear');
    \Illuminate\Support\Facades\Artisan::call('route:clear');
    \Illuminate\Support\Facades\Artisan::call('cache:clear');
    \Illuminate\Support\Facades\Artisan::call('config:cache');
    \Illuminate\Support\Facades\Artisan::call('route:cache');
    \Illuminate\Support\Facades\Artisan::call('view:cache');

    echo json_encode([
        'status'  => 'success',
        'message' => 'Migrations and caches completed successfully!',
        'output'  => $migrateOutput,
    ]);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => $e->getMessage(),
        'file'    => $e->getFile() . ':' . $e->getLine(),
    ]);
}
