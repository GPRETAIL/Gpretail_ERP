# POS checkout performance verification — 26 October 2026

The regression fixture creates 200 identifiable TEMP products, variants, barcodes,
stock records and FIFO batches in a disposable test database. It submits three
100-line and three 200-line paid invoices through the actual `/api/pos-sales`
endpoint. Test transactions roll back all fixture records. No Coffee store sales,
inventory or customer records are changed by this test.

## Matched local comparison

Windows, PHP 8.4.24, Xdebug disabled, SQLite in-memory, same fixture and endpoint.
Baseline source: `ec83352`. Three sequential requests per basket size; milliseconds
include the application test HTTP kernel, query logging and receipt serialization.
They exclude internet latency, browser rendering, PDF generation and the printer.
These small samples demonstrate the reproduced bottleneck, not a production SLA.

- 100 lines before: 1758.36 / 1850.10 / 1880.46 ms; median **1850.10 ms**.
- 100 lines after: 790.84 / 599.42 / 613.71 ms; median **613.71 ms**.
- 200 lines before: 4805.74 / 3106.99 / 3072.84 ms; median **3106.99 ms**.
- 200 lines after: 961.09 / 1018.97 / 1058.04 ms; median **1018.97 ms**.
- Warm 200-line query count: **8619 → 3622**, approximately 58% fewer.
- Warm 200-line schema-inspection queries: **4402 → 0**.
- Final measurements include the new checkout retry reservation (three queries).

Separate MariaDB 10.11.11 verification used only the explicitly created database
`gpretail_pos_perf_20261026`. Final 200-line requests: 3787.65 / 1926.39 / 1950.75 ms
(median **1950.75 ms**). This was not a matched MariaDB before/after comparison.
Earlier debugger-enabled runs are excluded from the comparison above.

## Implementation and safeguards

- Cache table column metadata in `StoreModelScope`; keep record ownership checks.
- Resolve products and locked barcodes once per basket, rather than per line.
- Retain stock locks, negative-stock rejection, FIFO allocations, payment writes,
  document-number uniqueness, audit and transaction rollback.
- Reject foreign products, mismatched barcodes and duplicate/sold PIECE barcodes.
- Reserve an optional UUID checkout key in the same transaction as the sale.
  An unchanged retry by the same user/store returns the existing invoice.
  Changed payloads or another user cannot reuse the key. Failed transactions
  roll back the reservation, stock and payment changes together.
- Replayed checkouts do not enqueue another sync event. Legacy callers without
  a checkout key remain supported.
- The POS screen retains the attempt key during an unchanged retry. It is cleared
  after a confirmed save. POS writes do not automatically fail over to another
  database after an ambiguous timeout; manual retries stay on the original node.
  This protection is for the open checkout session; it is not cart recovery after
  a browser refresh or a substitute for verifying an uncertain sale in history.
- Share subscription status between the footer and reminder. Pause background
  checks in hidden tabs, avoid overlapping sync polls, and back off to five
  minutes when local sync is disabled. License enforcement remains server-side.
- Successful checkout responses expose `Server-Timing: pos-checkout;dur=...`.
  This measures controller validation, transaction and serialization; total
  browser request time also includes middleware, hosting and network overhead.

## Repeat the isolated regression

From `backend-laravel`, run `php artisan test --filter=PosCheckoutPerformanceTest`
using the repository's default SQLite test configuration. On Windows use the
XAMPP PHP executable if PHP is not on PATH, and set `XDEBUG_MODE=off` for timing.
The test prints `POS_PERFORMANCE` samples and enforces query ceilings rather
than machine-dependent timing limits.

`PosCheckoutRetryTest` additionally verifies duplicate submissions, payments and
stock counted once, reservation rollback, ownership, and barcode validation.
