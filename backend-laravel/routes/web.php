<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'healthy',
        'service' => 'Next ERP SaaS API',
        'version' => '13.26.1',
        'php' => PHP_VERSION,
    ]);
});
