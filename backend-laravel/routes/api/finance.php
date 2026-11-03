<?php

use App\Http\Controllers\Api\V1\Finance\AccountingController;
use App\Http\Controllers\Api\V1\Finance\SupplierPaymentController;
use Illuminate\Support\Facades\Route;

// Double-entry books and supplier payments.
// Loaded inside the authenticated app-route group in routes/api.php.

// Double-entry books (Finance): ledgers, hand-entered vouchers and reports for the selected store.
Route::prefix('accounting')->controller(AccountingController::class)->group(function () {
    Route::get('accounts', 'accounts');
    Route::post('accounts', 'storeAccount');
    Route::put('accounts/{id}', 'updateAccount');
    Route::delete('accounts/{id}', 'destroyAccount');
    Route::get('accounts/{id}/ledger', 'ledger');
    Route::get('daybook', 'daybook');
    Route::get('vouchers/{id}', 'voucher');
    Route::post('vouchers', 'storeVoucher');
    Route::put('vouchers/{id}', 'updateVoucher');
    Route::delete('vouchers/{id}', 'destroyVoucher');
    Route::get('trial-balance', 'trialBalance');
    Route::get('profit-loss', 'profitAndLoss');
    Route::get('balance-sheet', 'balanceSheet');
    Route::get('outstanding', 'outstanding');
    Route::get('summary-layouts', 'summaryLayouts');
    Route::get('summary/{dataset}', 'summary');
    Route::post('repost', 'repost');
});
Route::get('supplier-payments/dashboard-summary', [SupplierPaymentController::class, 'dashboardSummary']);
Route::get('supplier-payments/pending', [SupplierPaymentController::class, 'pending']);
Route::get('supplier-payments/pending/{type}/{id}/details', [SupplierPaymentController::class, 'pendingDetails']);
Route::get('supplier-payments/history', [SupplierPaymentController::class, 'history']);
Route::get('supplier-payments', [SupplierPaymentController::class, 'index']);
Route::post('supplier-payments', [SupplierPaymentController::class, 'store']);
