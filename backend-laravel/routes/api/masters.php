<?php

use App\Http\Controllers\Api\V1\Hr\EmployeeController;
use App\Http\Controllers\Api\V1\Masters\AgentController;
use App\Http\Controllers\Api\V1\Masters\BrandController;
use App\Http\Controllers\Api\V1\Masters\CategoryController;
use App\Http\Controllers\Api\V1\Masters\ConfigurationController;
use App\Http\Controllers\Api\V1\Masters\ItemController;
use App\Http\Controllers\Api\V1\Masters\LookupController;
use App\Http\Controllers\Api\V1\Masters\ProductAttributeController;
use App\Http\Controllers\Api\V1\Masters\ProductController;
use App\Http\Controllers\Api\V1\Masters\SizeController;
use App\Http\Controllers\Api\V1\Masters\SupplierController;
use App\Http\Controllers\Api\V1\Masters\TaxController;
use App\Http\Controllers\Api\V1\Masters\TransportController;
use Illuminate\Support\Facades\Route;

// Lookups, configurations, attributes, sizes, items, products and the other masters.
// Loaded inside the authenticated app-route group in routes/api.php.

// Consolidated Batch Master Lookups
Route::get('lookups', [LookupController::class, 'index']);
// Configurations & Counters
// Keep each resource's controller identity so module/action authorization also applies to imports.
foreach (['brands' => BrandController::class, 'items' => ItemController::class,
    'products' => ProductController::class, 'suppliers' => SupplierController::class,
    'transports' => TransportController::class, 'agents' => AgentController::class,
    'taxes' => TaxController::class, 'employees' => EmployeeController::class,
    'sizes' => SizeController::class, 'size-groups' => SizeController::class] as $resource => $controller) {
    Route::post($resource.'/bulk', [$controller, 'bulkImport'])->defaults('resource', $resource);
}
Route::post('attributes/{type}/bulk', [ProductAttributeController::class, 'bulkImport'])->defaults('resource', 'attributes');
Route::post('configurations/{type}/bulk', [ConfigurationController::class, 'bulkImport'])->defaults('resource', 'configurations');
Route::get('configurations/counter', [ConfigurationController::class, 'getCounters']);
Route::get('configurations/{key}', [ConfigurationController::class, 'show']);
Route::post('configurations/{type}', [ConfigurationController::class, 'storeType']);
Route::get('configurations/{type}/{id}', [ConfigurationController::class, 'showType'])->where('id', '[0-9]+');
Route::put('configurations/{type}/{id}', [ConfigurationController::class, 'updateType']);
Route::delete('configurations/{type}/{id}', [ConfigurationController::class, 'destroyType']);
Route::get('configurations', [ConfigurationController::class, 'index']);
Route::post('configurations', [ConfigurationController::class, 'store']);

// Attributes (divisions, fits, sleeves, colors, types, etc.)
Route::get('attributes/{type}/{id}', [ProductAttributeController::class, 'showByType']);
Route::get('attributes/{type}', [ProductAttributeController::class, 'indexByType']);
Route::post('attributes/{type}', [ProductAttributeController::class, 'storeByType']);
Route::put('attributes/{type}/{id}', [ProductAttributeController::class, 'updateByType']);
Route::delete('attributes/{type}/{id}', [ProductAttributeController::class, 'destroyByType']);

// Sizes & Size Groups
Route::get('size-groups/{id}', [SizeController::class, 'groupsShow']);
Route::get('size-groups', [SizeController::class, 'groupsIndex']);
Route::post('size-groups', [SizeController::class, 'groupsStore']);
Route::put('size-groups/{id}', [SizeController::class, 'groupsUpdate']);
Route::delete('size-groups/{id}', [SizeController::class, 'groupsDestroy']);
Route::apiResource('sizes', SizeController::class);
// Items (Warehouse Dashboard Summary)
Route::get('items/dashboard-summary', [ItemController::class, 'dashboardSummary']);
Route::get('items/grouped', [ItemController::class, 'groupedSummary']);
Route::apiResource('items', ItemController::class);

// Products Dashboard Summary & Barcode Search
Route::get('products/dashboard-summary', [ProductController::class, 'dashboardSummary']);
Route::get('products/barcode/{barcode}', [ProductController::class, 'findByBarcode']);
Route::get('products/grouped', [ProductController::class, 'groupedSummary']);
Route::apiResource('products', ProductController::class);
Route::apiResource('product', ProductController::class);
// Masters
Route::get('brands/grouped', [BrandController::class, 'groupedSummary']);
Route::apiResource('brand', BrandController::class);
Route::apiResource('brands', BrandController::class);
Route::apiResource('categories', CategoryController::class);
Route::apiResource('category', CategoryController::class);
Route::get('taxes/grouped', [TaxController::class, 'groupedSummary']);
Route::apiResource('tax', TaxController::class);
Route::apiResource('taxes', TaxController::class);
Route::get('suppliers/grouped', [SupplierController::class, 'groupedSummary']);
Route::apiResource('suppliers', SupplierController::class);
Route::apiResource('supplier', SupplierController::class);
Route::get('agents/grouped', [AgentController::class, 'groupedSummary']);
Route::apiResource('agents', AgentController::class);
Route::apiResource('agent', AgentController::class);
Route::get('transports/grouped', [TransportController::class, 'groupedSummary']);
Route::apiResource('transports', TransportController::class);
Route::apiResource('transport', TransportController::class);
