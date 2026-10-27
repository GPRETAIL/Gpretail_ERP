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
