# Stock catalog and local-server QA — 6 November 2026

## Changes

- POS stock search now follows the saved warehouse `allowSaleWithoutStock` rule. Enabled: active zero/negative-stock items and unstocked products/variants are returned. Disabled: stock must be positive.
- POS and POS Old no longer discard zero-stock rows returned by the authoritative API. Existing server checkout validation still enforces stock when disabled; enabled sales record shortages and replenishment settles negative inventory.
- Catalog reads remain bounded (50 search results; 2,000 for the existing legacy all-results mode), do not create inventory, and exclude inactive/other-store products from unstocked fallbacks.
- Warehouse Save uses a filled primary button, progress indicator and duplicate-submission guard.
- Testing an unregistered local server returns actionable 422 validation instead of a StoreLocalNode model exception.
- Save URLs requires a local backend address. Both blank cannot save. Cloud URL remains optional and uses the configured cloud default when omitted. Disabling is a separate confirmed action carrying `disable_failover: true`.
- Page paths such as `/login` and `/dashboard`, credentials, queries and fragments are rejected in the form. Unsaved addresses cannot be tested. Existing approved-endpoint, port, DNS and SSRF restrictions are retained.

## Automated regression cases

| Case | Expected result | Coverage |
|---|---|---|
| Stock switch off, zero/negative inventory | Absent from catalog; overselling rejected | SellWithoutStockTest |
| Stock switch on, zero/negative inventory | Catalog returns the item and its quantity | SellWithoutStockTest |
| Product/variant never stocked | Searchable without creating a stock row | SellWithoutStockTest |
| Inactive / other-store product | Excluded | SellWithoutStockTest |
| Sell beyond inventory, receive stock, cancel | Shortage recorded; inventory balances correctly | SellWithoutStockTest, SalesStockRulesTest |
| Dealer and POS Old stock behavior | Existing stock rules maintained | DealerInvoiceStockTest, PosOldSaleTest |
| Test before first configuration save | 422 instruction; no outbound network call | ServerProbeSecurityTest |
| Empty save | 422 and existing configuration retained | ServerProbeSecurityTest, ConfigureLocalServer.test.jsx |
| Explicit disable | Empty URLs accepted only with explicit intent | ServerProbeSecurityTest, ConfigureLocalServer.test.jsx |
| Invalid page URL / unsaved draft | Inline validation; Save/Test disabled as appropriate | ConfigureLocalServer.test.jsx |
| Failed health response | Error, not a success notification | ConfigureLocalServer.test.jsx |

## Verification evidence

- Full ERP backend run: **547 tests / 5,926 assertions passed** before the final empty-save/isolation regressions were added.
- Final focused stock + server-security run: **18 tests / 107 assertions passed**.
- Stock/return/Dealer/POS Old focused run: **15 tests / 101 assertions passed**.
- Final focused frontend run (routes, stock catalog, warehouse customization and local server): **20 passed**; targeted ESLint and production build passed.
- Full frontend run: 800 passed, 2 failed out of 802. Both failures were old login route fixtures (missing ThemeContext and old heading). The fixture was updated; all **10 route tests passed** on rerun. The whole suite was not repeated after this test-only correction.
- Browser: local-server form showed both empty inputs with Save disabled and required-address feedback. No real server configuration was overwritten during this check.
- Browser: after signing in to the local seeded ERP account, POS displayed **Product (All Stock Levels)**, confirming the saved rule reached the screen. The product-picker interaction could not be verified through the browser connection; a saved browser checkout remains unverified. Database-backed request tests ran in isolated SQLite; no live customer invoice was created.

## Re-run

From the ERP repository root:

```powershell
D:\xampp\php\php.exe -d xdebug.mode=off backend-laravel/vendor/phpunit/phpunit/phpunit --configuration backend-laravel/phpunit.xml --filter "SellWithoutStockTest|SalesStockRulesTest|DealerInvoiceStockTest|PosOldSaleTest|ServerProbeSecurityTest"
```

From frontend:

```powershell
npx vitest run src/app/__tests__/App.routes.test.jsx src/features/settings/__tests__/ConfigureLocalServer.test.jsx src/features/warehouse/barcodes/__tests__/BarcodeCustomisation.test.jsx src/features/sales/pos/utils/__tests__/posStockCatalog.test.js --maxWorkers=2
npm run build
```

## Remaining manual check

Sign in to local ERP; use a disposable store/product. Save the stock rule, reopen POS and POS Old, search a zero-stock item, bill it, verify No stock/short quantity, receive inventory and verify the corrected balance. Repeat with the switch off and confirm rejection. Test the local/cloud connection only after saving approved backend addresses. A real LAN failover and physical receipt print were not performed. Changes are local, not deployed.

