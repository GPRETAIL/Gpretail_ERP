import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";

const identity = (row) => row;
export function activeColumnFilters(filters = {}) {
  return Object.entries(filters)
    .filter(([, f]) => f && (["blank", "not_blank"].includes(f.operator) || String(f.value ?? "").trim()))
    .map(([field, f]) => ({ field, operator: f.operator || "contains", value: String(f.value ?? "") }));
}

// Adapters keep endpoint/row details outside the navigation state machine.
export function createSearchGridAdapter(endpoint, mapRow = identity, extraParams = {}) {
  return async ({ params, signal }) => {
    const { data } = await api.get(endpoint, { params: { ...extraParams, ...params }, signal });
    return {
      rows: (data?.data || []).map(mapRow),
      pagination: data?.pagination || { mode: "offset", total: data?.total, total_pages: data?.totalPages },
      metadata: { totalPayable: data?.totalPayable },
    };
  };
}

export default function useSearchGrid({ adapter, enabled = true, scopeKey = "", onError, initialLimit = 20, paginationMode = "server", sourceRows }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawPagination, setRawPagination] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [navigation, setNavigation] = useState({ page: 1, limit: initialLimit, cursor: null });
  const [search, setSearch] = useState({ query: null, field: "all", columnFilters: {}, sort: null, order: "asc" });
  const [revision, setRevision] = useState(0);
  const [requestParams, setRequestParams] = useState({});
  const generation = useRef(0);
  const controller = useRef(null);
  const latest = useRef({ adapter, onError });
  useEffect(() => { latest.current = { adapter, onError }; });
  const contextKey = JSON.stringify([scopeKey, search, requestParams]);
  const previousContext = useRef(contextKey);
  const requestKey = JSON.stringify([scopeKey, paginationMode === "client" ? null : [search, navigation], requestParams, revision, enabled]);

  const invalidate = useCallback(() => {
    generation.current += 1;
    controller.current?.abort();
  }, []);
  const setPage = useCallback((page) => {
    if (paginationMode === "server") invalidate();
    if (paginationMode === "server") setRevision(r => r + 1);
    setNavigation(n => ({ ...n, page: typeof page === "function" ? page(n.page) : page, cursor: null }));
  }, [invalidate, paginationMode]);
  const setLimit = useCallback((limit) => {
    if (paginationMode === "server") invalidate();
    if (paginationMode === "server") setRevision(r => r + 1);
    setNavigation({ page: 1, limit, cursor: null });
  }, [invalidate, paginationMode]);
  const onServerSearch = useCallback(({ query = "", field = "all", columnFilters = {} }) => {
    invalidate();
    setSearch(s => ({ ...s, query, field, columnFilters }));
    setRevision(r => r + 1);
    setNavigation(n => ({ ...n, page: 1, cursor: null }));
  }, [invalidate]);
  const onSortChange = useCallback((sort, order) => {
    invalidate();
    setSearch(s => ({ ...s, sort, order }));
    setRevision(r => r + 1);
    setNavigation(n => ({ ...n, page: 1, cursor: null }));
  }, [invalidate]);
  const navigateCursor = useCallback((cursor) => {
    invalidate();
    setNavigation(n => ({ ...n, cursor }));
    setRevision(r => r + 1);
  }, [invalidate]);
  const refresh = useCallback(() => { invalidate(); setRevision(r => r + 1); }, [invalidate]);
  const load = useCallback((params = {}, page = 1, limit) => {
    invalidate();
    setRequestParams(params);
    setRevision(r => r + 1);
    setNavigation(n => ({ page, limit: limit ?? n.limit, cursor: null }));
  }, [invalidate]);

  useEffect(() => {
    // Never reuse another store/type's cursor.
    if (previousContext.current !== contextKey) {
      previousContext.current = contextKey;
      if (navigation.cursor || navigation.page !== 1) {
        setNavigation(n => ({ ...n, page: 1, cursor: null }));
        if (paginationMode === "server") return;
      }
    }
    // Composite reports and controlled Settings drawers are assembled by their parent.
    // They share navigation without issuing another HTTP request.
    if (sourceRows !== undefined) return;
    if (!enabled) { setRows([]); setMetadata(null); setRawPagination(null); setLoading(false); return; }
    const id = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    const filters = activeColumnFilters(search.columnFilters);
    const params = {
      ...requestParams,
      ...(navigation.cursor ? { cursor: navigation.cursor } : { page: navigation.page }),
      limit: navigation.limit,
      search: String(search.query ?? requestParams.search ?? "").trim() || undefined,
      field: search.field !== "all" ? search.field : requestParams.field,
      column_filters: filters.length ? JSON.stringify(filters) : undefined,
      ...(search.sort ? { sort: search.sort, order: search.order, dir: search.order } : {}),
    };
    setLoading(true);
    setError(null);
    setRows([]);
    Promise.resolve().then(() => latest.current.adapter({ params, signal: abort.signal }))
      .then(result => {
        if (id !== generation.current || abort.signal.aborted) return;
        setRows(result.rows || []);
        setRawPagination(result.pagination || null);
        setMetadata(result.metadata || null);
      }).catch(err => {
        if (id !== generation.current || abort.signal.aborted) return;
        setError(err);
        setRawPagination(null);
        setMetadata(null);
        latest.current.onError?.(err);
      }).finally(() => {
        if (id === generation.current && !abort.signal.aborted) setLoading(false);
      });
    return () => { abort.abort(); generation.current += 1; };
    // Adapter identity is not a query key. Dynamic endpoints supply scopeKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const effectiveRows = sourceRows ?? rows;
  const total = Number(rawPagination?.total ?? effectiveRows.length) || 0;
  const totalPages = Math.max(1, Number(rawPagination?.total_pages ?? rawPagination?.last_page ?? rawPagination?.totalPages ?? Math.ceil(total / navigation.limit)) || 1);
  return {
    rows: effectiveRows, setRows, loading, error, metadata, rawPagination, pagination: { total, totalPages },
    page: navigation.page, limit: navigation.limit, setPage, setLimit,
    search, refresh, load, onServerSearch, onSortChange, navigateCursor,
  };
}
