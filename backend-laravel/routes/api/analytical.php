<?php

use App\Http\Controllers\Api\V1\Analytical\ProductPurchaseAnalyticsController;
use Illuminate\Support\Facades\Route;

// Supplier and product purchase analytics.
// Loaded inside the authenticated app-route group in routes/api.php.

// Supplier x Product purchase analytics (Direct Purchases + Purchase Invoices).
Route::get('supplier-product-analytics', [ProductPurchaseAnalyticsController::class, 'supplierProductSummary']);
Route::get('supplier-product-analytics/{productId}/history', [ProductPurchaseAnalyticsController::class, 'productPurchaseHistory']);
