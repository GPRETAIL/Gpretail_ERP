# Saved record and list integrity — 28 October 2026

This release checks create → list → reopen → partial edit flows using isolated test databases and actual shared React tables. It repairs confirmed save/serialization/display mismatches in masters, product attributes, HR configuration and warehouse documents. It does not claim a manual browser test of every ERP screen.

## Confirmed fixes

- Product lists read the API's snake-case tax, size-group and store relationships. Zero-valued settings and false flags display accurately. Purchase-entry attributes show the configured selections.
- A 500-row page or full export no longer receives the reduced dropdown projection, which omitted many saved columns. Explicit dropdown requests retain the lightweight projection.
- Partial product edits preserve omitted prices, flags and relationships; explicit clears remain cleared. Product-group attributes resolve to a store-owned reporting category instead of treating an attribute ID as a category ID. The source attribute ID remains available when reopening the form. Failed saves roll back category creation.
- Item lists eager-load the selected size from supplemental form data; both current `name` and legacy `size_name` display contracts are supported.
- Size-group lists retain a real Code column and a separate Sizes column. Missing creator/store information no longer displays invented Superadmin/Main Store values. Employee department names use the loaded relationship before falling back to lookup options.
- HR configuration retains sales flags, floor location, designation role and shift times. New records retain their configuration type so new roles/floors/shifts do not appear under another type. Legacy rows had no reliable type marker: they are retained, with their previous visibility, rather than guessed or deleted. HR roles remain separate from authentication roles and grant no permissions.
- Transport entries normalize the actual form payload, retain supplemental details, batch-load list relationships, and preserve fields on partial updates. Optional blank numeric fields use valid defaults. City references must point to store-owned city configurations.
- Commercial invoice headers retain dates, bundles, charges, totals and charge rows. Saving a header does not create product intake or stock movements; the existing product-based purchase path retains its stock behavior. API dates use `YYYY-MM-DD` for reopening date inputs.

## Migrations

`2026_10_28_000001_preserve_hr_configuration_details.php` adds nullable detail/audit fields to HR records and a nullable HR configuration type. `2026_10_28_000002_preserve_warehouse_form_details.php` adds nullable warehouse form details and transport creator information. Both were applied locally using explicit migration paths, without running unrelated untracked migrations. Deployment applies the tracked migrations after its recovery backup.

No customer rows are deleted or reseeded. Previously saved values affected only by display mapping become visible automatically. Values discarded by older save handlers were never stored and need re-entry; the new nullable columns cannot reconstruct them.

## Verification

`RecordListRoundTripTest` covers all 51 configuration and 27 product-attribute catalog types, normal/large/export product lists, item sizes, supplier/transport/agent/employee/tax/brand columns, HR metadata, transport forms and commercial invoice headers. It checks zero/false values, partial edits, explicit clearing and rejection of references from another store. Warehouse tests verify header saves leave both stock and purchase-intake rows unchanged.

Frontend coverage renders the actual shared list components for product taxes/size/store, size-group code/member sizes, transport cities and commercial invoice totals. The virtualization test boundary supplies a measured fixture viewport because jsdom has no browser layout engine.

Full backend and frontend suites, focused final additions, ESLint and a production build were run. One initial frontend run encountered a worker startup timeout; rerunning with two workers passed. CI is the release gate for the final committed tree. Existing POS tests still exercise 10,000-product catalogs and large baskets.

Windows Computer Use stopped because its runtime could not determine the current browser URL with sufficient confidence. No further browser input was issued. Live release verification therefore uses authenticated API reads and deployed asset/schema checks; no production test purchases, stock movements or emails are generated.
