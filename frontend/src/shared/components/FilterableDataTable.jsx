import { TYPE } from "@/shared/theme/typeScale";
import useResetOnChange from "@/shared/hooks/useResetOnChange";
import TablePaginationFooter from "./TablePaginationFooter";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ERP_UI, erpControlSx } from "@/shared/theme/erpUi";
import {
  Check,
  Columns3,
  Filter,
  GripVertical,
  MoveHorizontal,
  Layers,
  Pin,
  PinOff,
  Search,
  Settings2,
  Trash2,
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  IconButton,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  Popover,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import useRowVirtualization from "@/shared/hooks/useRowVirtualization";
import ExportBottomSheet from "./ExportBottomSheet";
import ColumnPersonalizerDialog from "./ColumnPersonalizerDialog";
import { fetchTablePreference, saveTablePreference } from "@/shared/utils/tablePreferences";

import {
  FILTER_OPERATORS,
  FILTER_DEFAULT,
  INPUT_FREE_OPERATORS,
  ROW_HEIGHT_PX,
  HEADER_HEIGHT_PX,
  FIXED_TABLE_HEIGHT,
  DEFAULT_MIN_COLUMN_WIDTH_PX,
  DEFAULT_MAX_COLUMN_WIDTH_PX,
  toText,
  normalize,
  passesColumnFilter,
  defaultCell,
  normalizeFilterMap,
  isFilterStateActive,
} from "./filterableDataTableUtils";

const FILTER_PANEL_PIN_KEY = "erp.table.filterPanelPinned";

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
  allowPageJump = true,
  onLimitChange = null,
  pagination = null,
  onNextCursor = null,
  onPreviousCursor = null,
  // "paginate" (default): cursor mode steps forward/back one page at a time, replacing the
  // visible rows (today's behavior, unchanged for every existing caller). "append": renders a
  // "Load More" button instead -- the caller appends the next page's rows to its own `rows`
  // instead of replacing them, growing a continuous list. Has no effect outside cursor mode.
  cursorLoadMode = "paginate",
  paginationMode = "server",
  enableServerSearch = false,
  onServerSearch = null,
  serverSearchDebounceMs = 350,
  onSortChange = null,
  serverSortFields = null,
  defaultGroupByColumn = null,
  // Server-side Group By (opt-in). When both are provided, grouping on `groupByColumn` fetches
  // paginated group summaries from the real (unfiltered-by-page-size) dataset instead of grouping
  // whatever's in `rows`/`allRowsSource` client-side -- see GroupAggregationService on the backend.
  // onFetchGroupSummaries({groupByColumn, page, limit, search, field, columnFilters}) -> {data, pagination, meta}
  // onFetchGroupRows({groupByColumn, groupValue, page, limit}) -> {data, pagination}
  onFetchGroupSummaries = null,
  onFetchGroupRows = null,
  // Feature 1: Fixed height
  fixedHeight = true,
  // Feature 1b: Fill available page height on large screens
  fillHeight = false,
  autoHideScrollbars = ERP_UI.autoHideScrollbars,
  filterPanelWidth = ERP_UI.filterPanelWidth,
  columnFilterWidth = ERP_UI.columnFilterWidth,
  controlBorderRadius = ERP_UI.controlRadius,
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
  // Feature 2b: Column resize. Drag a header edge to set an explicit width (narrower widths
  // truncate cell text with an ellipsis); "Autosize" clears it so table-layout:auto fits the
  // column to its content again. Widths persist with the table preference.
  enableColumnResize = true,
  minColumnWidthPx = DEFAULT_MIN_COLUMN_WIDTH_PX,
  maxColumnWidthPx = DEFAULT_MAX_COLUMN_WIDTH_PX,
  // Feature 3: Row selection
  enableSelection = false,
  selectedRows = [],
  onSelectionChange = null,
  selectionColumnWidthPx = 64,
  onBulkDelete = null,
  // Single selection: ticking a row replaces the previous one and there is no select-all box.
  singleSelection = false,
  // Accessible name for each row checkbox, e.g. (row) => `Select ${row.code}`.
  getRowSelectionLabel = null,
  searchButtonClassName = "fdt-search-btn",
  searchButtonStyle = undefined,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState(() =>
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
  // Server-side Group By state -- see onFetchGroupSummaries/onFetchGroupRows above.
  const [groupSummaryState, setGroupSummaryState] = useState({
    loading: false, page: 1, data: [], pagination: null, meta: null, unsupported: false,
  });
  const [groupRowsState, setGroupRowsState] = useState({});
  // groupRowsState[groupKey] = { rows: [], page: 1, hasMore: true, loading: false, error: null }
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" | "desc"
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [savingColumnPrefs, setSavingColumnPrefs] = useState(false);
  // pinnedColumnKeys are the left-pinned columns (the original, persisted shape);
  // right pins are tracked separately and a column is only ever in one of the two lists.
  const [pinnedColumnKeys, setPinnedColumnKeys] = useState([]);
  const [pinnedRightColumnKeys, setPinnedRightColumnKeys] = useState([]);
  // Pinned rows are session-only (not persisted via tablePreferenceKey, unlike pinned columns) --
  // mirrors rowValueFilters/Filter-Out state right below, which is also not persisted, and keeps
  // this feature scoped to the frontend (no user_table_preferences schema change). Each pin keeps
  // the row itself, so it stays in view across page changes, sorting, filters and Group By.
  const [pinnedRows, setPinnedRows] = useState({ top: [], bottom: [] }); // { top|bottom: [{ key, row }] }
  const [headerContextMenu, setHeaderContextMenu] = useState(null);
  const [rowContextMenu, setRowContextMenu] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  // Pinned, the filter panel docks beside the table (no overlay) so filters can be tried while the rows stay in view.
  // A per-browser preference shared by every table.
  const [filterPanelPinned, setFilterPanelPinned] = useState(() => {
    try {
      return localStorage.getItem(FILTER_PANEL_PIN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleFilterPanelPinned = useCallback(() => {
    setFilterPanelPinned((current) => {
      try {
        localStorage.setItem(FILTER_PANEL_PIN_KEY, current ? "0" : "1");
      } catch {
        // Storage blocked: the choice lasts for this page only.
      }
      return !current;
    });
  }, []);
  const [draftColumnFilters, setDraftColumnFilters] = useState({});
  const [rowValueFilters, setRowValueFilters] = useState({ exclude: {}, include: {} });
  const [filterPanelFocusKey, setFilterPanelFocusKey] = useState(null);
  const [leadingStickyWidth, setLeadingStickyWidth] = useState(0);
  const [stickyColumnOffsets, setStickyColumnOffsets] = useState({});
  const [stickyRightOffsets, setStickyRightOffsets] = useState({});
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
  const scrollbarIdleTimer = useRef(null);
  const [scrollbarsVisible, setScrollbarsVisible] = useState(false);
  const revealScrollbars = useCallback(() => {
    if (!autoHideScrollbars) return;
    setScrollbarsVisible(true);
    clearTimeout(scrollbarIdleTimer.current);
    scrollbarIdleTimer.current = setTimeout(() => setScrollbarsVisible(false), 1200);
  }, [autoHideScrollbars]);
  useEffect(() => () => clearTimeout(scrollbarIdleTimer.current), []);
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

  useResetOnChange([defaultGroupByColumn], () => {
    const normalizedDefault = String(defaultGroupByColumn || "").trim() || null;
    setGroupByColumn((prev) => {
      const normalizedPrev = String(prev || "").trim() || null;
      if (normalizedPrev === normalizedDefault) return prev;
      return normalizedDefault;
    });
    setExpandedGroups({});
  });

  useResetOnChange([columnKeysSignature], () => {
    const schemaColumns = columns;
    setVisibleColumns((prev) => {
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
  });

  useResetOnChange([columnKeysSignature, enableColumnResize], () => {
    if (!enableColumnResize) return;
    const schemaColumns = columns;
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
  });

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

        const leftPins = Array.isArray(saved.pinnedColumnKeys) ? saved.pinnedColumnKeys.map((key) => String(key)) : [];
        if (Array.isArray(saved.pinnedColumnKeys)) {
          setPinnedColumnKeys(leftPins);
        }
        if (Array.isArray(saved.pinnedRightColumnKeys)) {
          setPinnedRightColumnKeys(saved.pinnedRightColumnKeys.map((key) => String(key)).filter((key) => !leftPins.includes(key)));
        }
        if (saved.columnWidths && typeof saved.columnWidths === "object") {
          const validKeys = new Set(schemaColumns.map((column) => column.key));
          const widths = {};
          Object.entries(saved.columnWidths).forEach(([key, width]) => {
            if (validKeys.has(key) && Number(width) > 0) widths[key] = Number(width);
          });
          setColumnWidths(widths);
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
  // The column filter popup's two fields: 28px high like the toolbar controls, text centred so nothing is clipped.
  const columnFilterFieldSx = {
    "& .MuiOutlinedInput-root": { height: 28, borderRadius: controlBorderRadius ?? "5.25px" },
    "& .MuiInputBase-input": { fontSize: TYPE.body, lineHeight: "20px", height: 20, py: "4px", px: "8px" },
    "& .MuiNativeSelect-select.MuiInputBase-input": { pr: "26px", height: 20 },
    "& .MuiNativeSelect-icon, & .MuiSelect-icon": { right: 4 },
  };

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
            className: "p-2",
            sx: {
              width: columnFilterWidth,
              maxWidth: "calc(100vw - 24px)",
              mt: "6px",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "7px",
              boxShadow: 4,
            },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography component="span" sx={{ fontSize: TYPE.small, fontWeight: 600, color: "text.secondary" }}>
            {column.label}
          </Typography>
          <IconButton size="small" onClick={() => setActiveFilterColumn(null)}>
            <X size={14} />
          </IconButton>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <TextField
            select
            size="small"
            fullWidth
            slotProps={{ select: { native: true } }}
            value={getColumnFilter(column.key).operator}
            onChange={(e) =>
              setColumnFilter(column.key, { operator: e.target.value })
            }
            sx={columnFilterFieldSx}
          >
            {FILTER_OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </TextField>
          {!INPUT_FREE_OPERATORS.has(getColumnFilter(column.key).operator) && (
            <TextField
              inputRef={filterInputRef}
              size="small"
              fullWidth
              value={getColumnFilter(column.key).value}
              onChange={(e) =>
                setColumnFilter(column.key, { value: e.target.value })
              }
              placeholder="Enter filter value"
              sx={columnFilterFieldSx}
            />
          )}
        </Box>
        <Button size="small" onClick={() => clearColumnFilter(column.key)} sx={{ mt: 0.75, minWidth: 0, px: 1, fontSize: TYPE.small }}>
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

  const isServerGrouped = Boolean(
    groupByColumn && typeof onFetchGroupSummaries === "function" && !groupSummaryState.unsupported
  );
  // Group By no longer uses this path at all (server-only, see isServerGrouped) -- this remains
  // for the separate Filter Out / Show Matching features, which still operate on a bulk-fetched
  // row set.
  const shouldLoadAllRowsSource = Boolean(
    paginationMode === "server" &&
      typeof onExportRows === "function" &&
      (hasActiveRowValueFilters || hasActiveColumnFilters)
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
    onSortChange?.(serverSortFields ? serverSortFields[nextColumn] || null : nextColumn, nextDirection);
  }, [sortColumn, sortDirection, onSortChange, serverSortFields]);

  const sortRowsForDisplay = useCallback((sourceRows) => {
    const activeSortColumn = groupByColumn || sortColumn;
    const activeSortDirection = sortDirection;
    if (!activeSortColumn) return sourceRows || [];
    // When the parent drives sort via onSortChange, the rows it hands back are already in the
    // requested order -- skip re-sorting here (mirrors how enableServerSearch blanks out client
    // search) UNLESS grouping is active, which still needs a client-side presort to cluster
    // same-value rows regardless of who owns the column sort.
    if (onSortChange && !groupByColumn && (!serverSortFields || serverSortFields[sortColumn])) return sourceRows || [];
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
  }, [groupByColumn, sortColumn, sortDirection, columns, onSortChange, serverSortFields]);

  const sortedRows = useMemo(
    () => sortRowsForDisplay(filteredRows),
    [filteredRows, sortRowsForDisplay]
  );

  // Browser Group By: a table that already holds every row (client pagination, or no paging at
  // all) groups the full filtered set here -- nothing is sampled, so the old capped-sample problem
  // doesn't apply. Server-paged tables group through onFetchGroupSummaries (GroupAggregationService);
  // if that backend says a column can't be grouped, a table that holds all rows falls back to this.
  const holdsAllRows = paginationMode === "client"
    || !((typeof onPageChange === "function" || typeof onNextCursor === "function") && typeof onLimitChange === "function");
  const canClientGroup = holdsAllRows;
  const isClientGrouped = Boolean(groupByColumn && canClientGroup && !isServerGrouped);
  const clientGroups = useMemo(() => {
    if (!isClientGrouped) return [];
    const column = columns.find((c) => c.key === groupByColumn);
    if (!column) return [];
    const groups = new Map();
    sortedRows.forEach((row) => {
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
  }, [isClientGrouped, columns, groupByColumn, sortedRows]);

  useResetOnChange([groupByColumn], () => {
    setExpandedGroups({});
    setGroupRowsState({});
    setGroupSummaryState({ loading: false, page: 1, data: [], pagination: null, meta: null, unsupported: false });
  });

  // Fetch paginated group summaries from the server whenever grouping (in server mode) is active,
  // the group-summary page changes, or the active search/filters change (mirrors shouldLoadAllRowsSource's
  // dependency list for the client-side path).
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
          [groupKey]: {
            rows: nextRows,
            page: targetPage,
            hasMore: Boolean(result?.pagination?.has_next),
            loading: false,
            error: null,
          },
        };
      });
    } catch {
      setGroupRowsState((prev) => ({
        ...prev,
        [groupKey]: { ...(prev[groupKey] || { rows: [] }), loading: false, error: "Failed to load rows" },
      }));
    }
  }, [onFetchGroupRows, groupByColumn]);

  const toggleGroupExpanded = useCallback((groupKey) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupKey]: !prev[groupKey] };
      return next;
    });
    if (isServerGrouped && !expandedGroups[groupKey] && !groupRowsState[groupKey]) {
      fetchGroupRowsPage(groupKey, 1);
    }
  }, [isServerGrouped, expandedGroups, groupRowsState, fetchGroupRowsPage]);

  const loadMoreGroupRows = useCallback((groupKey) => {
    const current = groupRowsState[groupKey];
    if (!current || current.loading || !current.hasMore) return;
    fetchGroupRowsPage(groupKey, (current.page || 1) + 1);
  }, [groupRowsState, fetchGroupRowsPage]);

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

  const openRowContextMenu = useCallback((event, column, row, sourceIndex) => {
    event.preventDefault();
    event.stopPropagation();
    setHeaderContextMenu(null);
    setActiveFilterColumn(null);

    const menuWidth = 220;
    // Taller than the column header menu (which has no pin-status subtitle) -- accounts for the
    // "Pin row" item this menu adds alongside the existing Filter Out / Show Matching pair.
    const menuHeight = 128;
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
    const rowKeyValue = String(getRowKey(row, sourceIndex));

    setRowContextMenu({
      top: Math.max(viewportPadding, top),
      left: Math.max(viewportPadding, left),
      columnKey: column.key,
      label: column.label,
      rawValue,
      displayValue: toText(rawValue),
      rowKeyValue,
      row,
      pinSide: pinnedRows.top.some((pin) => pin.key === rowKeyValue)
        ? "top"
        : pinnedRows.bottom.some((pin) => pin.key === rowKeyValue) ? "bottom" : null,
      pinAnchor: null,
    });
  }, [getSearchValue, getRowKey, pinnedRows]);

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
    if (pinnedColumnKeys.length === 0 && pinnedRightColumnKeys.length === 0) return orderedVisible;
    const leftSet = new Set(pinnedColumnKeys);
    const rightSet = new Set(pinnedRightColumnKeys);
    return [
      ...orderedVisible.filter((column) => leftSet.has(column.key)),
      ...orderedVisible.filter((column) => !leftSet.has(column.key) && !rightSet.has(column.key)),
      ...orderedVisible.filter((column) => rightSet.has(column.key) && !leftSet.has(column.key)),
    ];
  }, [columns, visibleColumns, columnOrder, pinnedColumnKeys, pinnedRightColumnKeys]);

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
      // Right pins stack from the right edge inwards, so walk them in reverse display order.
      const nextRightOffsets = {};
      let currentRight = 0;
      [...visibleColumnDefs].reverse().forEach((column) => {
        if (!pinnedRightColumnKeys.includes(column.key)) return;
        nextRightOffsets[column.key] = currentRight;
        currentRight += headerCellRefs.current[column.key]?.offsetWidth || 0;
      });
      setStickyRightOffsets((prev) => (
        Object.keys(prev).length === Object.keys(nextRightOffsets).length
          && Object.keys(nextRightOffsets).every((key) => prev[key] === nextRightOffsets[key])
          ? prev
          : nextRightOffsets
      ));

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
        .filter((column) => pinnedColumnKeys.includes(column.key) || pinnedRightColumnKeys.includes(column.key))
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
  }, [visibleColumnDefs, pinnedColumnKeys, pinnedRightColumnKeys]);

  const getColumnPinSide = useCallback(
    (columnKey) => (pinnedColumnKeys.includes(columnKey) ? "left" : pinnedRightColumnKeys.includes(columnKey) ? "right" : null),
    [pinnedColumnKeys, pinnedRightColumnKeys]
  );

  const getStickyCellStyle = useCallback(
    (columnKey, isHeader = false) => {
      const side = getColumnPinSide(columnKey);
      if (!side) return undefined;
      return side === "left"
        ? { position: "sticky", left: stickyColumnOffsets[columnKey] ?? leadingStickyWidth, zIndex: isHeader ? 25 : 15 }
        : { position: "sticky", right: stickyRightOffsets[columnKey] ?? 0, zIndex: isHeader ? 25 : 15 };
    },
    [getColumnPinSide, stickyColumnOffsets, stickyRightOffsets, leadingStickyWidth]
  );

  // The divider line sits on the side facing the scrolling columns.
  const getPinEdgeShadow = useCallback(
    (columnKey) => (theme) => `${getColumnPinSide(columnKey) === "right" ? "-2px" : "2px"} 0 0 0 ${theme.palette.mode === "dark" ? "#374151" : "#e5e7eb"}`,
    [getColumnPinSide]
  );

  // An explicit width also caps the cell content (ellipsis), so columns can be made narrower
  // than their content under table-layout:auto, where max-width on the cell itself is ignored.
  const renderSizedCellContent = useCallback(
    (columnKey, content) => {
      const width = columnWidths[columnKey];
      if (!width) return content;
      return (
        <Box component="div" sx={{ maxWidth: Math.max(width - 24, 16), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {content}
        </Box>
      );
    },
    [columnWidths]
  );

  const tableLayout = useMemo(
    () => ({ pinnedRightColumnKeys, columnWidths }),
    [pinnedRightColumnKeys, columnWidths]
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

  // "Personalize List Columns" dialog (ColumnPersonalizerDialog): it keeps its own draft, starting from the
  // current columns each time it opens (a new key remounts it).
  const [columnDialogSession, setColumnDialogSession] = useState({ key: 0, initialSelected: [] });
  const handleOpenColumnDialog = () => {
    const orderedSelected = columnOrder.filter((k) => visibleColumns.includes(k));
    const extra = visibleColumns.filter((k) => !orderedSelected.includes(k));
    setColumnDialogSession((prev) => ({ key: prev.key + 1, initialSelected: [...orderedSelected, ...extra] }));
    setShowColumnDialog(true);
  };

  const handleApplyColumns = async (valid) => {
    setVisibleColumns(valid);
    setColumnOrder(valid);
    setShowColumnDialog(false);

    if (!tablePreferenceKey) return;
    try {
      setSavingColumnPrefs(true);
      await saveTablePreference(tablePreferenceKey, valid, valid, pinnedColumnKeys, tableLayout);
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
    setColumnWidths({});
    setPinnedColumnKeys([]);
    setPinnedRightColumnKeys([]);
    setShowColumnDialog(false);
    setHeaderContextMenu(null);
    Object.values(headerCellRefs.current).forEach((node) => {
      if (node) node.style.width = "";
    });

    if (!tablePreferenceKey) return;
    try {
      setSavingColumnPrefs(true);
      await saveTablePreference(tablePreferenceKey, allKeys, allKeys, [], { pinnedRightColumnKeys: [], columnWidths: {} });
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
      nextPinnedRightColumnKeys = pinnedRightColumnKeys,
      nextColumnWidths = columnWidths,
    } = {}) => {
      if (!tablePreferenceKey) return;
      try {
        await saveTablePreference(
          tablePreferenceKey,
          nextVisibleColumns,
          nextColumnOrder,
          nextPinnedColumnKeys,
          { pinnedRightColumnKeys: nextPinnedRightColumnKeys, columnWidths: nextColumnWidths }
        );
      } catch {
        // silent
      }
    },
    [tablePreferenceKey, visibleColumns, columnOrder, pinnedColumnKeys, pinnedRightColumnKeys, columnWidths]
  );
  // The resize mouseup listener is registered once per drag, so it reads the latest values via refs.
  const persistTablePreferenceRef = useRef(persistTablePreference);
  const columnWidthsRef = useRef(columnWidths);
  useEffect(() => {
    persistTablePreferenceRef.current = persistTablePreference;
    columnWidthsRef.current = columnWidths;
  }, [persistTablePreference, columnWidths]);

  // side: "left" | "right" | null (no pin). A column moves between sides rather than being in both.
  const openPinSubmenu = useCallback((anchor) => {
    setHeaderContextMenu((current) => (current && current.pinAnchor !== anchor ? { ...current, pinAnchor: anchor, rowPinAnchor: null } : current));
  }, []);
  const openHeaderRowPinSubmenu = useCallback((anchor) => {
    setHeaderContextMenu((current) => (current && current.rowPinAnchor !== anchor ? { ...current, rowPinAnchor: anchor, pinAnchor: null } : current));
  }, []);
  const closePinSubmenu = useCallback(() => {
    setHeaderContextMenu((current) => (current?.pinAnchor || current?.rowPinAnchor ? { ...current, pinAnchor: null, rowPinAnchor: null } : current));
  }, []);

  const handleSetColumnPin = useCallback(
    async (columnKey, side) => {
      const normalizedKey = String(columnKey || "").trim();
      if (!normalizedKey) return;

      const withoutKey = (keys) => keys.filter((key) => key !== normalizedKey);
      const nextPinnedColumnKeys = side === "left" ? [...withoutKey(pinnedColumnKeys), normalizedKey] : withoutKey(pinnedColumnKeys);
      const nextPinnedRightColumnKeys = side === "right" ? [...withoutKey(pinnedRightColumnKeys), normalizedKey] : withoutKey(pinnedRightColumnKeys);

      setPinnedColumnKeys(nextPinnedColumnKeys);
      setPinnedRightColumnKeys(nextPinnedRightColumnKeys);
      setHeaderContextMenu(null);
      await persistTablePreference({ nextPinnedColumnKeys, nextPinnedRightColumnKeys });
    },
    [pinnedColumnKeys, pinnedRightColumnKeys, persistTablePreference]
  );

  // Mirrors handleSetColumnPin above: side "top" | "bottom" | null (no pin); a row is only ever on
  // one side. No backend persistence (see the pinnedRows state comment).
  const handleSetRowPin = useCallback((rowKeyValue, row, side) => {
    const normalizedKey = String(rowKeyValue ?? "").trim();
    if (!normalizedKey) return;
    setPinnedRows((prev) => {
      const without = (list) => list.filter((pin) => pin.key !== normalizedKey);
      const top = without(prev.top);
      const bottom = without(prev.bottom);
      if (side === "top") top.push({ key: normalizedKey, row });
      if (side === "bottom") bottom.push({ key: normalizedKey, row });
      return { top, bottom };
    });
    setRowContextMenu(null);
  }, []);
  const openRowPinSubmenu = useCallback((anchor) => {
    setRowContextMenu((current) => (current && current.pinAnchor !== anchor ? { ...current, pinAnchor: anchor } : current));
  }, []);
  const closeRowPinSubmenu = useCallback(() => {
    setRowContextMenu((current) => (current?.pinAnchor ? { ...current, pinAnchor: null } : current));
  }, []);

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
      pinSide: getColumnPinSide(column.key),
      isGrouped: groupByColumn === column.key,
    });
  }, [groupByColumn, getColumnPinSide]);

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
          await saveTablePreference(tablePreferenceKey, visibleColumns, newOrder, pinnedColumnKeys, tableLayout);
        } catch {
          // silent
        }
      }, 800);
    },
    [tablePreferenceKey, visibleColumns, pinnedColumnKeys, tableLayout]
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
  // The header width is the column's width; renderSizedCellContent caps body content to match,
  // so a column can be dragged narrower than its content (text then ends with an ellipsis).
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

  const handleResizeMouseUp = useCallback(function finishResize() {
    const active = resizingRef.current;
    window.removeEventListener("mousemove", handleResizeMouseMove);
    window.removeEventListener("mouseup", finishResize);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setResizingColumnKey(null);
    resizingRef.current = null;
    if (!active || active.lastWidth == null) return;
    const nextColumnWidths = { ...columnWidthsRef.current, [active.columnKey]: Math.round(active.lastWidth) };
    setColumnWidths(nextColumnWidths);
    persistTablePreferenceRef.current({ nextColumnWidths });
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

  // Autosize = drop the explicit width so table-layout:auto fits the column to its content again.
  const handleAutosizeColumn = useCallback((columnKey) => {
    setHeaderContextMenu(null);
    const node = headerCellRefs.current[columnKey];
    if (node) node.style.width = "";
    if (!(columnKey in columnWidths)) return;
    const nextColumnWidths = { ...columnWidths };
    delete nextColumnWidths[columnKey];
    setColumnWidths(nextColumnWidths);
    persistTablePreference({ nextColumnWidths });
  }, [columnWidths, persistTablePreference]);

  const handleAutosizeAllColumns = useCallback(() => {
    setHeaderContextMenu(null);
    Object.values(headerCellRefs.current).forEach((node) => {
      if (node) node.style.width = "";
    });
    if (Object.keys(columnWidths).length === 0) return;
    setColumnWidths({});
    persistTablePreference({ nextColumnWidths: {} });
  }, [columnWidths, persistTablePreference]);

  const canPaginate = (typeof onPageChange === "function" || typeof onNextCursor === "function") && typeof onLimitChange === "function";
  const isClientPagination = canPaginate && paginationMode === "client";
  const isFullDatasetPagination = canPaginate && shouldLoadAllRowsSource;
  const usesLocalPagination = isClientPagination || isFullDatasetPagination;
  const isCursorMode = Boolean(
    (pagination?.mode === "cursor" || paginationMode === "cursor") && !usesLocalPagination
  );
  const isAppendCursorMode = isCursorMode && cursorLoadMode === "append";
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 20, 1);
  // Grouped tables page by group, whether the groups came from the server or the browser.
  const isGroupPaged = isServerGrouped || isClientGrouped;
  const clientGroupLimit = canPaginate ? safeLimit : Math.max(clientGroups.length, 1);
  const clientGroupTotalPages = Math.max(Math.ceil(clientGroups.length / clientGroupLimit), 1);
  const clientGroupPage = Math.min(groupSummaryState.page, clientGroupTotalPages);
  const groupSummaryData = isServerGrouped
    ? groupSummaryState.data
    : clientGroups.slice((clientGroupPage - 1) * clientGroupLimit, clientGroupPage * clientGroupLimit);
  const groupPagination = isServerGrouped
    ? groupSummaryState.pagination
    : { total: clientGroups.length, total_pages: clientGroupTotalPages, has_next: clientGroupPage < clientGroupTotalPages };
  const groupMatchingRows = isServerGrouped ? groupSummaryState.meta?.total_matching_rows ?? 0 : sortedRows.length;
  // Group By is server-only (GroupAggregationService) -- no client-side grouping fallback. A
  // capped, silently-sampled client computation was worse than not offering grouping at all once
  // tables reached real scale; see the "Group By" menu item gating above, which only lets a user
  // start grouping when onFetchGroupSummaries is actually wired for this page.
  const computedTotalRows = isGroupPaged
    ? Number(groupPagination?.total) || 0
    : usesLocalPagination
      ? sortedRows.length
      : Number(totalRows) || 0;
  const safeTotalPages = isGroupPaged
    ? Math.max(Number(groupPagination?.total_pages) || 1, 1)
    : usesLocalPagination
      ? Math.max(Math.ceil(computedTotalRows / safeLimit), 1)
      : Math.max(Number(totalPages) || 1, 1);
  const currentPage = isServerGrouped ? groupSummaryState.page : isClientGrouped ? clientGroupPage : Math.min(safePage, safeTotalPages);
  const paginatedRows = !isGroupPaged && usesLocalPagination
    ? sortedRows.slice((Math.min(safePage, safeTotalPages) - 1) * safeLimit, Math.min(safePage, safeTotalPages) * safeLimit)
    : sortedRows;
  const clientGroupRows = useMemo(() => {
    const map = {};
    clientGroups.forEach((group) => { map[String(group.group_value ?? "__blank__")] = group.rows; });
    return map;
  }, [clientGroups]);
  const paginatedGroupUnits = useMemo(() => {
    if (!isGroupPaged) return [];
    return groupSummaryData.map((item) => ({
      type: "group",
      groupKey: String(item.group_value ?? "__blank__"),
      label: item.label ?? (item.group_value === null ? "(Blank)" : String(item.group_value)),
      count: item.row_count,
      aggregates: {},
    }));
  }, [isGroupPaged, groupSummaryData]);
  const currentPageRowEntries = useMemo(() => {
    if (!groupByColumn) {
      return paginatedRows.map((row, index) => ({
        row,
        sourceIndex: index,
      }));
    }
    return []; // grouped: rows come from groupRowsState, fetched lazily per expanded group
  }, [groupByColumn, paginatedRows]);

  // Pin row (freeze-row): pinned rows render as small always-mounted blocks -- top ones right after
  // the header, bottom ones after the last row -- outside virtualization/keyboard-nav entirely (a
  // virtualized row can unmount once scrolled far out of view, which would silently un-stick it).
  // Each pin carries its row, so it stays visible on any page and while grouped; when the row is on
  // the current page its fresh copy is shown. Ungrouped, a pinned row is not repeated in the body;
  // grouped, it also stays in its group.
  const pinnedKeySet = useMemo(
    () => new Set([...pinnedRows.top, ...pinnedRows.bottom].map((pin) => pin.key)),
    [pinnedRows]
  );
  const toPinnedEntries = useCallback((pins) => {
    const fresh = new Map();
    currentPageRowEntries.forEach((entry) => {
      const key = String(getRowKey(entry.row, entry.sourceIndex));
      if (pinnedKeySet.has(key)) fresh.set(key, entry);
    });
    return pins.map((pin) => fresh.get(pin.key) || { row: pin.row, sourceIndex: -1, pinKey: pin.key });
  }, [currentPageRowEntries, getRowKey, pinnedKeySet]);
  // Header menu "Pin rows": applies to the ticked rows. A ticked row is found on this page or among the
  // pinned ones (a pin keeps its row); "No pin" only needs the key.
  const selectedRowKeys = useMemo(() => selectedRows.map((key) => String(key)), [selectedRows]);
  const selectedRowsPinSide = useMemo(() => {
    if (selectedRowKeys.length === 0) return undefined;
    const sideOf = (key) => (pinnedRows.top.some((pin) => pin.key === key) ? "top" : pinnedRows.bottom.some((pin) => pin.key === key) ? "bottom" : null);
    const sides = new Set(selectedRowKeys.map(sideOf));
    return sides.size === 1 ? [...sides][0] : undefined;
  }, [selectedRowKeys, pinnedRows]);
  const handleSetSelectedRowsPin = useCallback((side) => {
    const rowsByKey = new Map([...pinnedRows.top, ...pinnedRows.bottom].map((pin) => [pin.key, pin.row]));
    currentPageRowEntries.forEach((entry) => rowsByKey.set(String(getRowKey(entry.row, entry.sourceIndex)), entry.row));
    const keys = new Set(selectedRowKeys);
    setPinnedRows((prev) => {
      const without = (list) => list.filter((pin) => !keys.has(pin.key));
      const top = without(prev.top);
      const bottom = without(prev.bottom);
      if (side) {
        selectedRowKeys.forEach((key) => {
          if (rowsByKey.has(key)) (side === "top" ? top : bottom).push({ key, row: rowsByKey.get(key) });
        });
      }
      return { top, bottom };
    });
    setHeaderContextMenu(null);
  }, [pinnedRows, currentPageRowEntries, getRowKey, selectedRowKeys]);
  const handleUnpinAllRows = useCallback(() => {
    setPinnedRows({ top: [], bottom: [] });
    setHeaderContextMenu(null);
  }, []);
  const pinnedTopEntries = useMemo(() => toPinnedEntries(pinnedRows.top), [toPinnedEntries, pinnedRows.top]);
  const pinnedBottomEntries = useMemo(() => toPinnedEntries(pinnedRows.bottom), [toPinnedEntries, pinnedRows.bottom]);
  const unpinnedRowEntries = useMemo(() => {
    if (groupByColumn || pinnedKeySet.size === 0) return currentPageRowEntries;
    return currentPageRowEntries.filter((entry) => !pinnedKeySet.has(String(getRowKey(entry.row, entry.sourceIndex))));
  }, [groupByColumn, pinnedKeySet, currentPageRowEntries, getRowKey]);

  const displayRows = useMemo(() => {
    if (!groupByColumn) {
      // Excludes pinned rows -- those render separately, in the top and bottom blocks.
      return unpinnedRowEntries.map((entry) => ({
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

      if (expanded && isClientGrouped) {
        (clientGroupRows[unit.groupKey] || []).forEach((row, idx) => {
          items.push({ type: "row", row, sourceIndex: idx, isGroupedChild: true });
        });
      } else if (expanded) {
        const groupState = groupRowsState[unit.groupKey];
        (groupState?.rows || []).forEach((row, idx) => {
          items.push({ type: "row", row, sourceIndex: idx, isGroupedChild: true });
        });
        items.push({
          type: "group-loader",
          groupKey: unit.groupKey,
          loading: Boolean(groupState?.loading),
          hasMore: Boolean(groupState?.hasMore),
          error: groupState?.error || null,
        });
      }

      return items;
    });
  }, [groupByColumn, unpinnedRowEntries, paginatedGroupUnits, expandedGroups, groupRowsState, isClientGrouped, clientGroupRows]);

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

  const rowVirtualizer = useRowVirtualization({
    count: virtualizationActive ? displayRows.length : 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 8,
  });

  const virtualItems = virtualizationActive ? rowVirtualizer.virtualItems : [];
  const virtualPaddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const virtualPaddingBottom = virtualItems.length > 0
    ? rowVirtualizer.totalSize - virtualItems[virtualItems.length - 1].end
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
  useResetOnChange([virtualResetSignature, currentPage], () => setActiveRowIndex(null));

  // Re-clamp (not reset) when the row count merely shrinks, so e.g. collapsing a group the user is
  // sitting inside doesn't blow away their keyboard position entirely.
  useResetOnChange([displayRows.length], () => {
    setActiveRowIndex((prev) => {
      if (prev === null) return prev;
      if (displayRows.length === 0) return null;
      return Math.min(prev, displayRows.length - 1);
    });
  });

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

  const pageOptions = allowPageJump && (isGroupPaged || !isCursorMode)
    ? Array.from({ length: safeTotalPages }, (_, i) => i + 1)
    : [];
  const paginationBusy = loading || (isServerGrouped && groupSummaryState.loading);
  const hasPrev = isGroupPaged
    ? currentPage > 1
    : isCursorMode
      ? Boolean(pagination?.has_previous || pagination?.previous_cursor)
      : currentPage > 1;
  const hasNext = isGroupPaged
    ? Boolean(groupPagination?.has_next) || currentPage < safeTotalPages
    : isCursorMode
      ? Boolean(pagination?.has_next || pagination?.has_more || pagination?.next_cursor)
      : currentPage < safeTotalPages;

  const handlePrevPage = useCallback(() => {
    if (!hasPrev || paginationBusy) return;
    if (isGroupPaged) {
      setGroupSummaryState((prev) => ({ ...prev, page: Math.max(1, Math.min(prev.page, safeTotalPages) - 1) }));
    } else if (isCursorMode) {
      if (typeof onPreviousCursor === "function" && pagination?.previous_cursor) {
        onPreviousCursor(pagination.previous_cursor);
      } else if (typeof onPageChange === "function") {
        onPageChange("prev", pagination?.previous_cursor);
      }
    } else if (typeof onPageChange === "function") {
      onPageChange(currentPage - 1);
    }
  }, [hasPrev, paginationBusy, isGroupPaged, safeTotalPages, isCursorMode, onPreviousCursor, onPageChange, pagination, currentPage]);

  const handleNextPage = useCallback(() => {
    if (!hasNext || paginationBusy) return;
    if (isGroupPaged) {
      setGroupSummaryState((prev) => ({ ...prev, page: Math.min(prev.page, safeTotalPages) + 1 }));
    } else if (isCursorMode) {
      if (typeof onNextCursor === "function" && pagination?.next_cursor) {
        onNextCursor(pagination.next_cursor);
      } else if (typeof onPageChange === "function") {
        onPageChange("next", pagination?.next_cursor);
      }
    } else if (typeof onPageChange === "function") {
      onPageChange(currentPage + 1);
    }
  }, [hasNext, paginationBusy, isGroupPaged, safeTotalPages, isCursorMode, onNextCursor, onPageChange, pagination, currentPage]);

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
        onSelectionChange(singleSelection ? [key] : [...selectedRows, key]);
      } else {
        onSelectionChange(selectedRows.filter((k) => k !== key));
      }
    },
    [selectedRows, onSelectionChange, singleSelection]
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
    loading || allRowsLoading || (enableServerSearch && isServerSearchDebouncing) ||
    (isServerGrouped && groupSummaryState.loading && groupSummaryState.data.length === 0);

  useEffect(() => {
    if (isGroupPaged) return;
    if (!usesLocalPagination) return;
    if (safePage <= safeTotalPages) return;
    onPageChange(safeTotalPages);
  }, [isGroupPaged, usesLocalPagination, safePage, safeTotalPages, onPageChange]);

  // One renderer for both pinned blocks (top and bottom); see pinnedTopEntries above.
  const renderPinnedRows = (entries, side) => {
    const sideCount = entries.length;
    return entries.map((entry, pinIndex) => {
        const row = entry.row;
        const key = entry.pinKey ?? String(getRowKey(row, entry.sourceIndex));
        const isSelected = enableSelection && selectedRows.includes(key);
        // Top pins stack below the header; bottom pins stack up from the bottom edge.
        const stick = side === "top"
          ? { top: HEADER_HEIGHT_PX + pinIndex * ROW_HEIGHT_PX }
          : { bottom: (sideCount - 1 - pinIndex) * ROW_HEIGHT_PX };
        const rowBgSx = isSelected
          ? { bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(30,58,138,0.3)" : "#eff6ff") }
          : { bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(120,53,15,0.22)" : "#fffbeb") };
        const rowHoverSx = { "&:hover": rowBgSx };
        return (
          <TableRow
            key={`pin-${side}-${key}`}
            data-pinned-row={side}
            sx={{
              ...rowBorderTopSx, ...bodyRowSx, ...rowBgSx, ...rowHoverSx,
              cursor: onRowClick ? "pointer" : undefined,
            }}
            onClick={onRowClick ? (event) => {
              if (event.button !== 0) return;
              onRowClick(row);
            } : undefined}
          >
            <TableCell sx={{ position: "sticky", left: 0, ...stick, zIndex: 22, ...cellBorderSx, px: 1, ...bodyCellYSx, color: "text.secondary", ...rowBgSx }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  component="button"
                  type="button"
                  title="Unpin row"
                  aria-label="Unpin row"
                  onClick={(e) => { e.stopPropagation(); handleSetRowPin(key, row, null); }}
                  sx={{ display: "inline-flex", color: "#d97706" }}
                >
                  <Pin size={12} />
                </Box>
                {enableSelection && onSelectionChange && (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectRow(key, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    slotProps={{ input: { "aria-label": typeof getRowSelectionLabel === "function" ? getRowSelectionLabel(row) : "Select row" } }}
                    size="small"
                    sx={{ p: 0.25 }}
                  />
                )}
              </Box>
            </TableCell>
            {visibleColumnDefs.map((column) => {
              const rawValue = getRawValue(row, column);
              const content = column.render
                ? column.render(rawValue, row)
                : defaultCell(rawValue);
              const pinnedColStyle = getStickyCellStyle(column.key);
              return (
                <TableCell
                  key={column.key}
                  // pinnedColStyle spread first: a pinned row's own top/zIndex must win over a
                  // pinned column's when a cell is both (its z-index otherwise loses to 22 below).
                  style={{ ...(pinnedColStyle || {}), position: "sticky", ...stick, zIndex: 22 }}
                  sx={{
                    ...cellBorderSx, px: 1.5, ...bodyCellYSx, whiteSpace: "nowrap", color: "text.secondary",
                    ...rowBgSx,
                    ...(getColumnPinSide(column.key) ? { boxShadow: getPinEdgeShadow(column.key) } : null),
                  }}
                  onContextMenu={(event) => openRowContextMenu(event, column, row, entry.sourceIndex)}
                >
                  {renderSizedCellContent(column.key, content)}
                </TableCell>
              );
            })}
            {renderActions && (
              <TableCell sx={{ position: "sticky", ...stick, zIndex: 22, px: 1.5, ...bodyCellYSx, color: "text.secondary", ...rowBgSx }} onClick={(e) => e.stopPropagation()}>
                {renderActions(row, { selectedCount: selectedRows.length })}
              </TableCell>
            )}
          </TableRow>
        );
      });
  };

  // Detect if selected search field is a date type
  const isSearchFieldDate = useMemo(() => {
    if (searchField === "all") return false;
    const col = columns.find((c) => c.key === searchField);
    if (!col) return false;
    if (col.type === "date") return true;
    const lower = (col.key + col.label).toLowerCase();
    return /date|dob|birth|marriage/.test(lower);
  }, [searchField, columns]);

  // fillHeight: the table grows to fill whatever vertical space its parent gives it (flex:1,
  // min-height:0 so it can still shrink/scroll within that space) instead of only being as tall as
  // its own rows -- otherwise a near-empty result set leaves the pagination footer stranded right
  // under the last row instead of pinned to the bottom of the container, same as every other state.
  const tableViewportSx = fillHeight
    ? { flex: 1, minHeight: 0, ...(fixedHeight ? { maxHeight: { xs: "433px", lg: "none" } } : {}) }
    : {};
  const tableViewportStyle = !fillHeight && fixedHeight
    ? { maxHeight: `${FIXED_TABLE_HEIGHT}px` }
    : undefined;
  // Static style object (not className); merged directly onto the native search button below, so
  // compact sizing applies regardless of whether searchButtonClassName is the default `.fdt-search-
  // btn` or a caller-supplied override like `.glass-btn` -- an inline style always applies over a
  // stylesheet rule, no specificity fight either way.
  const compactActionStyle = { height: ERP_UI.actionHeight, boxSizing: "border-box", padding: "0 10px", fontSize: compact ? 11 : 12, borderRadius: controlBorderRadius };
  // MUI's `stickyHeader` (Table prop, active whenever fixedHeight is true -- the default) forces an
  // OPAQUE background on every .MuiTableCell-stickyHeader from the ambient theme, so sticky content
  // doesn't show through while scrolling. That wins the cascade over the `bg-gray-100`/`dark:bg-
  // gray-700` Tailwind classes below (same specificity, MUI's rule is injected later), and also
  // replaces what used to be simple see-through-to-<thead> inheritance for non-pinned header cells.
  // Routed through `sx` (not `className`) because MUI's own `sx`-generated styles are guaranteed to
  // out-rank the component's built-in styleOverrides regardless of stylesheet order -- the one thing
  // that reliably wins this specific fight. Reads `theme.palette.mode`, which TenantThemeProvider
  // keeps in sync with the app's own light/dark toggle, so this still matches Tailwind's dark: pair.
  // Confirmed live (getComputedStyle on a real pinned/grouped header cell) that this ALSO already
  // wins over the header cells' own conditional bg-gray-100/bg-blue-50 classes below -- both were
  // already fully inert before this conversion, so their removal here is a no-op, not a regression.
  // fontSize here (not just on tableTextSx/<Table> below) because MUI's own .MuiTableCell-root
  // sets an explicit font-size from the theme's typography scale, which wins over simple
  // inheritance from an ancestor <table> -- tableTextSx alone never actually reached any real
  // <th>/<td> text, on any page, compact or not (confirmed live: every table's header text
  // measured the same ~14px MUI default regardless of the compact prop). Real sx on each cell is
  // the only thing that reliably outranks MUI's own styleOverrides, same reasoning as the
  // background-color comment above.
  const headerCellSx = {
    backgroundColor: (theme) => (theme.palette.mode === "dark" ? "#374151" : "#f3f4f6"),
    fontSize: compact ? { xs: "10px", xl: "11px" } : { xs: 10.5, xl: 12.25 },
  };
  const headerCellYSx = compact ? { py: { xs: 0.5, xl: 0.75 } } : { py: { xs: 1, xl: 1.25 } };
  const bodyCellYSx = compact
    ? { py: 0, lineHeight: 1, fontSize: { xs: "10px", xl: "11px" } }
    : { py: { xs: 1, xl: 1.25 }, fontSize: { xs: 10.5, xl: 12.25 } };
  const bodyRowSx = compact ? { height: 32 } : {};
  const tableTextSx = compact
    ? { fontSize: { xs: "10px", xl: "11px" }, lineHeight: 1.25 }
    : { fontSize: { xs: 10.5, xl: 12.25 } };
  const cellBorderSx = { borderRight: 1, borderColor: "divider" };
  const rowBorderTopSx = { borderTop: 1, borderColor: "divider" };

  // Every field/button in the toolbar row shared one exact height before this conversion (all keyed
  // off the same topFieldClass/compactActionClass strings) -- MUI's Select/TextField/Button don't
  // default to matching heights at the same `size`, so it's pinned explicitly here to keep the row
  // visually unified instead of the fields/buttons drifting a few px out of alignment with each other.
  // This app's root font-size is 14px (not the usual 16px browser default -- verified live), so
  // Tailwind's h-8 (2rem) is 28px here, not 32px. Matches the native Search button's own h-8 exactly.
  const toolbarFieldHeight = ERP_UI.actionHeight;
  const toolbarFieldSx = { height: toolbarFieldHeight, fontSize: compact ? 11 : 12 };

  // The filter panel's content: in the right Drawer, or docked beside the table when pinned.
  const filterPanelBody = (
    <Box data-testid="filter-panel-root" sx={{ display: "flex", height: "100%", flexDirection: "column" }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Filter Panel</Typography>
            <Typography sx={{ fontSize: TYPE.small, color: "text.secondary" }}>Apply filters on multiple columns</Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={filterPanelPinned ? "Unpin panel" : "Pin panel beside the table"}>
              <IconButton
                size="small"
                aria-label={filterPanelPinned ? "Unpin panel" : "Pin panel"}
                aria-pressed={filterPanelPinned}
                onClick={toggleFilterPanelPinned}
                sx={filterPanelPinned ? { color: "primary.main", bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12) } : undefined}
              >
                {filterPanelPinned ? <PinOff size={16} /> : <Pin size={16} />}
              </IconButton>
            </Tooltip>
            <IconButton size="small" aria-label="Close filter panel" onClick={() => setShowFilterPanel(false)}>
              <X size={16} />
            </IconButton>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", px: 2, py: 1 }}>
          <Button
            size="small"
            onClick={() => {
              const cleared = normalizeFilterMap({}, columns);
              setDraftColumnFilters(cleared);
            }}
          >
            Clear All
          </Button>
          <Typography component="span" sx={{ fontSize: TYPE.small, color: "text.disabled" }}>|</Typography>
          <Typography component="span" sx={{ fontSize: TYPE.small, color: "text.secondary" }}>
            Active: {Object.values(draftColumnFilters).filter((filter) => isFilterStateActive(filter)).length}
          </Typography>
        </Stack>

        <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5 }}>
          <Stack spacing={1.5}>
            {columns.map((column) => {
              const draftFilter = getDraftColumnFilter(column.key);
              const isActive = isFilterStateActive(draftFilter);

              return (
                <Box
                  key={column.key}
                  data-testid={`filter-card-${column.key}`}
                  ref={(node) => {
                    filterPanelFieldRefs.current[column.key] = node;
                  }}
                  sx={{
                    borderRadius: "5.25px", border: "1px solid", px: 1.5, py: 1.5,
                    borderColor: filterPanelFocusKey === column.key
                      ? "primary.main"
                      : isActive ? "warning.main" : "divider",
                    bgcolor: filterPanelFocusKey === column.key
                      ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.06)
                      : isActive
                        ? (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.06)
                        : "background.paper",
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{column.label}</Typography>
                    {isActive && (
                      <Button size="small" color="inherit" onClick={() => clearDraftColumnFilter(column.key)} sx={{ fontSize: TYPE.small, minWidth: 0, p: 0 }}>
                        Clear
                      </Button>
                    )}
                  </Stack>
                  <Stack spacing={1}>
                    <Select
                      size="small"
                      fullWidth
                      value={draftFilter.operator}
                      onChange={(event) =>
                        setDraftColumnFilter(column.key, { operator: event.target.value })
                      }
                      sx={{ fontSize: 12 }}
                    >
                      {FILTER_OPERATORS.map((op) => (
                        <MenuItem key={op.value} value={op.value}>
                          {op.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {!INPUT_FREE_OPERATORS.has(draftFilter.operator) && (
                      <TextField
                        size="small"
                        fullWidth
                        value={draftFilter.value}
                        onChange={(event) =>
                          setDraftColumnFilter(column.key, { value: event.target.value })
                        }
                        placeholder={`Filter ${column.label}`}
                        sx={{ "& .MuiInputBase-input": { fontSize: 12 } }}
                      />
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end", borderTop: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Button size="small" variant="outlined" onClick={() => setShowFilterPanel(false)}>
            {filterPanelPinned ? "Close" : "Cancel"}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => applyColumnFilters(draftColumnFilters, { closePanel: !filterPanelPinned })}
          >
            Apply
          </Button>
        </Stack>
    </Box>
  );
  const filterPanelDocked = showFilterPanel && filterPanelPinned;

  return (
    <Box sx={{ minWidth: 0, ...erpControlSx, "& .MuiOutlinedInput-root": { borderRadius: controlBorderRadius }, ...(fillHeight ? { display: "flex", flex: 1, minHeight: 0, flexDirection: "column" } : {}) }}>
      <Stack
        direction="row"
        spacing={compact ? 0.75 : 1}
        sx={{ mb: compact ? 1 : 2, flexWrap: "wrap", alignItems: "center", rowGap: compact ? 0.75 : 1 }}
      >
        <Select
          size="small"
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          sx={{ width: 176, ...toolbarFieldSx, "& .MuiSelect-select": { display: "flex", alignItems: "center", height: "100% !important", boxSizing: "border-box" } }}
        >
          <MenuItem value="all">All Fields</MenuItem>
          {columns.map((column) => (
            <MenuItem key={column.key} value={column.key}>
              {column.label}
            </MenuItem>
          ))}
        </Select>
        <Box sx={{ flex: 1, position: "relative", minWidth: 160 }}>
          <TextField
            size="small"
            fullWidth
            type={isSearchFieldDate ? "date" : "text"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            sx={{
              "& .MuiInputBase-root": { height: toolbarFieldHeight, boxSizing: "border-box" },
              "& .MuiInputBase-input": { fontSize: compact ? 11 : 12, pr: searchQuery ? 3.5 : 1.5 },
            }}
          />
          {searchQuery && (
            <IconButton
              size="small"
              aria-label="Clear search"
              onClick={() => {
                setSearchQuery("");
                if (enableServerSearch) {
                  runImmediateServerSearch("", searchField, hasActiveColumnFilters);
                }
              }}
              sx={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", color: "text.disabled" }}
            >
              <X size={14} />
            </IconButton>
          )}
        </Box>
        {/* Kept as a native <button>, not a MUI Button -- searchButtonClassName is a public prop 27
            other pages rely on with a plain hardcoded className (only 15 pass .glass-btn); swapping
            the element risks the same MUI-base-style-wins-the-cascade fight Stage A found and fixed
            for .glass-btn specifically, but unverified for the other 27 pages' arbitrary classNames. */}
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
          className={searchButtonClassName}
          style={{ ...compactActionStyle, ...searchButtonStyle }}
        >
          <Search size={12} style={{marginRight: 4}} /> Search
        </button>
        <Button
          size="small"
          variant="text"
          className={hasActiveColumnFilters ? "glass-btn glass-btn-primary" : "glass-btn"}
          onClick={() => openFilterPanel()}
          startIcon={<Filter size={14} />}
          sx={toolbarFieldSx}
        >
          Filter
          {hasActiveColumnFilters && (
            <Box component="span" sx={{ ml: 0.75, borderRadius: 10, bgcolor: "primary.main", color: "primary.contrastText", px: 0.75, fontSize: TYPE.small, fontWeight: 500 }}>
              {Object.values(columnFilters).filter((filter) => isFilterStateActive(filter)).length}
            </Box>
          )}
        </Button>
        {excludedRowFilterCount > 0 && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => clearRowValueFilterMode("exclude")}
            sx={toolbarFieldSx}
          >
            Clear Filter Out
            <Box component="span" sx={{ ml: 0.75, borderRadius: 10, bgcolor: "error.main", color: "error.contrastText", px: 0.75, fontSize: TYPE.small, fontWeight: 500 }}>
              {excludedRowFilterCount}
            </Box>
          </Button>
        )}
        {includedRowFilterCount > 0 && (
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={() => clearRowValueFilterMode("include")}
            sx={toolbarFieldSx}
          >
            Clear Show Matching
            <Box component="span" sx={{ ml: 0.75, borderRadius: 10, bgcolor: "success.main", color: "success.contrastText", px: 0.75, fontSize: TYPE.small, fontWeight: 500 }}>
              {includedRowFilterCount}
            </Box>
          </Button>
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
      </Stack>

      {/* Bulk action bar */}
      {enableSelection && selectedRows.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center", borderRadius: "1.75px", border: "1px solid", borderColor: "primary.main",
            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
            px: 1.25, fontSize: TYPE.small, mb: compact ? 1.5 : 2, py: compact ? 0.5 : 0.75,
          }}
        >
          <Typography sx={{ fontSize: TYPE.small, fontWeight: 500, color: "primary.main" }}>
            {selectedRows.length} row{selectedRows.length > 1 ? "s" : ""} selected
          </Typography>
          {onBulkDelete && (
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<Trash2 size={12} />}
              onClick={() => onBulkDelete(selectedRows)}
              sx={{ fontSize: TYPE.small }}
            >
              Delete Selected
            </Button>
          )}
          <Button size="small" variant="outlined" color="inherit" onClick={() => onSelectionChange([])} sx={{ fontSize: TYPE.small }}>
            Clear Selection
          </Button>
        </Stack>
      )}

      <Box
        data-testid="table-and-filter-panel"
        sx={filterPanelDocked
          ? { display: "flex", gap: 1, minWidth: 0, ...(fillHeight ? { flex: 1, minHeight: 0 } : {}) }
          : { display: "contents" }}
      >
      <TableContainer
        ref={tableContainerRef}
        data-scrollbar-visible={autoHideScrollbars ? scrollbarsVisible : undefined}
        tabIndex={autoHideScrollbars ? 0 : undefined}
        role={autoHideScrollbars ? "region" : undefined}
        aria-label={autoHideScrollbars ? "Scrollable table results" : undefined}
        onScroll={autoHideScrollbars ? revealScrollbars : undefined}
        onPointerEnter={autoHideScrollbars ? revealScrollbars : undefined}
        onPointerMove={autoHideScrollbars ? revealScrollbars : undefined}
        onFocusCapture={autoHideScrollbars ? revealScrollbars : undefined}
        className={compact ? "compact-data-table" : ""}
        sx={{
          border: "1px solid", borderColor: "divider", borderRadius: "1.75px", overflow: "auto",
          bgcolor: "background.paper", color: "text.secondary",
          ...tableViewportSx,
          ...(filterPanelDocked ? { flex: 1, minWidth: 0 } : {}),
          ...(autoHideScrollbars ? {
            scrollbarGutter: "stable",
            scrollbarColor: "transparent transparent",
            "&::-webkit-scrollbar-thumb, &:hover::-webkit-scrollbar-thumb": { backgroundColor: "transparent" },
            '&[data-scrollbar-visible="true"]': { scrollbarColor: "rgba(100, 116, 139, 0.6) transparent" },
            '&[data-scrollbar-visible="true"]::-webkit-scrollbar-thumb': { backgroundColor: "rgba(100, 116, 139, 0.6)" },
          } : {}),
        }}
        style={tableViewportStyle}
      >
        <Table
          stickyHeader={fixedHeight}
          sx={{ width: "100%", minWidth: "max-content", bgcolor: "background.paper", color: "text.secondary", ...tableTextSx }}
        >
          <TableHead sx={{ position: fixedHeight ? "sticky" : undefined, top: fixedHeight ? 0 : undefined, zIndex: fixedHeight ? 30 : undefined, bgcolor: (theme) => (theme.palette.mode === "dark" ? "#374151" : "#f3f4f6"), color: "text.secondary" }}>
            <TableRow>
              <TableCell
                ref={leadingHeaderRef}
                // z-index as an inline style, not just the `z-30` class: when fixedHeight enables
                // MUI's stickyHeader, MUI's own injected CSS for .MuiTableCell-stickyHeader sets
                // z-index too, and (same specificity, injected later) wins over the Tailwind class
                // -- silently dropping this corner cell to z-index 2, below a pinned column's
                // inline zIndex:25. An inline style always wins regardless of stylesheet order.
                style={{ position: "sticky", left: 0, zIndex: 30 }}
                sx={{
                  ...headerCellSx, ...cellBorderSx, ...headerCellYSx,
                  px: 1, textAlign: "left", color: "text.secondary",
                  width: enableSelection ? selectionColumnWidthPx : 36,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box
                    component="button"
                    type="button"
                    title="Select visible columns"
                    onClick={handleOpenColumnDialog}
                    sx={{ display: "inline-flex", color: "text.secondary", transition: "color 0.15s", "&:hover": { color: "primary.main" } }}
                  >
                    <Settings2 size={14} />
                  </Box>
                  {enableSelection && onSelectionChange && !singleSelection && (
                    <Checkbox
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      size="small"
                      sx={{ p: 0.25 }}
                      slotProps={{ input: { title: "Select all on this page", "aria-checked": somePageSelected && !allPageSelected ? "mixed" : allPageSelected } }}
                    />
                  )}
                </Box>
              </TableCell>
              {visibleColumnDefs.map((column) => (
                <TableCell
                  key={column.key}
                  ref={(node) => {
                    headerCellRefs.current[column.key] = node;
                  }}
                  style={{
                    ...(fixedHeight ? { position: "sticky", top: 0 } : {}),
                    ...getStickyCellStyle(column.key, true),
                    ...(columnWidths[column.key] ? { width: columnWidths[column.key] } : null),
                  }}
                  sx={{
                    ...headerCellSx, ...cellBorderSx, ...headerCellYSx,
                    px: 1.5, textAlign: "left", color: "text.secondary",
                    position: fixedHeight ? "sticky" : "relative", whiteSpace: "nowrap", userSelect: "none",
                    ...(getColumnPinSide(column.key) ? { boxShadow: getPinEdgeShadow(column.key) } : null),
                  }}
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
                  <Box
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5,
                      ...(columnWidths[column.key] ? { maxWidth: Math.max(columnWidths[column.key] - 24, 16), overflow: "hidden" } : null),
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                      {getColumnPinSide(column.key) && (
                        <Pin
                          size={12}
                          style={{ color: "#d97706", flexShrink: 0, transform: getColumnPinSide(column.key) === "right" ? "scaleX(-1)" : undefined }}
                          aria-label={`Pinned ${getColumnPinSide(column.key)}`}
                        />
                      )}
                      {groupByColumn === column.key && (
                        <Layers
                          size={12}
                          style={{ color: "#2563eb" }}
                          title={`Grouped by ${column.label}`}
                        />
                      )}
                      {enableColumnReorder && (
                        <GripVertical size={12} style={{ color: "#94a3b8", cursor: "grab" }} />
                      )}
                      <Box
                        component="button"
                        type="button"
                        title={`Sort ${column.label}`}
                        onClick={() => toggleSort(column.key)}
                        sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, textAlign: "left", transition: "color 0.15s", "&:hover": { color: "primary.main" } }}
                      >
                        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>{column.label}</Box>
                        <Box component="span" sx={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
                          <ChevronUp
                            size={12}
                            style={{
                              marginBottom: -4,
                              color: sortColumn === column.key && sortDirection === "asc" ? undefined : "#d1d5db",
                            }}
                          />
                          <ChevronDown
                            size={12}
                            style={{
                              color: sortColumn === column.key && sortDirection === "desc" ? undefined : "#d1d5db",
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                      <Box
                        component="button"
                        type="button"
                        title={`Filter ${column.label}`}
                        onClick={(e) => toggleColumnFilterPopup(column.key, e.currentTarget)}
                        aria-label={`Filter ${column.label}`}
                        sx={{
                          transition: "color 0.15s, opacity 0.15s",
                          color: isFilterActive(column.key) ? "primary.main" : "text.disabled",
                          "&:hover": { color: isFilterActive(column.key) ? "primary.dark" : "text.secondary" },
                          opacity: isFilterActive(column.key) || activeFilterColumn === column.key ? 1 : 0,
                          "th:hover &, &:focus-visible": { opacity: 1 },
                          // Touch screens have no hover: keep it visible there.
                          "@media (hover: none)": { opacity: 1 },
                        }}
                      >
                        <Filter size={14} />
                      </Box>
                    </Box>
                  </Box>
                  {renderColumnFilterPopup(column)}
                  {enableColumnResize && (
                    <Box
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${column.label} column`}
                      title="Drag to resize, double-click to autosize"
                      draggable={false}
                      onMouseDown={(e) => handleResizeMouseDown(e, column.key)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleAutosizeColumn(column.key);
                      }}
                      sx={{
                        position: "absolute", right: 0, top: 0, height: "100%", width: 6,
                        cursor: "col-resize", userSelect: "none", zIndex: 10,
                        bgcolor: resizingColumnKey === column.key ? "rgba(59,130,246,0.6)" : "transparent",
                        "&:hover": { bgcolor: resizingColumnKey === column.key ? "rgba(59,130,246,0.6)" : "rgba(96,165,250,0.4)" },
                      }}
                    />
                  )}
                </TableCell>
              ))}
              {renderActions && <TableCell sx={{ px: 1.5, textAlign: "left", ...headerCellSx, ...headerCellYSx }}>{actionsLabel}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody sx={{ color: "text.secondary" }}>
            {showLoadingSkeleton ? (
              Array.from({ length: safeLimit }, (_, i) => (
                <TableRow key={`skel-${i}`} sx={{ ...rowBorderTopSx, animation: "app-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite", ...bodyRowSx }}>
                  <TableCell
                    sx={{
                      position: "sticky", left: 0, zIndex: 20, ...cellBorderSx, ...bodyCellYSx,
                      px: 1, bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1f2937" : "#fff"),
                    }}
                  >
                    <Skeleton variant="rounded" width={14} height={14} />
                  </TableCell>
                  {visibleColumnDefs.map((col) => (
                    <TableCell
                      key={col.key}
                      style={getStickyCellStyle(col.key)}
                      sx={{
                        ...cellBorderSx, ...bodyCellYSx, px: 1.5,
                        ...(getColumnPinSide(col.key)
                          ? {
                              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1f2937" : "#fff"),
                              boxShadow: getPinEdgeShadow(col.key),
                            }
                          : null),
                      }}
                    >
                      <Skeleton variant="text" width={`${45 + ((i * 17 + col.key.length * 7) % 40)}%`} />
                    </TableCell>
                  ))}
                  {renderActions && (
                    <TableCell sx={{ px: 1.5, ...bodyCellYSx }}>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Skeleton variant="rounded" width={14} height={14} />
                        <Skeleton variant="rounded" width={14} height={14} />
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (groupByColumn ? groupSummaryData.length === 0 : sortedRows.length === 0) ? (
              <TableRow>
                <TableCell colSpan={tableColSpan} sx={{ textAlign: "center", py: 2, color: "text.disabled", ...tableTextSx }}>
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* Pinned rows: always mounted (not part of rowsToRender/virtualization), each
                    cell sticky at the top (below the header) or the bottom of the scroll area --
                    the row-level equivalent of a pinned column's sticky left/right. */}
                {renderPinnedRows(pinnedTopEntries, "top")}
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
                      sx={{
                        ...rowBorderTopSx, ...bodyRowSx, ...focusRingSx,
                        bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(30,41,59,0.4)" : "#f8fafc"),
                      }}
                      {...rowKeyboardNavProps}
                    >
                      <TableCell colSpan={tableColSpan} sx={{ px: 1.5, ...bodyCellYSx, color: "text.secondary" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <IconButton
                            type="button"
                            size="small"
                            aria-expanded={item.expanded}
                            onClick={() => toggleGroupExpanded(item.groupKey)}
                            sx={{ "&:hover": { bgcolor: "action.hover" } }}
                          >
                            {item.expanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </IconButton>
                          <Box component="span" sx={{ fontWeight: 500 }}>
                            {columns.find((column) => column.key === groupByColumn)?.label || "Group"}: {item.label}
                          </Box>
                          <Box
                            component="span"
                            sx={{
                              borderRadius: "999px", px: 1, py: 0.25, fontSize: TYPE.small,
                              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"),
                              color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#334155"),
                            }}
                          >
                            {item.count} rows
                          </Box>
                          {item.aggregates && Object.keys(item.aggregates).length > 0 && (
                            <Box component="span" sx={{ fontSize: TYPE.small, color: (theme) => (theme.palette.mode === "dark" ? "#94a3b8" : "#475569") }}>
                              {Object.entries(item.aggregates)
                                .map(([columnKey, value]) => {
                                  const aggColumn = columns.find((column) => column.key === columnKey);
                                  return `${aggColumn?.label || columnKey}: ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                })
                                .join(" · ")}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                }

                if (item.type === "group-loader") {
                  return (
                    <TableRow
                      key={`grouploader-${item.groupKey}`}
                      sx={{
                        borderTop: 1, borderColor: (theme) => (theme.palette.mode === "dark" ? "divider" : "#f3f4f6"),
                        bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(30,41,59,0.2)" : "rgba(248,250,252,0.6)"),
                        ...bodyRowSx,
                      }}
                    >
                      <TableCell colSpan={tableColSpan} sx={{ px: 1.5, ...bodyCellYSx }}>
                        {item.loading ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: TYPE.small, color: (theme) => (theme.palette.mode === "dark" ? "#94a3b8" : "#64748b") }}>
                            <Skeleton variant="text" width={120} />
                            <Box component="span">Loading rows…</Box>
                          </Box>
                        ) : item.error ? (
                          <Box component="span" sx={{ fontSize: TYPE.small, color: (theme) => (theme.palette.mode === "dark" ? "#f87171" : "#e11d48") }}>{item.error}</Box>
                        ) : item.hasMore ? (
                          <Box
                            component="button"
                            type="button"
                            onClick={() => loadMoreGroupRows(item.groupKey)}
                            sx={{
                              fontSize: TYPE.small, fontWeight: 500, color: "primary.main",
                              "&:hover": { color: "primary.dark" },
                            }}
                          >
                            Load more…
                          </Box>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                }

                const row = item.row;
                const key = getRowKey(row, item.sourceIndex);
                const isSelected = enableSelection && selectedRows.includes(key);
                const rowBgSx = isSelected
                  ? { bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(30,58,138,0.3)" : "#eff6ff") }
                  : item.isGroupedChild
                    ? { bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(30,41,59,0.4)" : "#f8fafc") }
                    : { bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1f2937" : "#fff") };
                const rowHoverSx = isSelected
                  ? { "&:hover": rowBgSx }
                  : item.isGroupedChild
                    ? { "&:hover": { bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(51,65,85,0.4)" : "#f1f5f9") } }
                    : { "&:hover": { bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(55,65,81,0.5)" : "#f9fafb") } };
                return (
                  <TableRow
                    key={key}
                    sx={{
                      ...rowBorderTopSx, ...bodyRowSx, ...rowBgSx, ...rowHoverSx,
                      cursor: onRowClick ? "pointer" : undefined,
                      ...focusRingSx,
                    }}
                    onClick={onRowClick ? (event) => {
                      if (event.button !== 0) return;
                      if (enableKeyboardNav) setActiveRowIndex(displayIndex);
                      onRowClick(row);
                    } : undefined}
                    {...rowKeyboardNavProps}
                  >
                    <TableCell sx={{ position: "sticky", left: 0, zIndex: 20, ...cellBorderSx, px: 1, ...bodyCellYSx, color: "text.secondary", ...rowBgSx }}>
                      {enableSelection && onSelectionChange && (
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(key, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          slotProps={{ input: { "aria-label": typeof getRowSelectionLabel === "function" ? getRowSelectionLabel(row) : "Select row" } }}
                          size="small"
                          sx={{ p: 0.25 }}
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
                          sx={{
                            ...cellBorderSx, px: 1.5, ...bodyCellYSx, whiteSpace: "nowrap", color: "text.secondary",
                            ...(getColumnPinSide(column.key)
                              ? {
                                  ...rowBgSx,
                                  boxShadow: getPinEdgeShadow(column.key),
                                }
                              : null),
                          }}
                          onContextMenu={(event) => openRowContextMenu(event, column, row, item.sourceIndex)}
                        >
                          {renderSizedCellContent(column.key, item.isGroupedChild && column.key === groupByColumn ? (
                            <Box sx={{ pl: 3 }}>{content}</Box>
                          ) : content)}
                        </TableCell>
                      );
                    })}
                    {renderActions && (
                      <TableCell sx={{ px: 1.5, ...bodyCellYSx, color: "text.secondary" }} onClick={(e) => e.stopPropagation()}>
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
                {renderPinnedRows(pinnedBottomEntries, "bottom")}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {filterPanelDocked && (
        // Positioned content: the panel takes the table's height instead of growing with its column list.
        <Box
          component="aside"
          aria-label="Filter panel"
          sx={{
            position: "relative", flexShrink: 0, width: filterPanelWidth, maxWidth: "45%", minHeight: 360,
            border: "1px solid", borderColor: "divider", borderRadius: "1.75px", bgcolor: "background.paper",
            ...(controlBorderRadius ? { "& .MuiOutlinedInput-root": { borderRadius: controlBorderRadius } } : {}),
          }}
        >
          <Box sx={{ position: "absolute", inset: 0 }}>{filterPanelBody}</Box>
        </Box>
      )}
      </Box>

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
          {/* Pin column opens its choices to the side (hover, click or →) instead of listing them inline. */}
          <MenuItem
            aria-haspopup="menu"
            aria-expanded={Boolean(headerContextMenu.pinAnchor)}
            onMouseEnter={(event) => openPinSubmenu(event.currentTarget)}
            onClick={(event) => openPinSubmenu(event.currentTarget)}
            onKeyDown={(event) => { if (event.key === "ArrowRight") openPinSubmenu(event.currentTarget); }}
            selected={Boolean(headerContextMenu.pinAnchor)}
            sx={{ gap: 1, fontSize: TYPE.body }}
          >
            <Pin size={14} style={{ color: "#d97706" }} />
            Pin column
            <Box component="span" sx={{ ml: "auto", pl: 2, color: "text.secondary", fontSize: TYPE.small }}>
              {headerContextMenu.pinSide === "left" ? "Left" : headerContextMenu.pinSide === "right" ? "Right" : ""}
            </Box>
            <ChevronRight size={14} />
          </MenuItem>
          <Menu
            open={Boolean(headerContextMenu.pinAnchor)}
            anchorEl={headerContextMenu.pinAnchor}
            onClose={closePinSubmenu}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            // Not modal: the main menu stays hoverable, so moving to another item closes this one.
            hideBackdrop
            disableAutoFocus
            disableEnforceFocus
            disableRestoreFocus
            sx={{ pointerEvents: "none" }}
            slotProps={{
              paper: {
                className: "min-w-[130px] py-1",
                sx: { pointerEvents: "auto", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1, boxShadow: 4 },
              },
              list: { onKeyDown: (event) => { if (event.key === "ArrowLeft" || event.key === "Escape") closePinSubmenu(); } },
            }}
          >
            {[
              [null, "No pin"],
              ["left", "Pin left"],
              ["right", "Pin right"],
            ].map(([side, label]) => (
              <MenuItem
                key={label}
                role="menuitemradio"
                aria-checked={headerContextMenu.pinSide === side}
                selected={headerContextMenu.pinSide === side}
                onClick={() => handleSetColumnPin(headerContextMenu.columnKey, side)}
                sx={{ gap: 1, fontSize: TYPE.body }}
              >
                <ListItemIcon sx={{ minWidth: "18px !important" }}>
                  {headerContextMenu.pinSide === side ? <Check size={14} /> : null}
                </ListItemIcon>
                {label}
              </MenuItem>
            ))}
          </Menu>
          {/* Pin rows: the ticked rows go to the top or bottom (a single row can also be pinned from its right-click menu). */}
          <MenuItem
            aria-haspopup="menu"
            aria-expanded={Boolean(headerContextMenu.rowPinAnchor)}
            onMouseEnter={(event) => openHeaderRowPinSubmenu(event.currentTarget)}
            onClick={(event) => openHeaderRowPinSubmenu(event.currentTarget)}
            onKeyDown={(event) => { if (event.key === "ArrowRight") openHeaderRowPinSubmenu(event.currentTarget); }}
            selected={Boolean(headerContextMenu.rowPinAnchor)}
            sx={{ gap: 1, fontSize: TYPE.body }}
          >
            <Pin size={14} style={{ color: "#d97706", transform: "rotate(90deg)" }} />
            Pin rows
            <Box component="span" sx={{ ml: "auto", pl: 2, color: "text.secondary", fontSize: TYPE.small }}>
              {selectedRowKeys.length > 0 ? `${selectedRowKeys.length} ticked` : pinnedKeySet.size > 0 ? `${pinnedKeySet.size} pinned` : ""}
            </Box>
            <ChevronRight size={14} />
          </MenuItem>
          <Menu
            open={Boolean(headerContextMenu.rowPinAnchor)}
            anchorEl={headerContextMenu.rowPinAnchor}
            onClose={closePinSubmenu}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            hideBackdrop
            disableAutoFocus
            disableEnforceFocus
            disableRestoreFocus
            sx={{ pointerEvents: "none" }}
            slotProps={{
              paper: {
                className: "min-w-[150px] py-1",
                sx: { pointerEvents: "auto", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1, boxShadow: 4 },
              },
              list: { onKeyDown: (event) => { if (event.key === "ArrowLeft" || event.key === "Escape") closePinSubmenu(); } },
            }}
          >
            {selectedRowKeys.length > 0 ? (
              [
                [null, "No pin"],
                ["top", "Pin to top"],
                ["bottom", "Pin to bottom"],
              ].map(([side, label]) => (
                <MenuItem
                  key={label}
                  role="menuitemradio"
                  aria-checked={selectedRowsPinSide === side}
                  selected={selectedRowsPinSide === side}
                  onClick={() => handleSetSelectedRowsPin(side)}
                  sx={{ gap: 1, fontSize: TYPE.body }}
                >
                  <ListItemIcon sx={{ minWidth: "18px !important" }}>
                    {selectedRowsPinSide === side ? <Check size={14} /> : null}
                  </ListItemIcon>
                  {label}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled sx={{ fontSize: TYPE.small, whiteSpace: "normal", maxWidth: 220 }}>
                {enableSelection ? "Tick the rows to pin, or right-click a row" : "Right-click a row to pin it"}
              </MenuItem>
            )}
            {pinnedKeySet.size > 0 && <Divider sx={{ my: 0.5 }} />}
            {pinnedKeySet.size > 0 && (
              <MenuItem onClick={handleUnpinAllRows} sx={{ gap: 1, fontSize: TYPE.body }}>
                <ListItemIcon sx={{ minWidth: "18px !important" }} />
                Unpin all rows
              </MenuItem>
            )}
          </Menu>
          <Divider sx={{ my: 0.5 }} onMouseEnter={closePinSubmenu} />
          {enableColumnResize && (
            <MenuItem onMouseEnter={closePinSubmenu} onClick={() => handleAutosizeColumn(headerContextMenu.columnKey)} sx={{ gap: 1, fontSize: TYPE.body }}>
              <MoveHorizontal size={14} style={{ color: "#0d9488" }} />
              Autosize this column
            </MenuItem>
          )}
          {enableColumnResize && (
            <MenuItem onMouseEnter={closePinSubmenu} onClick={handleAutosizeAllColumns} sx={{ gap: 1, fontSize: TYPE.body }}>
              <MoveHorizontal size={14} style={{ color: "#0d9488" }} />
              Autosize all columns
            </MenuItem>
          )}
          <MenuItem
            onMouseEnter={closePinSubmenu}
            onClick={() => {
              setHeaderContextMenu(null);
              handleOpenColumnDialog();
            }}
            sx={{ gap: 1, fontSize: TYPE.body }}
          >
            <Columns3 size={14} style={{ color: "#64748b" }} />
            Choose columns
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          {(typeof onFetchGroupSummaries === "function" || canClientGroup || headerContextMenu.isGrouped) && (
            <MenuItem
              onMouseEnter={closePinSubmenu}
              onClick={() => (
                headerContextMenu.isGrouped
                  ? handleUngroupColumn()
                  : handleGroupByColumn(headerContextMenu.columnKey)
              )}
              sx={{ gap: 1, fontSize: TYPE.body }}
            >
              <Filter size={14} style={{ color: "#2563eb" }} />
              {headerContextMenu.isGrouped ? "Ungroup" : "Group By"}
            </MenuItem>
          )}
          <MenuItem
            onMouseEnter={closePinSubmenu}
            onClick={() => openFilterPanel(headerContextMenu.columnKey)}
            sx={{ gap: 1, fontSize: TYPE.body }}
          >
            <Filter size={14} style={{ color: "#2563eb" }} />
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
          <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1.5, py: 1 }}>
            <Typography sx={{ fontSize: TYPE.small, fontWeight: 600 }}>{rowContextMenu.label}</Typography>
            <Typography noWrap sx={{ fontSize: TYPE.small, color: "text.secondary" }}>{rowContextMenu.displayValue}</Typography>
          </Box>
          <MenuItem
            aria-haspopup="menu"
            aria-expanded={Boolean(rowContextMenu.pinAnchor)}
            onMouseEnter={(event) => openRowPinSubmenu(event.currentTarget)}
            onClick={(event) => openRowPinSubmenu(event.currentTarget)}
            onKeyDown={(event) => { if (event.key === "ArrowRight") openRowPinSubmenu(event.currentTarget); }}
            selected={Boolean(rowContextMenu.pinAnchor)}
            sx={{ gap: 1, fontSize: 12 }}
          >
            <Pin size={14} style={{ color: "#d97706" }} />
            Pin row
            <Box component="span" sx={{ ml: "auto", pl: 2, color: "text.secondary", fontSize: TYPE.small }}>
              {rowContextMenu.pinSide === "top" ? "Top" : rowContextMenu.pinSide === "bottom" ? "Bottom" : ""}
            </Box>
            <ChevronRight size={14} />
          </MenuItem>
          <Menu
            open={Boolean(rowContextMenu.pinAnchor)}
            anchorEl={rowContextMenu.pinAnchor}
            onClose={closeRowPinSubmenu}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            // Not modal, like the column pin submenu: moving to another item closes this one.
            hideBackdrop
            disableAutoFocus
            disableEnforceFocus
            disableRestoreFocus
            sx={{ pointerEvents: "none" }}
            slotProps={{
              paper: {
                className: "min-w-[140px] py-1",
                sx: { pointerEvents: "auto", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1, boxShadow: 4 },
              },
              list: { onKeyDown: (event) => { if (event.key === "ArrowLeft" || event.key === "Escape") closeRowPinSubmenu(); } },
            }}
          >
            {[
              [null, "No pin"],
              ["top", "Pin to top"],
              ["bottom", "Pin to bottom"],
            ].map(([side, label]) => (
              <MenuItem
                key={label}
                role="menuitemradio"
                aria-checked={rowContextMenu.pinSide === side}
                selected={rowContextMenu.pinSide === side}
                onClick={() => handleSetRowPin(rowContextMenu.rowKeyValue, rowContextMenu.row, side)}
                sx={{ gap: 1, fontSize: TYPE.body }}
              >
                <ListItemIcon sx={{ minWidth: "18px !important" }}>
                  {rowContextMenu.pinSide === side ? <Check size={14} /> : null}
                </ListItemIcon>
                {label}
              </MenuItem>
            ))}
          </Menu>
          <MenuItem
            onMouseEnter={closeRowPinSubmenu}
            onClick={() => applyRowValueFilter("exclude", rowContextMenu.columnKey, rowContextMenu.rawValue)}
            sx={{ fontSize: 12 }}
          >
            Filter Out
          </MenuItem>
          <MenuItem
            onMouseEnter={closeRowPinSubmenu}
            onClick={() => applyRowValueFilter("include", rowContextMenu.columnKey, rowContextMenu.rawValue)}
            sx={{ fontSize: 12 }}
          >
            Show Matching
          </MenuItem>
        </Menu>
      )}

      {/* Surface 3 (filter panel) also gets a slide-in transition for the first time here -- new
          vs. today's instant mount/unmount, another intentional, accepted improvement. */}
      <Drawer
        anchor="right"
        open={showFilterPanel && !filterPanelPinned}
        onClose={() => setShowFilterPanel(false)}
        slotProps={{
          paper: {
            sx: {
              width: "100%",
              maxWidth: filterPanelWidth,
              bgcolor: "background.paper",
              ...(controlBorderRadius ? { "& .MuiOutlinedInput-root": { borderRadius: controlBorderRadius } } : {}),
            },
          },
          backdrop: {
            sx: { bgcolor: "rgba(0, 0, 0, 0.1)" },
          },
        }}
      >
        {filterPanelPinned ? null : filterPanelBody}
      </Drawer>

      {canPaginate && (
        <TablePaginationFooter
          limit={safeLimit}
          onLimitChange={onLimitChange}
          totalLabel={isGroupPaged
            ? `${computedTotalRows.toLocaleString()} groups · ${groupMatchingRows.toLocaleString()} rows total`
            : isCursorMode
              ? (pagination?.estimated_total ? `Total: ~${Number(pagination.estimated_total).toLocaleString()}` : `Showing ${rows.length} rows`)
              : `Total: ${computedTotalRows}`}
          page={currentPage}
          totalPages={safeTotalPages}
          pageOptions={pageOptions}
          canJump={allowPageJump}
          cursor={isCursorMode && !isGroupPaged}
          append={isAppendCursorMode}
          hasPrev={hasPrev}
          hasNext={hasNext}
          busy={paginationBusy}
          loading={loading}
          onPrevious={handlePrevPage}
          onNext={handleNextPage}
          onPageChange={isGroupPaged
            ? (page) => setGroupSummaryState((prev) => ({ ...prev, page }))
            : onPageChange}
        />
      )}

      <ColumnPersonalizerDialog
        key={columnDialogSession.key}
        open={showColumnDialog}
        columns={columns}
        initialSelected={columnDialogSession.initialSelected}
        saving={savingColumnPrefs}
        onClose={() => setShowColumnDialog(false)}
        onApply={handleApplyColumns}
        onReset={handleResetColumnDefaults}
      />
    </Box>
  );
}
