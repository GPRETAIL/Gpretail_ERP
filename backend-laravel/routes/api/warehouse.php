<?php

use App\Http\Controllers\Api\V1\Warehouse\BarcodeController;
use App\Http\Controllers\Api\V1\Warehouse\DirectPurchaseController;
use App\Http\Controllers\Api\V1\Warehouse\InventoryEntryController;
use App\Http\Controllers\Api\V1\Warehouse\ItemLocatorController;
use App\Http\Controllers\Api\V1\Warehouse\PhysicalStockController;
use App\Http\Controllers\Api\V1\Warehouse\PurchaseInvoiceController;
use App\Http\Controllers\Api\V1\Warehouse\PurchaseReturnController;
use App\Http\Controllers\Api\V1\Warehouse\TransportEntryController;
use App\Http\Controllers\Api\V1\Warehouse\WarehouseReportController;
use Illuminate\Support\Facades\Route;

// Transport entries, purchase invoices, inventory, direct purchases, barcodes, physical stock, purchase returns and warehouse reports.
// Loaded inside the authenticated app-route group in routes/api.php.

// Transport Entries & Logistics
Route::get('transport-entries/next-lr-number', [TransportEntryController::class, 'nextLrNumber']);
Route::get('transport-entries/duplicates', [TransportEntryController::class, 'duplicates']);
Route::post('transport-entries/{id}/attachments', [TransportEntryController::class, 'storeAttachment']);
Route::delete('transport-entries/attachments/{attId}', [TransportEntryController::class, 'destroyAttachment']);
Route::get('transport-entries/next-issue-number', [TransportEntryController::class, 'nextIssueNumber']);
Route::get('transport-entries/next-receipt-number', [TransportEntryController::class, 'nextReceiptNumber']);
Route::get('transport-entries/grouped', [TransportEntryController::class, 'groupedSummary']);
Route::apiResource('transport-entries', TransportEntryController::class);

// Invoices / Purchase Invoices
Route::get('invoices/grouped', [PurchaseInvoiceController::class, 'groupedSummary']);
Route::apiResource('invoices', PurchaseInvoiceController::class);

// Inventory Entries & Adjustments
Route::get('inventory-entries/grouped', [InventoryEntryController::class, 'groupedSummary']);
Route::apiResource('inventory-entries', InventoryEntryController::class);

// Direct Purchases
Route::post('direct-purchases/bulk', [DirectPurchaseController::class, 'bulk']);
Route::post('purchase-entry/bulk', [DirectPurchaseController::class, 'bulk']);
Route::get('direct-purchases/grouped', [DirectPurchaseController::class, 'groupedSummary']);
Route::apiResource('direct-purchases', DirectPurchaseController::class);
Route::apiResource('purchase-entry', DirectPurchaseController::class);

// Barcodes
Route::get('barcodes/source-item', [BarcodeController::class, 'sourceItem']);
Route::put('barcodes/source-item', [BarcodeController::class, 'updateSourceItem']);
Route::get('barcodes/physical-stock', [BarcodeController::class, 'physicalStock']);
Route::get('barcodes/item-locator', [BarcodeController::class, 'itemLocator']);
Route::post('barcodes/generate', [BarcodeController::class, 'generate']);
Route::get('barcodes', [BarcodeController::class, 'index']);
Route::post('barcodes', [BarcodeController::class, 'generateSingle']);

// Physical Stock
Route::apiResource('physical-stocks', PhysicalStockController::class);

// Purchase Returns
Route::get('purchase-returns/stock-search', [PurchaseReturnController::class, 'stockSearch']);
Route::get('purchase-returns/grouped', [PurchaseReturnController::class, 'groupedSummary']);
Route::apiResource('purchase-returns', PurchaseReturnController::class);
// Item Locator
Route::get('item-locator', [ItemLocatorController::class, 'index']);

// Warehouse Reports & Stock Analyzer
Route::get('warehouse-reports', [WarehouseReportController::class, 'index']);
Route::get('warehouse-reports/data/{report}', [WarehouseReportController::class, 'report']);
Route::get('warehouse-reports/summary-layouts', [WarehouseReportController::class, 'summaryLayouts']);
Route::get('warehouse-reports/summary/{dataset}', [WarehouseReportController::class, 'summary']);
Route::get('stock-analyzer', [WarehouseReportController::class, 'stockAnalyzer']);
Route::get('stock-pivot', [WarehouseReportController::class, 'stockPivot']);
Route::match(['get', 'post', 'put'], 'warehouse-customisation', [WarehouseReportController::class, 'warehouseCustomization']);
Route::match(['get', 'post', 'put'], 'warehouse-customization', [WarehouseReportController::class, 'warehouseCustomization']);
