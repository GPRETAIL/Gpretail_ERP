<?php

namespace App\Services\Tenancy;

use App\Models\User;
use Illuminate\Http\Request;

class BusinessPermissions
{
    private const MASTERS = ['BrandController', 'CategoryController', 'TaxController', 'SupplierController', 'AgentController', 'TransportController', 'CustomerController', 'EmployeeController', 'ProductController', 'ProductAttributeController', 'SizeController', 'HrConfigurationController', 'ItemController'];

    private const TRANSACTIONS = ['PosSaleController', 'PosReturnController', 'CustomerOrderController', 'DealerInvoiceController', 'PurchaseInvoiceController', 'PurchaseReturnController', 'DirectPurchaseController', 'InventoryEntryController', 'PhysicalStockController', 'SalesApprovalController', 'StockOutwardController', 'SupplierPaymentController', 'SettlementController', 'CashRegisterController', 'TransportEntryController', 'BarcodeController', 'AttendanceController', 'PurchaseOrderController', 'PosOfflineController'];

    private const ADMINISTRATION = ['ThemeWorkspaceController', 'BackupController', 'SettingsController', 'ConfigurationController', 'CompanyController', 'StoreController', 'UserAccessController', 'StoreActivationController', 'SyncController'];

    /** Dropdown lists the counter, CRM and HR screens load; every other configuration key (remote support, AI keys) stays admin-only. */
    public const LOOKUP_CONFIGURATIONS = ['city', 'state', 'country', 'location', 'bank', 'card_types', 'upi_provider', 'customer_category', 'sale_area', 'return_reason', 'vendor', 'agent_type', 'additional_charges', 'bundle_rack'];

    /** Reads that expose purchase cost, margins, supplier dues or finance totals; the counter screens never call them. */
    private const COST_READS = ['SupplierPaymentController', 'FinanceDashboardController', 'PurchaseInvoiceController', 'PurchaseReturnController', 'DirectPurchaseController', 'InventoryEntryController', 'TransportEntryController', 'PurchaseOrderController', 'WarehouseReportController', 'WarehouseDashboardController', 'ProductPurchaseAnalyticsController', 'AnalyticalDashboardController', 'SalesReportController'];

