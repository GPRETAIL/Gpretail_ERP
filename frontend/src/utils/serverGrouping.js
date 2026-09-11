import api from "../api/axios";

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
 * @param {string} resourcePath e.g. "/products"
 * @param {Record<string,string>} columnMap frontend key -> real DB column, e.g. { active: "is_active" }
 * @param {(filters: object) => Array<{field:string,operator:string,value:string}>} buildActiveColumnFilters
 */
export function createGroupFetchers(resourcePath, columnMap, buildActiveColumnFilters = defaultBuildActiveColumnFilters) {
  const realColumn = (key) => columnMap[key] || key;

  const onFetchGroupSummaries = async ({ groupByColumn, page, limit, search, field, columnFilters }) => {
    const activeFilters = buildActiveColumnFilters(columnFilters || {});
    const res = await api.get(`${resourcePath}/grouped`, {
      params: {
        group_by: groupByColumn,
        page,
        limit,
        search: search ? search.trim() : undefined,
        field: search && field && field !== "all" ? field : undefined,
        column_filters: activeFilters.length ? JSON.stringify(activeFilters) : undefined,
      },
    });
    return res.data;
  };

  const onFetchGroupRows = async ({ groupByColumn, groupValue, page, limit }) => {
    const column = realColumn(groupByColumn);
    const isBlank = groupValue === "__blank__" || groupValue === null || groupValue === "";
    const filter = isBlank
      ? { field: column, operator: "blank", value: "" }
      : { field: column, operator: "equals", value: String(groupValue) };
    const res = await api.get(resourcePath, {
      params: { column_filters: JSON.stringify([filter]), page, limit },
    });
    return res.data;
  };

  return { onFetchGroupSummaries, onFetchGroupRows };
}
