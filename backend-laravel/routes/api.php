<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ActivationController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\TaxController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\AgentController;
use App\Http\Controllers\Api\V1\TransportController;
use App\Http\Controllers\Api\V1\ProductAttributeController;
use App\Http\Controllers\Api\V1\SizeController;
use App\Http\Controllers\Api\V1\HrConfigurationController;
use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\LoyaltyController;
use App\Http\Controllers\Api\V1\PosSaleController;
use App\Http\Controllers\Api\V1\PosReturnController;
use App\Http\Controllers\Api\V1\SalesApprovalController;
use App\Http\Controllers\Api\V1\DealerInvoiceController;
use App\Http\Controllers\Api\V1\CashRegisterController;
use App\Http\Controllers\Api\V1\SettlementController;
use App\Http\Controllers\Api\V1\CustomerOrderController;
use App\Http\Controllers\Api\V1\DirectPurchaseController;
use App\Http\Controllers\Api\V1\PurchaseInvoiceController;
use App\Http\Controllers\Api\V1\InventoryEntryController;
use App\Http\Controllers\Api\V1\BarcodeController;
use App\Http\Controllers\Api\V1\PhysicalStockController;
use App\Http\Controllers\Api\V1\PurchaseReturnController;
use App\Http\Controllers\Api\V1\StockOutwardController;
use App\Http\Controllers\Api\V1\TransportEntryController;
use App\Http\Controllers\Api\V1\ItemLocatorController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\ConfigurationController;
use App\Http\Controllers\Api\V1\SupplierPaymentController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ItemController;
use App\Http\Controllers\Api\V1\SalesReportController;
use App\Http\Controllers\Api\V1\WarehouseDashboardController;
use App\Http\Controllers\Api\V1\CrmDashboardController;
use App\Http\Controllers\Api\V1\WarehouseReportController;
use App\Http\Controllers\Api\V1\UserAccessController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\LookupController;

/*
|--------------------------------------------------------------------------
| API Routes - Complete Unified Laravel 13 Backend
|--------------------------------------------------------------------------
|
| Converted from Java Spring Boot Microservices to Unified Laravel 13 API.
| All routes match the React MUI frontend contracts.
|
*/

// 1. Activation & System Gate Routes
Route::prefix('activation')->group(function () {
    Route::get('status', [ActivationController::class, 'status']);
    Route::post('register', [ActivationController::class, 'register']);
    Route::post('set-password', [ActivationController::class, 'setPassword']);
    Route::get('password-setup-check', [ActivationController::class, 'passwordSetupCheck']);
});

// 2. Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('me', [AuthController::class, 'me'])->middleware('auth:sanctum');
    Route::post('counter', [AuthController::class, 'counter'])->middleware('auth:sanctum');
    Route::get('counter', [ConfigurationController::class, 'getCounters']);
    Route::post('change-password', [AuthController::class, 'login']);
});
Route::post('admin-auth/login', [AuthController::class, 'login']);
Route::get('local-server-config', [AuthController::class, 'localServerConfig']);
Route::get('local-server-config/test', [SettingsController::class, 'localServerTest']);