    public function ability(Request $request): string
    {
        $controller = class_basename($request->route()?->getControllerClass() ?? '');
        $action = $request->route()?->getActionMethod() ?? '';
        if (in_array($controller, ['MobileAccessController', 'RemoteSupportController', 'RealtimeController'], true)) {
            return 'personal';
        }
        if ($controller === 'ApprovalController') {
            return match ($action) {
                'limits', 'status' => 'read',
                'myLimit', 'setPin' => 'personal',
                'updateLimits' => 'settings.manage',
                'requestApproval', 'pinApprove', 'withdraw' => 'sales.post',
                default => 'approvals.decide', // inbox, pendingCount, approve, reject
            };
        }
        $read = in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true);
        if ($controller === 'AuthController') {
            // Every page reads the connector status and routing target (no sync_token); only saving it is admin work.
            if (in_array($action, ['localServerConfig', 'localServerConfigRuntime'], true)) {
                return 'read';
            }
            if (str_starts_with($action, 'localServer')) {
                return 'settings.manage';
            }

            return 'personal';
        }
        if ($controller === 'UserAccessController' && in_array($action, ['getTablePreferences', 'updateTablePreferences'], true)) {
            return 'personal';
        }
        if ($this->isLookupRead($request)) {
            return 'read';
        }
        // Warehouse Customisation (label layout, print mode, sell-without-stock) is a store setting.
        if (! $read && $controller === 'WarehouseReportController' && $action === 'warehouseCustomization') {
            return 'settings.manage';
        }
        if (in_array($controller, self::ADMINISTRATION, true)) {
            if ($read && $controller === 'SettingsController' && in_array($action, ['salesCustomization', 'getTheme', 'listThemePresets', 'printerConfigsResolve', 'localPrinterMeta'], true)) {
                return 'read';
            }
            if ($read && in_array($controller, ['CompanyController', 'StoreController'], true) && in_array($action, ['index', 'show', 'subscriptionStatus'], true)) {
                return 'read';
            }

            return 'settings.manage';
        }
        if ($controller === 'InvoiceAiController') {
            return in_array($action, ['getEngineConfig', 'saveEngineConfig'], true) ? 'settings.manage' : 'purchases.post';
        }
        if ($controller === 'AccountingController') {
            // The books (profit, balances) are for managers and accountants, not every signed-in user.
            return $read ? 'accounts.view' : 'accounts.post';
        }
        if (str_contains(strtolower($action), 'export')) {
            return 'reports.export';
        }
        if ($read && in_array($controller, self::COST_READS, true)) {
            return 'costs.view';
        }
        // The employee list stays readable (trimmed to a directory, see EmployeeController); full records and documents are HR data.
        if ($read && $controller === 'EmployeeController' && in_array($action, ['show', 'groupedSummary', 'documentUrl'], true)) {
            return 'hr.view';
        }
        if ($read) {
            return 'read';
        }
        if (in_array($controller, ['NotificationController', 'NotificationPreferenceController', 'PushSubscriptionController', 'DashboardLayoutController'], true)) {
            return 'personal';
        }
        if (in_array($controller, self::MASTERS, true)) {
            return 'masters.write';
        }
        // Sales users raise approval requests; a manager, supervisor or admin decides them.
        if ($controller === 'SalesApprovalController') {
            return in_array($action, ['accept', 'reject'], true) ? 'approvals.decide' : 'sales.post';
        }
        if (in_array($controller, self::TRANSACTIONS, true)) {
            if ($request->method() === 'DELETE' || preg_match('/cancel|void|destroy|delete/i', $action)) {
                return 'transactions.delete';
            }
            if (preg_match('/approve|reject/i', $action)) {
                return 'transactions.approve';
            }

            // POS returns are a counter action (cashier preset allows them); refunds over the
            // user's limit are additionally gated by ApprovalService. A dealer invoice is a sale too.
            return in_array($controller, ['PosSaleController', 'PosOfflineController', 'PosReturnController', 'CustomerOrderController', 'CashRegisterController', 'DealerInvoiceController'], true) ? 'sales.post' : 'purchases.post';
        }

        return 'unassigned';
    }

    public function isLookupRead(Request $request): bool
    {
        return in_array($request->method(), ['GET', 'HEAD'], true)
            && class_basename($request->route()?->getControllerClass() ?? '') === 'ConfigurationController'
            && $request->route()?->getActionMethod() === 'show'
            && in_array(strtolower(str_replace('-', '_', (string) $request->route('key'))), self::LOOKUP_CONFIGURATIONS, true);
    }

    public function allows(User $user, string $ability, bool $trustedReplay = false): bool
    {
        if ($user->role === 'sync_system') {
            return $trustedReplay && in_array($ability, ['masters.write', 'sales.post', 'purchases.post', 'transactions.approve', 'transactions.delete'], true);
        }
        if (! $user->is_active || $ability === 'unassigned') {
            return false;
        }
        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            return true;
        }
        $grants = [
            'manager' => ['read', 'personal', 'masters.write', 'sales.post', 'purchases.post', 'transactions.approve', 'transactions.delete', 'reports.export', 'approvals.decide', 'accounts.view', 'accounts.post', 'costs.view', 'hr.view'],
            'accountant' => ['read', 'personal', 'reports.export', 'accounts.view', 'accounts.post', 'costs.view', 'hr.view'],
            // Floor supervisor: a cashier who can also approve discounts/refunds within their limit.
            'supervisor' => ['read', 'personal', 'sales.post', 'approvals.decide'],
            'cashier' => ['read', 'personal', 'sales.post'],
            'sales' => ['read', 'personal', 'sales.post'],
            'warehouse' => ['read', 'personal', 'purchases.post', 'costs.view'],
            'user' => ['read', 'personal'],
            'staff' => ['read', 'personal'],
        ];

        return in_array($ability, $grants[$user->role] ?? [], true);
    }
}
