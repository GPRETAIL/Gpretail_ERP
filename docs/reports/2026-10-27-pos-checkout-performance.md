# POS load regression — 27 October 2026

## Scope and evidence

Seeded **10,000 products** with matching variants, PACK barcodes, stock and FIFO
batches in disposable local MariaDB `gpretail_pos_load_20261027`. Real Coffee
inventory and cloud sales were not seeded or altered by these load tests.

The real HTTP API accepted paid baskets of 1, 10, 100, 200 and 1,000 items, three
requests each. Each request was retried with its original checkout key and its
saved invoice was fetched to verify line counts, payments and totals. Two PHP
servers concurrently submitted the same key against the same database: both
returned one invoice and stock decreased exactly once. This checks duplicate
retry behavior, not sustained concurrent till capacity.

Final loopback HTTP medians: 592.01 / 673.01 / 1000.70 / 688.56 / 1684.62 ms for
1 / 10 / 100 / 200 / 1,000 lines respectively. Small, noisy local samples are not
a cloud SLA. Raw results: `pos-load-2026-10-27.json`. PHP 8.4.24, Xdebug off,
MariaDB 10.11.11, Windows; no test suites competing during this final run.
HTTP includes bootstrap and response transfer; `api` timing measures middleware
and application work, and `pos-checkout` measures the controller. Physical
printing, PDF rendering and internet latency are excluded.

- Warm 200-line requests: **33–34 queries**, versus the preceding release's
  **3,622** queries in its warm framework benchmark. These are distinct
  measurement boundaries; the final framework regression uses 31 queries.
- Final 1,000-line HTTP requests: 53 queries; writes are chunked at 200 rows.
- Initial catalog: 50 rows. Searching/scanning `TEMP-LOAD-10000` found the last
  product without downloading the whole catalog.
- Browser smoke: searched product 10,000, scanned another 40 barcodes, paid
  ₹4,100, confirmed cleared cart, Last Bill and barcode focus. Cash input focused
  when checkout opened. Browser automation failed during the PDF-download step;
  that download and a physical printer were not verified in this run.
- Full checks: 313 backend tests (2,776 assertions), 469 frontend tests, lint with
  zero warnings/errors, and production build passed. The build retains its
  existing bundle-size advisory.

## Changes and invariants

`PosCheckoutWriter` batches sale lines, stock audits, FIFO allocations, stock
updates and PIECE barcode updates in the existing sale transaction. Reads
validate store ownership, product/variant/barcode relationships and acquire
stock locks before writes. FIFO, insufficient-stock rollback, payments and
checkout-key protection remain enforced. Duplicate variant lines retain separate
audit/allocation records; deleting their invoice restores FIFO stock once.

Profiling identified five foreign-key schema introspections taking about 590 ms
in one one-line request. `StoreSchema` shares **metadata only** through the file
cache, keyed by connection/database and ordered migration history. Migration or
rollback changes the key; permission and ownership results are never cached.
Unit tests that alter schema directly bypass this cache. After manual DDL outside
migrations, clear the file cache (`php artisan cache:clear --store=file`). A
non-writable cache falls back to database metadata rather than skipping checks.

The POS picker searches on the server and keeps variants/PIECE labels distinct.
One store-scoped latest-document summary replaces four list requests. API timing
headers expose total request query counts without SQL/bindings. Deliberately
canceled Axios requests are neither retried to cloud nor logged as API failures.
ESC/POS layout diagnostics are off by default. Temporary opt-in:
`sessionStorage.setItem("vynerix:print-debug", "1")`; remove that key to stop.
Diagnostics omit bill/payment QR contents.

## Hosting findings

Live errors were PDO connection failures during Sanctum authentication, before
the POS controller. The verified local Unix socket was configured and APP_DEBUG
disabled; the previous environment was encrypted into a private recovery file.
Subsequent logs still contain eight `Operation not permitted` errors over that
socket, last observed at **2026-10-26 19:37:12 UTC** (27 October 01:07:12 IST).
A successful SSH DB probe does not prove every web worker is healthy. Hostinger
resource/security policy needs investigation if this recurs; query reduction
alone cannot resolve an OS refusal to open a database connection.

Connection failures now return a safe 503 with Retry-After instead of exposing
SQL or database details. For an uncertain save, verify sales history or retry
the unchanged open checkout; do not initiate a new sale blindly.

## Repeat safely

The normal automated regression needs no external database:
`php artisan test --filter='PosLargeCatalogTest|PosCheckoutRetryTest|StoreSchemaCacheTest'`.

For real HTTP/browser tests on local XAMPP, create an empty, explicitly named
`gpretail_pos_load_YYYYMMDD` database. In a separate PowerShell process set
APP_ENV=testing, DB_CONNECTION=mysql, DB_HOST=127.0.0.1, DB_USERNAME=root,
DB_PASSWORD empty and DB_DATABASE to that disposable name. Migrate it, then run
`php tests/Support/seed-pos-load.php 10000`. The seeder refuses a normal database
or existing store/product data and generates a test-only ephemeral signing key.
No production licence key or authorization bypass is used.

Set POS_LOAD_DATABASE to that same name and run two loopback-only PHP servers:
`php -S 127.0.0.1:8149 -t public tests/Support/serve-pos-load.php` and the same
command using port 8150. Run `python tests/Support/pos-http-load.py`. The router
requires loopback and a disposable database name and overrides configuration
without editing the repository's normal .env. Its blank-root DB credentials are
for this local XAMPP lab only. The Python harness refuses remote targets.

Optionally point a separate Vite server at 8149. Log in as `temp-pos-load` with
the fixture-only password `temporary-test-only`. Stop these lab servers and drop
only the explicitly created disposable database after verification; remove its
temporary public-key file. Never run the seeder against a customer deployment.
