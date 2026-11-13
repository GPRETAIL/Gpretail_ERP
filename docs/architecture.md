# Architecture

GPRETAIL is a multi-store retail ERP: one Laravel API serves the desktop ERP screens, the POS tills
and the `/app` mobile workspace. Each store's data is kept apart from every other store's.

```
React SPA (frontend/)  ──HTTPS──▶  Laravel API (backend-laravel/)  ──▶  MariaDB / MySQL
   │  desktop ERP, POS, /app mobile         │
   │                                        ├─▶ Pusher (realtime dashboards and notifications)
   └─ local print connector (ws://:5001)    └─▶ platform server (activation, licences, sync, push)
```

## A request, end to end

1. **Sign-in.** `AuthController@login` issues a Sanctum token. Failed attempts are counted per account
   and IP (`Services/Security/FailedAttempts`). Signed-in routes sit behind `auth:sanctum`. An unknown
   username still costs one password-hash check, so response time doesn't reveal which accounts exist.
   The app pages carry `SecurityHeaders::APP_POLICY` (CSP: scripts only from the app and Google sign-in), served
   by `routes/web.php`; `public/.htaccess` sends `/` and `index.html` there. Print popups are printed by the
   opener, because the popup inherits the policy and inline scripts are blocked. The backup and sync cron
   endpoints take their token only from a header (`X-Backup-Cron-Token`, `X-Sync-Cron-Token`) or a POST body.
2. **Store context.** Every request names the selected store (`X-Store-Id`, or `store_id` in the body).
   `ResolveStoreContext` checks it against the user's stores and records it on the request.
3. **Permission.** `AuthorizeBusinessAction` maps the controller class and action to an ability
   (`Services/Tenancy/BusinessPermissions`) and checks it against the user's role and page grants.
4. **Data isolation.** Store-owned models use `StoreModelScope`: reads only see the selected store's rows,
   and writes are stamped with the selected store. Raw queries go through `StoreQuery`. A tenant admin
   can see every store; everyone else sees only their own.
5. **Validation.** Form Requests in `app/Http/Requests`, or inline in older actions (see
   `docs/folder-structure.md`).
6. **Sync capture.** `CaptureSyncOutbox` records changes for the platform; `AuthenticateSyncReplay` lets
   the platform replay them.

## Main flows