## Follow-up: unapproved port / endpoint

The reported local URL was `http://127.0.0.1:5173/`, which is the Vite frontend, not a LAN backend. Frontend preview ports and loopback addresses now have explicit form validation and are rejected on Save by the API. Existing bad configurations remain visible so they can be corrected or disabled; saving must not silently approve a network endpoint.

The known cloud origin `https://dev.gpsoftware.in` was added to this machine's ignored `SERVER_PROBE_ALLOWED_ENDPOINTS` setting, preserving existing entries. A real TLS-verified RegisteredServerProbe check returned `healthy: true`. Local LAN reachability was not claimed or fabricated: this machine's development API currently uses loopback port 8001 and is not a deployed LAN server. Use an actual reachable LAN backend and approve its exact origin for Test Local. SSRF restrictions remain enforced.

## LAN port 8001 and heartbeat follow-up

- Added backend port 8001 to probe port validation while retaining exact-origin approval, private-LAN checks and metadata/loopback rejection.
- Bound the development backend on 0.0.0.0:8001. Both LAN `/up` and `/api/connector/web-config` returned HTTP 200 at 192.168.31.246.
- Explicitly approved this LAN origin in the local ignored environment. `DEV_SERVER_ORIGIN` identifies this same development instance, only in APP_ENV=local. A single-worker development server must not recursively HTTP-probe itself. Test Local reports SETUP_REQUIRED, not successful synchronization, for this case. Production always performs the normal approved network probe.
- Nodes with no heartbeat show Not connected; Stale is reserved for a previous overdue heartbeat. A connection test does not create a heartbeat or replay queued events.
- The current deployment is not a paired local/cloud sync installation. Its existing pending events were not sent to the hosted ERP. Actual connector provisioning and successful ongoing sync remain outside this connectivity check.

Local launch: `php -d xdebug.mode=off artisan serve --host=0.0.0.0 --port=8001 --no-reload` from backend-laravel. Other PCs must be on the same LAN; remote-device firewall reachability was not verified.

## Session interruption after saving a LAN URL

A reachable backend returning success=true with data.enabled=false was mistakenly considered a healthy local connector. This enabled failover routing and could send local session checks to the separate hosted database. Runtime discovery now keeps connector-disabled responses on the issuing deployment; authentication and runtime-configuration requests always use the configured deployment API. The local runtime API also declines to advertise the explicit development instance as a connector while its node role is cloud. Regression tests cover connector-disabled discovery, session request routing and preserving properly configured local-role advertisement.

## Live failover readiness audit (2026-11-06)

Requested scenario: local invoice -> cloud, local backend outage -> cloud invoice, restart -> local catch-up, including automatic browser switching.

Read-only comparison against the hosted dev ERP confirmed these installations are not paired:

- Local role: cloud. Local stores: id 1 SBT_01 / SRI BALAJI TEXTILE, id 2 TEST_01 / Approvals Test Store. Both belong to local platform company SBT_01.
- Hosted dev role: cloud. Hosted stores: id 2 Coffee 1 and id 3 Coffee 2 Pvt Ltd, belonging to CMP-PMAG8C. Hosted store_local_nodes has no records.
- Local outbox: 36 pending events. No events were replayed or acknowledged during this audit.
- A temporary local admin bearer token returned HTTP 200 from local /api/auth/me and HTTP 401 from hosted /api/auth/me. It was revoked in finally after the check. The token was never printed or persisted in the report.
- Focused PHPUnit run: 41 passed, 130 assertions, 3.875 seconds (SyncCycleServiceTest, CaptureSyncOutboxTest, AuthenticateSyncReplayTest, ServerProbeSecurityTest).

Outcome: live invoice replication and browser outage/recovery are NOT verified. Passing HTTP-faked tests does not establish cross-deployment session continuity or entity-ID consistency. Do not enable sync against the existing Balaji database and Coffee cloud company. Pending user selection of Coffee 1 or Coffee 2 for a separate local test database; no hosted business data or connector settings were changed.

Before the live test: provision a matching licensed store and per-node credentials on both sides, align initial master data and identifiers, implement/verify a secure user session handoff, and run a local sync worker. Then record uniquely tagged invoice IDs, stock/totals and queue transitions on both sides before and after stopping/restarting the local backend. An invoice still pending when the entire local machine stops cannot reach cloud until that machine resumes; this is expected, not a successful pre-shutdown sync.

Follow-up: the user selected Coffee 1. See [live Coffee 1 failover results](2026-11-06-coffee1-live-failover-qa.md). Invoice replication passed; transparent browser failover failed and is paused.
