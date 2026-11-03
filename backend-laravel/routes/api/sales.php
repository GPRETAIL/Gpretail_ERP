<?php

use App\Http\Controllers\Api\V1\Sales\ApprovalController;
use App\Http\Controllers\Api\V1\Sales\CashRegisterController;
use App\Http\Controllers\Api\V1\Sales\DealerInvoiceController;
use App\Http\Controllers\Api\V1\Sales\PosOfflineController;
use App\Http\Controllers\Api\V1\Sales\PosReturnController;
use App\Http\Controllers\Api\V1\Sales\PosSaleController;
use App\Http\Controllers\Api\V1\Sales\SalesApprovalController;
use App\Http\Controllers\Api\V1\Sales\SalesReportController;
use App\Http\Controllers\Api\V1\Sales\SettlementController;
use Illuminate\Support\Facades\Route;

// POS sales and returns, approvals, dealer invoices, cash register, settlements and sales reports.
// Loaded inside the authenticated app-route group in routes/api.php.

// POS Special Endpoints (Must be registered before apiResource)
Route::get('pos-sales/next-bill-no', [PosSaleController::class, 'nextBillNo']);
// Offline billing: what a till downloads to keep billing without internet, and the manager's check list.
Route::get('pos-sales/offline/series', [PosOfflineController::class, 'series']);
Route::get('pos-sales/offline/catalog', [PosOfflineController::class, 'catalog']);
Route::get('pos-sales/offline/review', [PosOfflineController::class, 'review']);
Route::post('pos-sales/offline/review/{id}', [PosOfflineController::class, 'markReviewed'])->whereNumber('id');
Route::get('pos-sales/latest-document', [PosSaleController::class, 'latestDocument']);
Route::get('pos-sale/next-bill-no', [PosSaleController::class, 'nextBillNo']);
Route::get('pos-sales/salesman-lookup', [PosSaleController::class, 'salesmanLookup']);
Route::get('pos-sales/summary-report', [PosSaleController::class, 'summaryReport']);
Route::get('pos-sales/stock-products', [PosSaleController::class, 'stockProducts']);
Route::get('pos-sales/barcode-lookup', [PosSaleController::class, 'barcodes']);
Route::get('pos-sales/stock-rules', [PosSaleController::class, 'stockRules']);
Route::get('pos-sales/grouped', [PosSaleController::class, 'groupedSummary']);
Route::get('touch-sales/next-bill-no', [PosSaleController::class, 'touchSalesNextBillNo']);
Route::get('touch-sales', [PosSaleController::class, 'touchSales']);
Route::get('pos-old-sales/last-receipt', [PosSaleController::class, 'lastReceipt']);
Route::get('pos-old-sales/lookup-sale', [PosSaleController::class, 'lookupSale']);
Route::get('pos-old-sales/session-summary', [PosSaleController::class, 'sessionSummary']);
Route::get('pos-old-sales/next-bill-no', [PosSaleController::class, 'nextBillNo']);
Route::get('pos-old-sales/grouped', [PosSaleController::class, 'oldSalesGroupedSummary']);
Route::get('pos-old-sales', [PosSaleController::class, 'posOldSales']);
Route::post('pos-old-sales', [PosSaleController::class, 'storeLegacy']);

// POS Returns
Route::get('pos-returns/next-return-no', [PosReturnController::class, 'nextReturnNo']);
Route::get('pos-returns/source-bill', [PosReturnController::class, 'sourceBill']);
Route::get('pos-returns/source-by-barcode', [PosReturnController::class, 'sourceByBarcode']);
Route::get('pos-returns/return-product-barcode', [PosReturnController::class, 'returnProductBarcode']);
Route::get('pos-returns/credit-return', [PosReturnController::class, 'lookupCredit']);
Route::get('pos-returns/grouped', [PosReturnController::class, 'groupedSummary']);
Route::get('pos-returns', [PosReturnController::class, 'index']);
Route::post('pos-returns', [PosReturnController::class, 'store']);
Route::get('pos-returns/{id}', [PosReturnController::class, 'show']);

