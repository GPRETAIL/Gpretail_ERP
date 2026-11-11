<?php

use App\Http\Controllers\Api\V1\Platform\ClientErrorController;
use App\Http\Controllers\Api\V1\Platform\StoreActivationController;
use Illuminate\Support\Facades\Route;

// Company stores linked from the platform.
// Loaded inside the authenticated app-route group in routes/api.php.

Route::get('company-stores', [StoreActivationController::class, 'index']);
Route::post('company-stores/sync', [StoreActivationController::class, 'sync']);
Route::post('company-stores/activate', [StoreActivationController::class, 'activate'])->middleware('throttle:10,1');

// Front-end crash reports from the error boundaries (any signed-in client).
Route::post('client-errors', [ClientErrorController::class, 'store'])->middleware('throttle:20,1');
