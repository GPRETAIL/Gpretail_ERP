<?php

use App\Http\Controllers\Api\V1\InvoiceAiController;
use Illuminate\Support\Facades\Route;

Route::post('v1/invoice-ai/extract', [InvoiceAiController::class, 'extract'])
    ->middleware('auth:sanctum');

Route::post('v1/invoice-ai/process-flow', [InvoiceAiController::class, 'processPurchaseFlow'])
    ->middleware('auth:sanctum');

Route::get('v1/invoice-ai/engine-config', [InvoiceAiController::class, 'getEngineConfig'])
    ->middleware('auth:sanctum');

Route::post('v1/invoice-ai/engine-config', [InvoiceAiController::class, 'saveEngineConfig'])
    ->middleware('auth:sanctum');

