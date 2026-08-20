<?php

use Illuminate\Support\Facades\Route;

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
