# Phase 8 remediation

The downloaded Phase 8 folder contains 27 replacement PHP files, not a unified
patch. Its snapshots predate the current master imports, saved-field metadata,
HR configuration, item-parent relationships, compact bill numbers and theme
permissions. The intended fixes were merged into the current implementation.

- Group master blank filters and search/identifier alternatives so other
  filters and store constraints continue to apply.
- Validate uploaded item images as JPEG/PNG/WebP, at most 2 MB, before storage.
- Use explicit Product, Agent, AttributeValue, Size and SizeGroup fillable
  lists, including the newer size options and item-parent/metadata fields.
- Allowlist generic company writes and strip platform identity/licence fields;
  retain dedicated theme permissions and managed-store write restrictions.
- Report store licence validity from signature verification. A company
  activation does not validate an individual store's licence. A paid plan
  nearing renewal is not automatically a trial.
- Replace the fabricated overdue total with actual positive outstanding
  balances. As in the supplied Phase 8 code, overdue currently means an invoice
  more than 30 days old; this is not a supplier-specific contractual due date.
  Aggregate across authorized stores, exclude overpayments and restrict monthly
  payments to the current calendar month and year. Three aggregate queries
  replace the previous repeated totals/counts.
- Preserve product packSize/pack_size, including partial edits, zero and
  explicit clearing. Reject negative/non-integer values.

Expanded feature tests cover image contents and limits, identifier/blank-filter
isolation, paid/trial licence status, forged company fields, pack-size round
trips and payment balance/date boundaries. The existing master round-trip and
import suites remain part of the full backend regression run.

The company-update test also reproduced a missing `stores.contact_person`
column. Migration `2026_10_28_000003_complete_store_form_columns` adds the
existing Store model/form columns missing from fresh installations, checking
each column before adding it. It preserves existing records and legacy columns;
rollback intentionally retains those columns and their values.

Apply the compatibility migration with:

```powershell
php artisan migrate --path=database/migrations/2026_10_28_000003_complete_store_form_columns.php --force
```

Verification:

```powershell
php artisan test --filter=Phase8CodeQualityAndSecurityTest
php artisan test
```
