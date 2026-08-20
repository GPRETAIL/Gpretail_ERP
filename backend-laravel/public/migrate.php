<?php

/**
 * Public Direct Migration Runner
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

    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    $migrateOutput = \Illuminate\Support\Facades\Artisan::output();

    \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
    $seedOutput = \Illuminate\Support\Facades\Artisan::output();

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
