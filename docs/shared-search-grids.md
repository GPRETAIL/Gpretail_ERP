# Shared ERP listing contract

Standard lists use `SearchGridPanel`, `FilterableDataTable` and its single
`TablePaginationFooter`. `MasterSearchPanel` is a compatibility export of the
same panel. `ERP_UI` owns control dimensions and scrollbar defaults.

`useSearchGrid` owns rows, loading/error state, page size, navigation, search,
filters, sort, refresh and stale-response protection. Endpoint adapters return
`{ rows, pagination, metadata? }`. `createSearchGridAdapter` handles ordinary
ERP JSON endpoints and accepts a row mapper. Dynamic endpoints must supply a
`scopeKey` (for example, Configuration type). Store switching reloads the app
through the existing Navbar and sends the existing scope headers.

Normal listing searches never request `all=true`. Export callbacks and dropdown
lookups remain separate. Cursor navigation replaces the displayed rows; it does
not append or show Load More. Search, filter, supported server sort, page-size
and scope changes reset the cursor. Abort signals and request generations prevent
an older response from replacing newer results.

The API's `pagination.mode` is authoritative:

- Small datasets use offset paging and allow page jumps.
- Above the configured 50,000 estimated-row threshold, or beyond the 50,000
  offset cap, standard lists use Previous/Next cursor navigation.
- MySQL estimates describe the underlying table, not an exact filtered count.
- Query sorting includes an ID tiebreaker. Supported Master sort fields are
  explicitly mapped; other existing display-column sorts remain local.

Configuration, HR configuration, size groups and settlement bill selection opt
into paginated listing responses. Their existing lookup responses remain
available without the opt-in. Physical Stock preserves source pagination when
enriching barcode rows.

The shared POS counter picker reads authenticated `/auth/counter` metadata, so
staff do not need Configuration Settings access to select an active counter.
Settlement bill reports request `status=open`, `credit` or `canceled`; `all`
includes paid history. Report requests with `all=true` are not capped at 50 bills.

Aggregate analytics keep their complete group calculations and totals and use
the hook's client mode. Composite Sales/Warehouse reports, Backup overview
histories and controlled permission drawers supply `sourceRows`; their parent
retains the report assembly or metadata/action loader. These are intentional
client adapters, not cursor-capable query endpoints. Supplier pending payments
retain their merged-document offset API. Unread-first notifications retain offset
mode because their expression ordering cannot form a Laravel cursor keyset.

Sales report tiles without a dedicated data source show “Not available yet”
instead of displaying a reused customer, employee, stock or POS list.

Editable POS/invoice lines do not use this listing migration.

The integration contract test checks all 42 ERP listing screens. Behaviour tests
cover offset jumps, cursor replacement, repeated requests, resets, cancellation,
stale results, aggregate totals and Brand/Product integration. Backend tests cover
threshold boundaries, deep offsets, duplicate sort values, both cursor directions,
store isolation and lookup compatibility.
