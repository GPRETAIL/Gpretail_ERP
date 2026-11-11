# Coffee 1 live failover and invoice replication test — 6 November 2026

## Scope and setup

The user selected Coffee 1 (store id 2, STR-SMZOW9BT5O, company CMP-PMAG8C). The hosted dev ERP was paired to a new isolated local SQLite database, not the existing Balaji database. Initial Coffee 1 master and transaction data was exported with BackupService secret filtering; login sessions, passwords and auth tables were not copied. The signed store licence and deployment identity were provisioned separately and verified successfully. Temporary test credentials were revoked or disabled after testing.

- Hosted API: https://dev.gpsoftware.in/api
- Isolated local backend: http://192.168.31.246:8080
- Browser test frontend: http://127.0.0.1:5175
- Existing Balaji backend/frontend remain on 8001/5173.
- Port 8001 heartbeat was rejected by the hosted build; Windows refused binding to 8000. Supported port 8080 worked.
- Test product: QA-FO-261106-59D6 Temporary Failover Item, price ₹1, starting stock 20.

## Live results

| Scenario | Observed result |
| --- | --- |
| Paired connector authentication and initial heartbeat | Passed. Both catalog APIs returned the same product IDs and stock 20. |
| Create local sale | HTTP 201; INV-STR-SMZOW9BT5O-20261106-0001, quantity 1, amount ₹1. |
| Stop local HTTP backend | Verified connection refused on the stopped backend. Frontend and local database stayed running. |
| Push locally queued invoice while web server stopped | CLI sync worker pushed 1, failed 0. Hosted invoice API confirmed the original bill number and amount. This is not a complete-machine/power-loss test: the worker could still read the local disk/database. |
| Create cloud invoice during local HTTP outage | HTTP 201; INV-STR-SMZOW9BT5O-20261106-C0001, quantity 2, amount ₹2. |
| Restart local and pull cloud changes | Worker pulled 1, failed 0. Local invoice API returned the cloud bill with its original number and amount. |
| Compare both databases | Each bill appeared exactly once on each side; amounts ₹1/₹2 and quantities 1/2 matched. Stock was 17 on each side. |
| Repeat sync twice | Each run pushed 0, pulled 0, failed 0. No duplicate invoices appeared. |
| Browser while local available | Real browser signed into the isolated Coffee 1 database; dashboard showed two bills totaling ₹3 and footer Local Server. |
| Browser while local stopped | FAILED: browser returned to /login. The local Sanctum session is not accepted by the separate hosted database. Transparent customer login continuity is not implemented. |
| Worker heartbeat with HTTP down | Originally incorrectly sent local_healthy=true. Fixed and verified live: hosted node local_healthy=false while stopped, true after restart. |
| Browser realtime auth requests | Originally queued as writes, then failed replay with HTTP 403 personal permission. Excluded realtime subscription requests from future outbox capture; regression test reproduced the old failure and passed after the fix. Three pre-fix failed realtime entries remain in the isolated QA database as evidence, not invoice failures. |

## Fixes and automated checks

1. SyncCycleService CLI heartbeat now checks the local HTTP connector identity and enabled state; worker liveness does not imply backend HTTP health. HTTP-triggered cycles do not recursively probe themselves.
2. CaptureSyncOutbox excludes realtime subscription/authentication traffic, which is specific to the browser and node.
3. Both regression tests failed before their fixes and passed after. Focused suites: 21 tests, 47 assertions. Backend full suite after the heartbeat fix: 556 tests, 5,956 assertions. Final suite after both fixes: **557 passed, 5,959 assertions**, 53.398 seconds. Focused suites were repeated after import formatting.

## Current state and limits

**Not ready for automatic browser failover.** Coffee 1's connector configuration is retained but disabled on both sides to avoid logging out real users or replicating live changes into a temporary QA database. Hosted pending queue was zero when paused. No recurring sync worker or Windows scheduled task was enabled: sync cycles in this test were explicitly invoked. Balaji's 36 pending records were not replayed or changed.

The two tagged test invoices and temporary test product remain for traceability; they add ₹3 of test sales to Coffee 1. Test-only local user is disabled and temporary cloud API token is revoked. Application fixes are local code changes, not deployed to hosted ERP.

Next implementation must establish secure per-node browser session handoff without sharing database tokens, then repeat the browser shutdown/recovery test with a continuous local worker. Also verify original cashier and sale timestamp preservation: current replay records the receiving node's Sync System User and replay time. Current evidence proves invoice numbers, quantities, totals and stock convergence for this aligned single-store test, not complete record equality or collision safety during concurrent master creation.
Temporary QA web servers (8080/5175) were stopped after the test. Existing local backend 8001, frontend 5173, and hosted /up were each verified HTTP 200.
