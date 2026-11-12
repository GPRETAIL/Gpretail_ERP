import { useCallback, useEffect, useState } from "react";
import useResetOnChange from "@/shared/hooks/useResetOnChange";

const EMPTY_SUMMARY = { loading: false, page: 1, data: [], pagination: null, meta: null, unsupported: false };

/**
 * FilterableDataTable's Group By state: the grouped column, which groups are open, and, for a server-paged
 * table, the group summaries and each open group's rows fetched from the server.
 *
 * Server grouping is on when the table has `onFetchGroupSummaries` and the backend can group the column:
 * - onFetchGroupSummaries({ groupByColumn, page, limit, search, field, columnFilters }) -> { data, pagination, meta }
 * - onFetchGroupRows({ groupByColumn, groupValue, page, limit }) -> { data, pagination }
 * A summary that fails (or answers success: false) marks the column `unsupported`, and a table that holds all
 * its rows then groups in the browser instead (see buildClientGroups).
 */
export default function useTableGrouping({
  defaultGroupByColumn, onFetchGroupSummaries, onFetchGroupRows, limit, searchQuery, searchField, columnFilters,
}) {
  const [groupByColumn, setGroupByColumn] = useState(defaultGroupByColumn || null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groupSummaryState, setGroupSummaryState] = useState(EMPTY_SUMMARY);
  // groupRowsState[groupKey] = { rows: [], page: 1, hasMore: true, loading: false, error: null }
  const [groupRowsState, setGroupRowsState] = useState({});

  useResetOnChange([defaultGroupByColumn], () => {
    const normalizedDefault = String(defaultGroupByColumn || "").trim() || null;
    setGroupByColumn((prev) => {
      const normalizedPrev = String(prev || "").trim() || null;
      if (normalizedPrev === normalizedDefault) return prev;
      return normalizedDefault;
    });
    setExpandedGroups({});
  });

  useResetOnChange([groupByColumn], () => {
    setExpandedGroups({});
    setGroupRowsState({});
    setGroupSummaryState(EMPTY_SUMMARY);
  });

  const isServerGrouped = Boolean(
    groupByColumn && typeof onFetchGroupSummaries === "function" && !groupSummaryState.unsupported
  );

  // Fetch a page of group summaries whenever server grouping is active, the group page changes, or the
  // search or filters change.
  useEffect(() => {
    if (!isServerGrouped) return undefined;
    let cancelled = false;
    (async () => {
      setGroupSummaryState((prev) => ({ ...prev, loading: true }));
      try {
        const result = await onFetchGroupSummaries({
          groupByColumn,
          page: groupSummaryState.page,
          limit: Math.max(Number(limit) || 20, 1),
          search: searchQuery,
          field: searchField,
          columnFilters,
        });
        if (cancelled) return;
        if (!result || result.success === false) {
          // Backend doesn't support grouping by this column -- fall back to the client-side path.
          setGroupSummaryState((prev) => ({ ...prev, loading: false, unsupported: true }));
          return;
        }
        setGroupSummaryState((prev) => ({
          ...prev,
          loading: false,
          data: result.data || [],
          pagination: result.pagination || null,
          meta: result.meta || null,
        }));
      } catch {
        if (!cancelled) setGroupSummaryState((prev) => ({ ...prev, loading: false, unsupported: true }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isServerGrouped, groupByColumn, groupSummaryState.page, limit, searchQuery, searchField, columnFilters]);

  const fetchGroupRowsPage = useCallback(async (groupKey, targetPage) => {
    if (typeof onFetchGroupRows !== "function") return;
    setGroupRowsState((prev) => ({
      ...prev,
      [groupKey]: { ...(prev[groupKey] || { rows: [], hasMore: true }), loading: true, error: null },
    }));
    try {
      const result = await onFetchGroupRows({ groupByColumn, groupValue: groupKey, page: targetPage, limit: 50 });
      setGroupRowsState((prev) => {
        const existing = prev[groupKey] || { rows: [] };
        const nextRows = targetPage > 1 ? [...existing.rows, ...(result?.data || [])] : (result?.data || []);
        return {
          ...prev,
          [groupKey]: { rows: nextRows, page: targetPage, hasMore: Boolean(result?.pagination?.has_next), loading: false, error: null },
        };
      });
    } catch {
      setGroupRowsState((prev) => ({
        ...prev,
        [groupKey]: { ...(prev[groupKey] || { rows: [] }), loading: false, error: "Failed to load rows" },
      }));
    }
  }, [onFetchGroupRows, groupByColumn]);

  /** Opens or closes a group; a server group's first page of rows is fetched the first time it opens. */
  const toggleGroupExpanded = useCallback((groupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
    if (isServerGrouped && !expandedGroups[groupKey] && !groupRowsState[groupKey]) {
      fetchGroupRowsPage(groupKey, 1);
    }
  }, [isServerGrouped, expandedGroups, groupRowsState, fetchGroupRowsPage]);

  const loadMoreGroupRows = useCallback((groupKey) => {
    const current = groupRowsState[groupKey];
    if (!current || current.loading || !current.hasMore) return;
    fetchGroupRowsPage(groupKey, (current.page || 1) + 1);
  }, [groupRowsState, fetchGroupRowsPage]);

  /** Moves to a page of groups: a number, or a function of the current page. */
  const setGroupPage = useCallback((next) => {
    setGroupSummaryState((prev) => ({ ...prev, page: typeof next === "function" ? next(prev.page) : next }));
  }, []);

  return {
    groupByColumn, setGroupByColumn, expandedGroups, groupSummaryState, groupRowsState,
    isServerGrouped, toggleGroupExpanded, loadMoreGroupRows, setGroupPage,
  };
}

/**
 * Browser Group By for a table that holds every row: groups `rows` (already filtered and sorted) by the
 * column's value, keeping first-seen order. Blank values form one "(Blank)" group; booleans show Yes/No.
 */
export function buildClientGroups(rows, column) {
  if (!column) return [];
  const groups = new Map();
  rows.forEach((row) => {
    const raw = column.valueGetter ? column.valueGetter(row) : row?.[column.key];
    const blank = raw === null || raw === undefined || String(raw).trim() === "";
    const key = blank ? "__blank__" : String(raw);
    if (!groups.has(key)) {
      const label = blank ? "(Blank)" : typeof raw === "boolean" ? (raw ? "Yes" : "No") : String(raw);
      groups.set(key, { group_value: blank ? null : key, label, row_count: 0, rows: [] });
    }
    const group = groups.get(key);
    group.row_count += 1;
    group.rows.push(row);
  });
  return Array.from(groups.values());
}
