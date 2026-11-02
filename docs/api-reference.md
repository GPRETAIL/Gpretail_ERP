# API reference

Every endpoint under `/api`, grouped by module (514 endpoints). Generated from
`php artisan route:list --sort=definition --json`; regenerate it after changing routes.

- Each signed-in endpoint is also served under `/api/v1/...` with the same behaviour.
- **Auth** means a Sanctum token is required. Signed-in requests also carry the selected store
  (`X-Store-Id`); `ResolveStoreContext` checks it against the user's stores and
  `AuthorizeBusinessAction` checks the user's permission for the controller action.
- Route files: public entry routes in `routes/api.php`, signed-in routes in `routes/api/<module>.php`,
  invoice AI in `routes/invoice_ai.php`.

## Modules

- [Analytical](#analytical) (2)
- [Auth](#auth) (14)
- [Crm](#crm) (28)
- [Dashboards](#dashboards) (25)
- [Finance](#finance) (21)
- [Hr](#hr) (32)
- [Masters](#masters) (120)
- [Notifications](#notifications) (11)
- [Other](#other) (1)
- [Platform](#platform) (20)
- [Sales](#sales) (92)
- [Settings](#settings) (70)
- [Store](#store) (18)
- [Warehouse](#warehouse) (61)

## Analytical

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/supplier-product-analytics` | ProductPurchaseAnalyticsController@supplierProductSummary | yes |
| GET | `/api/supplier-product-analytics/{productId}/history` | ProductPurchaseAnalyticsController@productPurchaseHistory | yes |

## Auth

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/auth/config` | AuthController@config | no |
| POST | `/api/auth/google` | AuthController@google | no |
| POST | `/api/auth/login` | AuthController@login | no |
| POST | `/api/auth/logout` | AuthController@logout | yes |
| GET | `/api/auth/me` | AuthController@me | yes |
| POST | `/api/auth/counter` | AuthController@counter | yes |
| GET | `/api/auth/counter` | AuthController@counters | yes |
| POST | `/api/auth/change-password` | AuthController@changePassword | yes |
| POST | `/api/admin-auth/login` | AuthController@login | no |
| GET | `/api/local-server-config` | AuthController@localServerConfig | yes |
| PUT | `/api/local-server-config` | AuthController@localServerConfigUpdate | yes |
| GET | `/api/local-server-config/runtime` | AuthController@localServerConfigRuntime | yes |
| GET | `/api/mobile/access` | MobileAccessController@status | yes |
| GET | `/api/me` | AuthController@me | yes |

## Crm

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/customers/dashboard-summary` | CustomerController@dashboardSummary | yes |
| POST | `/api/customers/bulk` | CustomerController@bulk | yes |
| GET | `/api/customers/{id}/profile` | CustomerController@profile | yes |
| GET | `/api/customers/grouped` | CustomerController@groupedSummary | yes |
| GET | `/api/loyalty/balances` | LoyaltyController@balances | yes |
| GET | `/api/loyalty/transactions` | LoyaltyController@transactions | yes |
| POST | `/api/customer-orders/bulk` | CustomerOrderController@bulk | yes |
| GET | `/api/customer-orders/next-order-no` | CustomerOrderController@nextOrderNo | yes |
| POST | `/api/customer-orders/customer-quick-create` | CustomerOrderController@customerQuickCreate | yes |
| GET | `/api/customer-orders/customer-search` | CustomerOrderController@customerSearch | yes |
| GET | `/api/customer-orders/stock-availability` | CustomerOrderController@stockAvailability | yes |
| GET | `/api/customer-orders/stock-products` | CustomerOrderController@stockProducts | yes |
| GET | `/api/customer-orders/grouped` | CustomerOrderController@groupedSummary | yes |
| GET | `/api/customer-orders` | CustomerOrderController@index | yes |
| POST | `/api/customer-orders` | CustomerOrderController@store | yes |
| GET | `/api/customer-orders/{customer_order}` | CustomerOrderController@show | yes |
| PUT|PATCH | `/api/customer-orders/{customer_order}` | CustomerOrderController@update | yes |
| DELETE | `/api/customer-orders/{customer_order}` | CustomerOrderController@destroy | yes |
| GET | `/api/customers` | CustomerController@index | yes |
| POST | `/api/customers` | CustomerController@store | yes |
| GET | `/api/customers/{customer}` | CustomerController@show | yes |
| PUT|PATCH | `/api/customers/{customer}` | CustomerController@update | yes |
| DELETE | `/api/customers/{customer}` | CustomerController@destroy | yes |
| GET | `/api/customer` | CustomerController@index | yes |
| POST | `/api/customer` | CustomerController@store | yes |
| GET | `/api/customer/{customer}` | CustomerController@show | yes |
| PUT|PATCH | `/api/customer/{customer}` | CustomerController@update | yes |
| DELETE | `/api/customer/{customer}` | CustomerController@destroy | yes |

## Dashboards

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/dashboard/overview` | DashboardController@overview | yes |
| GET | `/api/dashboard/warehouse` | DashboardController@warehouse | yes |
| GET | `/api/dashboard/summary` | DashboardController@summary | yes |
| GET | `/api/dashboard/analytics` | DashboardController@analytics | yes |
| GET | `/api/dashboard/attention-summary` | DashboardController@attentionSummary | yes |
| GET | `/api/dashboard/layout` | DashboardLayoutController@index | yes |
| PUT | `/api/dashboard/layout/{tabKey}` | DashboardLayoutController@update | yes |
| DELETE | `/api/dashboard/layout/{tabKey}` | DashboardLayoutController@reset | yes |
| GET | `/api/dashboard` | DashboardController@index | yes |
| GET | `/api/warehouse/dashboard/export` | WarehouseDashboardController@export | yes |
| GET | `/api/warehouse/dashboard/inventory` | WarehouseDashboardController@inventory | yes |
| GET | `/api/warehouse/dashboard/incoming` | WarehouseDashboardController@incoming | yes |
| GET | `/api/warehouse/dashboard/outgoing` | WarehouseDashboardController@outgoing | yes |
| GET | `/api/warehouse/dashboard/alerts` | WarehouseDashboardController@alerts | yes |
| GET | `/api/warehouse/dashboard/activity` | WarehouseDashboardController@activity | yes |
| GET | `/api/warehouse/dashboard` | WarehouseDashboardController@index | yes |
| GET | `/api/sales/dashboard/export` | SalesDashboardController@export | yes |
| GET | `/api/sales/dashboard` | SalesDashboardController@index | yes |
| GET | `/api/finance/dashboard` | FinanceDashboardController@index | yes |
| GET | `/api/store/dashboard` | StoreDashboardController@index | yes |
| GET | `/api/masters/dashboard` | MastersDashboardController@index | yes |
| GET | `/api/settings/dashboard` | SettingsDashboardController@index | yes |
| GET | `/api/analytical/dashboard` | AnalyticalDashboardController@index | yes |
| GET | `/api/crm/dashboard/export` | CrmDashboardController@export | yes |
| GET | `/api/crm/dashboard` | CrmDashboardController@index | yes |

## Finance

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/accounting/accounts` | AccountingController@accounts | yes |
| POST | `/api/accounting/accounts` | AccountingController@storeAccount | yes |
| PUT | `/api/accounting/accounts/{id}` | AccountingController@updateAccount | yes |
| DELETE | `/api/accounting/accounts/{id}` | AccountingController@destroyAccount | yes |
| GET | `/api/accounting/accounts/{id}/ledger` | AccountingController@ledger | yes |
| GET | `/api/accounting/daybook` | AccountingController@daybook | yes |
| GET | `/api/accounting/vouchers/{id}` | AccountingController@voucher | yes |
| POST | `/api/accounting/vouchers` | AccountingController@storeVoucher | yes |
| PUT | `/api/accounting/vouchers/{id}` | AccountingController@updateVoucher | yes |
| DELETE | `/api/accounting/vouchers/{id}` | AccountingController@destroyVoucher | yes |
| GET | `/api/accounting/trial-balance` | AccountingController@trialBalance | yes |
| GET | `/api/accounting/profit-loss` | AccountingController@profitAndLoss | yes |
| GET | `/api/accounting/balance-sheet` | AccountingController@balanceSheet | yes |
| GET | `/api/accounting/outstanding` | AccountingController@outstanding | yes |
| POST | `/api/accounting/repost` | AccountingController@repost | yes |
| GET | `/api/supplier-payments/dashboard-summary` | SupplierPaymentController@dashboardSummary | yes |
| GET | `/api/supplier-payments/pending` | SupplierPaymentController@pending | yes |
| GET | `/api/supplier-payments/pending/{type}/{id}/details` | SupplierPaymentController@pendingDetails | yes |
| GET | `/api/supplier-payments/history` | SupplierPaymentController@history | yes |
| GET | `/api/supplier-payments` | SupplierPaymentController@index | yes |
| POST | `/api/supplier-payments` | SupplierPaymentController@store | yes |

## Hr

| Method | Path | Controller action | Auth |
|---|---|---|---|
| POST | `/api/employees/bulk` | EmployeeController@bulkImport | yes |
| GET | `/api/hr-designations/{id}` | HrConfigurationController@designationsShow | yes |
| PUT | `/api/hr-designations/{id}` | HrConfigurationController@designationsUpdate | yes |
| DELETE | `/api/hr-designations/{id}` | HrConfigurationController@designationsDestroy | yes |
| GET | `/api/hr-designations` | HrConfigurationController@designationsIndex | yes |
| POST | `/api/hr-designations` | HrConfigurationController@designationsStore | yes |
| GET | `/api/hr-departments/{id}` | HrConfigurationController@departmentsShow | yes |
| PUT | `/api/hr-departments/{id}` | HrConfigurationController@departmentsUpdate | yes |
| DELETE | `/api/hr-departments/{id}` | HrConfigurationController@departmentsDestroy | yes |
| GET | `/api/hr-departments` | HrConfigurationController@departmentsIndex | yes |
| POST | `/api/hr-departments` | HrConfigurationController@departmentsStore | yes |
| GET | `/api/hr-sections/{id}` | HrConfigurationController@departmentsShow | yes |
| PUT | `/api/hr-sections/{id}` | HrConfigurationController@departmentsUpdate | yes |
| DELETE | `/api/hr-sections/{id}` | HrConfigurationController@departmentsDestroy | yes |
| GET | `/api/hr-sections` | HrConfigurationController@departmentsIndex | yes |
| POST | `/api/hr-sections` | HrConfigurationController@departmentsStore | yes |
| GET|POST|PUT|DELETE | `/api/hr-{type}/{id?}` | HrConfigurationController@handleType | yes |
| GET | `/api/employees/dashboard-summary` | EmployeeController@dashboardSummary | yes |
| POST | `/api/employees/{id}/upload` | EmployeeController@uploadDocument | yes |
| POST | `/api/employees/{id}/education-certificate` | EmployeeController@educationCertificate | yes |
| GET | `/api/employees/{id}/document-url` | EmployeeController@documentUrl | yes |
| GET | `/api/employees/grouped` | EmployeeController@groupedSummary | yes |
| GET | `/api/employees` | EmployeeController@index | yes |
| POST | `/api/employees` | EmployeeController@store | yes |
| GET | `/api/employees/{employee}` | EmployeeController@show | yes |
| PUT|PATCH | `/api/employees/{employee}` | EmployeeController@update | yes |
| DELETE | `/api/employees/{employee}` | EmployeeController@destroy | yes |
| GET | `/api/attendance/today` | AttendanceController@today | yes |
| POST | `/api/attendance/check-in` | AttendanceController@checkIn | yes |
| POST | `/api/attendance/check-out` | AttendanceController@checkOut | yes |
| POST | `/api/attendance/mark-leave` | AttendanceController@markLeave | yes |
| GET|POST|PUT | `/api/attendance/settings` | AttendanceController@settings | yes |

## Masters

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/lookups` | LookupController@index | yes |
| POST | `/api/brands/bulk` | BrandController@bulkImport | yes |
| POST | `/api/items/bulk` | ItemController@bulkImport | yes |
| POST | `/api/products/bulk` | ProductController@bulkImport | yes |
| POST | `/api/suppliers/bulk` | SupplierController@bulkImport | yes |
| POST | `/api/transports/bulk` | TransportController@bulkImport | yes |
| POST | `/api/agents/bulk` | AgentController@bulkImport | yes |
| POST | `/api/taxes/bulk` | TaxController@bulkImport | yes |
| POST | `/api/sizes/bulk` | SizeController@bulkImport | yes |
| POST | `/api/size-groups/bulk` | SizeController@bulkImport | yes |
| POST | `/api/attributes/{type}/bulk` | ProductAttributeController@bulkImport | yes |
| POST | `/api/configurations/{type}/bulk` | ConfigurationController@bulkImport | yes |
| GET | `/api/configurations/counter` | ConfigurationController@getCounters | yes |
| GET | `/api/configurations/{key}` | ConfigurationController@show | yes |
| POST | `/api/configurations/{type}` | ConfigurationController@storeType | yes |
| GET | `/api/configurations/{type}/{id}` | ConfigurationController@showType | yes |
| PUT | `/api/configurations/{type}/{id}` | ConfigurationController@updateType | yes |
| DELETE | `/api/configurations/{type}/{id}` | ConfigurationController@destroyType | yes |
| GET | `/api/configurations` | ConfigurationController@index | yes |
| POST | `/api/configurations` | ConfigurationController@store | yes |
| GET | `/api/attributes/{type}/{id}` | ProductAttributeController@showByType | yes |
| GET | `/api/attributes/{type}` | ProductAttributeController@indexByType | yes |
| POST | `/api/attributes/{type}` | ProductAttributeController@storeByType | yes |
| PUT | `/api/attributes/{type}/{id}` | ProductAttributeController@updateByType | yes |
| DELETE | `/api/attributes/{type}/{id}` | ProductAttributeController@destroyByType | yes |
| GET | `/api/size-groups/{id}` | SizeController@groupsShow | yes |
| GET | `/api/size-groups` | SizeController@groupsIndex | yes |
| POST | `/api/size-groups` | SizeController@groupsStore | yes |
| PUT | `/api/size-groups/{id}` | SizeController@groupsUpdate | yes |
| DELETE | `/api/size-groups/{id}` | SizeController@groupsDestroy | yes |
| GET | `/api/sizes` | SizeController@index | yes |
| POST | `/api/sizes` | SizeController@store | yes |
| GET | `/api/sizes/{size}` | SizeController@show | yes |
| PUT|PATCH | `/api/sizes/{size}` | SizeController@update | yes |
| DELETE | `/api/sizes/{size}` | SizeController@destroy | yes |
| GET | `/api/items/dashboard-summary` | ItemController@dashboardSummary | yes |
| GET | `/api/items/grouped` | ItemController@groupedSummary | yes |
| GET | `/api/items` | ItemController@index | yes |
| POST | `/api/items` | ItemController@store | yes |
| GET | `/api/items/{item}` | ItemController@show | yes |
| PUT|PATCH | `/api/items/{item}` | ItemController@update | yes |
| DELETE | `/api/items/{item}` | ItemController@destroy | yes |
| GET | `/api/products/dashboard-summary` | ProductController@dashboardSummary | yes |
| GET | `/api/products/barcode/{barcode}` | ProductController@findByBarcode | yes |
| GET | `/api/products/grouped` | ProductController@groupedSummary | yes |
| GET | `/api/products` | ProductController@index | yes |
| POST | `/api/products` | ProductController@store | yes |
| GET | `/api/products/{product}` | ProductController@show | yes |
| PUT|PATCH | `/api/products/{product}` | ProductController@update | yes |
| DELETE | `/api/products/{product}` | ProductController@destroy | yes |
| GET | `/api/product` | ProductController@index | yes |
| POST | `/api/product` | ProductController@store | yes |
| GET | `/api/product/{product}` | ProductController@show | yes |
| PUT|PATCH | `/api/product/{product}` | ProductController@update | yes |
| DELETE | `/api/product/{product}` | ProductController@destroy | yes |
| GET | `/api/brands/grouped` | BrandController@groupedSummary | yes |
| GET | `/api/brand` | BrandController@index | yes |
| POST | `/api/brand` | BrandController@store | yes |
| GET | `/api/brand/{brand}` | BrandController@show | yes |
| PUT|PATCH | `/api/brand/{brand}` | BrandController@update | yes |
| DELETE | `/api/brand/{brand}` | BrandController@destroy | yes |
| GET | `/api/brands` | BrandController@index | yes |
| POST | `/api/brands` | BrandController@store | yes |
| GET | `/api/brands/{brand}` | BrandController@show | yes |
| PUT|PATCH | `/api/brands/{brand}` | BrandController@update | yes |
| DELETE | `/api/brands/{brand}` | BrandController@destroy | yes |
| GET | `/api/categories` | CategoryController@index | yes |
| POST | `/api/categories` | CategoryController@store | yes |
| GET | `/api/categories/{category}` | CategoryController@show | yes |
| PUT|PATCH | `/api/categories/{category}` | CategoryController@update | yes |
| DELETE | `/api/categories/{category}` | CategoryController@destroy | yes |
| GET | `/api/category` | CategoryController@index | yes |
| POST | `/api/category` | CategoryController@store | yes |
| GET | `/api/category/{category}` | CategoryController@show | yes |
| PUT|PATCH | `/api/category/{category}` | CategoryController@update | yes |
| DELETE | `/api/category/{category}` | CategoryController@destroy | yes |
| GET | `/api/taxes/grouped` | TaxController@groupedSummary | yes |
| GET | `/api/tax` | TaxController@index | yes |
| POST | `/api/tax` | TaxController@store | yes |
| GET | `/api/tax/{tax}` | TaxController@show | yes |
| PUT|PATCH | `/api/tax/{tax}` | TaxController@update | yes |
| DELETE | `/api/tax/{tax}` | TaxController@destroy | yes |
| GET | `/api/taxes` | TaxController@index | yes |
| POST | `/api/taxes` | TaxController@store | yes |
| GET | `/api/taxes/{tax}` | TaxController@show | yes |
| PUT|PATCH | `/api/taxes/{tax}` | TaxController@update | yes |
| DELETE | `/api/taxes/{tax}` | TaxController@destroy | yes |
| GET | `/api/suppliers/grouped` | SupplierController@groupedSummary | yes |
| GET | `/api/suppliers` | SupplierController@index | yes |
| POST | `/api/suppliers` | SupplierController@store | yes |
| GET | `/api/suppliers/{supplier}` | SupplierController@show | yes |
| PUT|PATCH | `/api/suppliers/{supplier}` | SupplierController@update | yes |
| DELETE | `/api/suppliers/{supplier}` | SupplierController@destroy | yes |
| GET | `/api/supplier` | SupplierController@index | yes |
| POST | `/api/supplier` | SupplierController@store | yes |
| GET | `/api/supplier/{supplier}` | SupplierController@show | yes |
| PUT|PATCH | `/api/supplier/{supplier}` | SupplierController@update | yes |
| DELETE | `/api/supplier/{supplier}` | SupplierController@destroy | yes |
| GET | `/api/agents/grouped` | AgentController@groupedSummary | yes |
| GET | `/api/agents` | AgentController@index | yes |
| POST | `/api/agents` | AgentController@store | yes |
| GET | `/api/agents/{agent}` | AgentController@show | yes |
| PUT|PATCH | `/api/agents/{agent}` | AgentController@update | yes |
| DELETE | `/api/agents/{agent}` | AgentController@destroy | yes |
| GET | `/api/agent` | AgentController@index | yes |
| POST | `/api/agent` | AgentController@store | yes |
| GET | `/api/agent/{agent}` | AgentController@show | yes |
| PUT|PATCH | `/api/agent/{agent}` | AgentController@update | yes |
| DELETE | `/api/agent/{agent}` | AgentController@destroy | yes |
| GET | `/api/transports/grouped` | TransportController@groupedSummary | yes |
| GET | `/api/transports` | TransportController@index | yes |
| POST | `/api/transports` | TransportController@store | yes |
| GET | `/api/transports/{transport}` | TransportController@show | yes |
| PUT|PATCH | `/api/transports/{transport}` | TransportController@update | yes |
| DELETE | `/api/transports/{transport}` | TransportController@destroy | yes |
| GET | `/api/transport` | TransportController@index | yes |
| POST | `/api/transport` | TransportController@store | yes |
| GET | `/api/transport/{transport}` | TransportController@show | yes |
| PUT|PATCH | `/api/transport/{transport}` | TransportController@update | yes |
| DELETE | `/api/transport/{transport}` | TransportController@destroy | yes |

## Notifications

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/notifications/push/config` | PushSubscriptionController@config | yes |
| POST | `/api/notifications/push/subscription` | PushSubscriptionController@store | yes |
| DELETE | `/api/notifications/push/subscription` | PushSubscriptionController@destroy | yes |
| GET | `/api/notification-preferences` | NotificationPreferenceController@show | yes |
| PUT | `/api/notification-preferences` | NotificationPreferenceController@update | yes |
| POST | `/api/realtime/auth` | RealtimeController@auth | yes |
| GET | `/api/notifications` | NotificationController@index | yes |
| GET | `/api/notifications/banners` | NotificationController@banners | yes |
| GET | `/api/notifications/unread-count` | NotificationController@unreadCount | yes |
| POST | `/api/notifications/{id}/read` | NotificationController@markRead | yes |
| POST | `/api/notifications/read-all` | NotificationController@markAllRead | yes |

## Other

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/health` | Closure | no |

## Platform

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/activation/status` | ActivationController@status | no |
| POST | `/api/activation/register` | ActivationController@register | no |
| POST | `/api/activation/bootstrap-register` | ActivationController@bootstrapRegister | no |
| POST | `/api/activation/set-password` | ActivationController@setPassword | no |
| GET | `/api/activation/password-setup-check` | ActivationController@passwordSetupCheck | no |
| GET | `/api/connector/web-config` | SyncController@webConfig | no |
| POST | `/api/sync/heartbeat` | SyncController@heartbeat | no |
| GET | `/api/sync/outbound/next` | SyncController@outboundNext | no |
| POST | `/api/sync/outbound/ack` | SyncController@outboundAck | no |
| GET|POST | `/api/sync/run-cycle` | SyncController@runCycle | no |
| GET | `/api/sync/catch-up-export` | SyncController@catchUpExport | no |
| GET | `/api/sync/nodes` | SyncController@nodes | yes |
| GET | `/api/sync/outbox` | SyncController@outboxEvents | yes |
| POST | `/api/sync/outbox/{id}/retry` | SyncController@retryOutboxEvent | yes |
| POST | `/api/sync/outbox/retry-all` | SyncController@retryAllFailed | yes |
| GET | `/api/company-stores` | StoreActivationController@index | yes |
| POST | `/api/company-stores/sync` | StoreActivationController@sync | yes |
| POST | `/api/company-stores/activate` | StoreActivationController@activate | yes |
| GET | `/api/companies/tenant-sync/overview` | StoreActivationController@overview | yes |
| POST | `/api/companies/tenant-sync/pull` | StoreActivationController@sync | yes |

## Sales

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/pos-sales/next-bill-no` | PosSaleController@nextBillNo | yes |
| GET | `/api/pos-sales/offline/series` | PosOfflineController@series | yes |
| GET | `/api/pos-sales/offline/catalog` | PosOfflineController@catalog | yes |
| GET | `/api/pos-sales/offline/review` | PosOfflineController@review | yes |
| POST | `/api/pos-sales/offline/review/{id}` | PosOfflineController@markReviewed | yes |
| GET | `/api/pos-sales/latest-document` | PosSaleController@latestDocument | yes |
| GET | `/api/pos-sale/next-bill-no` | PosSaleController@nextBillNo | yes |
| GET | `/api/pos-sales/salesman-lookup` | PosSaleController@salesmanLookup | yes |
| GET | `/api/pos-sales/summary-report` | PosSaleController@summaryReport | yes |
| GET | `/api/pos-sales/stock-products` | PosSaleController@stockProducts | yes |
| GET | `/api/pos-sales/barcode-lookup` | PosSaleController@barcodes | yes |
| GET | `/api/pos-sales/stock-rules` | PosSaleController@stockRules | yes |
| GET | `/api/pos-sales/grouped` | PosSaleController@groupedSummary | yes |
| GET | `/api/touch-sales/next-bill-no` | PosSaleController@touchSalesNextBillNo | yes |
| GET | `/api/touch-sales` | PosSaleController@touchSales | yes |
| GET | `/api/pos-old-sales/last-receipt` | PosSaleController@lastReceipt | yes |
| GET | `/api/pos-old-sales/lookup-sale` | PosSaleController@lookupSale | yes |
| GET | `/api/pos-old-sales/session-summary` | PosSaleController@sessionSummary | yes |
| GET | `/api/pos-old-sales/next-bill-no` | PosSaleController@nextBillNo | yes |
| GET | `/api/pos-old-sales/grouped` | PosSaleController@oldSalesGroupedSummary | yes |
| GET | `/api/pos-old-sales` | PosSaleController@posOldSales | yes |
| POST | `/api/pos-old-sales` | PosSaleController@storeLegacy | yes |
| GET | `/api/pos-returns/next-return-no` | PosReturnController@nextReturnNo | yes |
| GET | `/api/pos-returns/source-bill` | PosReturnController@sourceBill | yes |
| GET | `/api/pos-returns/source-by-barcode` | PosReturnController@sourceByBarcode | yes |
| GET | `/api/pos-returns/return-product-barcode` | PosReturnController@returnProductBarcode | yes |
| GET | `/api/pos-returns/credit-return` | PosReturnController@lookupCredit | yes |
| GET | `/api/pos-returns/grouped` | PosReturnController@groupedSummary | yes |
| GET | `/api/pos-returns` | PosReturnController@index | yes |
| POST | `/api/pos-returns` | PosReturnController@store | yes |
| GET | `/api/pos-returns/{id}` | PosReturnController@show | yes |
| GET | `/api/approvals/limits` | ApprovalController@limits | yes |
| PUT | `/api/approvals/limits` | ApprovalController@updateLimits | yes |
| GET | `/api/approvals/my-limit` | ApprovalController@myLimit | yes |
| PUT | `/api/approvals/pin` | ApprovalController@setPin | yes |
| POST | `/api/approvals/requests` | ApprovalController@requestApproval | yes |
| POST | `/api/approvals/pin-approve` | ApprovalController@pinApprove | yes |
| GET | `/api/approvals/requests/{id}` | ApprovalController@status | yes |
| POST | `/api/approvals/requests/{id}/withdraw` | ApprovalController@withdraw | yes |
| GET | `/api/approvals/inbox` | ApprovalController@inbox | yes |
| GET | `/api/approvals/pending-count` | ApprovalController@pendingCount | yes |
| POST | `/api/approvals/requests/{id}/approve` | ApprovalController@approve | yes |
| POST | `/api/approvals/requests/{id}/reject` | ApprovalController@reject | yes |
| GET | `/api/sales-on-approval/next-approval-no` | SalesApprovalController@nextApprovalNo | yes |
| GET | `/api/sales-on-approval/pending-count` | SalesApprovalController@pendingCount | yes |
| POST | `/api/sales-on-approval/{id}/accept` | SalesApprovalController@accept | yes |
| POST | `/api/sales-on-approval/{id}/reject` | SalesApprovalController@reject | yes |
| POST | `/api/sales-on-approval/{id}/bill` | SalesApprovalController@bill | yes |
| GET | `/api/sales-on-approval/grouped` | SalesApprovalController@groupedSummary | yes |
| GET | `/api/sales-on-approval` | SalesApprovalController@index | yes |
| POST | `/api/sales-on-approval` | SalesApprovalController@store | yes |
| GET | `/api/sales-on-approval/{sales_on_approval}` | SalesApprovalController@show | yes |
| GET | `/api/dealer-invoices/next-bill-no` | DealerInvoiceController@nextBillNo | yes |
| GET | `/api/dealer-invoice-returns/next-return-no` | DealerInvoiceController@nextReturnNo | yes |
| GET | `/api/dealer-invoice-returns/grouped` | DealerInvoiceController@returnsGroupedSummary | yes |
| GET | `/api/dealer-invoice-returns` | DealerInvoiceController@returnsIndex | yes |
| POST | `/api/dealer-invoice-returns` | DealerInvoiceController@returnsStore | yes |
| GET | `/api/dealer-invoices/grouped` | DealerInvoiceController@groupedSummary | yes |
| GET | `/api/dealer-invoices` | DealerInvoiceController@index | yes |
| POST | `/api/dealer-invoices` | DealerInvoiceController@store | yes |
| GET | `/api/dealer-invoices/{dealer_invoice}` | DealerInvoiceController@show | yes |
| DELETE | `/api/dealer-invoices/{dealer_invoice}` | DealerInvoiceController@destroy | yes |
| GET | `/api/cash-openings/meta` | CashRegisterController@openingMeta | yes |
| GET | `/api/cash-openings` | CashRegisterController@openingIndex | yes |
| POST | `/api/cash-openings` | CashRegisterController@openingStore | yes |
| GET | `/api/cash-closings/meta` | CashRegisterController@closingMeta | yes |
| GET | `/api/cash-closings/next-bill-no` | CashRegisterController@closingNextBillNo | yes |
| GET | `/api/cash-closings/opening-amount` | CashRegisterController@openingAmount | yes |
| GET | `/api/cash-closings` | CashRegisterController@closingIndex | yes |
| POST | `/api/cash-closings` | CashRegisterController@closingStore | yes |
| GET | `/api/settlements/next-settlement-number` | SettlementController@nextSettlementNumber | yes |
| GET | `/api/settlements/unpaid-bills` | SettlementController@unpaidBills | yes |
| GET | `/api/settlements/bill/{billNo}` | SettlementController@getBill | yes |
| GET | `/api/settlements` | SettlementController@index | yes |
| POST | `/api/settlements` | SettlementController@store | yes |
| GET | `/api/settlements/{id}` | SettlementController@getBill | yes |
| GET | `/api/sales-reports` | SalesReportController@index | yes |
| GET | `/api/sales-comparer` | SalesReportController@salesComparer | yes |
| GET | `/api/sales-vs-purchase` | SalesReportController@salesVsPurchase | yes |
| GET | `/api/sales-vs-stock` | SalesReportController@salesVsStock | yes |
| GET | `/api/sales-pivot` | SalesReportController@salesPivot | yes |
| GET | `/api/pos-sales` | PosSaleController@index | yes |
| POST | `/api/pos-sales` | PosSaleController@store | yes |
| GET | `/api/pos-sales/{pos_sale}` | PosSaleController@show | yes |
| PUT|PATCH | `/api/pos-sales/{pos_sale}` | PosSaleController@update | yes |
| DELETE | `/api/pos-sales/{pos_sale}` | PosSaleController@destroy | yes |
| GET | `/api/pos-sale` | PosSaleController@index | yes |
| POST | `/api/pos-sale` | PosSaleController@store | yes |
| GET | `/api/pos-sale/{pos_sale}` | PosSaleController@show | yes |
| PUT|PATCH | `/api/pos-sale/{pos_sale}` | PosSaleController@update | yes |
| DELETE | `/api/pos-sale/{pos_sale}` | PosSaleController@destroy | yes |

## Settings

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET|POST | `/api/local-server-config/test` | SettingsController@localServerTest | yes |
| GET|POST | `/api/local-server-config/test-cloud` | SettingsController@cloudServerTest | yes |
| GET|PUT | `/api/user-access/{id}/client-access` | UserAccessController@clientAccess | yes |
| GET | `/api/companies/subscription/status` | StoreController@subscriptionStatus | yes |
| POST | `/api/companies/subscription/notices/{id}/dismiss` | StoreController@subscriptionStatus | yes |
| GET | `/api/tenant/theme-history` | ThemeWorkspaceController@history | yes |
| DELETE | `/api/tenant/theme-history` | ThemeWorkspaceController@removeHistory | yes |
| DELETE | `/api/tenant/theme-history/{revisionId}` | ThemeWorkspaceController@removeHistory | yes |
| POST | `/api/tenant/theme-history/{revisionId}/restore` | ThemeWorkspaceController@restore | yes |
| GET | `/api/companies/{id}/theme-history` | ThemeWorkspaceController@history | yes |
| DELETE | `/api/companies/{id}/theme-history` | ThemeWorkspaceController@removeHistory | yes |
| DELETE | `/api/companies/{id}/theme-history/{revisionId}` | ThemeWorkspaceController@removeHistory | yes |
| POST | `/api/companies/{id}/theme-history/{revisionId}/restore` | ThemeWorkspaceController@restore | yes |
| GET | `/api/tenant/theme` | ThemeWorkspaceController@index | yes |
| PUT | `/api/tenant/theme` | ThemeWorkspaceController@update | yes |
| GET | `/api/tenant/theme-presets` | ThemeWorkspaceController@presets | yes |
| POST | `/api/tenant/theme-presets` | ThemeWorkspaceController@savePreset | yes |
| POST | `/api/tenant/theme-presets/{presetId}/apply` | ThemeWorkspaceController@applyPreset | yes |
| DELETE | `/api/tenant/theme-presets/{presetId}` | ThemeWorkspaceController@deletePreset | yes |
| GET | `/api/companies/{id}/theme` | SettingsController@getTheme | yes |
| PUT | `/api/companies/{id}/theme` | SettingsController@updateTheme | yes |
| GET | `/api/companies/{id}/theme-presets` | SettingsController@listThemePresets | yes |
| POST | `/api/companies/{id}/theme-presets` | SettingsController@saveThemePreset | yes |
| POST | `/api/companies/{id}/theme-presets/{presetId}/apply` | SettingsController@applyThemePreset | yes |
| DELETE | `/api/companies/{id}/theme-presets/{presetId}` | SettingsController@deleteThemePreset | yes |
| POST | `/api/companies/{id}/force-logout` | UserAccessController@forceLogout | yes |
| GET | `/api/companies/{id}` | StoreController@show | yes |
| PUT | `/api/companies/{id}` | StoreController@update | yes |
| DELETE | `/api/companies/{id}` | StoreController@destroy | yes |
| POST | `/api/companies` | StoreController@store | yes |
| GET | `/api/companies` | StoreController@index | yes |
| GET | `/api/admin/monitoring/companies` | StoreController@index | yes |
| POST | `/api/admin/notify` | SettingsController@notify | yes |
| GET | `/api/backups/overview` | BackupController@overview | yes |
| GET|POST|PUT | `/api/backups/settings` | BackupController@settings | yes |
| POST | `/api/backups/cloud-test` | BackupController@cloudTest | yes |
| GET|POST | `/api/backups/scheduled-run` | BackupController@scheduledRun | no |
| POST | `/api/backups/import` | BackupController@import | yes |
| GET | `/api/backups/{id}/download` | BackupController@download | yes |
| GET | `/api/backups/{id}/logs` | BackupController@logs | yes |
| POST | `/api/backups/{id}/restore` | BackupController@restore | yes |
| DELETE | `/api/backups/{id}` | BackupController@destroy | yes |
| POST | `/api/backups` | BackupController@store | yes |
| GET | `/api/printer-configs/resolve` | SettingsController@printerConfigsResolve | yes |
| GET | `/api/local-printer-service/meta` | SettingsController@localPrinterMeta | yes |
| GET | `/api/local-printer-service/installer` | SettingsController@localPrinterInstaller | yes |
| GET|POST|PUT | `/api/sales-customization` | SettingsController@salesCustomization | yes |
| GET|POST|PUT | `/api/sales-customisation` | SettingsController@salesCustomization | yes |
| GET | `/api/user-access/groups` | UserAccessController@groupsIndex | yes |
| POST | `/api/user-access/groups` | UserAccessController@groupsStore | yes |
| PUT | `/api/user-access/groups/{id}` | UserAccessController@groupsUpdate | yes |
| DELETE | `/api/user-access/groups/{id}` | UserAccessController@groupsDestroy | yes |
| GET | `/api/user-access/store-groups` | UserAccessController@storeGroupsIndex | yes |
| POST | `/api/user-access/store-groups` | UserAccessController@storeGroupsStore | yes |
| PUT | `/api/user-access/store-groups/{id}` | UserAccessController@storeGroupsUpdate | yes |
| DELETE | `/api/user-access/store-groups/{id}` | UserAccessController@storeGroupsDestroy | yes |
| POST | `/api/user-access/{id}/force-logout` | UserAccessController@forceLogout | yes |
| GET | `/api/user-access` | UserAccessController@index | yes |
| POST | `/api/user-access` | UserAccessController@store | yes |
| GET | `/api/user-access/{id}` | UserAccessController@show | yes |
| PUT | `/api/user-access/{id}` | UserAccessController@update | yes |
| DELETE | `/api/user-access/{id}` | UserAccessController@destroy | yes |
| GET | `/api/user-table-preferences/{tableKey}` | UserAccessController@getTablePreferences | yes |
| PUT | `/api/user-table-preferences/{tableKey}` | UserAccessController@updateTablePreferences | yes |
| GET | `/api/remote-support/config` | RemoteSupportController@config | yes |
| POST | `/api/remote-support/request` | RemoteSupportController@requestSession | yes |
| GET | `/api/remote-support/active` | RemoteSupportController@activeSession | yes |
| POST | `/api/remote-support/{id}/cancel` | RemoteSupportController@cancelSession | yes |
| GET | `/api/remote-support/sessions` | RemoteSupportController@index | yes |
| POST | `/api/remote-support/{id}/end` | RemoteSupportController@endSession | yes |

## Store

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/purchase-orders/suggestions` | PurchaseOrderController@suggestions | yes |
| POST | `/api/purchase-orders/generate` | PurchaseOrderController@generate | yes |
| POST | `/api/purchase-orders/{id}/approve` | PurchaseOrderController@approve | yes |
| POST | `/api/purchase-orders/{id}/cancel` | PurchaseOrderController@cancel | yes |
| POST | `/api/purchase-orders/{id}/close` | PurchaseOrderController@close | yes |
| GET | `/api/purchase-orders` | PurchaseOrderController@index | yes |
| POST | `/api/purchase-orders` | PurchaseOrderController@store | yes |
| GET | `/api/purchase-orders/{purchase_order}` | PurchaseOrderController@show | yes |
| PUT|PATCH | `/api/purchase-orders/{purchase_order}` | PurchaseOrderController@update | yes |
| DELETE | `/api/purchase-orders/{purchase_order}` | PurchaseOrderController@destroy | yes |
| GET | `/api/stock-outwards/destinations` | StockOutwardController@destinations | yes |
| POST | `/api/stock-outwards/{id}/receive` | StockOutwardController@receive | yes |
| POST | `/api/stock-outwards/{id}/cancel` | StockOutwardController@cancel | yes |
| GET | `/api/stock-outwards` | StockOutwardController@index | yes |
| POST | `/api/stock-outwards` | StockOutwardController@store | yes |
| GET | `/api/stock-outwards/{stock_outward}` | StockOutwardController@show | yes |
| PUT|PATCH | `/api/stock-outwards/{stock_outward}` | StockOutwardController@update | yes |
| DELETE | `/api/stock-outwards/{stock_outward}` | StockOutwardController@destroy | yes |

## Warehouse

| Method | Path | Controller action | Auth |
|---|---|---|---|
| GET | `/api/transport-entries/next-lr-number` | TransportEntryController@nextLrNumber | yes |
| GET | `/api/transport-entries/duplicates` | TransportEntryController@duplicates | yes |
| POST | `/api/transport-entries/{id}/attachments` | TransportEntryController@storeAttachment | yes |
| DELETE | `/api/transport-entries/attachments/{attId}` | TransportEntryController@destroyAttachment | yes |
| GET | `/api/transport-entries/next-issue-number` | TransportEntryController@nextIssueNumber | yes |
| GET | `/api/transport-entries/next-receipt-number` | TransportEntryController@nextReceiptNumber | yes |
| GET | `/api/transport-entries/grouped` | TransportEntryController@groupedSummary | yes |
| GET | `/api/transport-entries` | TransportEntryController@index | yes |
| POST | `/api/transport-entries` | TransportEntryController@store | yes |
| GET | `/api/transport-entries/{transport_entry}` | TransportEntryController@show | yes |
| PUT|PATCH | `/api/transport-entries/{transport_entry}` | TransportEntryController@update | yes |
| DELETE | `/api/transport-entries/{transport_entry}` | TransportEntryController@destroy | yes |
| GET | `/api/invoices/grouped` | PurchaseInvoiceController@groupedSummary | yes |
| GET | `/api/invoices` | PurchaseInvoiceController@index | yes |
| POST | `/api/invoices` | PurchaseInvoiceController@store | yes |
| GET | `/api/invoices/{invoice}` | PurchaseInvoiceController@show | yes |
| PUT|PATCH | `/api/invoices/{invoice}` | PurchaseInvoiceController@update | yes |
| DELETE | `/api/invoices/{invoice}` | PurchaseInvoiceController@destroy | yes |
| GET | `/api/inventory-entries/grouped` | InventoryEntryController@groupedSummary | yes |
| GET | `/api/inventory-entries` | InventoryEntryController@index | yes |
| POST | `/api/inventory-entries` | InventoryEntryController@store | yes |
| GET | `/api/inventory-entries/{inventory_entry}` | InventoryEntryController@show | yes |
| PUT|PATCH | `/api/inventory-entries/{inventory_entry}` | InventoryEntryController@update | yes |
| DELETE | `/api/inventory-entries/{inventory_entry}` | InventoryEntryController@destroy | yes |
| POST | `/api/direct-purchases/bulk` | DirectPurchaseController@bulk | yes |
| POST | `/api/purchase-entry/bulk` | DirectPurchaseController@bulk | yes |
| GET | `/api/direct-purchases/grouped` | DirectPurchaseController@groupedSummary | yes |
| GET | `/api/direct-purchases` | DirectPurchaseController@index | yes |
| POST | `/api/direct-purchases` | DirectPurchaseController@store | yes |
| GET | `/api/direct-purchases/{direct_purchase}` | DirectPurchaseController@show | yes |
| PUT|PATCH | `/api/direct-purchases/{direct_purchase}` | DirectPurchaseController@update | yes |
| DELETE | `/api/direct-purchases/{direct_purchase}` | DirectPurchaseController@destroy | yes |
| GET | `/api/purchase-entry` | DirectPurchaseController@index | yes |
| POST | `/api/purchase-entry` | DirectPurchaseController@store | yes |
| GET | `/api/purchase-entry/{purchase_entry}` | DirectPurchaseController@show | yes |
| PUT|PATCH | `/api/purchase-entry/{purchase_entry}` | DirectPurchaseController@update | yes |
| DELETE | `/api/purchase-entry/{purchase_entry}` | DirectPurchaseController@destroy | yes |
| GET | `/api/barcodes/source-item` | BarcodeController@sourceItem | yes |
| PUT | `/api/barcodes/source-item` | BarcodeController@updateSourceItem | yes |
| GET | `/api/barcodes/physical-stock` | BarcodeController@physicalStock | yes |
| POST | `/api/barcodes/generate` | BarcodeController@generate | yes |
| GET | `/api/barcodes` | BarcodeController@index | yes |
| POST | `/api/barcodes` | BarcodeController@generateSingle | yes |
| GET | `/api/physical-stocks` | PhysicalStockController@index | yes |
| POST | `/api/physical-stocks` | PhysicalStockController@store | yes |
| GET | `/api/physical-stocks/{physical_stock}` | PhysicalStockController@show | yes |
| PUT|PATCH | `/api/physical-stocks/{physical_stock}` | PhysicalStockController@update | yes |
| DELETE | `/api/physical-stocks/{physical_stock}` | PhysicalStockController@destroy | yes |
| GET | `/api/purchase-returns/stock-search` | PurchaseReturnController@stockSearch | yes |
| GET | `/api/purchase-returns/grouped` | PurchaseReturnController@groupedSummary | yes |
| GET | `/api/purchase-returns` | PurchaseReturnController@index | yes |
| POST | `/api/purchase-returns` | PurchaseReturnController@store | yes |
| GET | `/api/purchase-returns/{purchase_return}` | PurchaseReturnController@show | yes |
| PUT|PATCH | `/api/purchase-returns/{purchase_return}` | PurchaseReturnController@update | yes |
| DELETE | `/api/purchase-returns/{purchase_return}` | PurchaseReturnController@destroy | yes |
| GET | `/api/item-locator` | ItemLocatorController@index | yes |
| GET | `/api/warehouse-reports` | WarehouseReportController@index | yes |
| GET | `/api/stock-analyzer` | WarehouseReportController@stockAnalyzer | yes |
| GET | `/api/stock-pivot` | WarehouseReportController@stockPivot | yes |
| GET|POST|PUT | `/api/warehouse-customisation` | WarehouseReportController@warehouseCustomization | yes |
| GET|POST|PUT | `/api/warehouse-customization` | WarehouseReportController@warehouseCustomization | yes |