// Helper function to define all application API routes
$registerAppRoutes = function () {
    // Identity & Profile
    Route::get('me', [AuthController::class, 'me'])->middleware('auth:sanctum');

    // Consolidated Batch Master Lookups
    Route::get('lookups', [LookupController::class, 'index']);

    // Dashboard Sub-endpoints
    Route::get('dashboard/overview', [DashboardController::class, 'overview']);
    Route::get('dashboard/warehouse', [DashboardController::class, 'warehouse']);
    Route::get('dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('dashboard/analytics', [DashboardController::class, 'analytics']);
    Route::get('dashboard/attention-summary', [DashboardController::class, 'attentionSummary']);
    Route::get('dashboard', [DashboardController::class, 'index']);

    // Companies & Subscriptions
    Route::get('companies/subscription/status', [CompanyController::class, 'subscriptionStatus']);
    Route::post('companies/subscription/notices/{id}/dismiss', [CompanyController::class, 'subscriptionStatus']);
    Route::get('companies/tenant-sync/overview', [CompanyController::class, 'index']);
    Route::post('companies/tenant-sync/pull', [CompanyController::class, 'index']);
    Route::get('companies/{id}/theme', [SettingsController::class, 'getTheme']);
    Route::put('companies/{id}/theme', [SettingsController::class, 'updateTheme']);
    Route::post('companies/{id}/force-logout', [UserAccessController::class, 'forceLogout']);
    Route::get('companies/{id}', [CompanyController::class, 'show']);
    Route::put('companies/{id}', [CompanyController::class, 'update']);
    Route::delete('companies/{id}', [CompanyController::class, 'destroy']);
    Route::post('companies', [CompanyController::class, 'store']);
    Route::get('companies', [CompanyController::class, 'index']);
    Route::get('admin/monitoring/companies', [CompanyController::class, 'index']);
    Route::post('admin/notify', [SettingsController::class, 'notify']);

    // Backups
    Route::get('backups/overview', [SettingsController::class, 'backupsOverview']);
    Route::match(['get', 'post', 'put'], 'backups/settings', [SettingsController::class, 'backupsSettings']);
    Route::post('backups/import', [SettingsController::class, 'backupsStore']);
    Route::post('backups/{id}/restore', [SettingsController::class, 'backupsRestore']);
    Route::delete('backups/{id}', [SettingsController::class, 'backupsDestroy']);
    Route::get('backups', [SettingsController::class, 'backupsIndex']);
    Route::post('backups', [SettingsController::class, 'backupsStore']);

    // Printer Configurations & Local Printer Service
    Route::get('printer-configs/resolve', [SettingsController::class, 'printerConfigsResolve']);
    Route::get('local-printer-service/meta', [SettingsController::class, 'localPrinterMeta']);
    Route::get('local-printer-service/installer', [SettingsController::class, 'localPrinterInstaller']);

    // Configurations & Counters
    Route::get('configurations/counter', [ConfigurationController::class, 'getCounters']);
    Route::get('configurations/{key}', [ConfigurationController::class, 'show']);
    Route::post('configurations/{type}', [ConfigurationController::class, 'storeType']);
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

    // HR Designations, Departments & Sections
    Route::get('hr-designations/{id}', [HrConfigurationController::class, 'designationsShow']);
    Route::put('hr-designations/{id}', [HrConfigurationController::class, 'designationsUpdate']);
    Route::delete('hr-designations/{id}', [HrConfigurationController::class, 'designationsDestroy']);
    Route::get('hr-designations', [HrConfigurationController::class, 'designationsIndex']);
    Route::post('hr-designations', [HrConfigurationController::class, 'designationsStore']);

    Route::get('hr-departments/{id}', [HrConfigurationController::class, 'departmentsShow']);
    Route::put('hr-departments/{id}', [HrConfigurationController::class, 'departmentsUpdate']);
    Route::delete('hr-departments/{id}', [HrConfigurationController::class, 'departmentsDestroy']);
    Route::get('hr-departments', [HrConfigurationController::class, 'departmentsIndex']);
    Route::post('hr-departments', [HrConfigurationController::class, 'departmentsStore']);

    Route::get('hr-sections/{id}', [HrConfigurationController::class, 'departmentsShow']);
    Route::put('hr-sections/{id}', [HrConfigurationController::class, 'departmentsUpdate']);
    Route::delete('hr-sections/{id}', [HrConfigurationController::class, 'departmentsDestroy']);
    Route::get('hr-sections', [HrConfigurationController::class, 'departmentsIndex']);
    Route::post('hr-sections', [HrConfigurationController::class, 'departmentsStore']);

    Route::match(['get', 'post', 'put', 'delete'], 'hr-{type}/{id?}', [HrConfigurationController::class, 'handleType']);

    // Items (Warehouse Dashboard Summary)
    Route::get('items/dashboard-summary', [ItemController::class, 'dashboardSummary']);
    Route::apiResource('items', ItemController::class);

    // Products Dashboard Summary & Barcode Search
    Route::get('products/dashboard-summary', [ProductController::class, 'dashboardSummary']);
    Route::get('products/barcode/{barcode}', [ProductController::class, 'findByBarcode']);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('product', ProductController::class);

    // Employees
    Route::get('employees/dashboard-summary', [EmployeeController::class, 'dashboardSummary']);
    Route::post('employees/{id}/upload', [EmployeeController::class, 'uploadDocument']);
    Route::post('employees/{id}/education-certificate', [EmployeeController::class, 'educationCertificate']);
    Route::apiResource('employees', EmployeeController::class);

    // Attendance
    Route::get('attendance/today', [AttendanceController::class, 'today']);
    Route::post('attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('attendance/check-out', [AttendanceController::class, 'checkOut']);
    Route::post('attendance/mark-leave', [AttendanceController::class, 'markLeave']);
    Route::match(['get', 'post', 'put'], 'attendance/settings', [AttendanceController::class, 'settings']);

    // Transport Entries & Logistics
    Route::get('transport-entries/next-lr-number', [TransportEntryController::class, 'nextLrNumber']);
    Route::get('transport-entries/duplicates', [TransportEntryController::class, 'duplicates']);
    Route::post('transport-entries/{id}/attachments', [TransportEntryController::class, 'storeAttachment']);
    Route::delete('transport-entries/attachments/{attId}', [TransportEntryController::class, 'destroyAttachment']);
    Route::get('transport-entries/next-issue-number', [TransportEntryController::class, 'nextIssueNumber']);
    Route::get('transport-entries/next-receipt-number', [TransportEntryController::class, 'nextReceiptNumber']);
    Route::apiResource('transport-entries', TransportEntryController::class);

    // Invoices / Purchase Invoices
    Route::apiResource('invoices', PurchaseInvoiceController::class);

    // Inventory Entries & Adjustments
    Route::apiResource('inventory-entries', InventoryEntryController::class);

    // Direct Purchases
    Route::post('direct-purchases/bulk', [DirectPurchaseController::class, 'bulk']);
    Route::post('purchase-entry/bulk', [DirectPurchaseController::class, 'bulk']);
    Route::apiResource('direct-purchases', DirectPurchaseController::class);
    Route::apiResource('purchase-entry', DirectPurchaseController::class);

    // Barcodes
    Route::get('barcodes/source-item', [BarcodeController::class, 'sourceItem']);
    Route::put('barcodes/source-item', [BarcodeController::class, 'updateSourceItem']);
    Route::get('barcodes/physical-stock', [BarcodeController::class, 'physicalStock']);
    Route::post('barcodes/generate', [BarcodeController::class, 'generate']);
    Route::get('barcodes', [BarcodeController::class, 'index']);
    Route::post('barcodes', [BarcodeController::class, 'generateSingle']);


    // Physical Stock
    Route::apiResource('physical-stocks', PhysicalStockController::class);

    // Purchase Returns
    Route::get('purchase-returns/stock-search', [PurchaseReturnController::class, 'stockSearch']);
    Route::apiResource('purchase-returns', PurchaseReturnController::class);

    // Stock Outwards (Inter-store Transfers)
    Route::apiResource('stock-outwards', StockOutwardController::class);

    // Item Locator
    Route::get('item-locator', [ItemLocatorController::class, 'index']);

    // Warehouse Reports & Stock Analyzer
    Route::get('warehouse-reports', [WarehouseReportController::class, 'index']);
    Route::get('stock-analyzer', [WarehouseReportController::class, 'stockAnalyzer']);
    Route::match(['get', 'post', 'put'], 'warehouse-customisation', [WarehouseReportController::class, 'warehouseCustomization']);
    Route::match(['get', 'post', 'put'], 'warehouse-customization', [WarehouseReportController::class, 'warehouseCustomization']);

    // Warehouse Dashboard & Operations Command Center
    Route::get('warehouse/dashboard/export', [WarehouseDashboardController::class, 'export']);
    Route::get('warehouse/dashboard/inventory', [WarehouseDashboardController::class, 'inventory']);
    Route::get('warehouse/dashboard/incoming', [WarehouseDashboardController::class, 'incoming']);
    Route::get('warehouse/dashboard/outgoing', [WarehouseDashboardController::class, 'outgoing']);
    Route::get('warehouse/dashboard/alerts', [WarehouseDashboardController::class, 'alerts']);
    Route::get('warehouse/dashboard/activity', [WarehouseDashboardController::class, 'activity']);
    Route::get('warehouse/dashboard', [WarehouseDashboardController::class, 'index']);

    // Customer & Supplier Dashboard Summaries
    Route::get('crm/dashboard/export', [CrmDashboardController::class, 'export']);
    Route::get('crm/dashboard', [CrmDashboardController::class, 'index']);
    Route::get('customers/dashboard-summary', [CustomerController::class, 'dashboardSummary']);
    Route::post('customers/bulk', [CustomerController::class, 'bulk']);
    Route::get('customers/{id}/profile', [CustomerController::class, 'profile']);

    // Loyalty (CRM)
    Route::get('loyalty/balances', [LoyaltyController::class, 'balances']);
    Route::get('loyalty/transactions', [LoyaltyController::class, 'transactions']);

    Route::get('supplier-payments/dashboard-summary', [SupplierPaymentController::class, 'dashboardSummary']);
    Route::get('supplier-payments/pending', [SupplierPaymentController::class, 'pending']);
    Route::get('supplier-payments/pending/{type}/{id}/details', [SupplierPaymentController::class, 'pendingDetails']);
    Route::get('supplier-payments/history', [SupplierPaymentController::class, 'history']);
    Route::get('supplier-payments', [SupplierPaymentController::class, 'index']);
    Route::post('supplier-payments', [SupplierPaymentController::class, 'store']);

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Customer Orders
    Route::post('customer-orders/bulk', [CustomerOrderController::class, 'bulk']);
    Route::get('customer-orders/next-order-no', [CustomerOrderController::class, 'nextOrderNo']);
    Route::post('customer-orders/customer-quick-create', [CustomerOrderController::class, 'customerQuickCreate']);
    Route::get('customer-orders/customer-search', [CustomerOrderController::class, 'customerSearch']);
    Route::get('customer-orders/stock-availability', [CustomerOrderController::class, 'stockAvailability']);
    Route::get('customer-orders/stock-products', [CustomerOrderController::class, 'stockProducts']);
    Route::apiResource('customer-orders', CustomerOrderController::class);

    // POS Special Endpoints (Must be registered before apiResource)
    Route::get('pos-sales/next-bill-no', [PosSaleController::class, 'nextBillNo']);
    Route::get('pos-sale/next-bill-no', [PosSaleController::class, 'nextBillNo']);
    Route::get('pos-sales/salesman-lookup', [PosSaleController::class, 'salesmanLookup']);
    Route::get('pos-sales/summary-report', [PosSaleController::class, 'summaryReport']);
    Route::get('pos-sales/stock-products', [PosSaleController::class, 'stockProducts']);
    Route::get('pos-sales/barcode-lookup', [PosSaleController::class, 'barcodes']);
    Route::get('touch-sales/next-bill-no', [PosSaleController::class, 'touchSalesNextBillNo']);
    Route::get('touch-sales', [PosSaleController::class, 'touchSales']);
    Route::get('pos-old-sales/last-receipt', [PosSaleController::class, 'lastReceipt']);
    Route::get('pos-old-sales/lookup-sale', [PosSaleController::class, 'lookupSale']);
    Route::get('pos-old-sales/session-summary', [PosSaleController::class, 'sessionSummary']);
    Route::get('pos-old-sales/next-bill-no', [PosSaleController::class, 'nextBillNo']);
    Route::get('pos-old-sales', [PosSaleController::class, 'posOldSales']);
    Route::post('pos-old-sales', [PosSaleController::class, 'storeLegacy']);

    // POS Returns
    Route::get('pos-returns/next-return-no', [PosReturnController::class, 'nextReturnNo']);
    Route::get('pos-returns/source-bill', [PosReturnController::class, 'sourceBill']);
    Route::get('pos-returns/source-by-barcode', [PosReturnController::class, 'sourceByBarcode']);
    Route::get('pos-returns/return-product-barcode', [PosReturnController::class, 'returnProductBarcode']);
    Route::get('pos-returns/credit-return', [PosReturnController::class, 'lookupCredit']);
    Route::get('pos-returns', [PosReturnController::class, 'index']);
    Route::post('pos-returns', [PosReturnController::class, 'store']);
    Route::get('pos-returns/{id}', [PosReturnController::class, 'show']);

    // Sales on Approval
    Route::get('sales-on-approval/next-approval-no', [SalesApprovalController::class, 'nextApprovalNo']);
    Route::get('sales-on-approval/pending-count', [SalesApprovalController::class, 'pendingCount']);
    Route::post('sales-on-approval/{id}/accept', [SalesApprovalController::class, 'accept']);
    Route::post('sales-on-approval/{id}/reject', [SalesApprovalController::class, 'reject']);
    Route::apiResource('sales-on-approval', SalesApprovalController::class);

    // Dealer Invoices
    Route::get('dealer-invoices/next-bill-no', [DealerInvoiceController::class, 'nextBillNo']);
    Route::get('dealer-invoice-returns/next-return-no', [DealerInvoiceController::class, 'nextReturnNo']);
    Route::get('dealer-invoice-returns', [DealerInvoiceController::class, 'returnsIndex']);
    Route::post('dealer-invoice-returns', [DealerInvoiceController::class, 'returnsStore']);
    Route::apiResource('dealer-invoices', DealerInvoiceController::class);

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
    Route::get('sales-comparer', [SalesReportController::class, 'salesComparer']);
    Route::get('sales-vs-purchase', [SalesReportController::class, 'salesVsPurchase']);
    Route::get('sales-vs-stock', [SalesReportController::class, 'salesVsStock']);
    Route::match(['get', 'post', 'put'], 'sales-customization', [SettingsController::class, 'salesCustomization']);
    Route::match(['get', 'post', 'put'], 'sales-customisation', [SettingsController::class, 'salesCustomization']);

    // Masters
    Route::apiResource('brand', BrandController::class);
    Route::apiResource('brands', BrandController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('category', CategoryController::class);
    Route::apiResource('tax', TaxController::class);
    Route::apiResource('taxes', TaxController::class);
    Route::apiResource('suppliers', SupplierController::class);
    Route::apiResource('supplier', SupplierController::class);
    Route::apiResource('agents', AgentController::class);
    Route::apiResource('agent', AgentController::class);
    Route::apiResource('transports', TransportController::class);
    Route::apiResource('transport', TransportController::class);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('customer', CustomerController::class);

    // POS & Sales
    Route::apiResource('pos-sales', PosSaleController::class);
    Route::apiResource('pos-sale', PosSaleController::class);

    // User Access Management & Preferences
    Route::get('user-access/groups', [UserAccessController::class, 'groupsIndex']);
    Route::post('user-access/groups', [UserAccessController::class, 'groupsStore']);
    Route::put('user-access/groups/{id}', [UserAccessController::class, 'groupsUpdate']);
    Route::delete('user-access/groups/{id}', [UserAccessController::class, 'groupsDestroy']);
    Route::get('user-access/store-groups', [UserAccessController::class, 'storeGroupsIndex']);
    Route::post('user-access/store-groups', [UserAccessController::class, 'storeGroupsStore']);
    Route::put('user-access/store-groups/{id}', [UserAccessController::class, 'storeGroupsUpdate']);
    Route::delete('user-access/store-groups/{id}', [UserAccessController::class, 'storeGroupsDestroy']);
    Route::post('user-access/{id}/force-logout', [UserAccessController::class, 'forceLogout']);
    Route::get('user-access', [UserAccessController::class, 'index']);
    Route::post('user-access', [UserAccessController::class, 'store']);
    Route::get('user-access/{id}', [UserAccessController::class, 'show']);
    Route::put('user-access/{id}', [UserAccessController::class, 'update']);
    Route::delete('user-access/{id}', [UserAccessController::class, 'destroy']);
    Route::get('user-table-preferences/{tableKey}', [UserAccessController::class, 'getTablePreferences']);
    Route::put('user-table-preferences/{tableKey}', [UserAccessController::class, 'updateTablePreferences']);
};

// Register directly on /api/...
$registerAppRoutes();

// Register on /api/v1/...
Route::prefix('v1')->name('v1.')->group($registerAppRoutes);
