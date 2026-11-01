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
| Discount and refund approvals | `Services/Approvals/ApprovalService` | Per-role limits; supervisor PIN with lockout |
| Returns | `Sales/PosReturnController` | Refund is prorated from the bill line (discount and tax included) |
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

Realtime updates use hosted Pusher, configured in `.env`.

## Conventions worth knowing

- Business dates (for example voucher dates) use `config('app.business_timezone')`
  (Asia/Kolkata by default). `app.timezone` is UTC.
- Controller class names are permission keys; see `docs/folder-structure.md`.
- Every signed-in route is registered twice: under `/api/...` and `/api/v1/...`.
