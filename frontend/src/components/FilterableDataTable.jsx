import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Filter,
  GripVertical,
  Layers,
  Pin,
  Search,
  Settings2,
  Trash2,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import ExportBottomSheet from "./ExportBottomSheet";
import { fetchTablePreference, saveTablePreference } from "../utils/tablePreferences";

const FILTER_OPERATORS = [
  { value: "contains", label: "Contain" },
  { value: "not_contains", label: "Does not contain" },
  { value: "equal", label: "Equal" },
  { value: "not_equal", label: "Does not equal" },
  { value: "begins_with", label: "Begins with" },
  { value: "ends_with", label: "Ends With" },
  { value: "blank", label: "Blank" },
  { value: "not_blank", label: "Not blank" },
];

const FILTER_DEFAULT = { operator: "contains", value: "" };
const INPUT_FREE_OPERATORS = new Set(["blank", "not_blank"]);

const ROW_HEIGHT_PX = 33;
const HEADER_HEIGHT_PX = 37;
const FIXED_TABLE_HEIGHT = ROW_HEIGHT_PX * 12 + HEADER_HEIGHT_PX;

const DEFAULT_MIN_COLUMN_WIDTH_PX = 64;
const DEFAULT_MAX_COLUMN_WIDTH_PX = 640;

const toText = (value, fallback = "--") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
};

const normalize = (value) => String(value ?? "").toLowerCase().trim();
const isEffectivelyBlank = (value) => {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  if (text === "") return true;
  return text === "--" || text === "-";
};

const passesColumnFilter = (rawValue, filter) => {
  const value = normalize(rawValue);
  const query = normalize(filter.value);

  switch (filter.operator) {
    case "contains":
      return query === "" ? true : value.includes(query);
    case "not_contains":
      return query === "" ? true : !value.includes(query);
    case "equal":
      return query === "" ? true : value === query;
    case "not_equal":
      return query === "" ? true : value !== query;
    case "begins_with":
      return query === "" ? true : value.startsWith(query);
    case "ends_with":
      return query === "" ? true : value.endsWith(query);
    case "blank":
      return isEffectivelyBlank(rawValue);
    case "not_blank":
      return !isEffectivelyBlank(rawValue);
    default:
      return true;
  }
};

const defaultCell = (value) => toText(value);

const normalizeFilterMap = (source = {}, schemaColumns = []) => {
  const next = {};
  schemaColumns.forEach((column) => {
    const filter = source?.[column.key] || FILTER_DEFAULT;
    next[column.key] = {
      operator: filter?.operator || FILTER_DEFAULT.operator,
      value: String(filter?.value || ""),
    };
  });
  return next;
};

const isFilterStateActive = (filter) => {
  if (!filter) return false;
  if (filter.operator === "blank" || filter.operator === "not_blank") return true;
  return String(filter.value || "").trim() !== "";
};

