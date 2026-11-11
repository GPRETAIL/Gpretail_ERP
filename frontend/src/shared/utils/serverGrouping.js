import api from "@/shared/api/apiClient";

// Generic default, used by pages that don't have their own buildActiveColumnFilters helper
// (i.e. pages with no column-filter UI wired at all yet -- grouping still works there, it just
// never has filters to forward). Mirrors FilterableDataTable's own hasActiveColumnFilters check.
const defaultBuildActiveColumnFilters = (filters = {}) =>
  Object.entries(filters)
    .filter(([, f]) => f?.operator === "blank" || f?.operator === "not_blank" || String(f?.value ?? "").trim() !== "")
    .map(([field, f]) => ({ field, operator: f?.operator || "contains", value: String(f?.value ?? "") }));

/**
 * Builds the onFetchGroupSummaries/onFetchGroupRows pair FilterableDataTable needs for
 * server-side Group By (GroupAggregationService on the backend), given a resource's list
 * endpoint, its frontend-column-key -> real-DB-column map (matching
 * config('pagination.resources.{resource}.groupable_columns') on the backend), and the page's
 * own buildActiveColumnFilters helper (every master page already has one, for the
 * Filter Out/Show Matching features -- reused here rather than reimplemented).
 *
 * By default the summary comes from the resource's own `${resourcePath}/grouped` endpoint. With
 * `inline: true` it comes from the list endpoint itself (`group_summary=1`): PaginationService
 * answers it for any resource with groupable_columns, so no separate endpoint is needed.
 * `baseParams` are the list's own fixed params (e.g. `{ paginate: true }`), sent with both calls.
 * `mapRow` is the page's own row mapper (the one its list adapter uses), so a group's rows show
 * the same values as the ungrouped list.
 *
 * @param {string} resourcePath e.g. "/products"
 * @param {Record<string,string>} columnMap frontend key -> real DB column, e.g. { active: "is_active" }
 * @param {(filters: object) => Array<{field:string,operator:string,value:string}>} buildActiveColumnFilters
 * @param {{ inline?: boolean, baseParams?: object, mapRow?: (row: object) => object }} options
 */
export function createGroupFetchers(resourcePath, columnMap, buildActiveColumnFilters = defaultBuildActiveColumnFilters, options = {}) {
  const { inline = false, baseParams = {}, mapRow = null } = options;
  const realColumn = (key) => columnMap[key] || key;

  const onFetchGroupSummaries = async ({ groupByColumn, page, limit, search, field, columnFilters }) => {
    const activeFilters = buildActiveColumnFilters(columnFilters || {});
    const res = await api.get(inline ? resourcePath : `${resourcePath}/grouped`, {
      params: {
        ...baseParams,
        ...(inline ? { group_summary: 1 } : {}),
        group_by: groupByColumn,
        page,
        limit,
        search: search ? search.trim() : undefined,
        field: search && field && field !== "all" ? field : undefined,
        column_filters: activeFilters.length ? JSON.stringify(activeFilters) : undefined,
      },
    });
    // A list that answered with rows instead of a summary (e.g. a fallback branch that never reaches
    // PaginationService) can't be grouped: report it unsupported rather than show rows as groups.
    const first = res.data?.data?.[0];
    if (first && !("row_count" in first)) return { success: false };
    return res.data;
  };

  const onFetchGroupRows = async ({ groupByColumn, groupValue, page, limit }) => {
    const column = realColumn(groupByColumn);
    const isBlank = groupValue === "__blank__" || groupValue === null || groupValue === "";
    const filter = isBlank
      ? { field: column, operator: "blank", value: "" }
      : { field: column, operator: "equals", value: String(groupValue) };
    const res = await api.get(resourcePath, {
      params: { ...baseParams, column_filters: JSON.stringify([filter]), page, limit },
    });
    if (!mapRow) return res.data;
    return { ...res.data, data: (res.data?.data || []).map((row) => mapRow(row)) };
  };

  return { onFetchGroupSummaries, onFetchGroupRows };
}
