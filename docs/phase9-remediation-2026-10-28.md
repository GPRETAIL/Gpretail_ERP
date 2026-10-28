# Phase 9 integration

Merged the seven-file download into the current ERP instead of replacing files
with older snapshots. The supplied BackupService snapshot would remove current
parent ownership checks, protected configuration-ID filtering, restore dependency
ordering and private temporary-file permissions. Its POS snapshots also predate
store-name validation, compact bills, shared headers and asynchronous printing.

Implemented:

- Cursor iteration for backup/catch-up export, retaining all existing secret and
  ownership filters. Query logging is suppressed during export and restored to
  its previous state on success or failure.
- Direct restore ownership is validated before writes. Existing IDs are fetched
  in batches of 500, with consistent non-null store/company ownership required.
  Indirect children still require a valid parent in the selected store.
- Platform administrator IDs are fetched once per users restore. Global role
  definitions remain protected and transaction rollback/dependency ordering stay
  intact.
- Catch-up timestamp comparisons use batches of 500 keys. Bulk writes also cap
  parameter counts: 900 for SQLite compatibility, 60,000 for MySQL, at most
  1,000 rows per write.
- POS Return uses the shared HTML builders and payment-method helper. Current
  legacy POS helpers were extracted, preserving fetched store names and identity.
- All five POS Return/legacy/touch browser-print paths use the shared hidden
  iframe helper. Direct ESC/POS queues and nonblocking save behavior remain.
- Removed fictitious shop/address/GST/phone fallbacks from the shared thermal
  layouts. Missing store names still fail validation in actual print flows.

Regression evidence:

- A 10,000-row restore performs exactly 20 direct ownership reads.
- A 1,200-row merge preserves newer local values beyond chunk boundaries, with
  every SQL statement below 999 bound parameters in the regression test.
- A restore containing 1,001 legitimate users and a forged platform-admin ID is
  rejected after one protected-role lookup.
- Existing encrypted POS recovery, child-record isolation, global-role
  protection and backup secret-redaction tests remain in the regression suite.
- Frontend coverage checks historical receipts, store selection, compact bill
  values, HTML escaping and printing after async work without opening popups.

The export API still returns complete arrays and archive writing still JSON
encodes each table. Cursor iteration reduces intermediate hydration and logging
cost; it does not provide constant-memory end-to-end archive streaming.
