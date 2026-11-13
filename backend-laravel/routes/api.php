<?php

use App\Http\Controllers\Api\V1\Platform\ActivationController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Settings\SettingsController;
use App\Http\Controllers\Api\V1\Platform\SyncController;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Complete Unified Laravel 13 Backend
|--------------------------------------------------------------------------
|
| Converted from Java Spring Boot Microservices to Unified Laravel 13 API.
| All routes match the React MUI frontend contracts.
|
*/

// Public: whether the server cron is running (running | stale | never), checkable without signing in or
// server access. Reveals no timestamps or configuration.
Route::get('health', function () {
    $last = Cache::get('ops:scheduler-heartbeat');
    $scheduler = ! is_int($last) ? 'never' : ($last >= now()->timestamp - 180 ? 'running' : 'stale');

    return response()->json(['status' => 'UP', 'background' => ['scheduler' => $scheduler]]);
})->middleware('throttle:60,1');

// 1. Activation & System Gate Routes
Route::prefix('activation')->group(function () {
    Route::get('status', [ActivationController::class, 'status']);
    Route::post('register', [ActivationController::class, 'register'])->middleware('throttle:10,1');
    Route::post('bootstrap-register', [ActivationController::class, 'bootstrapRegister'])->middleware('throttle:10,1');
    Route::post('set-password', [ActivationController::class, 'setPassword'])->middleware('throttle:10,1');
    Route::get('password-setup-check', [ActivationController::class, 'passwordSetupCheck']);
});

// 2. Authentication Routes
Route::prefix('auth')->group(function () {
    Route::get('config', [AuthController::class, 'config'])->middleware('throttle:30,1');
    Route::post('google', [AuthController::class, 'google'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('staff-login', [\App\Http\Controllers\Api\V1\Auth\StaffAuthController::class, 'login'])->middleware('throttle:20,1');
    Route::post('staff-pin', [\App\Http\Controllers\Api\V1\Auth\StaffAuthController::class, 'changePin'])->middleware(['auth:sanctum', 'throttle:10,1']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('counter', [AuthController::class, 'counter'])->middleware('auth:sanctum');
    Route::get('counter', [AuthController::class, 'counters'])->middleware('auth:sanctum');
    Route::post('change-password', [AuthController::class, 'changePassword'])->middleware(['auth:sanctum', 'throttle:10,1']);
});
Route::post('admin-auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::get('local-server-config', [AuthController::class, 'localServerConfig'])->middleware('auth:sanctum');
Route::put('local-server-config', [AuthController::class, 'localServerConfigUpdate'])->middleware('auth:sanctum');
Route::get('local-server-config/runtime', [AuthController::class, 'localServerConfigRuntime'])->middleware('auth:sanctum');
Route::post('local-server-config/connect', [AuthController::class, 'connectToCloud'])->middleware(['auth:sanctum', 'throttle:10,1']);
Route::post('auth/failover-session', [AuthController::class, 'failoverSession'])->middleware(['auth:sanctum', 'throttle:30,1']);
Route::post('auth/failover-session/exchange', [AuthController::class, 'exchangeFailoverSession'])->middleware('throttle:20,1');
Route::match(['get', 'post'], 'local-server-config/test', [SettingsController::class, 'localServerTest'])->middleware(['auth:sanctum', 'throttle:10,1']);
Route::match(['get', 'post'], 'local-server-config/test-cloud', [SettingsController::class, 'cloudServerTest'])->middleware(['auth:sanctum', 'throttle:10,1']);
// Every counter polls this every 5 s; behind the on-prem Vite proxy they can share one address.
Route::get('connector/web-config', [SyncController::class, 'webConfig'])->middleware('throttle:900,1');
Route::post('sync/heartbeat', [SyncController::class, 'heartbeat'])->middleware('throttle:60,1');
Route::get('sync/outbound/next', [SyncController::class, 'outboundNext'])->middleware('throttle:60,1');
Route::post('sync/outbound/ack', [SyncController::class, 'outboundAck'])->middleware('throttle:60,1');
Route::match(['get', 'post'], 'sync/run-cycle', [SyncController::class, 'runCycle'])->middleware('throttle:10,1');
Route::get('sync/catch-up-export', [SyncController::class, 'catchUpExport'])->middleware('throttle:10,1');
// On-prem failover: connect with a cloud admin sign-in, copy users, and sign-ins valid on both servers.
Route::post('sync/register-node', [SyncController::class, 'registerNode'])->middleware('throttle:10,1');
Route::get('sync/users', [SyncController::class, 'users'])->middleware('throttle:30,1');
Route::post('sync/failover-session', [SyncController::class, 'failoverSession'])->middleware('throttle:120,1');
Route::post('sync/session-user', [SyncController::class, 'sessionUser'])->middleware('throttle:60,1');
Route::get('sync/outbound/count', [SyncController::class, 'outboundCount'])->middleware('throttle:60,1');
Route::get('sync/nodes', [SyncController::class, 'nodes'])->middleware('auth:sanctum');
Route::get('sync/outbox', [SyncController::class, 'outboxEvents'])->middleware('auth:sanctum');
Route::post('sync/outbox/{id}/retry', [SyncController::class, 'retryOutboxEvent'])->middleware('auth:sanctum');
Route::post('sync/outbox/retry-all', [SyncController::class, 'retryAllFailed'])->middleware('auth:sanctum');


// Every signed-in app route, grouped by module under routes/api/. The file order matters where
// two routes could match the same URL: the earlier one wins.
$registerAppRoutes = function () {
    require __DIR__.'/api/auth.php';
    require __DIR__.'/api/platform.php';
    require __DIR__.'/api/dashboards.php';
    require __DIR__.'/api/settings.php';
    require __DIR__.'/api/masters.php';
    require __DIR__.'/api/hr.php';
    require __DIR__.'/api/warehouse.php';
    require __DIR__.'/api/store.php';
    require __DIR__.'/api/finance.php';
    require __DIR__.'/api/crm.php';
    require __DIR__.'/api/notifications.php';
    require __DIR__.'/api/sales.php';
    require __DIR__.'/api/analytical.php';
};

// Register directly on /api/...
Route::middleware(['auth:sanctum', 'throttle:signed-in'])->group($registerAppRoutes);

// Register on /api/v1/...
Route::middleware(['auth:sanctum', 'throttle:signed-in'])->prefix('v1')->name('v1.')->group($registerAppRoutes);
