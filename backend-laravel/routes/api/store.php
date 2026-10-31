<?php

use App\Http\Controllers\Api\V1\Store\PurchaseOrderController;
use App\Http\Controllers\Api\V1\Store\StockOutwardController;
use Illuminate\Support\Facades\Route;

// Purchase orders and store-to-store transfers.
// Loaded inside the authenticated app-route group in routes/api.php.

// Stock Outwards (Inter-store Transfers)
Route::get('purchase-orders/suggestions', [PurchaseOrderController::class, 'suggestions']);
Route::post('purchase-orders/generate', [PurchaseOrderController::class, 'generate']);
Route::post('purchase-orders/{id}/approve', [PurchaseOrderController::class, 'approve']);
Route::post('purchase-orders/{id}/cancel', [PurchaseOrderController::class, 'cancel']);
Route::post('purchase-orders/{id}/close', [PurchaseOrderController::class, 'close']);
Route::apiResource('purchase-orders', PurchaseOrderController::class);
Route::get('stock-outwards/destinations', [StockOutwardController::class, 'destinations']);
Route::post('stock-outwards/{id}/receive', [StockOutwardController::class, 'receive']);
Route::post('stock-outwards/{id}/cancel', [StockOutwardController::class, 'cancel']);
Route::apiResource('stock-outwards', StockOutwardController::class);
