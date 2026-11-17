<?php

use App\Http\Controllers\Api\V1\Crm\CustomerController;
use App\Http\Controllers\Api\V1\Crm\CustomerOrderController;
use App\Http\Controllers\Api\V1\Crm\LoyaltyController;
use Illuminate\Support\Facades\Route;

// Customers, loyalty and customer orders.
// Loaded inside the authenticated app-route group in routes/api.php.

Route::get('customers/dashboard-summary', [CustomerController::class, 'dashboardSummary']);
Route::post('customers/bulk', [CustomerController::class, 'bulk']);
Route::get('customers/{id}/profile', [CustomerController::class, 'profile']);
Route::get('customers/grouped', [CustomerController::class, 'groupedSummary']);

// Loyalty (CRM)
Route::get('loyalty/balances', [LoyaltyController::class, 'balances']);
Route::get('loyalty/transactions', [LoyaltyController::class, 'transactions']);
Route::get('loyalty/settings', [LoyaltyController::class, 'settings']);
Route::put('loyalty/settings', [LoyaltyController::class, 'saveSettings']);
Route::post('loyalty/adjust', [LoyaltyController::class, 'adjust']);
// Customer Orders
Route::post('customer-orders/bulk', [CustomerOrderController::class, 'bulk']);
Route::get('customer-orders/next-order-no', [CustomerOrderController::class, 'nextOrderNo']);
Route::post('customer-orders/customer-quick-create', [CustomerOrderController::class, 'customerQuickCreate']);
Route::get('customer-orders/customer-search', [CustomerOrderController::class, 'customerSearch']);
Route::get('customer-orders/stock-availability', [CustomerOrderController::class, 'stockAvailability']);
Route::get('customer-orders/stock-products', [CustomerOrderController::class, 'stockProducts']);
Route::get('customer-orders/grouped', [CustomerOrderController::class, 'groupedSummary']);
Route::apiResource('customer-orders', CustomerOrderController::class);
Route::apiResource('customers', CustomerController::class);
Route::apiResource('customer', CustomerController::class);