export default function FilterableDataTable({
  rows = [],
  columns = [],
  loading = false,
  emptyText = "No records found.",
  searchPlaceholder = "Search...",
  onRefresh = null,
  refreshDisabled = false,
  rowKey = "id",
  onRowClick = null,
  renderActions = null,
  actionsLabel = "Action",
  showExport = true,
  onExportRows = null,
  exportFileName = "table_data",
  exportTitle = "",
  exportTitleResolver = null,
  exportSubtitle = "",
  exportHeadingLines = [],
  exportSheetName = "Export",
  tablePreferenceKey = "",
  page = 1,
  limit = 10,
  totalPages = 1,
  totalRows = 0,
  onPageChange = null,
  onLimitChange = null,
  paginationMode = "server",
  enableServerSearch = false,
  onServerSearch = null,
  serverSearchDebounceMs = 350,
  onSortChange = null,
  defaultGroupByColumn = null,
  // Feature 1: Fixed height
  fixedHeight = true,
  // Feature 1b: Fill available page height on large screens
  fillHeight = false,
  compact = true,
  // Feature 1c: Row virtualization (opt-in; requires compact=true -- that's the only mode with a
  // CSS-enforced, uniform row height, see the .compact-data-table rule in index.css). No-op with a
  // dev warning otherwise, not a crash.
  enableVirtualization = false,
  // Feature 1d: Row-level keyboard navigation (opt-in). Arrow Up/Down/Home/End move a roving
  // "active row" cursor, Enter activates it (same as a click), Space toggles selection. Byte-
  // identical to today when left off -- no new Tab stop, no focus ring, no key handling.
  enableKeyboardNav = false,
  // Feature 2: Column reorder
  enableColumnReorder = true,
  // Feature 2b: Column resize (opt-in). Widen-only -- table-layout:auto plus forced
  // whitespace-nowrap means every column already shows full content with no truncation
  // mechanism, so narrowing below natural content width is a harmless no-op (column snaps
  // back) rather than a new ellipsis/truncation feature. Session-only: widths reset on reload.
  enableColumnResize = false,
  minColumnWidthPx = DEFAULT_MIN_COLUMN_WIDTH_PX,
  maxColumnWidthPx = DEFAULT_MAX_COLUMN_WIDTH_PX,
  // Feature 3: Row selection
  enableSelection = false,
  selectedRows = [],
  onSelectionChange = null,
  selectionColumnWidthClassName = "w-16",
  onBulkDelete = null,
  searchButtonClassName = "flex items-center px-3 py-1 xl:py-1.5 bg-blue-500 text-white rounded-sm text-xs xl:text-sm hover:bg-blue-600 disabled:opacity-50",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState(() =>
    columns.map((column) => column.key)
  );
  const [draftVisibleColumns, setDraftVisibleColumns] = useState(() =>
    columns.map((column) => column.key)
  );
  const [columnOrder, setColumnOrder] = useState(() =>
    columns.map((column) => column.key)
  );
  const [columnFilters, setColumnFilters] = useState({});
  const [groupByColumn, setGroupByColumn] = useState(defaultGroupByColumn || null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [allRowsSource, setAllRowsSource] = useState([]);
  const [allRowsLoading, setAllRowsLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" | "desc"
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [savingColumnPrefs, setSavingColumnPrefs] = useState(false);
  const [pinnedColumnKeys, setPinnedColumnKeys] = useState([]);
  const [headerContextMenu, setHeaderContextMenu] = useState(null);
  const [rowContextMenu, setRowContextMenu] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [draftColumnFilters, setDraftColumnFilters] = useState({});
  const [rowValueFilters, setRowValueFilters] = useState({ exclude: {}, include: {} });
  const [filterPanelFocusKey, setFilterPanelFocusKey] = useState(null);
  const [leadingStickyWidth, setLeadingStickyWidth] = useState(0);
  const [stickyColumnOffsets, setStickyColumnOffsets] = useState({});
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumnKey, setResizingColumnKey] = useState(null);
  const resizingRef = useRef(null);
  const headerSecondaryMouseDownRef = useRef({ columnKey: null, at: 0 });
  const filterPanelFieldRefs = useRef({});
  const leadingHeaderRef = useRef(null);
  const headerCellRefs = useRef({});
  const tableContainerRef = useRef(null);
  const rowNodeRefs = useRef(new Map());
  const filterInputRef = useRef(null);
  const stableSchemaColumnsRef = useRef(columns);
  const dragColRef = useRef(null);
  const dragOverColRef = useRef(null);
  const orderSaveTimer = useRef(null);
  const serverSearchTimerRef = useRef(null);
  const didInitServerSearchRef = useRef(false);
  const [isServerSearchDebouncing, setIsServerSearchDebouncing] = useState(false);

  const columnKeysSignature = useMemo(
    () => columns.map((column) => column.key).join("|"),
    [columns]
  );

  useEffect(() => {
    stableSchemaColumnsRef.current = columns;
  }, [columnKeysSignature, columns]);

  useEffect(() => {
    const normalizedDefault = String(defaultGroupByColumn || "").trim() || null;
    setGroupByColumn((prev) => {
      const normalizedPrev = String(prev || "").trim() || null;
      if (normalizedPrev === normalizedDefault) return prev;
      return normalizedDefault;
    });
    setExpandedGroups({});
  }, [defaultGroupByColumn]);

  useEffect(() => {
    const schemaColumns = stableSchemaColumnsRef.current;
    setVisibleColumns((prev) => {
      const valid = prev.filter((key) => schemaColumns.some((column) => column.key === key));
      if (valid.length > 0) return valid;
      return schemaColumns.map((column) => column.key);
    });
    setDraftVisibleColumns((prev) => {
      const valid = prev.filter((key) => schemaColumns.some((column) => column.key === key));
      if (valid.length > 0) return valid;
      return schemaColumns.map((column) => column.key);
    });
    setColumnOrder((prev) => {
      const allKeys = schemaColumns.map((c) => c.key);
      const valid = prev.filter((key) => allKeys.includes(key));
      const newKeys = allKeys.filter((key) => !valid.includes(key));
      return [...valid, ...newKeys];
    });
  }, [columnKeysSignature]);

  useEffect(() => {
    if (!enableColumnResize) return;
    const schemaColumns = stableSchemaColumnsRef.current;
    const validKeys = new Set(schemaColumns.map((column) => column.key));
    setColumnWidths((prev) => {
      const next = {};
      let changed = false;
      Object.entries(prev).forEach(([key, width]) => {
        if (validKeys.has(key)) {
          next[key] = width;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [columnKeysSignature, enableColumnResize]);

  useEffect(() => {
    let active = true;

    const loadPreference = async () => {
      if (!tablePreferenceKey) return;
      try {
        const saved = await fetchTablePreference(tablePreferenceKey);
        if (!active || !saved) return;
        const schemaColumns = stableSchemaColumnsRef.current;

        if (Array.isArray(saved.visibleColumns) && saved.visibleColumns.length > 0) {
          const valid = saved.visibleColumns.filter((key) =>
            schemaColumns.some((column) => column.key === key)
          );
          if (valid.length > 0) setVisibleColumns(valid);
        }

        if (Array.isArray(saved.columnOrder) && saved.columnOrder.length > 0) {
          setColumnOrder((prev) => {
            const allKeys = schemaColumns.map((c) => c.key);
            const valid = saved.columnOrder.filter((key) => allKeys.includes(key));
            const newKeys = allKeys.filter((key) => !valid.includes(key));
            return valid.length > 0 ? [...valid, ...newKeys] : prev;
          });
        }

        if (Array.isArray(saved.pinnedColumnKeys)) {
          setPinnedColumnKeys(saved.pinnedColumnKeys.map((key) => String(key)));
        }
      } catch {
        // Keep defaults if preference lookup fails.
      }
    };

    loadPreference();
    return () => {
      active = false;
    };
  }, [tablePreferenceKey, columnKeysSignature]);

  // Surface 1 (filter popup) outside-click/Escape closing is now owned by MUI Popover's own
  // onClose -- no manual document listener needed.

  useEffect(() => {
    if (!headerContextMenu) return;

    // MUI Menu's own onClose covers backdrop-click and Escape. It does NOT cover "the user
    // scrolled the page" or "the user right-clicked elsewhere" -- both of which this component's
    // UX has always closed on, and losing that would leave a stale menu floating over
    // scrolled-away content. Keep these three window listeners; only the old ref-based
    // outside-mousedown branch is gone (superseded by Menu's onClose).
    const handleClose = () => setHeaderContextMenu(null);

    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    window.addEventListener("contextmenu", handleClose);

    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("contextmenu", handleClose);
    };
  }, [headerContextMenu]);

  useEffect(() => {
    if (!rowContextMenu) return;

    const handleClose = () => setRowContextMenu(null);

    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    window.addEventListener("contextmenu", handleClose);

    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("contextmenu", handleClose);
    };
  }, [rowContextMenu]);

  useEffect(() => {
    if (!activeFilterColumn) return;
    const timer = setTimeout(() => {
      filterInputRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeFilterColumn]);

  const getRawValue = (row, column) => {
    if (column.valueGetter) return column.valueGetter(row);
    return row?.[column.key];
  };
  const getSearchValue = useCallback((row, column) => {
    if (column.searchValue) return column.searchValue(row);
    if (column.valueGetter) return column.valueGetter(row);
    return row?.[column.key];
  }, []);

  const getColumnFilter = (columnKey) => columnFilters[columnKey] || FILTER_DEFAULT;
  const getDraftColumnFilter = (columnKey) => draftColumnFilters[columnKey] || FILTER_DEFAULT;

  const setColumnFilter = (columnKey, update) => {
    setColumnFilters((prev) => {
      const base = prev[columnKey] || FILTER_DEFAULT;
      return {
        ...prev,
        [columnKey]: { ...base, ...update },
      };
    });
  };

  const clearColumnFilter = (columnKey) => {
    setColumnFilters((prev) => ({ ...prev, [columnKey]: FILTER_DEFAULT }));
  };

  const setDraftColumnFilter = (columnKey, update) => {
    setDraftColumnFilters((prev) => {
      const base = prev[columnKey] || FILTER_DEFAULT;
      return {
        ...prev,
        [columnKey]: { ...base, ...update },
      };
    });
  };

  const clearDraftColumnFilter = (columnKey) => {
    setDraftColumnFilters((prev) => ({ ...prev, [columnKey]: FILTER_DEFAULT }));
  };

  const isFilterActive = (columnKey) => {
    return isFilterStateActive(getColumnFilter(columnKey));
  };

  const toggleColumnFilterPopup = (columnKey, triggerElement) => {
    setActiveFilterColumn((prev) => {
      if (prev === columnKey) return null;
      setFilterAnchorEl(triggerElement);
      return columnKey;
    });
  };

  // Adopting real MUI Popover/Menu/Drawer/Dialog for the four floating surfaces in this file
  // brings focus-trap, Escape-to-close, and proper ARIA roles for the first time -- none of the
  // four had any of this before this pass. Intentional, accepted UX improvement, not an
  // oversight. Surface 3's Drawer slide-in transition (also new vs. today's instant mount) is
  // called out again at its own render site below.
  const renderColumnFilterPopup = (column) => {
    if (activeFilterColumn !== column.key) return null;

    return (
      <Popover
        open
        anchorEl={filterAnchorEl}
        onClose={() => setActiveFilterColumn(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            className: "w-56 p-2",
            sx: {
              mt: "6px",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              boxShadow: 4,
            },
          },
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
            {column.label}
          </span>
          <IconButton size="small" onClick={() => setActiveFilterColumn(null)}>
            <X className="w-3.5 h-3.5" />
          </IconButton>
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={getColumnFilter(column.key).operator}
            onChange={(e) =>
              setColumnFilter(column.key, { operator: e.target.value })
            }
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-[11px] bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            {FILTER_OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
          {!INPUT_FREE_OPERATORS.has(getColumnFilter(column.key).operator) && (
            <input
              ref={filterInputRef}
              type="text"
              value={getColumnFilter(column.key).value}
              onChange={(e) =>
                setColumnFilter(column.key, { value: e.target.value })
              }
              placeholder="Enter filter value"
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-[11px] dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
          )}
        </div>
        <Button size="small" onClick={() => clearColumnFilter(column.key)} className="mt-2">
          Clear
        </Button>
      </Popover>
    );
  };

  const excludedRowFilterCount = useMemo(
    () => Object.values(rowValueFilters.exclude).reduce((sum, values) => sum + values.length, 0),
    [rowValueFilters]
  );
  const includedRowFilterCount = useMemo(
    () => Object.values(rowValueFilters.include).reduce((sum, values) => sum + values.length, 0),
    [rowValueFilters]
  );
  const hasActiveRowValueFilters = excludedRowFilterCount > 0 || includedRowFilterCount > 0;

  const applyLocalFilters = useCallback((sourceRows) => {
    const safeRows = sourceRows || [];

    // When server search is enabled, skip the global search bar filter
    // (server already handled that), but STILL apply per-column header filters locally.
    const query = enableServerSearch ? "" : normalize(searchQuery);

    return safeRows.filter((row) => {
      // Global search bar filter (client-side only)
      if (query) {
        if (searchField === "all") {
          const hasMatch = columns.some((column) =>
            normalize(getSearchValue(row, column)).includes(query)
          );
          if (!hasMatch) return false;
        } else {
          const activeColumn = columns.find((column) => column.key === searchField);
          if (activeColumn && !normalize(getSearchValue(row, activeColumn)).includes(query)) {
            return false;
          }
        }
      }

      // Per-column header filters — always applied (both server and client modes)
      for (const column of columns) {
        const filter = columnFilters[column.key] || FILTER_DEFAULT;
        const searchValue = getSearchValue(row, column);
        if (!passesColumnFilter(searchValue, filter)) return false;

        const normalizedValue = normalize(searchValue);
        const excludedValues = rowValueFilters.exclude[column.key] || [];
        if (excludedValues.includes(normalizedValue)) return false;

        const includedValues = rowValueFilters.include[column.key] || [];
        if (includedValues.length > 0 && !includedValues.includes(normalizedValue)) return false;
      }

      return true;
    });
  }, [columns, searchField, searchQuery, columnFilters, getSearchValue, enableServerSearch, rowValueFilters]);

  const hasActiveColumnFilters = useMemo(() => {
    return Object.values(columnFilters).some((f) => {
      if (f?.operator === "blank" || f?.operator === "not_blank") return true;
      return String(f?.value || "").trim() !== "";
    });
  }, [columnFilters]);

  const shouldLoadAllRowsSource = Boolean(
    paginationMode === "server" &&
      typeof onExportRows === "function" &&
      (groupByColumn || hasActiveRowValueFilters || hasActiveColumnFilters)
  );
  const sourceRows = shouldLoadAllRowsSource ? allRowsSource : rows;
  const filteredRows = useMemo(() => applyLocalFilters(sourceRows), [sourceRows, applyLocalFilters]);
  const getRowKey = useCallback((row, index) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    return row?.[rowKey] ?? index;
  }, [rowKey]);

  const toggleSort = useCallback((columnKey) => {
    let nextColumn = columnKey;
    let nextDirection = "asc";
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        nextDirection = "desc";
      } else {
        // Third click resets
        nextColumn = null;
        nextDirection = "asc";
      }
    }
    setSortColumn(nextColumn);
    setSortDirection(nextDirection);
    onSortChange?.(nextColumn, nextDirection);
  }, [sortColumn, sortDirection, onSortChange]);

  const sortRowsForDisplay = useCallback((sourceRows) => {
    const activeSortColumn = groupByColumn || sortColumn;
    const activeSortDirection = sortDirection;
    if (!activeSortColumn) return sourceRows || [];
    // When the parent drives sort via onSortChange, the rows it hands back are already in the
    // requested order -- skip re-sorting here (mirrors how enableServerSearch blanks out client
    // search) UNLESS grouping is active, which still needs a client-side presort to cluster
    // same-value rows regardless of who owns the column sort.
    if (onSortChange && !groupByColumn) return sourceRows || [];
    const col = columns.find((c) => c.key === activeSortColumn);
    if (!col) return sourceRows || [];
    const sorted = [...(sourceRows || [])].sort((a, b) => {
      const aVal = col.valueGetter ? col.valueGetter(a) : a?.[col.key];
      const bVal = col.valueGetter ? col.valueGetter(b) : b?.[col.key];
      const aStr = String(aVal ?? "").toLowerCase();
      const bStr = String(bVal ?? "").toLowerCase();
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return aStr.localeCompare(bStr);
    });
    return activeSortDirection === "desc" ? sorted.reverse() : sorted;
  }, [groupByColumn, sortColumn, sortDirection, columns, onSortChange]);

  const sortedRows = useMemo(
    () => sortRowsForDisplay(filteredRows),
    [filteredRows, sortRowsForDisplay]
  );

  useEffect(() => {
    setExpandedGroups({});
  }, [groupByColumn]);

  const toggleGroupExpanded = useCallback((groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  const emitServerSearch = useCallback(
    (query, field, immediate = false, fetchAll = false, filters = null) => {
      if (!enableServerSearch || typeof onServerSearch !== "function") return;
      onServerSearch({
        query: String(query || "").trim(),
        field,
        immediate,
        fetchAll,
        columnFilters: filters || columnFilters,
      });
    },
    [enableServerSearch, onServerSearch, columnFilters]
  );

  const applyRowValueFilter = useCallback((mode, columnKey, rawValue) => {
    const normalizedMode = mode === "include" ? "include" : "exclude";
    const oppositeMode = normalizedMode === "include" ? "exclude" : "include";
    const normalizedColumnKey = String(columnKey || "").trim();
    const normalizedValue = normalize(rawValue);
    if (!normalizedColumnKey) return;

    setRowValueFilters((prev) => {
      const next = {
        exclude: { ...prev.exclude },
        include: { ...prev.include },
      };

      const currentValues = new Set(next[normalizedMode][normalizedColumnKey] || []);
      currentValues.add(normalizedValue);
      next[normalizedMode][normalizedColumnKey] = [...currentValues];

      const oppositeValues = (next[oppositeMode][normalizedColumnKey] || []).filter(
        (value) => value !== normalizedValue
      );
      if (oppositeValues.length > 0) next[oppositeMode][normalizedColumnKey] = oppositeValues;
      else delete next[oppositeMode][normalizedColumnKey];

      return next;
    });

    setRowContextMenu(null);
    if (typeof onPageChange === "function") onPageChange(1);
  }, [onPageChange]);

  const clearRowValueFilterMode = useCallback((mode) => {
    const normalizedMode = mode === "include" ? "include" : "exclude";
    setRowValueFilters((prev) => ({
      ...prev,
      [normalizedMode]: {},
    }));
    if (typeof onPageChange === "function") onPageChange(1);
  }, [onPageChange]);

  const openRowContextMenu = useCallback((event, column, row) => {
    event.preventDefault();
    event.stopPropagation();
    setHeaderContextMenu(null);
    setActiveFilterColumn(null);

    const menuWidth = 220;
    const menuHeight = 94;
    const viewportPadding = 8;
    const left = Math.min(
      event.clientX,
      window.innerWidth - menuWidth - viewportPadding
    );
    const top = Math.min(
      event.clientY,
      window.innerHeight - menuHeight - viewportPadding
    );
    const rawValue = getSearchValue(row, column);

    setRowContextMenu({
      top: Math.max(viewportPadding, top),
      left: Math.max(viewportPadding, left),
      columnKey: column.key,
      label: column.label,
      rawValue,
      displayValue: toText(rawValue),
    });
  }, [getSearchValue]);

  const resolveServerSearchPayload = useCallback(() => {
    const directQuery = String(searchQuery || "").trim();
    if (directQuery !== "") {
      return {
        query: directQuery,
        field: searchField,
        fetchAll: hasActiveColumnFilters,
      };
    }

    return {
      query: "",
      field: searchField,
      fetchAll: hasActiveColumnFilters,
    };
  }, [searchQuery, searchField, hasActiveColumnFilters]);

  const applyColumnFilters = useCallback((nextFilters, { closePanel = false } = {}) => {
    setColumnFilters(nextFilters);
    if (typeof onPageChange === "function") onPageChange(1);
    if (closePanel) setShowFilterPanel(false);

    if (enableServerSearch && typeof onServerSearch === "function") {
      const query = String(searchQuery || "").trim();
      const hasFilters = Object.values(nextFilters || {}).some((filter) => isFilterStateActive(filter));
      clearTimeout(serverSearchTimerRef.current);
      setIsServerSearchDebouncing(false);
      emitServerSearch(query, searchField, true, hasFilters, nextFilters);
    }
  }, [enableServerSearch, onPageChange, onServerSearch, searchQuery, searchField, emitServerSearch]);

  const openFilterPanel = useCallback((focusColumnKey = null) => {
    const schemaColumns = stableSchemaColumnsRef.current;
    setDraftColumnFilters(normalizeFilterMap(columnFilters, schemaColumns));
    setFilterPanelFocusKey(focusColumnKey);
    setHeaderContextMenu(null);
    setShowFilterPanel(true);
  }, [columnFilters]);

  useEffect(() => {
    if (!showFilterPanel || !filterPanelFocusKey) return;
    const timer = setTimeout(() => {
      filterPanelFieldRefs.current[filterPanelFocusKey]?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [showFilterPanel, filterPanelFocusKey]);

  useEffect(() => {
    if (!enableServerSearch || typeof onServerSearch !== "function") return;
    if (!didInitServerSearchRef.current) {
      didInitServerSearchRef.current = true;
      return;
    }
    const delay = Math.max(0, Number(serverSearchDebounceMs) || 350);
    const { query, field, fetchAll } = resolveServerSearchPayload();
    setIsServerSearchDebouncing(true);
    clearTimeout(serverSearchTimerRef.current);
    serverSearchTimerRef.current = setTimeout(() => {
      setIsServerSearchDebouncing(false);
      emitServerSearch(query, field, false, fetchAll, columnFilters);
    }, delay);
    return () => clearTimeout(serverSearchTimerRef.current);
  }, [
    enableServerSearch,
    onServerSearch,
    searchQuery,
    searchField,
    columnFilters,
    hasActiveColumnFilters,
    serverSearchDebounceMs,
    emitServerSearch,
    resolveServerSearchPayload,
  ]);

  const runImmediateServerSearch = useCallback(
    (query, field, fetchAll) => {
      clearTimeout(serverSearchTimerRef.current);
      setIsServerSearchDebouncing(false);
      emitServerSearch(query, field, true, fetchAll, columnFilters);
    },
    [emitServerSearch, columnFilters]
  );

  const visibleColumnDefs = useMemo(() => {
    const visible = columns.filter((column) => visibleColumns.includes(column.key));
    const orderedVisible = visible.sort((a, b) => {
      const ai = columnOrder.indexOf(a.key);
      const bi = columnOrder.indexOf(b.key);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
    if (pinnedColumnKeys.length === 0) return orderedVisible;
    const pinnedSet = new Set(pinnedColumnKeys);
    return [
      ...orderedVisible.filter((column) => pinnedSet.has(column.key)),
      ...orderedVisible.filter((column) => !pinnedSet.has(column.key)),
    ];
  }, [columns, visibleColumns, columnOrder, pinnedColumnKeys]);

  useEffect(() => {
    const updateStickyOffsets = () => {
      const nextLeadingWidth = leadingHeaderRef.current?.offsetWidth || 0;
      const nextOffsets = {};
      let currentLeft = nextLeadingWidth;

      visibleColumnDefs.forEach((column) => {
        if (!pinnedColumnKeys.includes(column.key)) return;
        nextOffsets[column.key] = currentLeft;
        currentLeft += headerCellRefs.current[column.key]?.offsetWidth || 0;
      });

      setLeadingStickyWidth(nextLeadingWidth);
      setStickyColumnOffsets((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(nextOffsets);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every((key) => prev[key] === nextOffsets[key])
        ) {
          return prev;
        }
        return nextOffsets;
      });
    };

    updateStickyOffsets();

    const observedNodes = [
      leadingHeaderRef.current,
      ...visibleColumnDefs
        .filter((column) => pinnedColumnKeys.includes(column.key))
        .map((column) => headerCellRefs.current[column.key]),
    ].filter(Boolean);

    if (typeof ResizeObserver !== "undefined" && observedNodes.length > 0) {
      const observer = new ResizeObserver(updateStickyOffsets);
      observedNodes.forEach((node) => observer.observe(node));
      window.addEventListener("resize", updateStickyOffsets);
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", updateStickyOffsets);
      };
    }

    window.addEventListener("resize", updateStickyOffsets);
    return () => window.removeEventListener("resize", updateStickyOffsets);
  }, [visibleColumnDefs, pinnedColumnKeys]);

  const getStickyCellStyle = useCallback(
    (columnKey, isHeader = false) => {
      if (!pinnedColumnKeys.includes(columnKey)) return undefined;
      return {
        position: "sticky",
        left: stickyColumnOffsets[columnKey] ?? leadingStickyWidth,
        zIndex: isHeader ? 25 : 15,
      };
    },
    [pinnedColumnKeys, stickyColumnOffsets, leadingStickyWidth]
  );

  const handleExportRows = useCallback(async () => {
    if (typeof onExportRows !== "function") return filteredRows;

    const resolved = await onExportRows({
      query: String(searchQuery || "").trim(),
      field: searchField,
      columnFilters,
      hasActiveColumnFilters,
      visibleColumns: visibleColumnDefs,
    });
    const sourceRows = Array.isArray(resolved)
      ? resolved
      : Array.isArray(resolved?.rows)
        ? resolved.rows
        : rows;
    return applyLocalFilters(sourceRows);
  }, [
    onExportRows,
    filteredRows,
    searchQuery,
    searchField,
    columnFilters,
    hasActiveColumnFilters,
    visibleColumnDefs,
    rows,
    applyLocalFilters,
  ]);

  useEffect(() => {
    let active = true;

    const loadAllRows = async () => {
      if (!shouldLoadAllRowsSource) {
        setAllRowsSource([]);
        setAllRowsLoading(false);
        return;
      }

      try {
        setAllRowsLoading(true);
        const resolved = await onExportRows({
          query: String(searchQuery || "").trim(),
          field: searchField,
          columnFilters,
          hasActiveColumnFilters,
          visibleColumns: visibleColumnDefs,
        });
        if (!active) return;
        const nextRows = Array.isArray(resolved)
          ? resolved
          : Array.isArray(resolved?.rows)
            ? resolved.rows
            : rows;
        setAllRowsSource(Array.isArray(nextRows) ? nextRows : []);
      } finally {
        if (active) setAllRowsLoading(false);
      }
    };

    loadAllRows();
    return () => {
      active = false;
    };
  }, [
    shouldLoadAllRowsSource,
    onExportRows,
    searchQuery,
    searchField,
    columnFilters,
    hasActiveColumnFilters,
    visibleColumnDefs,
    rows,
  ]);

  // --- Column personalizer dual-list state ---
  const [availableHighlight, setAvailableHighlight] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [draftSelectedOrder, setDraftSelectedOrder] = useState([]);

  const handleOpenColumnDialog = () => {
    // draftVisibleColumns = keys currently selected (in order)
    const orderedSelected = columnOrder.filter((k) => visibleColumns.includes(k));
    const extra = visibleColumns.filter((k) => !orderedSelected.includes(k));
    setDraftVisibleColumns([...orderedSelected, ...extra]);
    setDraftSelectedOrder([...orderedSelected, ...extra]);
    setAvailableHighlight(null);
    setSelectedHighlight(null);
    setShowColumnDialog(true);
  };

  const handleMoveToSelected = () => {
    if (!availableHighlight) return;
    setDraftVisibleColumns((prev) => [...prev, availableHighlight]);
    setDraftSelectedOrder((prev) => [...prev, availableHighlight]);
    setAvailableHighlight(null);
  };

  const handleMoveAllToSelected = () => {
    const allKeys = columns.map((c) => c.key);
    setDraftVisibleColumns(allKeys);
    setDraftSelectedOrder(allKeys);
    setAvailableHighlight(null);
  };

  const handleMoveToAvailable = () => {
    if (!selectedHighlight) return;
    // Don't allow removing the last column
    if (draftVisibleColumns.length <= 1) return;
    setDraftVisibleColumns((prev) => prev.filter((k) => k !== selectedHighlight));
    setDraftSelectedOrder((prev) => prev.filter((k) => k !== selectedHighlight));
    setSelectedHighlight(null);
  };

  const handleMoveAllToAvailable = () => {
    // Keep at least the first column
    const first = draftSelectedOrder[0];
    setDraftVisibleColumns([first]);
    setDraftSelectedOrder([first]);
    setSelectedHighlight(null);
  };

  const handleMoveSelectedUp = () => {
    if (!selectedHighlight) return;
    setDraftSelectedOrder((prev) => {
      const idx = prev.indexOf(selectedHighlight);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const handleMoveSelectedDown = () => {
    if (!selectedHighlight) return;
    setDraftSelectedOrder((prev) => {
      const idx = prev.indexOf(selectedHighlight);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const draftAvailableColumns = useMemo(
    () => columns.filter((c) => !draftVisibleColumns.includes(c.key)),
    [columns, draftVisibleColumns]
  );

  const draftSelectedColumns = useMemo(
    () =>
      draftSelectedOrder
        .map((key) => columns.find((c) => c.key === key))
        .filter(Boolean),
    [columns, draftSelectedOrder]
  );

  const handleApplyColumns = async () => {
    const valid = draftSelectedOrder.filter((key) =>
      columns.some((column) => column.key === key)
    );
    if (valid.length === 0) return;

    setVisibleColumns(valid);
    setColumnOrder(valid);
    setShowColumnDialog(false);

    if (!tablePreferenceKey) return;
    try {
      setSavingColumnPrefs(true);
      await saveTablePreference(tablePreferenceKey, valid, valid, pinnedColumnKeys);
    } catch {
      // Keep UI responsive even if preference save fails.
    } finally {
      setSavingColumnPrefs(false);
    }
  };

  const handleResetColumnDefaults = async () => {
    const allKeys = columns.map((c) => c.key);
    setVisibleColumns(allKeys);
    setColumnOrder(allKeys);
    if (enableColumnResize) setColumnWidths({});
    setShowColumnDialog(false);

    if (!tablePreferenceKey) return;
    try {
      setSavingColumnPrefs(true);
      await saveTablePreference(tablePreferenceKey, allKeys, allKeys, pinnedColumnKeys);
    } catch {
      // silent
    } finally {
      setSavingColumnPrefs(false);
    }
  };

  const persistTablePreference = useCallback(
    async ({
      nextVisibleColumns = visibleColumns,
      nextColumnOrder = columnOrder,
      nextPinnedColumnKeys = pinnedColumnKeys,
    } = {}) => {
      if (!tablePreferenceKey) return;
      try {
        await saveTablePreference(
          tablePreferenceKey,
          nextVisibleColumns,
          nextColumnOrder,
          nextPinnedColumnKeys
        );
      } catch {
        // silent
      }
    },
    [tablePreferenceKey, visibleColumns, columnOrder, pinnedColumnKeys]
  );

  const handleTogglePinColumn = useCallback(
    async (columnKey) => {
      const normalizedKey = String(columnKey || "").trim();
      if (!normalizedKey) return;

      const isCurrentlyPinned = pinnedColumnKeys.includes(normalizedKey);
      const nextPinnedColumnKeys = isCurrentlyPinned
        ? pinnedColumnKeys.filter((key) => key !== normalizedKey)
        : [...pinnedColumnKeys.filter((key) => key !== normalizedKey), normalizedKey];

      setPinnedColumnKeys(nextPinnedColumnKeys);
      setHeaderContextMenu(null);
      await persistTablePreference({ nextPinnedColumnKeys });
    },
    [pinnedColumnKeys, persistTablePreference]
  );

  const handleGroupByColumn = useCallback((columnKey) => {
    const normalizedKey = String(columnKey || "").trim();
    if (!normalizedKey) return;
    setGroupByColumn(normalizedKey);
    if (typeof onPageChange === "function") onPageChange(1);
    setHeaderContextMenu(null);
  }, [onPageChange]);

  const handleUngroupColumn = useCallback(() => {
    setGroupByColumn(null);
    setHeaderContextMenu(null);
  }, []);

  const openHeaderContextMenu = useCallback((event, column) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveFilterColumn(null);
    const menuWidth = 180;
    const menuHeight = 108;
    const viewportPadding = 8;
    const left = Math.min(
      event.clientX,
      window.innerWidth - menuWidth - viewportPadding
    );
    const top = Math.min(
      event.clientY,
      window.innerHeight - menuHeight - viewportPadding
    );

    setHeaderContextMenu({
      top: Math.max(viewportPadding, top),
      left: Math.max(viewportPadding, left),
      columnKey: column.key,
      label: column.label,
      isPinned: pinnedColumnKeys.includes(column.key),
      isGrouped: groupByColumn === column.key,
    });
  }, [groupByColumn, pinnedColumnKeys]);

  const handleHeaderMouseDown = useCallback((event, column) => {
    if (event.button !== 2) return;
    headerSecondaryMouseDownRef.current = {
      columnKey: column.key,
      at: Date.now(),
    };
    openHeaderContextMenu(event, column);
  }, [openHeaderContextMenu]);

  const handleHeaderContextMenu = useCallback((event, column) => {
    const lastMouseDown = headerSecondaryMouseDownRef.current;
    if (
      lastMouseDown.columnKey === column.key &&
      Date.now() - lastMouseDown.at < 400
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    openHeaderContextMenu(event, column);
  }, [openHeaderContextMenu]);

  // Coordinate-based fallback for the header context menu: on some browsers a
  // sticky-positioned header cell's own contextmenu/mousedown listeners don't fire on a
  // genuine right-click (the per-cell React handlers above are skipped entirely, not just
  // out-raced), even though the same click is hit-testable via elementFromPoint and a
  // synthetic dispatch on the same node works fine. This document-level listener uses the
  // event's real screen coordinates against each header cell's live bounding rect instead of
  // relying on event.target/bubbling, so it still finds the intended column even if the
  // browser resolved the native event to an unexpected target. It only ever engages when the
  // per-cell handler above did NOT already handle the click -- that handler calls
  // stopPropagation(), which stops a normally-dispatched event from ever reaching this
  // document listener, so the two paths cannot double-open the menu.
  useEffect(() => {
    const handleDocumentContextMenu = (event) => {
      for (const column of visibleColumnDefs) {
        const node = headerCellRefs.current[column.key];
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (
          event.clientX >= rect.left && event.clientX <= rect.right &&
          event.clientY >= rect.top && event.clientY <= rect.bottom
        ) {
          openHeaderContextMenu(event, column);
          return;
        }
      }
    };
    document.addEventListener("contextmenu", handleDocumentContextMenu);
    return () => document.removeEventListener("contextmenu", handleDocumentContextMenu);
  }, [visibleColumnDefs, openHeaderContextMenu]);

  // --- Column reorder drag handlers ---
  const handleColumnReorder = useCallback(
    (newOrder) => {
      setColumnOrder(newOrder);
      if (!tablePreferenceKey) return;
      clearTimeout(orderSaveTimer.current);
      orderSaveTimer.current = setTimeout(async () => {
        try {
          await saveTablePreference(tablePreferenceKey, visibleColumns, newOrder, pinnedColumnKeys);
        } catch {
          // silent
        }
      }, 800);
    },
    [tablePreferenceKey, visibleColumns, pinnedColumnKeys]
  );

  const onDragStart = useCallback((e, columnKey) => {
    dragColRef.current = columnKey;
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.5";
  }, []);

  const onDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = "";
    dragColRef.current = null;
    dragOverColRef.current = null;
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDragEnter = useCallback((e, columnKey) => {
    dragOverColRef.current = columnKey;
    e.currentTarget.classList.add("border-l-2", "border-l-blue-400");
  }, []);

  const onDragLeave = useCallback((e) => {
    e.currentTarget.classList.remove("border-l-2", "border-l-blue-400");
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove("border-l-2", "border-l-blue-400");
      const fromKey = dragColRef.current;
      const toKey = dragOverColRef.current;
      if (fromKey && toKey && fromKey !== toKey) {
        setColumnOrder((prev) => {
          const newOrder = [...prev];
          const fromIdx = newOrder.indexOf(fromKey);
          const toIdx = newOrder.indexOf(toKey);
          if (fromIdx === -1 || toIdx === -1) return prev;
          newOrder.splice(fromIdx, 1);
          newOrder.splice(toIdx, 0, fromKey);
          handleColumnReorder(newOrder);
          return newOrder;
        });
      }
    },
    [handleColumnReorder]
  );

  // --- Column resize drag handlers ---
  // Widen-only: table-layout:auto plus forced whitespace-nowrap means a header cell's explicit
  // width is only ever a floor, never a hard cap -- dragging narrower than a column's natural
  // content width is a harmless no-op (the column snaps back), not a truncation feature.
  // Direct-DOM style mutation during the drag (not setColumnWidths per-mousemove) mirrors
  // onDragStart/onDragEnd's opacity trick above, for the same reason: avoid a full-table
  // re-render on every mousemove frame on a wide table.
  const handleResizeMouseMove = useCallback(
    (event) => {
      const active = resizingRef.current;
      if (!active) return;
      const delta = event.clientX - active.startX;
      const nextWidth = Math.min(
        Math.max(active.startWidth + delta, minColumnWidthPx),
        maxColumnWidthPx
      );
      const node = headerCellRefs.current[active.columnKey];
      if (node) node.style.width = `${nextWidth}px`;
      resizingRef.current.lastWidth = nextWidth;
    },
    [minColumnWidthPx, maxColumnWidthPx]
  );

  const handleResizeMouseUp = useCallback(() => {
    const active = resizingRef.current;
    window.removeEventListener("mousemove", handleResizeMouseMove);
    window.removeEventListener("mouseup", handleResizeMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setResizingColumnKey(null);
    resizingRef.current = null;
    if (!active || active.lastWidth == null) return;
    setColumnWidths((prev) => ({ ...prev, [active.columnKey]: active.lastWidth }));
  }, [handleResizeMouseMove]);

  const handleResizeMouseDown = useCallback(
    (event, columnKey) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation(); // must not let the ancestor TableCell's native dragstart fire
      const node = headerCellRefs.current[columnKey];
      const startWidth = columnWidths[columnKey] ?? node?.offsetWidth ?? minColumnWidthPx;
      resizingRef.current = { columnKey, startX: event.clientX, startWidth, lastWidth: null };
      setResizingColumnKey(columnKey);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleResizeMouseMove);
      window.addEventListener("mouseup", handleResizeMouseUp);
    },
    [columnWidths, minColumnWidthPx, handleResizeMouseMove, handleResizeMouseUp]
  );

  const handleResetColumnWidth = useCallback((columnKey) => {
    setColumnWidths((prev) => {
      if (!(columnKey in prev)) return prev;
      const next = { ...prev };
      delete next[columnKey];
      return next;
    });
    const node = headerCellRefs.current[columnKey];
    if (node) node.style.width = "";
  }, []);

  const canPaginate = typeof onPageChange === "function" && typeof onLimitChange === "function";
  const isClientPagination = canPaginate && paginationMode === "client";
  const isFullDatasetPagination = canPaginate && shouldLoadAllRowsSource;
  const usesLocalPagination = isClientPagination || isFullDatasetPagination;
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 20, 1);
  const groupedSortedRows = useMemo(() => {
    if (!groupByColumn) return [];
    return sortRowsForDisplay(filteredRows);
  }, [groupByColumn, filteredRows, sortRowsForDisplay]);
  const groupedUnits = useMemo(() => {
    if (!groupByColumn) return [];

    const groupColumn = columns.find((column) => column.key === groupByColumn);
    if (!groupColumn) return [];

    const groups = [];
    const groupMap = new Map();

    groupedSortedRows.forEach((row, index) => {
      const rawValue = getRawValue(row, groupColumn);
      const normalizedValue = normalize(rawValue);
      const groupKey = normalizedValue === "" ? "__blank__" : normalizedValue;
      let group = groupMap.get(groupKey);

      if (!group) {
        group = {
          groupKey,
          label: toText(rawValue),
          rows: [],
        };
        groupMap.set(groupKey, group);
        groups.push(group);
      }

      group.rows.push({ row, sourceIndex: index });
    });

    return groups.map((group) => {
      if (group.rows.length <= 1) {
        const [entry] = group.rows;
        return {
          type: "row",
          row: entry.row,
          sourceIndex: entry.sourceIndex,
        };
      }

      // Per-column sums/averages for any column that opts in via `column.aggregate`. Computed here
      // (once per group, while the full row set is still in hand) rather than at render time, so
      // displayRows only ever carries the finished numbers forward, not the row list itself.
      const aggregates = {};
      columns.forEach((column) => {
        if (!column.aggregate) return;
        if (typeof column.aggregate === "function") {
          aggregates[column.key] = column.aggregate(group.rows.map((entry) => entry.row));
          return;
        }
        const values = group.rows.map((entry) => {
          const num = Number(getRawValue(entry.row, column));
          return isNaN(num) ? 0 : num;
        });
        if (column.aggregate === "sum") {
          aggregates[column.key] = values.reduce((sum, value) => sum + value, 0);
        } else if (column.aggregate === "avg") {
          aggregates[column.key] = values.length
            ? values.reduce((sum, value) => sum + value, 0) / values.length
            : 0;
        }
      });

      return {
        type: "group",
        groupKey: group.groupKey,
        label: group.label,
        rows: group.rows,
        count: group.rows.length,
        aggregates,
      };
    });
  }, [groupByColumn, groupedSortedRows, columns]);
  const useGroupedPagination = Boolean(groupByColumn);
  const computedTotalRows = useGroupedPagination
    ? groupedUnits.length
    : usesLocalPagination
      ? sortedRows.length
      : Number(totalRows) || 0;
  const safeTotalPages = useGroupedPagination
    ? Math.max(Math.ceil(computedTotalRows / safeLimit), 1)
    : usesLocalPagination
      ? Math.max(Math.ceil(computedTotalRows / safeLimit), 1)
      : Math.max(Number(totalPages) || 1, 1);
  const currentPage = Math.min(safePage, safeTotalPages);
  const paginatedRows = !useGroupedPagination && usesLocalPagination
    ? sortedRows.slice((currentPage - 1) * safeLimit, currentPage * safeLimit)
    : sortedRows;
  const paginatedGroupUnits = useMemo(() => {
    if (!useGroupedPagination) return [];
    return groupedUnits.slice((currentPage - 1) * safeLimit, currentPage * safeLimit);
  }, [useGroupedPagination, groupedUnits, currentPage, safeLimit]);
  const currentPageRowEntries = useMemo(() => {
    if (!groupByColumn) {
      return paginatedRows.map((row, index) => ({
        row,
        sourceIndex: index,
      }));
    }
    return paginatedGroupUnits.flatMap((unit) => (
      unit.type === "group"
        ? unit.rows
        : [{ row: unit.row, sourceIndex: unit.sourceIndex }]
    ));
  }, [groupByColumn, paginatedRows, paginatedGroupUnits]);
  const displayRows = useMemo(() => {
    if (!groupByColumn) {
      return currentPageRowEntries.map((entry) => ({
        type: "row",
        row: entry.row,
        sourceIndex: entry.sourceIndex,
        isGroupedChild: false,
      }));
    }

    return paginatedGroupUnits.flatMap((unit) => {
      if (unit.type === "row") {
        return [{
          type: "row",
          row: unit.row,
          sourceIndex: unit.sourceIndex,
          isGroupedChild: false,
        }];
      }

      const expanded = Boolean(expandedGroups[unit.groupKey]);
      const items = [{
        type: "group",
        groupKey: unit.groupKey,
        label: unit.label,
        count: unit.count,
        aggregates: unit.aggregates,
        expanded,
      }];

      if (expanded) {
        items.push(
          ...unit.rows.map((entry) => ({
            type: "row",
            row: entry.row,
            sourceIndex: entry.sourceIndex,
            isGroupedChild: true,
          }))
        );
      }

      return items;
    });
  }, [groupByColumn, currentPageRowEntries, paginatedGroupUnits, expandedGroups]);

  // --- Row virtualization (opt-in, see `enableVirtualization` above) ---
  const virtualizationActive = enableVirtualization && compact;

  useEffect(() => {
    if (enableVirtualization && !compact && import.meta.env.DEV) {
      console.warn(
        "FilterableDataTable: enableVirtualization has no effect when compact={false} " +
          "(no CSS-enforced fixed row height to virtualize against)."
      );
    }
  }, [enableVirtualization, compact]);

  const rowVirtualizer = useVirtualizer({
    count: virtualizationActive ? displayRows.length : 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 8,
  });

  const virtualItems = virtualizationActive ? rowVirtualizer.getVirtualItems() : [];
  const virtualPaddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const virtualPaddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0;
  const rowsToRender = virtualizationActive
    ? virtualItems.map((virtualItem) => ({ item: displayRows[virtualItem.index], displayIndex: virtualItem.index }))
    : displayRows.map((item, displayIndex) => ({ item, displayIndex }));

  // Reset scroll to top when the active view of the dataset changes (search/filter/sort/group), so
  // a user doesn't land scrolled deep into a now-different row set. Deliberately excludes
  // `expandedGroups` -- expanding/collapsing a group the user is currently looking at should not
  // yank their scroll position.
  const virtualResetSignature = useMemo(
    () =>
      [
        searchQuery,
        searchField,
        JSON.stringify(columnFilters),
        JSON.stringify(rowValueFilters),
        groupByColumn,
        sortColumn,
        sortDirection,
      ].join("|"),
    [searchQuery, searchField, columnFilters, rowValueFilters, groupByColumn, sortColumn, sortDirection]
  );

  useEffect(() => {
    if (!virtualizationActive) return;
    rowVirtualizer.scrollToOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rowVirtualizer identity is stable per mount; only the signature should trigger this
  }, [virtualResetSignature, virtualizationActive]);

  // --- Row-level keyboard navigation (opt-in, see `enableKeyboardNav` above) ---
  // Reset the active-row cursor on real navigational changes -- reuses the same signature as the
  // scroll-reset effect above, plus `currentPage` (pagination swaps `displayRows` content that
  // signature doesn't cover). Deliberately excludes `expandedGroups`, same reasoning as above.
  useEffect(() => {
    setActiveRowIndex(null);
  }, [virtualResetSignature, currentPage]);

  // Re-clamp (not reset) when the row count merely shrinks, so e.g. collapsing a group the user is
  // sitting inside doesn't blow away their keyboard position entirely.
  useEffect(() => {
    setActiveRowIndex((prev) => {
      if (prev === null) return prev;
      if (displayRows.length === 0) return null;
      return Math.min(prev, displayRows.length - 1);
    });
  }, [displayRows.length]);

  const moveActiveRowTo = useCallback(
    (nextIndex) => {
      if (displayRows.length === 0) return;
      const clamped = Math.max(0, Math.min(nextIndex, displayRows.length - 1));
      setActiveRowIndex(clamped);
      if (virtualizationActive) {
        rowVirtualizer.scrollToIndex(clamped, { align: "auto" });
      }
    },
    [displayRows.length, virtualizationActive, rowVirtualizer]
  );

  const virtualWindowSignature = virtualItems.length > 0
    ? `${virtualItems[0].index}-${virtualItems[virtualItems.length - 1].index}`
    : "";

  // Focus the active row once it actually has a DOM node -- under virtualization, scrollToIndex's
  // re-render and the target row's ref becoming available aren't guaranteed to land in the same
  // tick as the state change above, so this re-fires whenever the mounted window changes too.
  useEffect(() => {
    if (!enableKeyboardNav || activeRowIndex === null) return;
    const node = rowNodeRefs.current.get(activeRowIndex);
    if (!node || document.activeElement === node) return;
    node.focus(virtualizationActive ? { preventScroll: true } : undefined);
  }, [enableKeyboardNav, activeRowIndex, virtualWindowSignature, virtualizationActive]);

  const pageOptions = Array.from({ length: safeTotalPages }, (_, i) => i + 1);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < safeTotalPages;
  const tableColSpan = visibleColumnDefs.length + (renderActions ? 2 : 1);

  // --- Row selection handlers ---
  const handleSelectAll = useCallback(
    (checked) => {
      if (!onSelectionChange) return;
      if (checked) {
        const allKeys = currentPageRowEntries.map((entry) => getRowKey(entry.row, entry.sourceIndex));
        onSelectionChange([...new Set([...selectedRows, ...allKeys])]);
      } else {
        const pageKeys = new Set(
          currentPageRowEntries.map((entry) => getRowKey(entry.row, entry.sourceIndex))
        );
        onSelectionChange(selectedRows.filter((k) => !pageKeys.has(k)));
      }
    },
    [selectedRows, onSelectionChange, currentPageRowEntries, getRowKey]
  );

  const handleSelectRow = useCallback(
    (key, checked) => {
      if (!onSelectionChange) return;
      if (checked) {
        onSelectionChange([...selectedRows, key]);
      } else {
        onSelectionChange(selectedRows.filter((k) => k !== key));
      }
    },
    [selectedRows, onSelectionChange]
  );

  // Row-level keyboard nav key handler. Guarded so it only ever reacts when the <tr> itself (not a
  // descendant checkbox/action button) has focus -- that guard is what keeps every existing native
  // Tab stop on a row (selection checkbox, renderActions buttons) completely untouched, since their
  // own keydowns bubble up here and bail immediately rather than being double-handled.
  const handleRowKeyDown = useCallback(
    (event, displayIndex, item) => {
      if (event.target !== event.currentTarget) return;
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveActiveRowTo(displayIndex + 1);
          return;
        case "ArrowUp":
          event.preventDefault();
          moveActiveRowTo(displayIndex - 1);
          return;
        case "Home":
          event.preventDefault();
          moveActiveRowTo(0);
          return;
        case "End":
          event.preventDefault();
          moveActiveRowTo(displayRows.length - 1);
          return;
        case "Enter":
          event.preventDefault();
          if (item.type === "group") {
            toggleGroupExpanded(item.groupKey);
          } else if (onRowClick) {
            onRowClick(item.row);
          }
          return;
        case " ":
          event.preventDefault();
          if (item.type === "row" && enableSelection && onSelectionChange) {
            const key = getRowKey(item.row, item.sourceIndex);
            handleSelectRow(key, !selectedRows.includes(key));
          }
          return;
        default:
          return;
      }
    },
    [
      moveActiveRowTo,
      displayRows.length,
      toggleGroupExpanded,
      onRowClick,
      enableSelection,
      onSelectionChange,
      getRowKey,
      selectedRows,
      handleSelectRow,
    ]
  );

  const allPageSelected =
    enableSelection &&
    currentPageRowEntries.length > 0 &&
    currentPageRowEntries.every((entry) => selectedRows.includes(getRowKey(entry.row, entry.sourceIndex)));
  const somePageSelected =
    enableSelection &&
    currentPageRowEntries.some((entry) => selectedRows.includes(getRowKey(entry.row, entry.sourceIndex)));
  const showLoadingSkeleton =
    loading || allRowsLoading || (enableServerSearch && isServerSearchDebouncing);

  useEffect(() => {
    if (!(usesLocalPagination || useGroupedPagination)) return;
    if (safePage <= safeTotalPages) return;
    onPageChange(safeTotalPages);
  }, [usesLocalPagination, useGroupedPagination, safePage, safeTotalPages, onPageChange]);

  // Detect if selected search field is a date type
  const isSearchFieldDate = useMemo(() => {
    if (searchField === "all") return false;
    const col = columns.find((c) => c.key === searchField);
    if (!col) return false;
    if (col.type === "date") return true;
    const lower = (col.key + col.label).toLowerCase();
    return /date|dob|birth|marriage/.test(lower);
  }, [searchField, columns]);

  const tableViewportClass = fillHeight
    ? `${fixedHeight ? "max-h-[433px] " : ""}flex-1 min-h-0 lg:max-h-none`
    : "";
  const tableViewportStyle = !fillHeight && fixedHeight
    ? { maxHeight: `${FIXED_TABLE_HEIGHT}px` }
    : undefined;
  const controlRowClass = compact
    ? "mb-1 flex flex-wrap items-center gap-1.5"
    : "mb-2 flex flex-wrap gap-2";
  const topFieldClass = compact
    ? "h-8 rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-[11px] dark:text-gray-100 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    : "rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-[11px] xl:text-xs dark:text-gray-100 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const compactActionClass = compact ? "h-8 px-2.5 text-[11px]" : "";
  // MUI's `stickyHeader` (Table prop, active whenever fixedHeight is true -- the default) forces an
  // OPAQUE background on every .MuiTableCell-stickyHeader from the ambient theme, so sticky content
  // doesn't show through while scrolling. That wins the cascade over the `bg-gray-100`/`dark:bg-
  // gray-700` Tailwind classes below (same specificity, MUI's rule is injected later), and also
  // replaces what used to be simple see-through-to-<thead> inheritance for non-pinned header cells.
  // Routed through `sx` (not `className`) because MUI's own `sx`-generated styles are guaranteed to
  // out-rank the component's built-in styleOverrides regardless of stylesheet order -- the one thing
  // that reliably wins this specific fight. Reads `theme.palette.mode`, which TenantThemeProvider
  // keeps in sync with the app's own light/dark toggle, so this still matches Tailwind's dark: pair.
  const headerCellSx = {
    backgroundColor: (theme) => (theme.palette.mode === "dark" ? "#374151" : "#f3f4f6"),
  };
  const headerCellYClass = compact ? "py-1 xl:py-1.5" : "py-2 xl:py-2.5";
  const bodyCellYClass = compact ? "py-0 leading-none" : "py-2 xl:py-2.5";
  const bodyRowClass = compact ? "h-8" : "";
  const tableTextClass = compact ? "text-[10px] xl:text-[11px] leading-tight" : "text-xs xl:text-sm";
  const paginationRowClass = compact
    ? "mt-0.5 flex h-8 items-center justify-between text-[8px] text-gray-700 dark:text-gray-300"
    : "mt-0 flex h-7 items-center justify-between text-[10px] text-gray-700 dark:text-gray-300";
  const paginationControlClass = compact
    ? "compact-pagination-select h-[26px] rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 text-[7px] leading-tight dark:text-gray-100"
    : "h-7 rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 text-[10px] dark:text-gray-100";
  const paginationButtonClass = compact
    ? "compact-pagination-button flex h-[24px] w-[24px] items-center justify-center rounded-sm border border-gray-300 dark:border-gray-600 text-[8px] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
    : "flex h-7 w-7 items-center justify-center rounded-sm border border-gray-300 dark:border-gray-600 text-[10px] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50";
  const resolvedSearchButtonClassName = compact
    ? `${searchButtonClassName} ${compactActionClass}`
    : searchButtonClassName;

  return (
    <div className={fillHeight ? "flex flex-1 min-h-0 flex-col" : ""}>
      <div className={controlRowClass}>
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className={`w-44 ${topFieldClass}`}
        >
          <option value="all">All Fields</option>
          {columns.map((column) => (
            <option key={column.key} value={column.key}>
              {column.label}
            </option>
          ))}
        </select>
        <div className="flex-1 relative">
          <input
            type={isSearchFieldDate ? "date" : "text"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className={`w-full pr-7 ${topFieldClass}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                if (enableServerSearch) {
                  runImmediateServerSearch("", searchField, hasActiveColumnFilters);
                }
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            if (enableServerSearch) {
              const { query, field, fetchAll } = resolveServerSearchPayload();
              runImmediateServerSearch(query, field, fetchAll);
            }
            if (typeof onRefresh === "function") {
              onRefresh({ query: String(searchQuery || "").trim(), field: searchField });
            }
          }}
          disabled={Boolean(onRefresh) && refreshDisabled}
          className={resolvedSearchButtonClassName}
        >
          <Search className="w-3 h-3 mr-1" /> Search
        </button>
        <button
          type="button"
          onClick={() => openFilterPanel()}
          className={`inline-flex items-center rounded-sm border transition ${compactActionClass || "px-2.5 py-1 text-[11px] xl:text-xs"} ${
            hasActiveColumnFilters
              ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50"
          }`}
        >
          <Filter className="mr-1 h-3.5 w-3.5" />
          Filter
          {hasActiveColumnFilters && (
            <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {Object.values(columnFilters).filter((filter) => isFilterStateActive(filter)).length}
            </span>
          )}
        </button>
        {excludedRowFilterCount > 0 && (
          <button
            type="button"
            onClick={() => clearRowValueFilterMode("exclude")}
            className={`inline-flex items-center rounded-sm border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 ${compactActionClass || "px-2.5 py-1 text-[11px] xl:text-xs"}`}
          >
            Clear Filter Out
            <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {excludedRowFilterCount}
            </span>
          </button>
        )}
        {includedRowFilterCount > 0 && (
          <button
            type="button"
            onClick={() => clearRowValueFilterMode("include")}
            className={`inline-flex items-center rounded-sm border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 ${compactActionClass || "px-2.5 py-1 text-[11px] xl:text-xs"}`}
          >
            Clear Show Matching
            <span className="ml-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {includedRowFilterCount}
            </span>
          </button>
        )}
        {showExport && (
          <ExportBottomSheet
            columns={visibleColumnDefs}
            rows={filteredRows}
            fileName={exportFileName}
            title={exportTitle}
            titleResolver={exportTitleResolver}
            subtitle={exportSubtitle}
            headingLines={exportHeadingLines}
            sheetName={exportSheetName}
            onExportRows={handleExportRows}
            selectedRowKeys={enableSelection ? selectedRows : []}
            rowKey={rowKey}
          />
        )}
      </div>

      {/* Bulk action bar */}
      {enableSelection && selectedRows.length > 0 && (
        <div className={`flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-2.5 text-[11px] dark:border-blue-800 dark:bg-blue-900/30 ${compact ? "mb-1.5 py-1" : "mb-2 py-1.5"}`}>
          <span className="font-medium text-blue-700 dark:text-blue-400">
            {selectedRows.length} row{selectedRows.length > 1 ? "s" : ""} selected
          </span>
          {onBulkDelete && (
            <button
              type="button"
              onClick={() => onBulkDelete(selectedRows)}
              className="flex items-center gap-1 rounded-sm bg-red-500 px-2.5 py-1 text-[11px] text-white hover:bg-red-600 xl:text-xs"
            >
              <Trash2 className="w-3 h-3" /> Delete Selected
            </button>
          )}
          <button
            type="button"
            onClick={() => onSelectionChange([])}
            className="rounded-sm border border-gray-300 px-2.5 py-1 text-[11px] text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
          >
            Clear Selection
          </button>
        </div>
      )}

      <TableContainer
        ref={tableContainerRef}
        className={`border border-gray-200 dark:border-gray-700 rounded-sm overflow-auto bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300 ${compact ? "compact-data-table" : ""} ${tableViewportClass}`}
        style={tableViewportStyle}
      >
        <Table
          stickyHeader={fixedHeight}
          className={`w-full min-w-max bg-white ${tableTextClass} text-gray-700 dark:bg-gray-800 dark:text-gray-300`}
        >
          <TableHead className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            <TableRow>
              <TableCell
                ref={leadingHeaderRef}
                // z-index as an inline style, not just the `z-30` class: when fixedHeight enables
                // MUI's stickyHeader, MUI's own injected CSS for .MuiTableCell-stickyHeader sets
                // z-index too, and (same specificity, injected later) wins over the Tailwind class
                // -- silently dropping this corner cell to z-index 2, below a pinned column's
                // inline zIndex:25. An inline style always wins regardless of stylesheet order.
                style={{ position: "sticky", left: 0, zIndex: 30 }}
                sx={headerCellSx}
                className={`sticky left-0 z-30 border-r border-gray-200 dark:border-gray-700 bg-gray-100 px-2 ${headerCellYClass} text-left text-gray-700 dark:bg-gray-700 dark:text-gray-300 ${enableSelection ? selectionColumnWidthClassName : "w-9"}`}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Select visible columns"
                    onClick={handleOpenColumnDialog}
                    className="text-gray-600 hover:text-blue-600 transition dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                  {enableSelection && onSelectionChange && (
                    <Checkbox
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      size="small"
                      className="w-3.5 h-3.5"
                      slotProps={{ input: { title: "Select all on this page" } }}
                    />
                  )}
                </div>
              </TableCell>
              {visibleColumnDefs.map((column) => (
                <TableCell
                  key={column.key}
                  ref={(node) => {
                    headerCellRefs.current[column.key] = node;
                  }}
                  style={{
                    ...getStickyCellStyle(column.key, true),
                    ...(columnWidths[column.key] ? { width: columnWidths[column.key] } : null),
                  }}
                  sx={headerCellSx}
                  className={`border-r border-gray-200 dark:border-gray-700 px-3 ${headerCellYClass} text-left text-gray-700 dark:text-gray-300 relative whitespace-nowrap select-none ${
                    pinnedColumnKeys.includes(column.key)
                      ? "bg-gray-100 dark:bg-gray-700 shadow-[2px_0_0_0_rgba(229,231,235,1)] dark:shadow-[2px_0_0_0_rgba(55,65,81,1)]"
                      : groupByColumn === column.key
                        ? "bg-blue-50 dark:bg-blue-900/30"
                        : ""
                  }`}
                  draggable={enableColumnReorder}
                  onMouseDown={(event) => handleHeaderMouseDown(event, column)}
                  onContextMenu={(event) => handleHeaderContextMenu(event, column)}
                  onDragStart={enableColumnReorder ? (e) => onDragStart(e, column.key) : undefined}
                  onDragEnd={enableColumnReorder ? onDragEnd : undefined}
                  onDragOver={enableColumnReorder ? onDragOver : undefined}
                  onDragEnter={enableColumnReorder ? (e) => onDragEnter(e, column.key) : undefined}
                  onDragLeave={enableColumnReorder ? onDragLeave : undefined}
                  onDrop={enableColumnReorder ? onDrop : undefined}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      {pinnedColumnKeys.includes(column.key) && (
                        <Pin className="h-3 w-3 text-amber-600 dark:text-amber-500" />
                      )}
                      {groupByColumn === column.key && (
                        <Layers
                          className="h-3 w-3 text-blue-600 dark:text-blue-400"
                          title={`Grouped by ${column.label}`}
                        />
                      )}
                      {enableColumnReorder && (
                        <GripVertical className="w-3 h-3 text-gray-400 cursor-grab dark:text-gray-500" />
                      )}
                      <button
                        type="button"
                        title={`Sort ${column.label}`}
                        onClick={() => toggleSort(column.key)}
                        className="flex items-center gap-1 text-left hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        <span>{column.label}</span>
                        <span className="inline-flex flex-col leading-none">
                          <ChevronUp className={`w-3 h-3 -mb-1 ${
                            sortColumn === column.key && sortDirection === "asc"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-300 dark:text-gray-600"
                          }`} />
                          <ChevronDown className={`w-3 h-3 ${
                            sortColumn === column.key && sortDirection === "desc"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-300 dark:text-gray-600"
                          }`} />
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        title={`Filter ${column.label}`}
                        onClick={(e) => toggleColumnFilterPopup(column.key, e.currentTarget)}
                        className={`transition ${
                          isFilterActive(column.key)
                            ? "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        }`}
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {renderColumnFilterPopup(column)}
                  {enableColumnResize && (
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${column.label} column`}
                      draggable={false}
                      onMouseDown={(e) => handleResizeMouseDown(e, column.key)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleResetColumnWidth(column.key);
                      }}
                      className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none z-10 ${
                        resizingColumnKey === column.key ? "bg-blue-500/60" : "hover:bg-blue-400/40"
                      }`}
                    />
                  )}
                </TableCell>
              ))}
              {renderActions && <TableCell className={`px-3 ${headerCellYClass} text-left`}>{actionsLabel}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody className="text-gray-700 dark:text-gray-300">
            {showLoadingSkeleton ? (
              Array.from({ length: safeLimit }, (_, i) => (
                <TableRow key={`skel-${i}`} className={`border-t border-gray-200 dark:border-gray-700 animate-pulse ${bodyRowClass}`}>
                  <TableCell className={`sticky left-0 z-20 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 ${bodyCellYClass}`}>
                    <Skeleton variant="rounded" width={14} height={14} />
                  </TableCell>
                  {visibleColumnDefs.map((col) => (
                    <TableCell
                      key={col.key}
                      style={getStickyCellStyle(col.key)}
                      className={`border-r border-gray-200 dark:border-gray-700 px-3 ${bodyCellYClass} ${
                        pinnedColumnKeys.includes(col.key)
                          ? "bg-white dark:bg-gray-800 shadow-[2px_0_0_0_rgba(229,231,235,1)] dark:shadow-[2px_0_0_0_rgba(55,65,81,1)]"
                          : ""
                      }`}
                    >
                      <Skeleton variant="text" width={`${45 + ((i * 17 + col.key.length * 7) % 40)}%`} />
                    </TableCell>
                  ))}
                  {renderActions && (
                    <TableCell className={`px-3 ${bodyCellYClass}`}>
                      <div className="flex gap-2">
                        <Skeleton variant="rounded" width={14} height={14} />
                        <Skeleton variant="rounded" width={14} height={14} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (groupByColumn ? groupedUnits.length === 0 : sortedRows.length === 0) ? (
              <TableRow>
                <TableCell colSpan={tableColSpan} className="text-center py-4 text-gray-500 dark:text-gray-400">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {virtualizationActive && virtualPaddingTop > 0 && (
                  <TableRow
                    aria-hidden="true"
                    className="virtual-spacer-row"
                    style={{ "--vt-spacer-h": `${virtualPaddingTop}px` }}
                  >
                    <TableCell colSpan={tableColSpan} style={{ padding: 0, border: 0 }} />
                  </TableRow>
                )}
                {rowsToRender.map(({ item, displayIndex }) => {
                const isRovingTarget = enableKeyboardNav && (
                  activeRowIndex === null ? displayIndex === 0 : displayIndex === activeRowIndex
                );
                const isActiveRow = enableKeyboardNav && activeRowIndex === displayIndex;
                // sx, not a Tailwind className, deliberately -- Tailwind's JIT never generated CSS
                // for any outline-* utility in this project (confirmed empty in document.styleSheets
                // even with the class names correctly present in the DOM), so this follows the same
                // precedent as `headerCellSx` elsewhere in this file: fall back to sx when a Tailwind
                // class can't be relied on, using the theme's primary color rather than a hardcoded one.
                const focusRingSx = isActiveRow
                  ? { outline: "2px solid", outlineColor: "primary.main", outlineOffset: "-2px" }
                  : undefined;
                const rowKeyboardNavProps = enableKeyboardNav
                  ? {
                      tabIndex: isRovingTarget ? 0 : -1,
                      ref: (node) => {
                        if (node) rowNodeRefs.current.set(displayIndex, node);
                        else rowNodeRefs.current.delete(displayIndex);
                      },
                      onKeyDown: (event) => handleRowKeyDown(event, displayIndex, item),
                      onFocus: (event) => {
                        if (event.target !== event.currentTarget) return;
                        setActiveRowIndex(displayIndex);
                      },
                    }
                  : {};
                if (item.type === "group") {
                  return (
                    <TableRow
                      key={`group-${item.groupKey}`}
                      className={`border-t border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/40 ${bodyRowClass}`}
                      sx={focusRingSx}
                      {...rowKeyboardNavProps}
                    >
                      <TableCell colSpan={tableColSpan} className={`px-3 ${bodyCellYClass} text-gray-700 dark:text-gray-300`}>
                        <div className="flex items-center gap-2">
                          <IconButton
                            type="button"
                            size="small"
                            aria-expanded={item.expanded}
                            onClick={() => toggleGroupExpanded(item.groupKey)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            {item.expanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </IconButton>
                          <span className="font-medium">
                            {columns.find((column) => column.key === groupByColumn)?.label || "Group"}: {item.label}
                          </span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {item.count} rows
                          </span>
                          {item.aggregates && Object.keys(item.aggregates).length > 0 && (
                            <span className="text-[11px] text-slate-600 dark:text-slate-400">
                              {Object.entries(item.aggregates)
                                .map(([columnKey, value]) => {
                                  const aggColumn = columns.find((column) => column.key === columnKey);
                                  return `${aggColumn?.label || columnKey}: ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                })
                                .join(" · ")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                const row = item.row;
                const key = getRowKey(row, item.sourceIndex);
                const isSelected = enableSelection && selectedRows.includes(key);
                const rowBaseClass = item.isGroupedChild ? "bg-slate-50 dark:bg-slate-800/40" : "bg-white dark:bg-gray-800";
                const rowHoverClass = item.isGroupedChild ? "hover:bg-slate-100 dark:hover:bg-slate-700/40" : "hover:bg-gray-50 dark:hover:bg-gray-700/50";
                const pinnedCellBaseClass = item.isGroupedChild ? "bg-slate-50 dark:bg-slate-800/40" : "bg-white dark:bg-gray-800";
                return (
                  <TableRow
                    key={key}
                    className={`${bodyRowClass} ${onRowClick ? "cursor-pointer" : ""} border-t border-gray-200 dark:border-gray-700 ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/30" : rowBaseClass
                    } ${isSelected ? "hover:bg-blue-50 dark:hover:bg-blue-900/30" : rowHoverClass}`}
                    sx={focusRingSx}
                    onClick={onRowClick ? (event) => {
                      if (event.button !== 0) return;
                      if (enableKeyboardNav) setActiveRowIndex(displayIndex);
                      onRowClick(row);
                    } : undefined}
                    {...rowKeyboardNavProps}
                  >
                    <TableCell className={`sticky left-0 z-20 border-r border-gray-200 dark:border-gray-700 px-2 ${bodyCellYClass} text-gray-700 dark:text-gray-300 ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/30" : pinnedCellBaseClass
                    }`}>
                      {enableSelection && onSelectionChange && (
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(key, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                          className="w-3 h-3"
                        />
                      )}
                    </TableCell>
                    {visibleColumnDefs.map((column) => {
                      const rawValue = getRawValue(row, column);
                      const content = column.render
                        ? column.render(rawValue, row)
                        : defaultCell(rawValue);
                      return (
                        <TableCell
                          key={column.key}
                          style={getStickyCellStyle(column.key)}
                          className={`border-r border-gray-200 dark:border-gray-700 px-3 ${bodyCellYClass} whitespace-nowrap text-gray-700 dark:text-gray-300 ${
                            pinnedColumnKeys.includes(column.key)
                              ? isSelected
                                ? "bg-blue-50 dark:bg-blue-900/30 shadow-[2px_0_0_0_rgba(229,231,235,1)] dark:shadow-[2px_0_0_0_rgba(55,65,81,1)]"
                                : `${pinnedCellBaseClass} shadow-[2px_0_0_0_rgba(229,231,235,1)] dark:shadow-[2px_0_0_0_rgba(55,65,81,1)]`
                              : ""
                          }`}
                          onContextMenu={(event) => openRowContextMenu(event, column, row)}
                        >
                          {item.isGroupedChild && column.key === groupByColumn ? (
                            <div className="pl-6">{content}</div>
                          ) : content}
                        </TableCell>
                      );
                    })}
                    {renderActions && (
                      <TableCell className={`px-3 ${bodyCellYClass} text-gray-700 dark:text-gray-300`} onClick={(e) => e.stopPropagation()}>
                        {renderActions(row, { selectedCount: selectedRows.length })}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
                {virtualizationActive && virtualPaddingBottom > 0 && (
                  <TableRow
                    aria-hidden="true"
                    className="virtual-spacer-row"
                    style={{ "--vt-spacer-h": `${virtualPaddingBottom}px` }}
                  >
                    <TableCell colSpan={tableColSpan} style={{ padding: 0, border: 0 }} />
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {headerContextMenu && (
        <Menu
          open
          onClose={() => setHeaderContextMenu(null)}
          anchorReference="anchorPosition"
          anchorPosition={{ top: headerContextMenu.top, left: headerContextMenu.left }}
          slotProps={{
            paper: {
              className: "min-w-[180px] py-1",
              sx: {
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                boxShadow: 4,
              },
            },
          }}
        >
          <MenuItem
            onClick={() => handleTogglePinColumn(headerContextMenu.columnKey)}
            className="gap-2 text-xs"
          >
            <Pin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
            {headerContextMenu.isPinned ? "Unpin Column" : "Pin Column"}
          </MenuItem>
          <MenuItem
            onClick={() => (
              headerContextMenu.isGrouped
                ? handleUngroupColumn()
                : handleGroupByColumn(headerContextMenu.columnKey)
            )}
            className="gap-2 text-xs"
          >
            <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            {headerContextMenu.isGrouped ? "Ungroup" : "Group By"}
          </MenuItem>
          <MenuItem
            onClick={() => openFilterPanel(headerContextMenu.columnKey)}
            className="gap-2 text-xs"
          >
            <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Filter
          </MenuItem>
        </Menu>
      )}

      {rowContextMenu && (
        <Menu
          open
          onClose={() => setRowContextMenu(null)}
          anchorReference="anchorPosition"
          anchorPosition={{ top: rowContextMenu.top, left: rowContextMenu.left }}
          slotProps={{
            paper: {
              className: "min-w-[220px] py-1",
              sx: {
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                boxShadow: 4,
              },
            },
          }}
        >
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{rowContextMenu.label}</div>
            <div className="truncate text-[11px] text-gray-500 dark:text-gray-400">{rowContextMenu.displayValue}</div>
          </div>
          <MenuItem
            onClick={() => applyRowValueFilter("exclude", rowContextMenu.columnKey, rowContextMenu.rawValue)}
            className="text-xs"
          >
            Filter Out
          </MenuItem>
          <MenuItem
            onClick={() => applyRowValueFilter("include", rowContextMenu.columnKey, rowContextMenu.rawValue)}
            className="text-xs"
          >
            Show Matching
          </MenuItem>
        </Menu>
      )}

      {/* Surface 3 (filter panel) also gets a slide-in transition for the first time here -- new
          vs. today's instant mount/unmount, another intentional, accepted improvement. */}
      <Drawer
        anchor="right"
        open={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        slotProps={{
          paper: {
            sx: {
              width: "100%",
              maxWidth: 380,
              bgcolor: "background.paper",
            },
          },
          backdrop: {
            sx: { bgcolor: "rgba(0, 0, 0, 0.1)" },
          },
        }}
      >
          <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Filter Panel</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Apply filters on multiple columns</p>
                </div>
                <IconButton size="small" onClick={() => setShowFilterPanel(false)}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>

              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-700">
                <Button
                  size="small"
                  onClick={() => {
                    const cleared = normalizeFilterMap({}, columns);
                    setDraftColumnFilters(cleared);
                  }}
                >
                  Clear All
                </Button>
                <span className="text-[11px] text-gray-300 dark:text-gray-600">|</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Active: {Object.values(draftColumnFilters).filter((filter) => isFilterStateActive(filter)).length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-3">
                  {columns.map((column) => {
                    const draftFilter = getDraftColumnFilter(column.key);
                    const isActive = isFilterStateActive(draftFilter);

                    return (
                      <div
                        key={column.key}
                        ref={(node) => {
                          filterPanelFieldRefs.current[column.key] = node;
                        }}
                        className={`rounded-md border px-3 py-3 ${
                          filterPanelFocusKey === column.key
                            ? "border-blue-300 bg-blue-50/60 dark:border-blue-700 dark:bg-blue-900/20"
                            : isActive
                              ? "border-amber-200 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-900/20"
                              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{column.label}</span>
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => clearDraftColumnFilter(column.key)}
                              className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <select
                            value={draftFilter.operator}
                            onChange={(event) =>
                              setDraftColumnFilter(column.key, { operator: event.target.value })
                            }
                            className="block w-full rounded-sm border border-gray-300 bg-white p-1.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {FILTER_OPERATORS.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                          {!INPUT_FREE_OPERATORS.has(draftFilter.operator) && (
                            <input
                              type="text"
                              value={draftFilter.value}
                              onChange={(event) =>
                                setDraftColumnFilter(column.key, { value: event.target.value })
                              }
                              placeholder={`Filter ${column.label}`}
                              className="block w-full rounded-sm border border-gray-300 p-1.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                <Button size="small" variant="outlined" onClick={() => setShowFilterPanel(false)}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => applyColumnFilters(draftColumnFilters, { closePanel: true })}
                >
                  Apply
                </Button>
              </div>
          </div>
      </Drawer>

      {canPaginate && (
        <div className={paginationRowClass}>
          <div className="flex items-center gap-2">
            <span>Rows showing</span>
            <select
              value={safeLimit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className={paginationControlClass}
            >
              {[20, 60, 100, 150].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-gray-500 dark:text-gray-400">Total: {computedTotalRows}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => hasPrev && onPageChange(currentPage - 1)}
              disabled={!hasPrev}
              className={paginationButtonClass}
            >
              {"<"}
            </button>
            <select
              value={currentPage}
              onChange={(e) => onPageChange(Number(e.target.value))}
              className={paginationControlClass}
            >
              {pageOptions.map((p) => (
                <option key={p} value={p}>
                  Page {p}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => hasNext && onPageChange(currentPage + 1)}
              disabled={!hasNext}
              className={paginationButtonClass}
            >
              {">"}
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={showColumnDialog}
        onClose={() => setShowColumnDialog(false)}
        slotProps={{
          paper: {
            sx: {
              width: "100%",
              maxWidth: 768,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
            },
          },
        }}
      >
            {/* Header */}
            <DialogTitle className="flex items-center justify-between px-5 py-3 border-b dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Personalize List Columns</span>
              <IconButton size="small" onClick={() => setShowColumnDialog(false)}>
                <X className="w-4 h-4" />
              </IconButton>
            </DialogTitle>

            {/* Body — dual list */}
            <DialogContent className="px-5 py-4 flex items-stretch gap-3" style={{ minHeight: 320 }}>
              {/* Available list */}
              <div className="flex-1 flex flex-col">
                <span className="text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">Available</span>
                <div className="flex-1 border border-gray-300 rounded-sm overflow-auto bg-white dark:border-gray-600 dark:bg-gray-900" style={{ maxHeight: 280 }}>
                  {draftAvailableColumns.length === 0 ? (
                    <div className="text-xs text-gray-400 p-3 text-center dark:text-gray-500">All columns selected</div>
                  ) : (
                    draftAvailableColumns.map((col) => (
                      <div
                        key={col.key}
                        onClick={() => {
                          setAvailableHighlight(col.key);
                          setSelectedHighlight(null);
                        }}
                        onDoubleClick={() => {
                          setDraftVisibleColumns((prev) => [...prev, col.key]);
                          setDraftSelectedOrder((prev) => [...prev, col.key]);
                          setAvailableHighlight(null);
                        }}
                        className={`px-3 py-1.5 text-xs cursor-pointer select-none border-b border-gray-100 last:border-b-0 dark:border-gray-700 ${
                          availableHighlight === col.key
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                        }`}
                      >
                        {col.label}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Transfer buttons */}
              <div className="flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  title="Move to selected"
                  onClick={handleMoveToSelected}
                  disabled={!availableHighlight}
                  className="p-1.5 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  title="Move all to selected"
                  onClick={handleMoveAllToSelected}
                  disabled={draftAvailableColumns.length === 0}
                  className="p-1.5 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <ChevronsRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  title="Move to available"
                  onClick={handleMoveToAvailable}
                  disabled={!selectedHighlight || draftVisibleColumns.length <= 1}
                  className="p-1.5 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  title="Move all to available"
                  onClick={handleMoveAllToAvailable}
                  disabled={draftVisibleColumns.length <= 1}
                  className="p-1.5 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <ChevronsLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>

              {/* Selected list */}
              <div className="flex-1 flex flex-col">
                <span className="text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">Selected</span>
                <div className="flex-1 border border-gray-300 rounded-sm overflow-auto bg-white dark:border-gray-600 dark:bg-gray-900" style={{ maxHeight: 280 }}>
                  {draftSelectedColumns.map((col) => (
                    <div
                      key={col.key}
                      onClick={() => {
                        setSelectedHighlight(col.key);
                        setAvailableHighlight(null);
                      }}
                      onDoubleClick={() => {
                        if (draftVisibleColumns.length <= 1) return;
                        setDraftVisibleColumns((prev) => prev.filter((k) => k !== col.key));
                        setDraftSelectedOrder((prev) => prev.filter((k) => k !== col.key));
                        setSelectedHighlight(null);
                      }}
                      className={`px-3 py-1.5 text-xs cursor-pointer select-none border-b border-gray-100 last:border-b-0 dark:border-gray-700 ${
                        selectedHighlight === col.key
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      {col.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reorder buttons */}
              <div className="flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  title="Move up"
                  onClick={handleMoveSelectedUp}
                  disabled={
                    !selectedHighlight ||
                    draftSelectedOrder.indexOf(selectedHighlight) <= 0
                  }
                  className="p-1.5 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <ChevronUp className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  onClick={handleMoveSelectedDown}
                  disabled={
                    !selectedHighlight ||
                    draftSelectedOrder.indexOf(selectedHighlight) >=
                      draftSelectedOrder.length - 1
                  }
                  className="p-1.5 border border-gray-300 rounded-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </DialogContent>

            {/* Footer */}
            <DialogActions className="px-5 py-3 border-t flex items-center justify-between dark:border-gray-700">
              <Button
                size="small"
                variant="outlined"
                onClick={handleResetColumnDefaults}
                disabled={savingColumnPrefs}
              >
                Reset to column defaults
              </Button>
              <div className="flex items-center gap-2">
                <Button size="small" variant="outlined" onClick={() => setShowColumnDialog(false)}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleApplyColumns}
                  disabled={savingColumnPrefs}
                >
                  {savingColumnPrefs ? "Applying..." : "OK"}
                </Button>
              </div>
            </DialogActions>
      </Dialog>
    </div>
  );
}
