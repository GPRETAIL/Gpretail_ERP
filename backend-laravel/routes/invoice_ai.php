<?php

use App\Http\Controllers\Api\V1\Warehouse\InvoiceAiController;
use App\Http\Controllers\Api\V1\Warehouse\PhoneUploadController;
use Illuminate\Support\Facades\Route;

Route::post('v1/invoice-ai/extract', [InvoiceAiController::class, 'extract'])
    ->middleware('auth:sanctum');

Route::post('v1/invoice-ai/process-flow', [InvoiceAiController::class, 'processPurchaseFlow'])
    ->middleware('auth:sanctum');

Route::get('v1/invoice-ai/product-variants/{productId}', [InvoiceAiController::class, 'productVariants'])
    ->whereNumber('productId')->middleware('auth:sanctum');

// Upload from phone: the page starts a one-time link (QR code), then takes the file the phone sent.
Route::post('v1/invoice-ai/phone-upload', [PhoneUploadController::class, 'start'])->middleware(['auth:sanctum', 'throttle:20,1,phone-upload-start']);
Route::get('v1/invoice-ai/phone-upload/{token}', [PhoneUploadController::class, 'status'])->whereAlphaNumeric('token')->middleware('auth:sanctum');
Route::get('v1/invoice-ai/phone-upload/{token}/file', [PhoneUploadController::class, 'file'])->whereAlphaNumeric('token')->middleware('auth:sanctum');

Route::get('v1/invoice-ai/margins', [InvoiceAiController::class, 'margins'])
    ->middleware('auth:sanctum');

Route::get('v1/invoice-ai/engine-config', [InvoiceAiController::class, 'getEngineConfig'])
    ->middleware('auth:sanctum');

Route::post('v1/invoice-ai/engine-config', [InvoiceAiController::class, 'saveEngineConfig'])
    ->middleware('auth:sanctum');

