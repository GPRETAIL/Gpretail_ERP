<?php

use App\Http\Controllers\Api\V1\Dashboards\AnalyticalDashboardController;
use App\Http\Controllers\Api\V1\Dashboards\CrmDashboardController;
use App\Http\Controllers\Api\V1\Dashboards\DashboardController;
use App\Http\Controllers\Api\V1\Dashboards\DashboardLayoutController;
use App\Http\Controllers\Api\V1\Dashboards\FinanceDashboardController;
use App\Http\Controllers\Api\V1\Dashboards\MastersDashboardController;
use App\Http\Controllers\Api\V1\Dashboards\SalesDashboardController;
use App\Http\Controllers\Api\V1\Dashboards\SettingsDashboardController;
use App\Http\Controllers\Api\V1\Dashboards\StoreDashboardController;
use App\Http\Controllers\Api\V1\Dashboards\WarehouseDashboardController;
use Illuminate\Support\Facades\Route;

// Main dashboard and the per-module dashboard tabs.
// Loaded inside the authenticated app-route group in routes/api.php.

// Dashboard Sub-endpoints
Route::get('dashboard/overview', [DashboardController::class, 'overview']);
Route::get('dashboard/warehouse', [DashboardController::class, 'warehouse']);
Route::get('dashboard/summary', [DashboardController::class, 'summary']);
Route::get('dashboard/attention-summary', [DashboardController::class, 'attentionSummary']);
Route::get('dashboard/layout', [DashboardLayoutController::class, 'index']);
Route::put('dashboard/layout/{tabKey}', [DashboardLayoutController::class, 'update']);
Route::delete('dashboard/layout/{tabKey}', [DashboardLayoutController::class, 'reset']);
Route::get('dashboard', [DashboardController::class, 'index']);
// Warehouse Dashboard & Operations Command Center
Route::get('warehouse/dashboard/export', [WarehouseDashboardController::class, 'export']);
Route::get('warehouse/dashboard/inventory', [WarehouseDashboardController::class, 'inventory']);
Route::get('warehouse/dashboard/incoming', [WarehouseDashboardController::class, 'incoming']);
Route::get('warehouse/dashboard/outgoing', [WarehouseDashboardController::class, 'outgoing']);
Route::get('warehouse/dashboard/alerts', [WarehouseDashboardController::class, 'alerts']);
Route::get('warehouse/dashboard/activity', [WarehouseDashboardController::class, 'activity']);
Route::get('warehouse/dashboard', [WarehouseDashboardController::class, 'index']);

// Sales Dashboard (main Dashboard's Sales tab)
Route::get('sales/dashboard/export', [SalesDashboardController::class, 'export']);
Route::get('sales/dashboard', [SalesDashboardController::class, 'index']);

// Finance Dashboard (main Dashboard's Finance tab)
Route::get('finance/dashboard', [FinanceDashboardController::class, 'index']);
// Store Dashboard (main Dashboard's Store tab -- cross-store comparison)
Route::get('store/dashboard', [StoreDashboardController::class, 'index']);

// Masters Dashboard (main Dashboard's Masters tab)
Route::get('masters/dashboard', [MastersDashboardController::class, 'index']);

// Settings Dashboard (main Dashboard's Settings tab)
Route::get('settings/dashboard', [SettingsDashboardController::class, 'index']);

// Analytical Dashboard (main Dashboard's Analytical tab)
Route::get('analytical/dashboard', [AnalyticalDashboardController::class, 'index']);

// Customer & Supplier Dashboard Summaries
Route::get('crm/dashboard/export', [CrmDashboardController::class, 'export']);
Route::get('crm/dashboard', [CrmDashboardController::class, 'index']);