// Sales on Approval
// POS discount / refund approvals (see ApprovalService).
Route::get('approvals/limits', [ApprovalController::class, 'limits']);
Route::put('approvals/limits', [ApprovalController::class, 'updateLimits']);
Route::get('approvals/my-limit', [ApprovalController::class, 'myLimit']);
Route::put('approvals/pin', [ApprovalController::class, 'setPin'])->middleware('throttle:10,1');
Route::post('approvals/requests', [ApprovalController::class, 'requestApproval'])->middleware('throttle:30,1');
Route::post('approvals/pin-approve', [ApprovalController::class, 'pinApprove'])->middleware('throttle:10,1');
Route::get('approvals/requests/{id}', [ApprovalController::class, 'status'])->whereNumber('id');
Route::post('approvals/requests/{id}/withdraw', [ApprovalController::class, 'withdraw'])->whereNumber('id');
Route::get('approvals/inbox', [ApprovalController::class, 'inbox']);
Route::get('approvals/pending-count', [ApprovalController::class, 'pendingCount']);
Route::post('approvals/requests/{id}/approve', [ApprovalController::class, 'approve'])->whereNumber('id');
Route::post('approvals/requests/{id}/reject', [ApprovalController::class, 'reject'])->whereNumber('id');
Route::get('sales-on-approval/next-approval-no', [SalesApprovalController::class, 'nextApprovalNo']);
Route::get('sales-on-approval/pending-count', [SalesApprovalController::class, 'pendingCount']);
Route::post('sales-on-approval/{id}/accept', [SalesApprovalController::class, 'accept']);
Route::post('sales-on-approval/{id}/reject', [SalesApprovalController::class, 'reject']);
Route::post('sales-on-approval/{id}/bill', [SalesApprovalController::class, 'bill']);
Route::get('sales-on-approval/grouped', [SalesApprovalController::class, 'groupedSummary']);
Route::apiResource('sales-on-approval', SalesApprovalController::class)->only(['index', 'store', 'show']);

// Dealer Invoices
Route::get('dealer-invoices/next-bill-no', [DealerInvoiceController::class, 'nextBillNo']);
Route::get('dealer-invoice-returns/next-return-no', [DealerInvoiceController::class, 'nextReturnNo']);
Route::get('dealer-invoice-returns/grouped', [DealerInvoiceController::class, 'returnsGroupedSummary']);
Route::get('dealer-invoice-returns', [DealerInvoiceController::class, 'returnsIndex']);
Route::post('dealer-invoice-returns', [DealerInvoiceController::class, 'returnsStore']);
Route::get('dealer-invoices/grouped', [DealerInvoiceController::class, 'groupedSummary']);
// No update: an invoice is cancelled (DELETE restores its stock) and re-entered, never edited in place.
Route::apiResource('dealer-invoices', DealerInvoiceController::class)->only(['index', 'store', 'show', 'destroy']);

// Cash Register Sessions
Route::get('cash-openings/meta', [CashRegisterController::class, 'openingMeta']);
Route::get('cash-openings', [CashRegisterController::class, 'openingIndex']);
Route::post('cash-openings', [CashRegisterController::class, 'openingStore']);
Route::get('cash-closings/meta', [CashRegisterController::class, 'closingMeta']);
Route::get('cash-closings/next-bill-no', [CashRegisterController::class, 'closingNextBillNo']);
Route::get('cash-closings/opening-amount', [CashRegisterController::class, 'openingAmount']);
Route::get('cash-closings', [CashRegisterController::class, 'closingIndex']);
Route::post('cash-closings', [CashRegisterController::class, 'closingStore']);

// Settlements
Route::get('settlements/next-settlement-number', [SettlementController::class, 'nextSettlementNumber']);
Route::get('settlements/unpaid-bills', [SettlementController::class, 'unpaidBills']);
Route::get('settlements/bill/{billNo}', [SettlementController::class, 'getBill']);
Route::get('settlements', [SettlementController::class, 'index']);
Route::post('settlements', [SettlementController::class, 'store']);
Route::get('settlements/{id}', [SettlementController::class, 'getBill']);

// Sales Reports & Analytics
Route::get('sales-reports', [SalesReportController::class, 'index']);
Route::get('sales-reports/store/{report}', [SalesReportController::class, 'storeReport']);
Route::get('sales-reports/summary-layouts', [SalesReportController::class, 'summaryLayouts']);
Route::get('sales-reports/summary/{dataset}', [SalesReportController::class, 'summary']);
Route::get('sales-comparer', [SalesReportController::class, 'salesComparer']);
Route::get('sales-vs-purchase', [SalesReportController::class, 'salesVsPurchase']);
Route::get('sales-vs-stock', [SalesReportController::class, 'salesVsStock']);
Route::get('sales-pivot', [SalesReportController::class, 'salesPivot']);
// POS & Sales
Route::apiResource('pos-sales', PosSaleController::class);
Route::apiResource('pos-sale', PosSaleController::class);
