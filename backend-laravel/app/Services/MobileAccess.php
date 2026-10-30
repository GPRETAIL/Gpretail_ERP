<?php

namespace App\Services;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\Request;

class MobileAccess
{
    public const MODULES = ['dashboard', 'sales', 'warehouse', 'masters', 'crm', 'finance', 'store', 'analytical', 'hrms', 'settings'];

    public const ACTIONS = ['view', 'add', 'edit', 'delete', 'approve', 'export'];

    public const SCREENS = [
        'dashboard' => '/dashboard', 'sales' => '/sales/pos-sales', 'create_invoice' => '/sales/pos-sales',
        'purchase' => '/warehouse/invoice', 'purchase_summary' => '/warehouse/reports',
        'inventory_summary' => '/warehouse/dashboard',
        'returns' => '/sales/pos-sales-return', 'inventory' => '/masters/product', 'product_details' => '/masters/product',
        'customers' => '/crm/customer', 'suppliers' => '/masters/supplier', 'supplier_dues' => '/finance/supplier-payment',
        'attendance' => '/hrms/attendance', 'approvals' => '/sales/sales-on-approval',
        'fast_moving' => '/analytical/dashboard', 'sales_summary' => '/sales/reports',
        'reports' => '/analytical/dashboard', 'report_profit_loss' => '/analytical/dashboard',
        'report_gst' => '/analytical/dashboard', 'report_receivables' => '/finance/dashboard',
    ];

    private const PAGES = [
        'DashboardController' => '/dashboard', 'DashboardLayoutController' => '/dashboard',
        'PosSaleController' => '/sales/pos-sales', 'PosReturnController' => '/sales/pos-sales-return',
        'DealerInvoiceController' => '/sales/dealer-invoice', 'SalesApprovalController' => '/sales/sales-on-approval',
        'SalesDashboardController' => '/sales/pos-sales', 'SalesReportController' => '/sales/reports',
        'SettlementController' => '/sales/settlement', 'CashRegisterController' => '/sales/cash-opening',
        'PurchaseInvoiceController' => '/warehouse/invoice', 'PurchaseReturnController' => '/warehouse/purchase-return',
        'DirectPurchaseController' => '/warehouse/direct-purchase', 'InventoryEntryController' => '/warehouse/inventory-entry',
        'PhysicalStockController' => '/warehouse/physical-stock', 'StockOutwardController' => '/warehouse/stock-outward',
        'WarehouseReportController' => '/warehouse/reports', 'WarehouseDashboardController' => '/warehouse/dashboard',
        'TransportEntryController' => '/warehouse/transport-entry', 'BarcodeController' => '/warehouse/barcode',
        'ProductController' => '/masters/product', 'ItemController' => '/masters/item', 'LookupController' => '/masters/product',
        'BrandController' => '/masters/brand', 'CategoryController' => '/masters/category', 'TaxController' => '/masters/tax',
        'SizeController' => '/masters/size', 'ProductAttributeController' => '/masters/attribute',
        'SupplierController' => '/masters/supplier', 'AgentController' => '/masters/agent', 'TransportController' => '/masters/transport',
        'CustomerController' => '/crm/customer', 'CustomerOrderController' => '/crm/customer-orders',
        'CrmDashboardController' => '/crm/customer', 'LoyaltyController' => '/crm/loyalty-management',
        'FinanceDashboardController' => '/finance/dashboard', 'SupplierPaymentController' => '/finance/supplier-payment',
        'AnalyticalDashboardController' => '/analytical/dashboard', 'ProductPurchaseAnalyticsController' => '/analytical/dashboard',
        'AttendanceController' => '/hrms/attendance', 'EmployeeController' => '/hrms/employee', 'HrConfigurationController' => '/hrms/attendance',
        'StoreDashboardController' => '/store/dashboard', 'MastersDashboardController' => '/masters/product',
        'SettingsController' => '/settings/application-settings', 'SettingsDashboardController' => '/settings/application-settings',
        'ConfigurationController' => '/settings/application-settings', 'BackupController' => '/settings/backup',
        'StoreController' => '/settings/company', 'UserAccessController' => '/settings/company',
        'ItemLocatorController' => '/sales/stock-item-locator',
    ];

    public function tenantAdmin(User $user): bool
    {
        if ($user->role !== 'admin' || $user->store_id || ! $user->platform_company_code) {
            return false;
        }

        return app(StoreContext::class)->authFields($user)['is_tenant_admin'];
    }

