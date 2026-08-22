<?php

use App\Http\Controllers\Api\V1\InvoiceAiController;
use Illuminate\Support\Facades\Route;

Route::post('v1/invoice-ai/extract', [InvoiceAiController::class, 'extract'])
    ->middleware('auth:sanctum');
