# ERP application performance review — 27 October 2026

## Scope and evidence

This continues the deployed request coalescing, bounded read failover, visibility-aware polling, scoped caches, POS batching, and backup/local-server fixes. This pass covers the ERP application; it does not claim a manual browser sweep of every form or changes to the separate Vynerix Admin application.

Before deployment, two authenticated, sequential HTTPS passes across 32 endpoints returned 64 HTTP 200 responses with successful payloads. Coverage included the overview and all eight module dashboards, masters and attributes, warehouse documents, sales, supplier payments, HR, reports, notifications, backups and local-server runtime. A short-lived audit token was revoked in a finally block. No production invoices, stock or backups were created or restored.

Measurements were made from the hosting server to its public HTTPS endpoint, not from the customer's browser. The first pass sometimes spent approximately 1.15 seconds in database calls, while repetitions of the same endpoints were fast. A separate in-process query profile showed sub-millisecond queries. These samples demonstrate variability; they do not establish a permanent fix for Hostinger database connection delays or the previously observed MySQL 2002 failures.

## Changes

- Lazy-load desktop and mobile workspaces separately, and password setup/change screens. Existing chunk recovery and a loading skeleton cover the new boundaries.
- Lazy-load the eight dashboard module panes. Retain opened panes' local state, but only allow the visible pane to fetch. Date changes no longer refresh previously visited hidden dashboards. The toolbar Refresh action refreshes the visible module.
- Coalesce dashboard push bursts over 250 ms. Reference-count shared subscriptions so one consumer cannot unsubscribe another. Disconnect the Pusher client after the final consumer leaves. Do not start polling in a hidden document.
- Remove two unused mobile dashboard requests (`/dashboard/summary` and `/direct-purchases`): three requests replace five per refresh. Pass cancellation signals through all remaining requests, use silent refresh queuing on reconnect, and subscribe to the selected store's dashboard events.
- Cancel the warehouse workflow dashboard's three parallel reads when leaving the page. Its existing combined list contract and pagination are retained.
- Combine overview sales/tax aggregates, combine warehouse stock metrics into one aggregate, and combine sales-summary totals into one query. Preserve existing response contracts, store isolation, daily totals and previous-period trends. The legacy `thisMonthSales` field retains its existing all-time semantics in this performance-only change.
- Order and limit the supplier payment preview in SQL before materializing it in PHP. Only 15 displayed documents are loaded; their balances, overdue calculations and displayed-row totals keep the existing contract.
- Load the HTML receipt rasterizer only for image printing. Native ESC/POS jobs avoid its module entirely. Downloads still use the existing direct jsPDF/html2canvas implementation; SheetJS remains pinned to its 0.20.3 tarball.

## Build measurements

The production entry JavaScript chunk decreased from 1,282,282 bytes to approximately 412,110 bytes (about 68%). The dashboard chunk decreased from about 611.9 KB to 475.5 KB. These are individual minified chunk sizes, not total application bytes or a measured browser interaction speedup. Deferred chunks still download when their features are used. No generated JavaScript chunk exceeded 500 KB in the final local build.

## Validation

- Full backend suite: 331 tests passed, 2,863 assertions.
- Full frontend suite before the final print-loading change: 544 tests passed across 114 files. After that change, the 16 focused print queue, native/image receipt, routing and realtime tests passed.
- New coverage checks bounded payment previews, sales/tax trends, stock values and isolation, daily summary results, visible-module refresh, burst coalescing, shared websocket lifecycle, hidden documents, and mobile cancellation/unused reads.
- Existing 10,000-product POS regression tests passed. Under the full test run, warm 100/200-line baskets used 31 queries; a 1,000-line basket used 51. Local SQLite timings under concurrent test load are not cloud checkout latency guarantees.
- ESLint and production build must pass before commit. CI and post-deployment checks provide release validation.

## Limits retained

Browser automation is unavailable in this session, so no new manual visual, physical printer or customer-network timing claim is made. The warehouse workflow grid still combines the existing all-record endpoints with their existing server limits; true unified server pagination is a separate scaling change, not silently simulated by truncating rows. Transparent browser authentication across independent local/cloud Sanctum databases remains unverified and requires per-node authentication handoff before production reliance.
