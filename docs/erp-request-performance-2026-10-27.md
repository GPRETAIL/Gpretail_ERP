# ERP shared request performance — 27 October 2026

The POS baseline was verified first: a disposable 10,000-product catalog,
paid invoices up to 1,000 lines, payment/stock/FIFO reconciliation, identical-key
concurrent retries, and a 41-item browser checkout. See the separate POS load
report. Release `a272e5c` passed deployment; eight live authenticated read checks
returned 200 (auth, POS stock, latest bill, card types, sales customization,
local-server status, unread count, banners). Temporary verification tokens are
revoked immediately. Browser automation subsequently could not start its runtime,
so PDF download and a manual sweep of every page are not verified.

## Findings and changes

- All ERP consumers of the shared Axios client now share identical **concurrent
  JSON GETs**. There is no completed-response cache. Request identity includes
  resolved URL/query, all headers (including authentication/store), timeout,
  response type and status policy. Writes advance the read generation so a
  post-write refresh cannot join an older pending request. Downloads, progress
  observers, legacy cancel tokens, custom XSRF policies and `coalesce: false`
  opt out. Each consumer retains its own cancellation and response/config.
- A real loopback HTTP integration test verifies ten simultaneous reads produce
  one network request; one caller's cancellation preserves another caller; and
  a write causes a subsequent read to start a new HTTP request. Separate tests
  cover user/store/node/query isolation, errors, downloads and fresh retries.
- Automatic local-to-cloud fallback now applies only to reads, across every
  module. POST/PUT/PATCH/DELETE requests are never silently resent to another
  database after an ambiguous failure. POS retains its original-node retry key.
- `useAsyncQuery` queues at most one silent refresh while a request is running,
  rather than canceling/restarting it for each background event. Explicit reloads
  and changed query inputs can still replace an obsolete request.
- Theme/profile focus refresh is limited to once a minute with no overlapping
  request. Approval badge, remote-support and local-server polling pause in
  hidden tabs. Approval, local-health and printer probes have overlap guards.
  Existing subscription/sync polling already has shared state and idle backoff.
- Store-name, warehouse lookup and receipt-detail caches are separated by login,
  selected store and local/cloud target. Sorting lookup keys no longer mutates
  the caller's array. Cache sizes are bounded; existing lookup TTLs remain.
- The notification header and inbox both invoked twelve operational-alert
  generators. Their calculation is now locked/throttled for 60 seconds per
  user/store scope. Counts, preferences, visibility and personal read receipts
  remain live database queries. Tests verify immediate read-count updates,
  expiry and cross-store isolation. A failed file cache falls back to generation.
- Service-worker registration remains enabled in production. Its routine success
  console line is removed; registration failures remain visible. That message
  was informational and did not indicate duplicate API requests.

## Verification boundaries

Automated tests cover shared transport, cancellation, authentication/store cache
boundaries, notification receipts and POS/warehouse/master regressions. Shared
transport tests demonstrate avoided duplicate requests, not a promise that every
page has the same latency. Different endpoints, queries or scopes are intentionally
separate requests; legitimate license/permission and data-refresh checks remain.
Local checks passed: 483 frontend tests in 102 files, 314 backend tests with
2,786 assertions, zero ESLint warnings/errors and a successful production build.
The existing large-bundle build advisory remains.

No bulk fixture data was placed in the live Coffee store. Live read probes measure
server-near HTTPS latency, excluding the user's internet and browser rendering.
Intermittent Hostinger MySQL `Operation not permitted` failures are a separate
hosting fault; reduced query volume and safe 503 responses do not prove that fault
has been eliminated.

## Follow-up audit: startup, session changes and retry chains

The second pass found work outside the shared Axios adapter and refreshes caused
by changes to the entire profile object. The following paths are now covered:

- Runtime configuration uses one pending initialization per login/store. Logout,
  a new login, changed store or explicitly changed server configuration invalidate
  older pending results. The cloud runtime request includes the selected store
  header. A pending health response cannot restore a removed server. Health
  recovery emits one routing event instead of two.
- Profile/counter/theme edits no longer restart subscription, sync, notification
  count or inbox requests. Real authentication/store/node changes still discard
  previous results. Runtime snapshots now include local/cloud URLs, fixing cache
  identity when a local server changes without changing the `local` target name.
- Mobile splash performs no API calls: root AuthInitializer verifies the session
  and MobileHeader loads its own unread count. Mobile notification polling uses
  the common visibility-aware refresh hook and no unscoped window count cache.
  Mobile invoice creation no longer fetches an unused bill-number preview, and
  cancels its catalog/customer preload when the screen is left.
- A rejection from `/mobile/access` cannot broadcast the event that asks the same
  validator to run again. A temporary auth verification outage retains the cached
  session; a confirmed 401 still expires it. Backend permissions remain enforced
  on every business request. Late errors from a previous login/store cannot
  expire a new session, invoke its error handlers or initiate cloud fallback.
- The service worker never caches session verification. Offline API data is
  keyed by a SHA-256 digest of authentication/store/routing headers, not URL
  alone. Missing offline data returns 503 instead of a false successful empty
  response. Cache version 3.0.4 clears old unscoped read caches on activation;
  queued invoices/drafts in IndexedDB are unaffected. Cache-storage failure
  does not turn a successful network response into an application error.
- Generic HTTP 500 errors no longer trigger a cloud replay. Eligible local reads
  retain at most one fallback for availability/auth/setup failures; a fallback
  remains pinned to cloud if local health recovers during dispatch. Writes never
  use automatic cross-database fallback.
- Mobile Save/Print/Share share one pending/confirmed checkout and the backend's
  existing `checkoutKey` contract. An uncertain online save is not silently
  converted into a fresh offline invoice. Explicit retries retain the original
  key and local/cloud target. Offline queue entries carry user/store/target;
  automatic sync skips another account/store and legacy unscoped entries.
  Failed entries remain visible for review instead of being discarded. Sync
  stops on the first failure, debounces duplicate network-restoration events,
  and does not schedule another run from its own completion event.

Legacy mobile queue entries without ownership/check-out keys are deliberately
retained for manual reconciliation. Check the sales list before discarding or
recreating them. No queue data is deleted as part of this upgrade. The separate
printer-lockfile modification and unrelated local files are excluded.

Regression coverage includes raw-fetch initialization races, actual Axios
interceptors, polling/profile changes, cache node changes, mobile checkout
idempotency and offline queue scope/event handling. The local full frontend suite
passed 526 tests in 109 files with four workers. Four additional service-worker
tests passed separately. The initial parallel build/lint/test run hit a warehouse
test timeout; that test passed independently and in the bounded full run, without
changing the test timeout. Full lint has zero warnings/errors; the production
build passes with the pre-existing large-chunk advisory. Live browser automation
is still unavailable, so these checks do not claim a new manual sweep of every
page or physical printer.
