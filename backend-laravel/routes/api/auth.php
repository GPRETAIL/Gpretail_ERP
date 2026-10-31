<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\MobileAccessController;
use Illuminate\Support\Facades\Route;

// Signed-in identity and mobile access.
// Loaded inside the authenticated app-route group in routes/api.php.

Route::get('mobile/access', [MobileAccessController::class, 'status']);
// Identity & Profile
Route::get('me', [AuthController::class, 'me'])->middleware('auth:sanctum');
