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
})->where('any', '^(?!api|run-migrations).*$');