| Flow | Where | Notes |
|---|---|---|
| POS billing | `Sales/PosSaleController`, `Services/Pos` | Checkout is idempotent (`checkoutKey`); stock is taken FIFO from batches (`Services/Inventory/StockService`) |
| Offline billing | `Sales/PosOfflineController`, `frontend/src/features/sales/pos/offline` | Tills bill under an offline series `F{counter}`; bills sync later and conflicts are flagged for manager review |
| On-prem failover | `Services/Platform/LocalNodeRegistration`, `FailoverIdentity`, `SyncCycleService`, `frontend/src/shared/api/runtimeRouting.js` | See "On-prem server and cloud failover" below |
| Discount and refund approvals | `Services/Approvals/ApprovalService` | Per-role limits; supervisor PIN with lockout |
| Returns | `Sales/PosReturnController` | Refund is prorated from the bill line (discount and tax included) |
| Cash register | `Sales/CashRegisterController`, `Services/Sales/CashRegisterService` | One drawer per counter: Cash Opening counts the float, Cash Closing (also POS Old's Close) counts the drawer against opening + cash taken (less change, split bills included) − cash refunds − counter expenses |
| Purchasing | `Warehouse/*` | Purchase invoices, inventory entries, direct purchases, barcodes, LR/transport |
| Store transfers | `Store/StockOutwardController` | Dispatched → in transit → received or cancelled (`Enums/TransferStatus`) |
| Purchase orders | `Store/PurchaseOrderController`, `Services/Inventory/ReorderService` | A nightly reorder run drafts orders per supplier (`Enums/PurchaseOrderStatus`) |
| Accounting | `Services/Accounting` | Documents post double-entry vouchers automatically when saved; reports: trial balance, P&L, balance sheet, daybook, outstanding |
| Printing | `frontend/src/features/printing` | Receipts, invoices and barcode labels; silent printing through the local print connector |

## Background work

Shared hosting runs no queue workers, so background work is done by scheduled commands through cron
(`routes/console.php`):

| Command | When |
|---|---|
| `platform:sync` | every 5 minutes |
| `platform:notifications-sync` | every minute |
| `purchase-orders:generate` | 02:30 daily |
| `accounting:post` | 02:45 daily (catch-up for any document that did not post) |
| `security:purge-plaintext-snapshots --encrypt` | 03:15 daily |
| `ops:error-alerts` | every 10 minutes (see "Error alerts" below) |

Realtime updates use hosted Pusher, configured in `.env`.

## When the frontend crashes

`shared/components/ErrorBoundary.jsx` contains a crash to the part it happened in: the page area
(reset when the path changes), each dashboard widget, each HRMS app tab and `/app` screen, and the print
preview. The menu, header and tabs stay usable, and the user sees an honest message with a reference such
as `E-7F3K2`. After a deploy, a missing code file reloads the page once instead (guarded so it never loops).
Every other crash, plus errors outside React (`window` error and unhandled promise rejections), is sent by
`shared/utils/clientErrors.js` to `POST /api/client-errors`, which writes it with the user, store and page
to `storage/logs/client-errors-*.log` (kept 14 days). Search that log for the reference a user quotes.
Cancelled requests and 4xx API errors are not reported, and the same error is sent at most once a minute.

## Error alerts and rate limits

- **Error alerts:** `ops:error-alerts` reads only what was added to the logs since its last run: server
  errors (`laravel*.log`, ERROR and worse) and screen crashes (`client-errors-*.log`). When there are new
  ones, every active admin gets one notification in the bell (`SYSTEM_ERRORS`, shown in red) with the
  count and the most frequent messages. It also sends an email when `OPS_ALERT_EMAIL` is set and mail is
  configured. At most one alert goes out per `OPS_ALERT_COOLDOWN_MINUTES` (60); errors in between wait
  and go out together.
- **Downtime:** the app can't report itself down. Point an external uptime monitor at `/api/health`; it
  also says whether the scheduler is running.
- **Rate limits:** login, PIN, activation and sync routes have their own throttles. Every signed-in
  route also allows `API_SIGNED_IN_PER_MINUTE` requests per user per minute (600; 0 turns it off), then
  answers 429 with `Retry-After`. Platform sync replays are exempt, and offline bills retry a 429 later.
- **Print HTML:** text going into a print window's HTML goes through `shared/utils/escapeHtml.js`.
- **Performance log** (`storage/logs/performance-*.log`, 14 days; warnings only, so no alerts):
  - slow queries (`LOG_SLOW_QUERY_MS`, 1000): the SQL only, never the values
  - slow requests (`LOG_SLOW_REQUEST_MS`, 3000)
  - requests running many queries (`LOG_REQUEST_QUERY_LIMIT`, 150)
  - N+1 loads: a relation loaded row by row on a list of models. Tests fail on these
    (`Model::preventLazyLoading`), so eager-load with `with()`. Elsewhere the relation still loads and is
    logged once per model and relation.

## Lists: Group By and pinned rows

Every list uses `shared/components/FilterableDataTable.jsx`, and every list offers Group By on its columns.
A table that holds all its rows (client pagination, or no paging) groups them in the browser. A
server-paged table groups in the database through `shared/utils/serverGrouping.js`
(`createGroupFetchers`):
- **Summary:** comes from the list endpoint itself with `group_summary=1` (`inline: true`), or from an older
  resource's own `/grouped` endpoint. `PaginationService` answers the summary from the list's own query, so
  store scope and search apply. A resource only needs `groupable_columns` in `config/pagination.php`.
- **Group rows:** an expanded group asks the same list for that group's rows (`column_filters`), and
  `PaginationService` applies the filter. Pass the page's row mapper as `mapRow` so group rows look like
  the list.
- **Labels:** joined labels (supplier name for `supplier_id`) are looked up per page of groups, not joined
  into the list query.
- **Coverage guard:** `GroupByCoverage.contract.test.js` fails when a server-paged page has no group fetchers.

Rows can be pinned to the top or bottom from the row right-click menu (No pin / Pin to top / Pin to
bottom), or several at once: tick them, then use Pin rows in the column header menu, which also has
Unpin all rows. Pins keep the row, so they stay in view across pages, sorting, filters and Group By.
They last for the session.

## Report summary layouts

Every Sales and Warehouse report tab has a **Summary layouts** panel: pick a breakdown and a period, and the server
groups and totals the report (`ReportSummaryService` running a whitelisted dataset from
`app/Services/Reports/SummaryDatasets.php`, limited to the request's stores).
- **Per-tab lists:** a tab's `summary` in `SalesReports.jsx` / `WarehouseReports.jsx` is
  `{ dataset, layouts: [...] }`. It lists that report's own breakdowns in order, and the panel opens on the first.
  `tabSummaryFor()` in `shared/utils/reportSummary.jsx` resolves it.
- **Margin and tax:** `sale_margin` and `sale_tax` give Margin and CGST/SGST/IGST on the same bill lines.
  Margin cost falls back from the line's cost to the variant's, then the product's.
- **Layout scope:** a layout can carry its own `where`, for example Discount bills.
- **Adding one:** a new breakdown goes in the dataset, then into the tab's `layouts` list.

## Conventions worth knowing

- Lookups repeated within one request are read once through `App\Support\RequestMemo`: the licence
  record (`PlatformActivation::current()`), a user's stores and licensed stores (`StoreContext`), and
  the company theme (`TenantThemes::company`). The memo is emptied after each request and whenever a
  store, user or activation record is saved or deleted. Code that writes these tables with `DB::table`,
  or syncs a user's stores, calls `RequestMemo::flush()`.
- Business dates (for example voucher dates) use `config('app.business_timezone')`
  (Asia/Kolkata by default). `app.timezone` is UTC.
- Controller class names are permission keys; see `docs/folder-structure.md`.
- Every signed-in route is registered twice: under `/api/...` and `/api/v1/...`.

## On-prem server and cloud failover

A store can run the ERP on a PC in the shop ("on-prem", `SYNC_NODE_ROLE=local`). Billing PCs open its counter
address, e.g. `http://mainserver:5173` (Vite, forwarding `/api` to the on-prem backend). The cloud
(dev.gpsoftware.in) is the master for staff accounts and the fallback when the on-prem server is down.

- **Setting up.** Vynerix admin allows one ERP installation per company and signs each store licence for that
  installation, so an on-prem server takes its identity from its cloud. A fresh on-prem server shows Connect to
  cloud (`OnPremSetup.jsx`, `POST /local-server-config/bootstrap`): a cloud admin signs in once (checked by the
  cloud, not stored). The cloud (`POST /sync/register-node`) creates the store's node and hands over the company
  activation and the store with its signed licence, never its own Vynerix admin token. The on-prem server saves
  them (`platform_activations.managed_by_cloud`), then copies staff accounts and the store's data. It never calls
  Vynerix admin; licence renewals arrive in every heartbeat reply. Configure Local Server > Reconnect to cloud
  is for a server that is already set up.
- **Staying in step.** `sync:cycle` runs every 15 seconds on-prem (from `schedule:run`): it pushes on-prem
  writes, applies writes the cloud made for the store, copies the store's users from the cloud (same username,
  password and permissions; users removed on the cloud are switched off) and sends a heartbeat. Replayed writes
  are saved under the person who made them (`X-Sync-Actor`), not the sync user. One sync runs at a time. A write
  the cloud could not take because it was unreachable stays queued; one it rejects is marked failed for Retry.
  Admins can run Sync now or Re-copy from cloud on the on-prem page, and the footer shows "Syncing… N left".
- **Two sign-ins per counter.** After signing in on-prem, the counter asks for a cloud sign-in for the same
  person (`POST /auth/failover-session`, store-locked, 24 h, kept when the person signs in elsewhere). A counter
  that signed in on the cloud during an outage swaps it for an on-prem one on return
  (`POST /auth/failover-session/exchange`; the cloud confirms whose sign-in it is).
- **Failing over.** Counters check `/api/connector/web-config` every 5 seconds. Two misses in a row, or a bill the
  Vite proxy could not deliver (`X-Proxy-Error`), move them to the cloud at the same address, labelled "Cloud
  (on-prem server down)". The cloud numbers its bills in a separate C series, so they never clash with on-prem
  numbers it has not received yet. The cloud address comes from `VITE_FAILOVER_CLOUD_API_URL`, or from what
  the on-prem server said earlier.
- **Coming back.** The on-prem server reports `ready`, `catching_up` or `cloud_unreachable`. Counters on the cloud
  return only when nothing is left to pull or push ("Cloud (on-prem server catching up)" until then).
- **Limits.** If the whole server PC is off, its address cannot load (a plain-http intranet page can't work
  offline). Open tabs keep billing; after a reload the counter opens the cloud address. Records created on-prem
  (items, customers) can get a different number on the cloud; keeping numbers identical is the next phase.

