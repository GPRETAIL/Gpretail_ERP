<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\InvoiceAiController;

// Invoice AI proxy. Laravel owns auth/store context; the OCR server never accesses MariaDB.
Route::post('/api/v1/invoice-ai/extract', [InvoiceAiController::class, 'extract'])
    ->middleware('auth:sanctum');
Route::post('/api/v1/invoice-ai/process-flow', [InvoiceAiController::class, 'processPurchaseFlow'])
    ->middleware('auth:sanctum');
Route::get('/api/v1/invoice-ai/engine-config', [InvoiceAiController::class, 'getEngineConfig'])
    ->middleware('auth:sanctum');
Route::post('/api/v1/invoice-ai/engine-config', [InvoiceAiController::class, 'saveEngineConfig'])
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
})->where('any', '^(?!api).*$');
