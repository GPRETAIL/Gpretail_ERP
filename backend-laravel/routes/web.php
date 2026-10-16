<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\InvoiceAiController;

// System migration and cache helper for Hostinger deployments
Route::get('/run-migrations', function () {
    try {
        Artisan::call('migrate', ['--force' => true]);
        $output = Artisan::output();
        Artisan::call('config:cache');
        Artisan::call('route:cache');
        return response()->json([
            'status'  => 'success',
            'message' => 'Migrations and caches completed successfully!',
            'output'  => $output,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status'  => 'error',
            'message' => $e->getMessage(),
            'file'    => $e->getFile() . ':' . $e->getLine(),
        ], 500);
    }
});

// Invoice AI proxy. Laravel owns auth/store context; the OCR server never accesses MariaDB.
Route::post('/api/v1/invoice-ai/extract', [InvoiceAiController::class, 'extract'])
    ->middleware('auth:sanctum');
Route::post('/api/v1/invoice-ai/process-flow', [InvoiceAiController::class, 'processPurchaseFlow'])
    ->middleware('auth:sanctum');
Route::get('/api/v1/invoice-ai/engine-config', [InvoiceAiController::class, 'getEngineConfig'])
    ->middleware('auth:sanctum');
Route::post('/api/v1/invoice-ai/engine-config', [InvoiceAiController::class, 'saveEngineConfig'])
    ->middleware('auth:sanctum');


// System wipe & fresh seed helper for Hostinger deployments (dev.gpsoftware.in)
Route::match(['get', 'post'], '/maintenance-wipe-fresh-db', function (\Illuminate\Http\Request $request) {
    $secret = (string) $request->input('secret', $request->bearerToken());
    $expectedSecret = (string) (env('MAINTENANCE_WIPE_TOKEN') ?: env('BACKUP_CRON_SECRET', '288ad5bf18b5011dc1d32ec0a94a040d50ec2c81ce0b514e'));
    $confirm = (string) $request->input('confirm');

    if (empty($secret) || !hash_equals($expectedSecret, $secret)) {
        return response()->json([
            'status'  => 'error',
            'message' => 'Unauthorized: Invalid or missing secret parameter.',
        ], 403);
    }

    if ($confirm !== 'WIPE_DEV_DATABASE_CONFIRM') {
        return response()->json([
            'status'  => 'pending_confirmation',
            'message' => 'Safety check: To wipe and freshly seed the database, provide confirm=WIPE_DEV_DATABASE_CONFIRM.',
        ], 400);
    }

    try {
        Artisan::call('migrate:fresh', [
            '--force' => true,
            '--seed'  => true,
        ]);
        $output = Artisan::output();
        Artisan::call('optimize:clear');
        Artisan::call('config:cache');
        Artisan::call('route:cache');
        Artisan::call('view:cache');

        return response()->json([
            'status'           => 'success',
            'message'          => 'Database successfully wiped and seeded fresh!',
            'migration_output' => $output,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status'  => 'error',
            'message' => $e->getMessage(),
            'file'    => $e->getFile() . ':' . $e->getLine(),
        ], 500);
    }
});

// Serve React SPA index.html for all frontend web routes
Route::get('/{any?}', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return response()->json([
        'status'  => 'healthy',
        'service' => 'Next ERP SaaS API',
        'version' => '13.26.1',
        'php'     => PHP_VERSION,
    ]);
})->where('any', '^(?!api|run-migrations|maintenance-wipe-fresh-db).*$');
