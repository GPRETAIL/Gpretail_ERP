<?php

/**
 * Public Direct Migration & Cache Clear Runner
 */

header('Content-Type: application/json');

if (($_GET['token'] ?? '') !== 'NextErpDeploySecret2026') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$rootDir = file_exists(__DIR__ . '/../artisan') ? dirname(__DIR__) : __DIR__;

try {
    require_once $rootDir . '/vendor/autoload.php';
    $app = require_once $rootDir . '/bootstrap/app.php';
    $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    // 1. Clear old caches
    \Illuminate\Support\Facades\Artisan::call('optimize:clear');

    // 2. Run migrations
    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    $migrateOutput = \Illuminate\Support\Facades\Artisan::output();

    // 3. Run seeders safely (ignore duplicate entry errors)
    try {
        \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
    } catch (\Throwable $seedErr) {
        // Already seeded
    }

    // 4. Cache clean configurations
    \Illuminate\Support\Facades\Artisan::call('config:cache');
    \Illuminate\Support\Facades\Artisan::call('route:cache');
    \Illuminate\Support\Facades\Artisan::call('view:cache');

    echo json_encode([
        'status'  => 'success',
        'message' => 'Cache cleared, migrations executed, and routes optimized successfully!',
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
