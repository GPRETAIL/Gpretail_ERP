<?php

use App\Http\Controllers\Api\V1\Platform\StoreActivationController;
use App\Http\Controllers\Api\V1\Settings\BackupController;
use App\Http\Controllers\Api\V1\Settings\RemoteSupportController;
use App\Http\Controllers\Api\V1\Settings\SettingsController;
use App\Http\Controllers\Api\V1\Settings\StoreController;
use App\Http\Controllers\Api\V1\Settings\ThemeWorkspaceController;
use App\Http\Controllers\Api\V1\Settings\UserAccessController;
use Illuminate\Support\Facades\Route;

// Companies, themes, backups, printers, user access and remote support.
// Loaded inside the authenticated app-route group in routes/api.php.

Route::match(['get', 'put'], 'user-access/{id}/client-access', [UserAccessController::class, 'clientAccess']);
// Companies & Subscriptions
Route::get('companies/subscription/status', [StoreController::class, 'subscriptionStatus']);
Route::post('companies/subscription/notices/{id}/dismiss', [StoreController::class, 'subscriptionStatus']);
Route::get('companies/tenant-sync/overview', [StoreActivationController::class, 'overview']);
Route::post('companies/tenant-sync/pull', [StoreActivationController::class, 'sync']);
foreach (['tenant' => '', 'companies/{id}' => 'store'] as $prefix => $scope) {
    Route::get($prefix.'/theme-history', [ThemeWorkspaceController::class, 'history']);
    Route::delete($prefix.'/theme-history', [ThemeWorkspaceController::class, 'removeHistory']);
    Route::delete($prefix.'/theme-history/{revisionId}', [ThemeWorkspaceController::class, 'removeHistory']);
    Route::post($prefix.'/theme-history/{revisionId}/restore', [ThemeWorkspaceController::class, 'restore']);
}
Route::get('tenant/theme', [ThemeWorkspaceController::class, 'index']);
Route::put('tenant/theme', [ThemeWorkspaceController::class, 'update']);
Route::get('tenant/theme-presets', [ThemeWorkspaceController::class, 'presets']);
Route::post('tenant/theme-presets', [ThemeWorkspaceController::class, 'savePreset']);
Route::post('tenant/theme-presets/{presetId}/apply', [ThemeWorkspaceController::class, 'applyPreset']);
Route::delete('tenant/theme-presets/{presetId}', [ThemeWorkspaceController::class, 'deletePreset']);
Route::get('companies/{id}/theme', [SettingsController::class, 'getTheme']);
Route::put('companies/{id}/theme', [SettingsController::class, 'updateTheme']);
Route::get('companies/{id}/theme-presets', [SettingsController::class, 'listThemePresets']);
Route::post('companies/{id}/theme-presets', [SettingsController::class, 'saveThemePreset']);
Route::post('companies/{id}/theme-presets/{presetId}/apply', [SettingsController::class, 'applyThemePreset']);
Route::delete('companies/{id}/theme-presets/{presetId}', [SettingsController::class, 'deleteThemePreset']);
Route::post('companies/{id}/force-logout', [UserAccessController::class, 'forceLogout']);
Route::get('companies/{id}', [StoreController::class, 'show']);
Route::put('companies/{id}', [StoreController::class, 'update']);
Route::delete('companies/{id}', [StoreController::class, 'destroy']);
Route::post('companies', [StoreController::class, 'store']);
Route::get('companies', [StoreController::class, 'index']);
Route::get('admin/monitoring/companies', [StoreController::class, 'index']);
Route::post('admin/notify', [SettingsController::class, 'notify']);

// Backups - real synchronous local-storage backup/restore engine
Route::get('backups/overview', [BackupController::class, 'overview']);
Route::match(['get', 'post', 'put'], 'backups/settings', [BackupController::class, 'settings']);
Route::post('backups/cloud-test', [BackupController::class, 'cloudTest']);
// Cron pinger auth (X-Backup-Cron-Token), not a user session - must stay
// outside the closure's blanket auth:sanctum wrap below.
Route::match(['get', 'post'], 'backups/scheduled-run', [BackupController::class, 'scheduledRun'])
    ->withoutMiddleware('auth:sanctum');
Route::post('backups/import', [BackupController::class, 'import']);
Route::get('backups/{id}/download', [BackupController::class, 'download']);
Route::get('backups/{id}/logs', [BackupController::class, 'logs']);
Route::post('backups/{id}/restore', [BackupController::class, 'restore']);
Route::delete('backups/{id}', [BackupController::class, 'destroy']);
Route::post('backups', [BackupController::class, 'store']);

// Printer Configurations & Local Printer Service
Route::get('printer-configs/resolve', [SettingsController::class, 'printerConfigsResolve']);
Route::get('local-printer-service/meta', [SettingsController::class, 'localPrinterMeta']);
Route::get('local-printer-service/installer', [SettingsController::class, 'localPrinterInstaller']);
Route::match(['get', 'post', 'put'], 'sales-customization', [SettingsController::class, 'salesCustomization']);
Route::match(['get', 'post', 'put'], 'sales-customisation', [SettingsController::class, 'salesCustomization']);
// User Access Management & Preferences
Route::get('user-access/groups', [UserAccessController::class, 'groupsIndex']);
Route::post('user-access/groups', [UserAccessController::class, 'groupsStore']);
Route::put('user-access/groups/{id}', [UserAccessController::class, 'groupsUpdate']);
Route::delete('user-access/groups/{id}', [UserAccessController::class, 'groupsDestroy']);
Route::get('user-access/store-groups', [UserAccessController::class, 'storeGroupsIndex']);
Route::post('user-access/store-groups', [UserAccessController::class, 'storeGroupsStore']);
Route::put('user-access/store-groups/{id}', [UserAccessController::class, 'storeGroupsUpdate']);
Route::delete('user-access/store-groups/{id}', [UserAccessController::class, 'storeGroupsDestroy']);
Route::post('user-access/{id}/force-logout', [UserAccessController::class, 'forceLogout']);
Route::get('user-access', [UserAccessController::class, 'index']);
Route::post('user-access', [UserAccessController::class, 'store']);
Route::get('user-access/{id}', [UserAccessController::class, 'show']);
Route::put('user-access/{id}', [UserAccessController::class, 'update']);
Route::delete('user-access/{id}', [UserAccessController::class, 'destroy']);
Route::get('user-table-preferences/{tableKey}', [UserAccessController::class, 'getTablePreferences']);
Route::put('user-table-preferences/{tableKey}', [UserAccessController::class, 'updateTablePreferences']);

// Remote Support (RustDesk)
Route::prefix('remote-support')->group(function () {
    Route::get('config', [RemoteSupportController::class, 'config']);
    Route::post('request', [RemoteSupportController::class, 'requestSession']);
    Route::get('active', [RemoteSupportController::class, 'activeSession']);
    Route::post('{id}/cancel', [RemoteSupportController::class, 'cancelSession']);
    Route::get('sessions', [RemoteSupportController::class, 'index']);
    Route::post('{id}/end', [RemoteSupportController::class, 'endSession']);
});