    public function isMobile(Request $request): bool
    {
        return in_array('client:mobile', $request->user()?->currentAccessToken()->abilities ?? [], true);
    }

    public function canLogin(User $user, string $client): bool
    {
        return $this->tenantAdmin($user) || (bool) ($client === 'mobile' ? $user->mobile_access : $user->web_access);
    }

    public function storeStatus(User $user, Store $store): array
    {
        $licence = app(StoreLicenceVerifier::class)->verify($store);
        $entitlements = $licence['claims']['entitlements'] ?? [];
        $code = ! $this->canLogin($user, 'mobile') ? 'MOBILE_USER_ACCESS_DENIED'
            : (! $store->is_active || ! $licence['ok'] ? 'STORE_SUBSCRIPTION_REQUIRED'
                : (($entitlements['channels']['mobile'] ?? false) !== true ? 'MOBILE_SUBSCRIPTION_REQUIRED' : null));
        $screens = [];
        if ($code === null) {
            foreach (self::SCREENS as $screen => $path) {
                if ($this->pathAllowed($user, $entitlements, $path, $screen === 'create_invoice' ? 'add' : 'view')) {
                    if ($screen === 'create_invoice' && (! $this->pathAllowed($user, $entitlements, '/crm/customer', 'view')
                        || ! $this->pathAllowed($user, $entitlements, '/masters/product', 'view'))) {
                        continue;
                    }
                    $screens[] = $screen;
                }
            }
            $screens = array_merge($screens, ['modules', 'settings']);
        }

        return ['id' => $store->id, 'name' => $store->name, 'code' => $store->code, 'allowed' => $code === null,
            'reason' => $code, 'plan' => $store->platform_subscription['plan_name'] ?? null,
            'expires_at' => $store->platform_active_till?->toIso8601String(),
            'renewal_due' => $store->platform_active_till?->between(now(), now()->addDays(7)) ?? false,
            'offline_until' => $licence['claims']['offline_until'] ?? null, 'screens' => $screens,
            'mobile_entitled' => $licence['ok'] && ($entitlements['channels']['mobile'] ?? false) === true,
            'action_limits' => $licence['ok'] ? $this->actionLimits($entitlements) : [],
            'sections' => $licence['ok'] ? ($entitlements['sections'] ?? []) : []];
    }

    public function pathAllowed(User $user, array $entitlements, string $path, string $action): bool
    {
        if (! app(PagePermissions::class)->allows($user, $path, $action)) {
            return false;
        }
        $module = explode('/', trim($path, '/'))[0];
        $section = $entitlements['sections'][$module] ?? null;
        if ($section !== 'all' && (! is_array($section) || ! in_array($path, $section, true))) {
            return false;
        }
        $actions = $entitlements['actions'][$path] ?? null;
        if (is_array($actions) && (($actions['view'] ?? false) !== true
            || ($actions[$action] ?? false) !== true)) {
            return false;
        }

        return $this->userAllows($user, $module, $action);
    }

    private function actionLimits(array $entitlements): array
    {
        $limits = [];
        foreach ($entitlements['sections'] ?? [] as $module => $section) {
            foreach (self::ACTIONS as $action) {
                $limits[$module][$action] = $section === 'all';
                foreach (is_array($section) ? $section : [] as $path) {
                    $grant = $entitlements['actions'][$path] ?? null;
                    $limits[$module][$action] = $limits[$module][$action] || $grant === null
                        || (($grant['view'] ?? false) === true && ($grant[$action] ?? false) === true);
                }
            }
        }

        return $limits;
    }

    public function userAllows(User $user, string $module, string $action): bool
    {
        $grants = $user->module_permissions;

        return $grants === null || (($grants[$module]['view'] ?? false) === true && ($grants[$module][$action] ?? false) === true);
    }

    public function page(Request $request): ?string
    {
        return self::PAGES[class_basename($request->route()?->getControllerClass() ?? '')] ?? null;
    }

    public function action(Request $request): string
    {
        $method = $request->route()?->getActionMethod() ?? '';
        if (preg_match('/export/i', $method)) {
            return 'export';
        }
        if (preg_match('/approve|reject/i', $method)) {
            return 'approve';
        }
        if ($request->method() === 'DELETE' || preg_match('/cancel|void|destroy|delete/i', $method)) {
            return 'delete';
        }

        return match ($request->method()) {
            'GET', 'HEAD', 'OPTIONS' => 'view', 'POST' => 'add', default => 'edit'
        };
    }

