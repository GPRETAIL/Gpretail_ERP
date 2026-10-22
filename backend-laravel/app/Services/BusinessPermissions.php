<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;

class BusinessPermissions
{
    private const MASTERS = ['BrandController', 'CategoryController', 'TaxController', 'SupplierController', 'AgentController', 'TransportController', 'CustomerController', 'EmployeeController', 'ProductController', 'ProductAttributeController', 'SizeController', 'HrConfigurationController', 'ItemController'];

    private const TRANSACTIONS = ['PosSaleController', 'PosReturnController', 'CustomerOrderController', 'DealerInvoiceController', 'PurchaseInvoiceController', 'PurchaseReturnController', 'DirectPurchaseController', 'InventoryEntryController', 'PhysicalStockController', 'SalesApprovalController', 'StockOutwardController', 'SupplierPaymentController', 'SettlementController', 'CashRegisterController', 'TransportEntryController', 'BarcodeController', 'AttendanceController'];

    private const ADMINISTRATION = ['ThemeWorkspaceController', 'BackupController', 'SettingsController', 'ConfigurationController', 'CompanyController', 'StoreController', 'UserAccessController', 'StoreActivationController', 'SyncController'];

    public function ability(Request $request): string
    {
        $controller = class_basename($request->route()?->getControllerClass() ?? '');
        $action = $request->route()?->getActionMethod() ?? '';
        if ($controller === 'MobileAccessController') {
            return 'personal';
        }
        $read = in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true);
        if ($controller === 'AuthController') {
            return str_starts_with($action, 'localServer') ? 'settings.manage' : 'personal';
        }
        if ($controller === 'UserAccessController' && in_array($action, ['getTablePreferences', 'updateTablePreferences'], true)) {
            return 'personal';
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
        if (str_contains(strtolower($action), 'export')) {
            return 'reports.export';
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
        if (in_array($controller, self::TRANSACTIONS, true)) {
            if ($request->method() === 'DELETE' || preg_match('/cancel|void|destroy|delete/i', $action)) {
                return 'transactions.delete';
            }
            if (preg_match('/approve|reject/i', $action)) {
                return 'transactions.approve';
            }

            return in_array($controller, ['PosSaleController', 'CustomerOrderController', 'CashRegisterController'], true) ? 'sales.post' : 'purchases.post';
        }

        return 'unassigned';
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
            'manager' => ['read', 'personal', 'masters.write', 'sales.post', 'purchases.post', 'transactions.approve', 'transactions.delete', 'reports.export'],
            'cashier' => ['read', 'personal', 'sales.post'],
            'sales' => ['read', 'personal', 'sales.post'],
            'warehouse' => ['read', 'personal', 'purchases.post'],
            'user' => ['read', 'personal'],
            'staff' => ['read', 'personal'],
        ];

        return in_array($ability, $grants[$user->role] ?? [], true);
    }
}
