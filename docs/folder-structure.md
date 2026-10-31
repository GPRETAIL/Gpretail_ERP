# Folder structure and naming

How the code is laid out, and the rules new code follows. The backend uses Laravel's standard
layout grouped by business module; the frontend uses feature folders.

## Repository

```
backend-laravel/     Laravel 13 API (Sanctum, MariaDB/MySQL)
frontend/            React 19 + Vite + MUI single-page app, Playwright e2e suite in frontend/e2e
docs/                architecture, API reference, deployment, testing; reports/ (dated audits), features/, history/
.github/             CI/CD workflow and the Hostinger deploy script
```

## Backend (`backend-laravel/`)

```
app/
  Console/Commands/              scheduled and maintenance commands (see docs/deployment.md)
  Enums/                         backed enums: PurchaseOrderStatus, TransferStatus, ManualVoucherType
  Exceptions/                    domain exceptions (InsufficientStock, ApprovalRequired, ...)
  Http/
    Controllers/Api/V1/<Module>/ one folder per module (table below)
    Controllers/Concerns/        controller traits (ImportsMasterRows)
    Middleware/                  store context, permissions, sync replay/outbox, security headers, timing
    Requests/<Module>/           Form Requests; all extend Requests/ApiFormRequest
  Models/                        Eloquent models (flat, Laravel convention)
  Providers/
  Services/<Module>/             business logic (table below)
  Support/                       small framework-free helpers (pagination, grouping)
routes/
  api.php                        public entry routes + loads the signed-in module files
  api/<module>.php               signed-in routes, one file per module
  invoice_ai.php, console.php (schedule), web.php
tests/
  Feature/<Module>/  Unit/  Support/
```

| Module | Controllers | Services |
|---|---|---|
| Auth | AuthController, MobileAccessController | |
| Masters | Agent, Brand, Category, Configuration, Item, Lookup, MasterImport, ProductAttribute, Product, Size, Supplier, Tax, Transport | Forms/ (form-data builders) |
| Hr | Employee, HrConfiguration, Attendance | |
| Warehouse | Barcode, DirectPurchase, InventoryEntry, InvoiceAi, ItemLocator, PhysicalStock, PurchaseInvoice, PurchaseReturn, TransportEntry, WarehouseReport | Inventory/ (stock, FIFO batches, variants, reorder, transfers), Documents/ (numbering, OCR) |
| Sales | PosSale, PosReturn, PosOffline, CashRegister, Settlement, DealerInvoice, SalesApproval, Approval, SalesReport | Pos/, Approvals/ |
| Crm | Customer, CustomerOrder, Loyalty | |
| Finance | Accounting, SupplierPayment | Accounting/ |
| Store | PurchaseOrder, StockOutward | Inventory/ |
| Analytical | ProductPurchaseAnalytics | |
| Settings | Settings, Company, Store, UserAccess, Backup, ThemeWorkspace, RemoteSupport | Backup/, Settings/ |
| Platform | Activation, StoreActivation, Sync | Platform/ (activation, licences, sync, push) |
| Notifications | Notification, NotificationPreference, PushSubscription, Realtime | Notifications/ |
| Dashboards | Dashboard, DashboardLayout + one per module tab | Dashboards/ |
| (cross-cutting) | | Tenancy/ (store context, store scope, permissions), Security/ (failed attempts, Google sign-in) |

Controller class names are part of the permission system: `BusinessPermissions` and mobile access
look a controller up by its class name, so renaming a controller class is a permissions change.

### Validation

New endpoints validate with a Form Request in `app/Http/Requests/<Module>/`, named
`<Action><Thing>Request` (`StorePosReturnRequest`, `UpdateApprovalLimitsRequest`), extending
`ApiFormRequest`. If the screen expects a non-standard 422 body, override `errorBody()`.

Some older actions still validate inline, on purpose:

- **Called directly from code.** Bulk Excel import calls the master `store` actions row by row with a
  plain request, and some actions call each other. A Form Request would skip validation on those calls.
- **Validation runs after other work.** Moving it into a Form Request would change which error wins.

Convert one of these only together with its callers and a test.

## Frontend (`frontend/src/`)

```
main.jsx, index.css              entry point and global styles
app/                             App.jsx, store.js (Redux), routes.jsx (every protected route)
shared/
  api/                           apiClient (axios), caching, runtime routing, realtime client
  components/                    generic UI: PageHeader, FilterableDataTable, SearchGridPanel, dialogs, selects ...
  layout/                        MainLayout, Navbar, Sidebar, tabs, store switcher, nav items
  hooks/  utils/  theme/  brand/
features/<feature>/              auth, activation, licence, dashboard, masters, hr, warehouse, sales,
                                 crm, finance, store, analytical, settings, notifications, printing, sync
mobile/                          the /app mobile workspace (self-contained)
test/setup.js                    Vitest setup
```

Inside a feature, routed screens sit at the top of the folder. Supporting code goes in
`components/`, `hooks/`, `context/`, `utils/` and `api/`. Bigger features split into sub-features
the same way: `warehouse/purchase-invoice/`, `sales/pos/`, `sales/pos/offline/`.

Import across folders with the `@/` alias (`import PageHeader from "@/shared/components/PageHeader"`);
use `./` only for files in the same folder or below.

## Naming rules

| What | Rule | Example |
|---|---|---|
| Frontend folders | lowercase kebab-case | `purchase-invoice/` |
| React components and screens | `PascalCase.jsx`, named for what they show, without repeating the folder; the component has the file's name | `crm/CustomerList.jsx` |
| Entry / search screens | `<Document>Entry.jsx` / `<Document>Search.jsx` | `PurchaseReturnSearch.jsx` |
| Hooks | `useThing.js` | `usePosOffline.js` |
| Other JS modules | `camelCase.js` | `themeContext.js` |
| Acronyms | written as words | `PosSales.jsx` |
| Spelling in file names | British, as in the UI | `SalesCustomisation.jsx` |
| Frontend tests | `Name.test.jsx` (or `Name.topic.test.jsx`) in `__tests__/` beside the code | |
| PHP classes | PascalCase with a role suffix | `…Controller`, `…Request`, `…Service` |
| PHP tests | `<Behaviour>Test.php`, never named after a project phase | `TenantIsolationTest.php` |
| Docs | `kebab-case.md`; dated reports as `docs/reports/YYYY-MM-DD-topic.md` | |

API field names and stored settings keys (for example `customization` in saved JSON) are part of the
data contract. They are never renamed to match file names.