    public function authorize(Request $request): ?array
    {
        $user = $request->user();
        $controller = class_basename($request->route()?->getControllerClass() ?? '');
        if (in_array($controller, ['AuthController', 'MobileAccessController', 'StoreActivationController'], true)
            || ($controller === 'UserAccessController' && in_array($request->route()?->getActionMethod(), ['clientAccess', 'getTablePreferences', 'updateTablePreferences'], true))) {
            return null;
        }
        $mobile = $this->isMobile($request);
        if (! $this->canLogin($user, $mobile ? 'mobile' : 'web')) {
            return ['code' => 'CLIENT_ACCESS_DENIED', 'message' => 'Your administrator has disabled this sign-in channel.'];
        }
        if (in_array($controller, ['NotificationController', 'NotificationPreferenceController', 'PushSubscriptionController', 'RemoteSupportController'], true)) {
            // Support is a shared account service, including when a mobile token is used on the website.
            // Its controller still enforces the deployment/company and requester identity.
            return null;
        }
        if ($controller === 'ThemeWorkspaceController' || ($controller === 'SettingsController' && in_array($request->route()?->getActionMethod(), ['getTheme', 'updateTheme', 'listThemePresets', 'saveThemePreset', 'applyThemePreset', 'deleteThemePreset'], true))) {
            return null; // Controller enforces theme administration; business licences remain separate.
        }
        $page = $this->page($request);
        $ownMetadata = in_array($controller, ['StoreController', 'CompanyController'], true)
            && in_array($request->route()?->getActionMethod(), ['index', 'show', 'subscriptionStatus'], true)
            && in_array($request->method(), ['GET', 'HEAD'], true);
        if ($controller === 'DashboardLayoutController' || $ownMetadata) {
            return null;
        }
        if ($page && ! app(PagePermissions::class)->allows($user, $page, $this->action($request))) {
            return ['code' => 'PAGE_ACCESS_DENIED', 'message' => 'Your assigned page permissions do not allow this action.'];
        }
        if ($mobile) {
            $id = $request->attributes->get('store_context_id');
            $store = $id ? app(StoreContext::class)->available($user)->find($id) : null;
            if (! $store) {
                return ['code' => 'STORE_SELECTION_REQUIRED', 'message' => 'Select one assigned store to use the mobile app.'];
            }
            $status = $this->storeStatus($user, $store);
            if (! $status['allowed']) {
                return ['code' => $status['reason'], 'message' => 'Mobile access requires an active store subscription that includes mobile, and administrator approval.'];
            }
            if ($page && ! $this->pathAllowed($user, app(StoreLicenceVerifier::class)->verify($store)['claims']['entitlements'] ?? [], $page, $this->action($request))) {
                return ['code' => 'MODULE_ACCESS_DENIED', 'message' => 'Your subscription or user permissions do not allow this module or action.'];
            }
            if (! $page && $controller !== 'NotificationController') {
                return ['code' => 'MODULE_ACCESS_DENIED', 'message' => 'This API is not available to mobile sessions.'];
            }
        } elseif ($page && ($user->module_permissions !== null || $user->page_permissions !== null)) {
            $selected = $request->attributes->get('store_context_id');
            $stores = app(StoreContext::class)->available($user)->whereIn('id', $request->attributes->get('store_context_ids', []))->get();
            $allowed = $stores->filter(function ($store) use ($user, $page, $request) {
                if (! $store->is_active) {
                    return false;
                }
                if (! $store->platform_store_id && ! PlatformActivation::current()?->activated) {
                    return $this->userAllows($user, explode('/', trim($page, '/'))[0], $this->action($request));
                }
                $licence = app(StoreLicenceVerifier::class)->verify($store);

                return $licence['ok'] && $this->pathAllowed($user, $licence['claims']['entitlements'] ?? [], $page, $this->action($request));
            });
            if ($allowed->isEmpty() || ($selected && ! $allowed->contains('id', $selected))) {
                return ['code' => 'MODULE_ACCESS_DENIED', 'message' => 'Your subscription or user permissions do not allow this module or action.'];
            }
            // Combined read views aggregate only stores permitted for this page and subscription.
            $request->attributes->set('store_context_ids', $allowed->pluck('id')->all());
        }

        return null;
    }
}
