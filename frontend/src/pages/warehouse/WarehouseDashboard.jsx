import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  FileText,
  Package,
  Barcode,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings2,
  X,
  Eye,
  Pencil,
  Trash2,
  GripVertical,
} from "lucide-react";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchableSelect from "../../components/SearchableSelect";
import Toast from "../../components/Toast";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Box, Stack, Typography, IconButton, Button, alpha } from "@mui/material";

// Workflow steps in order
const WORKFLOW_STEPS = [
  { key: "lr_entry", label: "LR Entry", path: "/warehouse/transport-entry", icon: Truck },
  { key: "invoice", label: "Invoice", path: "/warehouse/invoice", icon: FileText },
  { key: "add_product", label: "Add Product", path: "/warehouse/inventory-entry", icon: Package },
  { key: "barcode", label: "Barcode", path: "/warehouse/barcode", icon: Barcode },
];

const LORRY_WORKFLOW_STEPS = [
  { key: "lr_entry", label: "LR Entry", path: "/warehouse/transport-entry", icon: Truck },
  { key: "issue", label: "Issue", path: "/warehouse/transport-issue", icon: FileText },
  { key: "receipt", label: "Receipt", path: "/warehouse/transport-receipt", icon: Package },
  { key: "invoice", label: "Invoice", path: "/warehouse/invoice", icon: FileText },
  { key: "add_product", label: "Add Product", path: "/warehouse/inventory-entry", icon: Package },
  { key: "barcode", label: "Barcode", path: "/warehouse/barcode", icon: Barcode },
];

// Current status -> which button index becomes enabled next
const STATUS_TO_NEXT_STEP = {
  lr_entry: "invoice",
  invoice_generated: "add_product",
  product_added: "barcode",
};

const STATUS_LABELS = {
  lr_entry: "LR Entry",
  issue_generated: "Issue Generated",
  receipt_generated: "Receipt Generated",
  invoice_generated: "Invoice Generated",
  product_added: "Product Added",
  barcode_generated: "Barcode Generated",
  completed: "Completed",
  cancelled: "Cancelled",
  pending: "Pending",
};

const PURPLE = "#9333ea";
const CYAN = "#0891b2";

// Semantic status -> MUI palette key ("purple"/"cyan" are literal-hex decorative accents, not MUI palette keys).
const STATUS_TONE = {
  lr_entry: "primary",
  issue_generated: "warning",
  receipt_generated: "cyan",
  invoice_generated: "success",
  product_added: "purple",
  barcode_generated: "neutral",
  completed: "success",
  cancelled: "error",
};

const statusChipSx = (status) => (theme) => {
  const tone = STATUS_TONE[status] || "neutral";
  if (tone === "purple") return { bgcolor: alpha(PURPLE, theme.palette.mode === "dark" ? 0.16 : 0.1), color: PURPLE };
  if (tone === "cyan") return { bgcolor: alpha(CYAN, theme.palette.mode === "dark" ? 0.16 : 0.1), color: CYAN };
  if (tone === "neutral") return { bgcolor: "action.hover", color: "text.secondary" };
  return { bgcolor: alpha(theme.palette[tone].main, theme.palette.mode === "dark" ? 0.16 : 0.1), color: `${tone}.main` };
};

const STATUS_ICON_MAP = {
  lr_entry: { icon: Truck, color: "primary.main", title: "LR No" },
  issue_generated: { icon: FileText, color: "warning.main", title: "Issue" },
  receipt_generated: { icon: Package, color: CYAN, title: "Receipt" },
  invoice_generated: { icon: FileText, color: "success.main", title: "Invoice" },
  product_added: { icon: Package, color: PURPLE, title: "Product Added" },
  barcode_generated: { icon: Barcode, color: "warning.main", title: "Barcode Generated" },
  pending: { icon: Barcode, color: "warning.main", title: "Barcode Generated" },
  completed: { icon: Barcode, color: "warning.main", title: "Barcode Generated" },
  cancelled: { icon: Truck, color: "primary.main", title: "LR No" },
};

const RAW_INITIAL_COLUMNS = [
  { key: "lr_entry_no", label: "LR Entry No", width: 100 },
  { key: "workflow_icons", label: "Icon", width: 68 },
  { key: "lr_no", label: "LR No", width: 90 },
  { key: "lr_date", label: "LR Date", width: 100 },
  { key: "company", label: "Company", width: 160 },
  { key: "supplier", label: "Supplier", width: 140 },
  { key: "purchase_manager", label: "Purchase Manager", width: 150 },
  { key: "lr_mode", label: "LR Mode", width: 110 },
  { key: "agent", label: "Agent", width: 130 },
  { key: "no_of_pieces", label: "No of Pieces", width: 120 },
  { key: "no_of_boxes", label: "No of Boxes", width: 120 },
  { key: "fromCity", label: "From City", width: 100 },
  { key: "receivingCity", label: "Receiving City", width: 120 },
  { key: "pay_mode", label: "LR Pay Mode", width: 120 },
  { key: "invoice_pay_mode", label: "INVOICE Pay Mode", width: 150 },
  { key: "no_of_bundles", label: "Bundles", width: 75 },
  { key: "goods_value", label: "Goods Value", width: 100 },
  { key: "files", label: "Files", width: 220 },
  { key: "status", label: "Status", width: 140 },
];

const HEADER_LABEL_CHAR_WIDTH = 8.6;
const HEADER_CHROME_WIDTH = 86; // drag handle + sort/filter buttons + spacing
const MIN_COLUMN_WIDTH_FLOOR = 86;

const getColumnMinWidth = (label) =>
  Math.max(
    MIN_COLUMN_WIDTH_FLOOR,
    Math.ceil(String(label || "").length * HEADER_LABEL_CHAR_WIDTH + HEADER_CHROME_WIDTH)
  );

const INITIAL_COLUMNS = RAW_INITIAL_COLUMNS.map((column) => {
  const minWidth = getColumnMinWidth(column.label);
  return {
    ...column,
    minWidth,
    width: Math.max(column.width, minWidth),
  };
});

const DEFAULT_VISIBLE_COLUMN_KEYS = [
  "lr_entry_no",
  "lr_no",
  "lr_date",
  "company",
  "supplier",
  "lr_mode",
  "no_of_bundles",
  "goods_value",
  "files",
  "status",
];

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "lr_entry", label: "LR" },
  { key: "issue_generated", label: "Issue generated" },
  { key: "receipt_generated", label: "Receipt generated" },
  { key: "invoice_generated", label: "Invoice generated" },
  { key: "product_added", label: "Product added" },
  { key: "barcode_generated", label: "Bar code generated" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const SEARCH_FIELDS = [
  { key: "all", label: "All" },
  { key: "company", label: "Company" },
  { key: "supplier", label: "Supplier" },
  { key: "status", label: "Status" },
  { key: "entry_type", label: "Entry Type" },
  { key: "lr_no", label: "LR Number" },
  { key: "lr_entry_no", label: "LR Entry No" },
  { key: "invoice_no", label: "Invoice Number" },
  { key: "barcode", label: "Barcode" },
  { key: "lr_date", label: "LR Date" },
  { key: "mode", label: "Mode" },
  { key: "from_location", label: "From Location" },
  { key: "received_by", label: "Received By" },
];

const PENDING_STATUSES = [
  "lr_entry",
  "issue_generated",
  "receipt_generated",
  "invoice_generated",
  "product_added",
  "barcode_generated",
  "pending",
];
const FILTER_DEFAULT = { operator: "contains", value: "" };
const INPUT_FREE_OPERATORS = new Set(["blank", "not_blank"]);
const isEffectivelyBlank = (value) => {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  if (text === "") return true;
  return text === "--" || text === "-";
};
const FILTER_OPERATORS = [
  { value: "contains", label: "Contain" },
  { value: "not_contains", label: "Does not contain" },
  { value: "equal", label: "Equal" },
  { value: "not_equal", label: "Does not equal" },
  { value: "begins_with", label: "Begins with" },
  { value: "ends_with", label: "Ends with" },
  { value: "blank", label: "Blank" },
  { value: "not_blank", label: "Not blank" },
];

const toAbsoluteUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;

  const apiBase = String(api?.defaults?.baseURL || "").trim();
  const apiBaseIsAbsolute = /^https?:\/\//i.test(apiBase);

  try {
    if (apiBaseIsAbsolute) return new URL(raw, apiBase).toString();
    return new URL(raw, window.location.origin).toString();
  } catch {
    return raw;
  }
};

const resolveAttachmentUrl = (attachment) => {
  if (!attachment) return "";
  if (attachment.file_url) return toAbsoluteUrl(attachment.file_url);
  if (attachment.file_path) return toAbsoluteUrl(`/api/uploads/transport-entries/${attachment.file_path}`);
  return "";
};

const hasGeneratedDirectPurchaseBarcode = (entry) => {
  // barcodes_count is a real backend-computed count (barcodes.direct_purchase_id) -
  // the previous check (item.barcode_id/barcodeId/barcodeRef.barcode) read fields
  // that don't exist anywhere in the data model, so it was always false and the
  // dashboard status could never progress past "Product Added".
  return Number(entry?.barcodes_count ?? entry?.barcodesCount ?? 0) > 0;
};

const getSnapshotLabel = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text && text !== "-" && text.toLowerCase() !== "unknown") {
      return text;
    }
  }
  return "-";
};

const withSnapshotRef = (ref, id, fallbackName) => {
  const name = getSnapshotLabel(ref?.name, fallbackName);
  if (name === "-") {
    return ref || null;
  }
  return {
    ...(ref || {}),
    ...(id ? { id } : {}),
    name,
  };
};

const mapDirectPurchaseWorkflowToDashboardStatus = (entry) => {
  const workflowStatus = entry?.invoice_workflow_status ?? entry?.invoiceWorkflowStatus;
  const normalized = String(workflowStatus || "").trim().toLowerCase();
  const hasBarcode = hasGeneratedDirectPurchaseBarcode(entry);
  if (normalized === "invoice_progress") {
    return hasBarcode ? "barcode_generated" : "product_added";
  }
  if (normalized === "invoice_completed") {
    return hasBarcode ? "completed" : "product_added";
  }
  if (normalized === "temporary") {
    return "product_added";
  }
  return hasBarcode ? "completed" : "product_added";
};

const groupRowsByTransportEntryId = (rows) =>
  rows.reduce((map, row) => {
    const transportEntryId = Number(row?.transport_entry_id ?? row?.transportEntryId ?? 0);
    if (!transportEntryId) return map;
    const key = String(transportEntryId);
    const current = map.get(key) || [];
    current.push(row);
    map.set(key, current);
    return map;
  }, new Map());

const deriveTransportEntryDashboardStatus = (entry, linkedInventoryEntries = []) => {
  const normalizedStatus = String(entry?.status || "").trim().toLowerCase();
  if (["cancelled", "completed", "barcode_generated", "product_added"].includes(normalizedStatus)) {
    return normalizedStatus;
  }
  return linkedInventoryEntries.length > 0 ? "product_added" : normalizedStatus || "lr_entry";
};

const normalizeTransportEntryForDashboard = (entry, linkedInventoryEntries = []) => ({
  ...entry,
  dashboardKey: `transport-entry-${entry.id}`,
  entry_source: "transport_entry",
  status: deriveTransportEntryDashboardStatus(entry, linkedInventoryEntries),
});

const normalizeDirectPurchaseForDashboard = (entry) => ({
  ...entry,
  dashboardKey: `direct-purchase-${entry.id}`,
  entry_source: "direct_purchase",
  company: withSnapshotRef(entry.company, entry.company_id ?? entry.companyId, entry.company_name),
  supplier: withSnapshotRef(entry.supplier, entry.supplier_id ?? entry.supplierId, entry.supplier_name),
  status: mapDirectPurchaseWorkflowToDashboardStatus(entry),
  lr_entry_no: `DP-${entry.id}`,
  lr_no: entry.lr_no || entry.lrNo || entry.invoice_no || entry.invoiceNo || "-",
  lr_date: entry.lr_date || entry.lrDate || entry.invoice_date || entry.invoiceDate || entry.created_at || entry.createdAt || null,
  invoice_no: entry.invoice_no || entry.invoiceNo || "-",
  lr_mode: "Direct Purchase",
  no_of_bundles: Number(entry.bundles || 0),
  goods_value: Number(entry.total || 0),
  attachments: [],
  barcodes: (Array.isArray(entry.items) ? entry.items : [])
    .map((item) => item?.barcodeRef)
    .filter(Boolean),
});

const isLorryTransportEntry = (entry) =>
  entry?.entry_source === "transport_entry" &&
  String(entry?.lr_mode || "").trim().toLowerCase() === "lorry";

const getWorkflowSteps = (entry) => (isLorryTransportEntry(entry) ? LORRY_WORKFLOW_STEPS : WORKFLOW_STEPS);

const getNextStepKeyForEntry = (entry) => {
  if (!entry) return null;
  if (entry.entry_source === "direct_purchase") {
    return entry.status === "product_added" ? "barcode" : null;
  }

  if (isLorryTransportEntry(entry)) {
    const lorryStatusToNextStep = {
      lr_entry: "issue",
      issue_generated: "receipt",
      receipt_generated: "invoice",
      invoice_generated: "add_product",
      product_added: "barcode",
    };
    return lorryStatusToNextStep[entry.status] ?? null;
  }

  return STATUS_TO_NEXT_STEP[entry.status] ?? null;
};

const isDirectPurchaseBarcodeStage = (entry) =>
  entry?.entry_source === "direct_purchase"
  && ["barcode_generated", "completed"].includes(String(entry?.status || "").trim().toLowerCase());

const WarehouseDashboard = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() =>
    DEFAULT_VISIBLE_COLUMN_KEYS
  );
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [draftVisibleColumns, setDraftVisibleColumns] = useState(() =>
    DEFAULT_VISIBLE_COLUMN_KEYS
  );
  const [draftSelectedOrder, setDraftSelectedOrder] = useState(() =>
    DEFAULT_VISIBLE_COLUMN_KEYS
  );
  const [availableHighlight, setAvailableHighlight] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [filterPopupPos, setFilterPopupPos] = useState({ top: 0, left: 0 });
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [activeTab, setActiveTab] = useState("all");
  const [searchField, setSearchField] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Resize refs
  const resizingCol = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const filterPopupRef = useRef(null);

  // Drag-to-reorder refs
  const dragColRef = useRef(null);
  const dragOverColRef = useRef(null);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const [transportRes, directPurchaseRes, inventoryRes] = await Promise.all([
          api.get("/transport-entries", { params: { all: "true" } }),
          api.get("/direct-purchases", { params: { all: "true" } }),
          api.get("/inventory-entries", { params: { all: "true" } }),
        ]);
        const inventoryEntries = Array.isArray(inventoryRes.data?.data) ? inventoryRes.data.data : [];
        const inventoryEntriesByTransportId = groupRowsByTransportEntryId(inventoryEntries);
        const transportEntries = (transportRes.data?.data || []).map((entry) =>
          normalizeTransportEntryForDashboard(
            entry,
            inventoryEntriesByTransportId.get(String(entry.id)) || []
          )
        );
        const directPurchaseEntries = (directPurchaseRes.data?.data || []).map(normalizeDirectPurchaseForDashboard);
        const mergedEntries = [...transportEntries, ...directPurchaseEntries].sort((left, right) => {
          const leftTime = new Date(
            left.created_at || left.createdAt || left.lr_date || left.lrDate || 0
          ).getTime();
          const rightTime = new Date(
            right.created_at || right.createdAt || right.lr_date || right.lrDate || 0
          ).getTime();
          return rightTime - leftTime;
        });
        setEntries(mergedEntries);
      } catch (err) {
        console.error("Failed to fetch entries:", err);
        setToast({ open: true, type: "error", message: "Failed to load dashboard data" });
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, []);

  const selectedEntry = entries.find((e) => e.dashboardKey === selectedRowKey);
  const workflowSteps = useMemo(() => getWorkflowSteps(selectedEntry), [selectedEntry]);
  const nextStepKey = getNextStepKeyForEntry(selectedEntry);

  const toSearchable = (val) => String(val ?? "").toLowerCase();

  const matchesTab = useCallback((entry, tab) => {
    if (tab === "all") return true;
    if (tab === "pending") return PENDING_STATUSES.includes(entry.status);
    return entry.status === tab;
  }, []);

  const matchesSearch = useCallback(
    (entry) => {
      const query = searchText.trim().toLowerCase();
      if (!query) return true;

      const statusLabel = STATUS_LABELS[entry.status] || entry.status || "";
      const lrDateText = entry.lr_date
        ? `${entry.lr_date} ${new Date(entry.lr_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}`
        : "";
      const fromLocationText = `${entry.fromCity?.name || ""} ${entry.auto_transfer_location || ""}`.trim();
      const receivedByText = entry.purchase_manager || "";
      const barcodeText = Array.isArray(entry.barcodes)
        ? entry.barcodes.map((barcodeRow) => barcodeRow?.barcode || "").join(" ")
        : "";
      const fileNames = Array.isArray(entry.attachments)
        ? entry.attachments.map((attachment) => attachment?.file_name || "").join(" ")
        : "";
      const fields = {
        all: `${entry.lr_entry_no || ""} ${entry.lr_no || ""} ${entry.company?.name || ""} ${entry.supplier?.name || ""} ${statusLabel} ${entry.invoice_no || ""} ${barcodeText} ${lrDateText} ${entry.lr_mode || ""} ${fromLocationText} ${receivedByText} ${fileNames}`,
        company: entry.company?.name || "",
        supplier: entry.supplier?.name || "",
        status: statusLabel,
        entry_type: statusLabel,
        lr_no: entry.lr_no || "",
        lr_entry_no: entry.lr_entry_no || "",
        invoice_no: entry.invoice_no || "",
        barcode: barcodeText,
        lr_date: lrDateText,
        mode: entry.lr_mode || "",
        from_location: fromLocationText,
        received_by: receivedByText,
      };

      return toSearchable(fields[searchField] || "").includes(query);
    },
    [searchField, searchText]
  );

  const visibleColumns = useMemo(
    () =>
      visibleColumnKeys
        .map((key) => columns.find((column) => column.key === key))
        .filter(Boolean),
    [columns, visibleColumnKeys]
  );

  const getColumnFilter = useCallback(
    (columnKey) => columnFilters[columnKey] || FILTER_DEFAULT,
    [columnFilters]
  );

  const isFilterActive = useCallback((columnKey) => {
    const filter = columnFilters[columnKey] || FILTER_DEFAULT;
    if (filter.operator === "blank" || filter.operator === "not_blank") return true;
    return String(filter.value || "").trim() !== "";
  }, [columnFilters]);

  const setColumnFilter = useCallback((columnKey, update) => {
    setColumnFilters((prev) => {
      const base = prev[columnKey] || FILTER_DEFAULT;
      return {
        ...prev,
        [columnKey]: { ...base, ...update },
      };
    });
  }, []);

  const clearColumnFilter = useCallback((columnKey) => {
    setColumnFilters((prev) => ({ ...prev, [columnKey]: FILTER_DEFAULT }));
  }, []);

  const toggleColumnFilterPopup = useCallback((columnKey, triggerElement) => {
    setActiveFilterColumn((prev) => {
      if (prev === columnKey) return null;
      const rect = triggerElement.getBoundingClientRect();
      const popupWidth = 224;
      const viewportPadding = 8;
      const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - popupWidth - viewportPadding
      );
      const top = rect.bottom + 6;
      setFilterPopupPos({ top, left });
      return columnKey;
    });
  }, []);

  const toggleSort = useCallback((columnKey) => {
    setSortColumn((prev) => {
      if (prev === columnKey) {
        setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
        return columnKey;
      }
      setSortDirection("asc");
      return columnKey;
    });
  }, []);

  const getColumnValue = useCallback((entry, colKey) => {
    if (colKey === "status") return STATUS_LABELS[entry.status] || entry.status || "-";
    return getCellValue(entry, colKey);
  }, []);

  const applyColumnFilter = useCallback((entry, colKey, filter) => {
    const rawValue = getColumnValue(entry, colKey);
    const value = String(rawValue ?? "").toLowerCase().trim();
    const query = String(filter.value ?? "").toLowerCase().trim();

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
  }, [getColumnValue]);

  const filteredEntries = useMemo(() => {
    const baseRows = entries
      .filter((entry) => matchesTab(entry, activeTab))
      .filter(matchesSearch)
      .filter((entry) =>
        columns.every((column) => {
          const filter = columnFilters[column.key] || FILTER_DEFAULT;
          return applyColumnFilter(entry, column.key, filter);
        })
      );

    if (!sortColumn) return baseRows;

    const sortedRows = [...baseRows].sort((a, b) => {
      const aVal = getColumnValue(a, sortColumn);
      const bVal = getColumnValue(b, sortColumn);
      const aStr = String(aVal ?? "").trim();
      const bStr = String(bVal ?? "").trim();
      const aNum = Number(aStr);
      const bNum = Number(bStr);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
      return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: "base" });
    });

    return sortDirection === "desc" ? sortedRows.reverse() : sortedRows;
  }, [
    entries,
    activeTab,
    matchesTab,
    matchesSearch,
    columns,
    columnFilters,
    applyColumnFilter,
    sortColumn,
    sortDirection,
    getColumnValue,
  ]);

  // Reset page when filters/tab/search change
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchText, searchField, columnFilters]);

  // Pagination computed values
  const totalRows = filteredEntries.length;
  const totalPages = Math.max(Math.ceil(totalRows / limit), 1);
  const currentPage = Math.min(page, totalPages);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  const getTabCount = useCallback(
    (tab) => entries.filter((entry) => matchesTab(entry, tab)).length,
    [entries, matchesTab]
  );

  const draftAvailableColumns = useMemo(
    () => columns.filter((column) => !draftVisibleColumns.includes(column.key)),
    [columns, draftVisibleColumns]
  );

  const draftSelectedColumns = useMemo(
    () =>
      draftSelectedOrder
        .map((key) => columns.find((column) => column.key === key))
        .filter(Boolean),
    [columns, draftSelectedOrder]
  );

  const handleOpenColumnDialog = useCallback(() => {
    const allKeys = columns.map((column) => column.key);
    const orderedSelected = visibleColumnKeys.filter((key) => allKeys.includes(key));
    const normalized = orderedSelected.length > 0 ? orderedSelected : allKeys.slice(0, 1);
    setDraftVisibleColumns(normalized);
    setDraftSelectedOrder(normalized);
    setAvailableHighlight(null);
    setSelectedHighlight(null);
    setShowColumnDialog(true);
  }, [columns, visibleColumnKeys]);

  const handleMoveToSelected = () => {
    if (!availableHighlight) return;
    setDraftVisibleColumns((prev) => [...prev, availableHighlight]);
    setDraftSelectedOrder((prev) => [...prev, availableHighlight]);
    setAvailableHighlight(null);
  };

  const handleMoveAllToSelected = () => {
    const allKeys = columns.map((column) => column.key);
    setDraftVisibleColumns(allKeys);
    setDraftSelectedOrder(allKeys);
    setAvailableHighlight(null);
  };

  const handleMoveToAvailable = () => {
    if (!selectedHighlight) return;
    if (draftVisibleColumns.length <= 1) return;
    setDraftVisibleColumns((prev) => prev.filter((key) => key !== selectedHighlight));
    setDraftSelectedOrder((prev) => prev.filter((key) => key !== selectedHighlight));
    setSelectedHighlight(null);
  };

  const handleMoveAllToAvailable = () => {
    const first = draftSelectedOrder[0];
    if (!first) return;
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

  const handleApplyColumns = () => {
    const allKeys = columns.map((column) => column.key);
    const valid = draftSelectedOrder.filter((key) => allKeys.includes(key));
    if (valid.length === 0) return;
    setVisibleColumnKeys(valid);
    setShowColumnDialog(false);
  };

  const handleResetColumnDefaults = () => {
    setVisibleColumnKeys(DEFAULT_VISIBLE_COLUMN_KEYS);
    setShowColumnDialog(false);
  };

  const handleRowSelect = (id) => {
    setSelectedRowKey((prev) => (prev === id ? null : id));
  };

  const handleWorkflowClick = (stepIndex) => {
    const step = workflowSteps[stepIndex];
    if (!step) return;
    if (stepIndex === 0) {
      // LR Entry — always navigates to create new
      navigate(step.path);
      return;
    }
    if (!selectedEntry) return;

    if (selectedEntry.entry_source === "direct_purchase") {
      if (
        step.key === "barcode"
        && ["product_added", "barcode_generated", "completed"].includes(
          String(selectedEntry.status || "").trim().toLowerCase()
        )
      ) {
        navigate(`/warehouse/barcode?direct_purchase_id=${selectedEntry.id}`);
      }
      return;
    }

    if (step.key === "invoice") {
      // Invoice — pass transport entry data via state
      navigate(`${step.path}?transport_entry_id=${selectedEntry.id}`, {
        state: {
          fromTransportEntry: true,
          companyId: selectedEntry.company_id,
          companyName: getSnapshotLabel(selectedEntry.company?.name, selectedEntry.company_name),
          supplierId: selectedEntry.supplier_id,
          supplierName: getSnapshotLabel(selectedEntry.supplier?.name, selectedEntry.supplier_name),
          lrEntryNo: selectedEntry.lr_entry_no,
          lrNo: selectedEntry.lr_no,
          transportEntryId: selectedEntry.id,
          pieces: selectedEntry.no_of_pieces || 0,
          bundles: selectedEntry.no_of_bundles || 0,
        },
      });
    } else {
      navigate(`${step.path}?transport_entry_id=${selectedEntry.id}`);
    }
  };

  const handleStatusUpdate = async (entryId, newStatus) => {
    setStatusUpdatingId(entryId);
    try {
      const isDirectPurchase = selectedEntry?.entry_source === "direct_purchase" && selectedEntry?.id === entryId;
      if (isDirectPurchase) {
        if (newStatus !== "completed") return;
        await api.put(`/direct-purchases/${entryId}`, { invoiceWorkflowStatus: "invoice_completed" });
      } else {
        await api.put(`/transport-entries/${entryId}`, { status: newStatus });
      }
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId && (
            (isDirectPurchase && entry.entry_source === "direct_purchase") ||
            (!isDirectPurchase && entry.entry_source === "transport_entry")
          )
            ? {
              ...entry,
              ...(isDirectPurchase
                ? {
                  invoice_workflow_status: "invoice_completed",
                  status: mapDirectPurchaseWorkflowToDashboardStatus({
                    ...entry,
                    invoice_workflow_status: "invoice_completed",
                  }),
                }
                : { status: newStatus }),
            }
            : entry
        )
      );
      setToast({
        open: true,
        type: "success",
        message:
          newStatus === "completed"
            ? "Entry marked as completed"
            : "Entry cancelled",
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      setToast({
        open: true,
        type: "error",
        message: "Failed to update entry status",
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Map status → the last completed step path for view/edit navigation
  const getEntryNavigation = (entry, mode) => {
    if (entry.entry_source === "direct_purchase") {
      if (isDirectPurchaseBarcodeStage(entry)) {
        navigate(`/warehouse/barcode?direct_purchase_id=${entry.id}`);
        return;
      }
      navigate(`/warehouse/direct-purchase?edit=${entry.id}`);
      return;
    }

    const lorryStatusStepMap = {
      lr_entry: { path: "/warehouse/transport-entry", stepKey: "lr_entry" },
      issue_generated: { path: "/warehouse/transport-issue", stepKey: "issue" },
      receipt_generated: { path: "/warehouse/transport-receipt", stepKey: "receipt" },
      invoice_generated: { path: "/warehouse/invoice", stepKey: "invoice" },
      product_added: { path: "/warehouse/inventory-entry", stepKey: "add_product" },
      barcode_generated: { path: "/warehouse/barcode", stepKey: "barcode" },
      completed: { path: "/warehouse/barcode", stepKey: "barcode" },
      cancelled: { path: "/warehouse/transport-entry", stepKey: "lr_entry" },
    };
    const standardStatusStepMap = {
      lr_entry: { path: "/warehouse/transport-entry", stepKey: "lr_entry" },
      invoice_generated: { path: "/warehouse/invoice", stepKey: "invoice" },
      product_added: { path: "/warehouse/inventory-entry", stepKey: "add_product" },
      barcode_generated: { path: "/warehouse/barcode", stepKey: "barcode" },
      completed: { path: "/warehouse/barcode", stepKey: "barcode" },
      cancelled: { path: "/warehouse/transport-entry", stepKey: "lr_entry" },
    };
    const statusStepMap = isLorryTransportEntry(entry) ? lorryStatusStepMap : standardStatusStepMap;
    const target = statusStepMap[entry.status] || statusStepMap.lr_entry;

    if (target.stepKey === "lr_entry") {
      navigate(`${target.path}?id=${entry.id}&mode=${mode}`);
    } else if (target.stepKey === "invoice") {
      navigate(`${target.path}?transport_entry_id=${entry.id}&mode=${mode}`, {
        state: {
          fromTransportEntry: true,
          companyId: entry.company_id,
          companyName: getSnapshotLabel(entry.company?.name, entry.company_name),
          supplierId: entry.supplier_id,
          supplierName: getSnapshotLabel(entry.supplier?.name, entry.supplier_name),
          lrEntryNo: entry.lr_entry_no,
          lrNo: entry.lr_no,
          transportEntryId: entry.id,
          pieces: entry.no_of_pieces || 0,
          bundles: entry.no_of_bundles || 0,
          mode,
        },
      });
    } else {
      navigate(`${target.path}?transport_entry_id=${entry.id}&mode=${mode}`);
    }
  };

  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, entry: null });

  const handleDelete = (entry) => {
    setDeleteConfirm({ open: true, entry });
  };

  const handleDeleteConfirmed = async () => {
    const entry = deleteConfirm.entry;
    if (!entry) return;
    setDeleteConfirm({ open: false, entry: null });

    setDeletingId(entry.dashboardKey);
    try {
      const deletePath =
        entry.entry_source === "direct_purchase"
          ? `/direct-purchases/${entry.id}`
          : `/transport-entries/${entry.id}`;
      await api.delete(deletePath);
      setEntries((prev) => prev.filter((e) => e.dashboardKey !== entry.dashboardKey));
      if (selectedRowKey === entry.dashboardKey) setSelectedRowKey(null);
      setToast({ open: true, type: "success", message: "Entry deleted successfully" });
    } catch (err) {
      console.error("Failed to delete entry:", err);
      setToast({ open: true, type: "error", message: "Failed to delete entry" });
    } finally {
      setDeletingId(null);
    }
  };

  // Column resize
  const handleResizeStart = useCallback(
    (e, colKey) => {
      e.preventDefault();
      e.stopPropagation();
      const currentColumn = columns.find((column) => column.key === colKey);
      if (!currentColumn) return;

      resizingCol.current = colKey;
      startX.current = e.clientX;
      startWidth.current = currentColumn.width;

      const handleMouseMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX.current;
        const minimumWidth = currentColumn.minWidth || getColumnMinWidth(currentColumn.label);
        const newWidth = Math.max(minimumWidth, startWidth.current + delta);
        setColumns((prev) =>
          prev.map((column) =>
            column.key === resizingCol.current ? { ...column, width: newWidth } : column
          )
        );
      };

      const handleMouseUp = () => {
        resizingCol.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [columns]
  );

  // Drag-to-reorder column handlers
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

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-l-2", "border-l-blue-400");
    const fromKey = dragColRef.current;
    const toKey = dragOverColRef.current;
    if (fromKey && toKey && fromKey !== toKey) {
      setVisibleColumnKeys((prev) => {
        const newOrder = [...prev];
        const fromIdx = newOrder.indexOf(fromKey);
        const toIdx = newOrder.indexOf(toKey);
        if (fromIdx === -1 || toIdx === -1) return prev;
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, fromKey);
        return newOrder;
      });
    }
  }, []);

  const getCellValue = (entry, colKey) => {
    switch (colKey) {
      case "workflow_icons":
        return STATUS_LABELS[entry.status] || entry.status || "-";
      case "company":
        return entry.company?.name || "-";
      case "supplier":
        return entry.supplier?.name || "-";
      case "purchase_manager":
        return entry.purchase_manager || "-";
      case "agent":
        return entry.agent?.name || "-";
      case "no_of_pieces":
        return entry.no_of_pieces ?? 0;
      case "no_of_boxes":
        return entry.no_of_boxes ?? 0;
      case "fromCity":
        return entry.fromCity?.name || "-";
      case "receivingCity":
        return entry.receivingCity?.name || "-";
      case "lr_date":
        return entry.lr_date
          ? new Date(entry.lr_date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "-";
      case "pay_mode":
        return entry.pay_mode || "-";
      case "invoice_pay_mode":
        return entry.invoice_pay_mode || "-";
      case "goods_value":
        return entry.goods_value ? Number(entry.goods_value).toFixed(2) : "0.00";
      case "status":
        return null; // handled separately with badge
      case "files": {
        const totalFiles = Array.isArray(entry.attachments) ? entry.attachments.length : 0;
        return totalFiles > 0 ? `${totalFiles} file(s)` : "-";
      }
      default:
        return entry[colKey] ?? "-";
    }
  };

  const handleBackClick = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate("/warehouse");
    }
  };

  useEffect(() => {
    if (!activeFilterColumn) return undefined;
    const handleOutside = (event) => {
      if (filterPopupRef.current && !filterPopupRef.current.contains(event.target)) {
        setActiveFilterColumn(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [activeFilterColumn]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <ConfirmDialog
        open={deleteConfirm.open}
        message={
          deleteConfirm.entry?.entry_source === "transport_entry" && deleteConfirm.entry?.status === "completed"
            ? "This entry is marked as completed. Deleting it will also remove the associated stock/inventory. Are you sure?"
            : "Are you sure you want to delete this entry? This action cannot be undone."
        }
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteConfirm({ open: false, entry: null })}
      />
      {/* Header */}
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton onClick={handleBackClick} type="button" aria-label="Back to warehouse module" sx={{ color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Breadcrumbs
            sx={{ fontSize: 12.25, fontWeight: 600 }}
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: "Dashboard" },
            ]}
          />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {selectedEntry && selectedEntry.status === "barcode_generated" && (
            <>
              <Button
                onClick={() => handleStatusUpdate(selectedEntry.id, "completed")}
                disabled={statusUpdatingId === selectedEntry.id}
                className="glass-btn glass-btn-success"
                sx={{ px: 1.5, py: 0.5, fontSize: 10.5, opacity: statusUpdatingId === selectedEntry.id ? 0.6 : 1 }}
              >
                Complete
              </Button>
              {selectedEntry.entry_source === "transport_entry" && (
                <Button
                  onClick={() => handleStatusUpdate(selectedEntry.id, "cancelled")}
                  disabled={statusUpdatingId === selectedEntry.id}
                  className="glass-btn glass-btn-danger"
                  sx={{ px: 1.5, py: 0.5, fontSize: 10.5, opacity: statusUpdatingId === selectedEntry.id ? 0.6 : 1 }}
                >
                  Cancel
                </Button>
              )}
            </>
          )}
          <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>{entries.length} entries</Typography>
        </Stack>
      </Stack>

      {/* Workflow Action Bar */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        {workflowSteps.map((step, index) => {
          const isLREntry = index === 0;
          // Once barcodes are generated, the "next step" pointer moves past this step entirely (or
          // the whole entry is done) - but the barcode screen still needs to be reachable afterward
          // to reprint a lost/damaged sticker, so keep it clickable rather than graying it out.
          const isBarcodeRevisit =
            step.key === "barcode"
            && selectedEntry
            && ["barcode_generated", "completed"].includes(
              String(selectedEntry.status || "").trim().toLowerCase()
            );
          const isEnabled = isLREntry || step.key === nextStepKey || isBarcodeRevisit;
          const Icon = step.icon;
          return (
            <Button
              key={step.key}
              disabled={!isEnabled}
              onClick={() => isEnabled && handleWorkflowClick(index)}
              startIcon={<Icon size={16} />}
              sx={{
                borderRadius: "3.5px",
                px: 2,
                py: 1,
                fontSize: 12.25,
                fontWeight: 500,
                ...(isEnabled
                  ? { bgcolor: "primary.main", color: "primary.contrastText", boxShadow: 1, "&:hover": { bgcolor: "primary.dark" } }
                  : { bgcolor: "action.hover", color: "text.disabled", border: "1px solid", borderColor: "divider", "&.Mui-disabled": { color: "text.disabled" } }),
              }}
            >
              {step.label}
            </Button>
          );
        })}

        {selectedEntry && (
          <Typography sx={{ ml: "auto", fontSize: 10.5, color: "text.secondary" }}>
            Selected: <Box component="strong">#{selectedEntry.lr_entry_no || selectedEntry.invoice_no || selectedEntry.id}</Box> —{" "}
            {STATUS_LABELS[selectedEntry.status] || selectedEntry.status}
          </Typography>
        )}
      </Stack>

      {/* Table */}
      <Box sx={{ p: 2, overflowX: "auto" }}>
        {/* Tabs + Search */}
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} sx={{ mb: 1.5, lg: { alignItems: "center", justifyContent: "space-between" } }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
            {STATUS_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Stack
                  key={tab.key}
                  component="button"
                  direction="row"
                  spacing={0.5}
                  onClick={() => setActiveTab(tab.key)}
                  sx={{
                    alignItems: "center",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: active ? "primary.main" : "divider",
                    bgcolor: active ? "primary.main" : "background.paper",
                    color: active ? "primary.contrastText" : "text.secondary",
                    px: 1.5,
                    py: 0.5,
                    fontSize: 10.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": { bgcolor: active ? "primary.dark" : "action.hover" },
                  }}
                >
                  <Box component="span">{tab.label}</Box>
                  <Box
                    component="span"
                    sx={{
                      borderRadius: 999,
                      px: 0.75,
                      py: 0.25,
                      fontSize: 9,
                      bgcolor: active ? "primary.dark" : "action.hover",
                      color: active ? "primary.contrastText" : "text.secondary",
                    }}
                  >
                    {getTabCount(tab.key)}
                  </Box>
                </Stack>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", lg: "auto" }, alignItems: "center" }}>
            <Box sx={{ width: { xs: 160, lg: 176 } }}>
              <SearchableSelect
                name="searchField"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                options={SEARCH_FIELDS.map((field) => ({ label: field.label, value: field.key }))}
                placeholder="Search By"
                showEmptyOption={false}
              />
            </Box>
            <Box
              component="input"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
              sx={{
                width: { xs: "100%", lg: 224 },
                borderRadius: "1.75px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                color: "text.primary",
                px: 1,
                py: 0.5,
                fontSize: 10.5,
                outline: "none",
                "&:focus": { borderColor: "primary.main" },
              }}
            />
          </Stack>
        </Stack>

        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "1.75px", minWidth: "max-content", position: "relative" }}>
          {/* Header */}
          <Stack
            direction="row"
            sx={(theme) => ({ bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 10.5, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider", userSelect: "none" })}
          >
            <Stack direction="row" spacing={0.5} sx={{ p: 1, width: 50, textAlign: "center", borderRight: 1, borderColor: "divider", flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
              <Box component="span" sx={{ fontSize: 9, lineHeight: 1 }}>Select</Box>
              <Box
                component="button"
                type="button"
                title="Personalize List Columns"
                onClick={handleOpenColumnDialog}
                sx={{ color: "text.secondary", border: 0, bgcolor: "transparent", cursor: "pointer", display: "flex", transition: "color 0.15s", "&:hover": { color: "primary.main" } }}
              >
                <Settings2 size={14} />
              </Box>
            </Stack>
            {visibleColumns.map((col) => (
              <Box
                key={col.key}
                draggable
                onDragStart={(e) => onDragStart(e, col.key)}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragEnter={(e) => onDragEnter(e, col.key)}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                sx={{ position: "relative", p: 1, borderRight: 1, borderColor: "divider", overflow: "hidden", cursor: "grab", "&:active": { cursor: "grabbing" } }}
                style={{ width: col.width, minWidth: col.width, flexShrink: 0 }}
              >
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 0.5, pr: 1 }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", whiteSpace: "nowrap" }}>
                    <GripVertical size={12} style={{ flexShrink: 0, color: "#9ca3af" }} />
                    {col.label}
                  </Stack>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <Box
                      component="button"
                      type="button"
                      title={`Sort ${col.label}`}
                      onClick={() => toggleSort(col.key)}
                      sx={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1, border: 0, bgcolor: "transparent", cursor: "pointer", color: sortColumn === col.key ? "primary.main" : "text.disabled", "&:hover": { color: sortColumn === col.key ? "primary.main" : "text.secondary" } }}
                    >
                      <ChevronUp
                        size={12}
                        style={{ color: sortColumn === col.key && sortDirection === "asc" ? undefined : "#d1d5db", marginBottom: -4 }}
                      />
                      <ChevronDown
                        size={12}
                        style={{ color: sortColumn === col.key && sortDirection === "desc" ? undefined : "#d1d5db" }}
                      />
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      title={`Filter ${col.label}`}
                      onClick={(event) => toggleColumnFilterPopup(col.key, event.currentTarget)}
                      sx={{ border: 0, bgcolor: "transparent", cursor: "pointer", display: "flex", color: isFilterActive(col.key) ? "primary.main" : "text.secondary", "&:hover": { color: isFilterActive(col.key) ? "primary.dark" : "text.primary" } }}
                    >
                      <Filter size={14} />
                    </Box>
                  </Stack>
                </Stack>
                {/* Resize handle */}
                <Box
                  onMouseDown={(e) => handleResizeStart(e, col.key)}
                  sx={{ position: "absolute", top: 0, right: 0, width: 4, height: "100%", cursor: "col-resize", transition: "background-color 0.15s", "&:hover": { bgcolor: "primary.light" } }}
                />

                {activeFilterColumn === col.key && (
                  <Box
                    ref={filterPopupRef}
                    sx={{ position: "fixed", zIndex: 120, width: 224, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", boxShadow: 4, p: 1 }}
                    style={{ top: `${filterPopupPos.top}px`, left: `${filterPopupPos.left}px` }}
                  >
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                      <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary" }}>{col.label}</Box>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => setActiveFilterColumn(null)}
                        sx={{ color: "text.disabled", border: 0, bgcolor: "transparent", cursor: "pointer", display: "flex", "&:hover": { color: "text.secondary" } }}
                      >
                        <X size={14} />
                      </Box>
                    </Stack>
                    <Stack spacing={1}>
                      <Box
                        component="select"
                        value={getColumnFilter(col.key).operator}
                        onChange={(e) => setColumnFilter(col.key, { operator: e.target.value })}
                        sx={{ display: "block", width: "100%", border: "1px solid", borderColor: "divider", borderRadius: "1.75px", p: 0.5, fontSize: 11, bgcolor: "background.paper", color: "text.primary" }}
                      >
                        {FILTER_OPERATORS.map((operator) => (
                          <option key={operator.value} value={operator.value}>
                            {operator.label}
                          </option>
                        ))}
                      </Box>
                      {!INPUT_FREE_OPERATORS.has(getColumnFilter(col.key).operator) && (
                        <Box
                          component="input"
                          type="text"
                          value={getColumnFilter(col.key).value}
                          onChange={(e) => setColumnFilter(col.key, { value: e.target.value })}
                          placeholder="Enter filter value"
                          sx={{ display: "block", width: "100%", border: "1px solid", borderColor: "divider", borderRadius: "1.75px", p: 0.5, fontSize: 11, bgcolor: "background.paper", color: "text.primary" }}
                        />
                      )}
                    </Stack>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => clearColumnFilter(col.key)}
                      sx={{ mt: 1, fontSize: 11, color: "primary.main", border: 0, bgcolor: "transparent", cursor: "pointer", "&:hover": { color: "primary.dark" } }}
                    >
                      Clear
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
            <Box sx={{ p: 1, width: 220, textAlign: "center", borderRight: 1, borderColor: "divider", flexShrink: 0 }}>
              Action
            </Box>
          </Stack>

          {/* Body */}
          <Box sx={{ maxHeight: "65vh", overflowY: "auto" }}>
            {loading ? (
              Array.from({ length: 8 }).map((_, rowIdx) => (
                <Stack key={rowIdx} direction="row" sx={{ borderBottom: 1, borderColor: "divider", animation: "app-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
                  <Box sx={{ p: 1, width: 50, flexShrink: 0, borderRight: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: "action.hover", borderRadius: "1.75px" }} />
                  </Box>
                  {visibleColumns.map((col) => (
                    <Box
                      key={col.key}
                      sx={{ p: 1, borderRight: 1, borderColor: "divider" }}
                      style={{ width: col.width, minWidth: col.width, flexShrink: 0 }}
                    >
                      <Box sx={{ height: 16, bgcolor: "action.hover", borderRadius: "1.75px" }} style={{ width: `${55 + (rowIdx * 7 + col.width) % 35}%` }} />
                    </Box>
                  ))}
                  <Stack direction="row" spacing={1} sx={{ p: 1, width: 220, flexShrink: 0, alignItems: "center" }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Box key={i} sx={{ height: 28, width: 64, bgcolor: "action.hover", borderRadius: "1.75px" }} />
                    ))}
                  </Stack>
                </Stack>
              ))
            ) : paginatedEntries.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 4, color: "text.secondary" }}>
                No entries found for current filters.
              </Box>
            ) : (
              paginatedEntries.map((entry) => {
                const isSelected = selectedRowKey === entry.dashboardKey;
                const isCompletedEntry = String(entry.status || "").trim().toLowerCase() === "completed";
                return (
                  <Stack
                    key={entry.dashboardKey}
                    direction="row"
                    onClick={() => handleRowSelect(entry.dashboardKey)}
                    sx={{ borderBottom: 1, borderColor: "divider", fontSize: 12.25, cursor: "pointer", transition: "background-color 0.15s", bgcolor: isSelected ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "transparent", "&:hover": { bgcolor: isSelected ? undefined : "action.hover" } }}
                  >
                    <Box sx={{ p: 1, width: 50, textAlign: "center", flexShrink: 0, borderRight: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Box
                        component="input"
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(entry.dashboardKey)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{ width: 16, height: 16, accentColor: "primary.main" }}
                      />
                    </Box>
                    {visibleColumns.map((col) => (
                      <Box
                        key={col.key}
                        sx={{
                          p: 1,
                          borderRight: 1,
                          borderColor: "divider",
                          ...(col.key === "files" || col.key === "workflow_icons"
                            ? {}
                            : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
                        }}
                        style={{ width: col.width, minWidth: col.width, flexShrink: 0 }}
                      >
                        {col.key === "workflow_icons" ? (
                          (() => {
                            const iconConfig = STATUS_ICON_MAP[entry.status] || STATUS_ICON_MAP.lr_entry;
                            const IconComp = iconConfig.icon;
                            return (
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", pl: 0.5 }}>
                                <Box component={IconComp} title={iconConfig.title} sx={{ width: 16, height: 16, color: iconConfig.color }} />
                              </Box>
                            );
                          })()
                        ) : col.key === "status" ? (
                          <Box
                            component="span"
                            sx={[{ display: "inline-block", px: 1, py: 0.25, borderRadius: 999, fontSize: 12.25, fontWeight: 500 }, statusChipSx(entry.status)]}
                          >
                            {STATUS_LABELS[entry.status] || entry.status || "-"}
                          </Box>
                        ) : col.key === "files" ? (
                          (() => {
                            const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
                            if (attachments.length === 0) return <Box component="span" sx={{ color: "text.disabled" }}>-</Box>;
                            const previewItems = attachments.slice(0, 2);
                            const remaining = attachments.length - previewItems.length;
                            return (
                              <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                                {previewItems.map((attachment) => {
                                  const url = resolveAttachmentUrl(attachment);
                                  return (
                                    <Box
                                      component="a"
                                      key={attachment.id || attachment.file_name}
                                      href={url || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!url) e.preventDefault();
                                      }}
                                      title={attachment.file_name || "Attachment"}
                                      sx={(theme) => ({
                                        display: "inline-flex",
                                        maxWidth: 95,
                                        alignItems: "center",
                                        borderRadius: "3.5px",
                                        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
                                        px: 0.75,
                                        py: 0.25,
                                        fontSize: 9,
                                        color: "primary.main",
                                        "&:hover": { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.14) },
                                      })}
                                    >
                                      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.file_name || "File"}</Box>
                                    </Box>
                                  );
                                })}
                                {remaining > 0 && (
                                  <Box component="span" sx={{ fontSize: 9, color: "text.secondary" }}>+{remaining} more</Box>
                                )}
                              </Stack>
                            );
                          })()
                        ) : (
                          getCellValue(entry, col.key)
                        )}
                      </Box>
                    ))}
                    <Box sx={{ p: 1, width: 220, flexShrink: 0, borderRight: 1, borderColor: "divider" }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                        <IconButton
                          title="View"
                          onClick={(e) => {
                            e.stopPropagation();
                            getEntryNavigation(entry, "view");
                          }}
                          className="glass-btn glass-btn-primary"
                          sx={{ borderRadius: "3.5px", p: 0.75 }}
                        >
                          <Eye size={14} />
                        </IconButton>
                        <IconButton
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCompletedEntry) return;
                            getEntryNavigation(entry, "edit");
                          }}
                          disabled={isCompletedEntry}
                          className="glass-btn glass-btn-primary"
                          sx={{ borderRadius: "3.5px", p: 0.75 }}
                        >
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry);
                          }}
                          disabled={deletingId === entry.dashboardKey}
                          className="glass-btn glass-btn-danger"
                          sx={{ borderRadius: "3.5px", p: 0.75 }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Stack>
                    </Box>
                  </Stack>
                );
              })
            )}
          </Box>

          {/* Footer — Pagination */}
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, fontSize: 10.5, color: "text.secondary", borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}>
            <Box component="span">Total: {totalRows}</Box>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              {/* Rows per page */}
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <Box component="span">Rows</Box>
                <Box
                  component="select"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: "1.75px", px: 0.5, py: 0.25, fontSize: 10.5, bgcolor: "background.paper", color: "text.primary" }}
                >
                  {[20, 60, 100, 150].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </Box>
              </Stack>

              {/* Page navigation */}
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <Box
                  component="button"
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  sx={{ p: 0.25, borderRadius: "1.75px", border: 0, bgcolor: "transparent", cursor: "pointer", display: "flex", "&:hover": { bgcolor: "action.selected" }, "&:disabled": { opacity: 0.4, cursor: "not-allowed" } }}
                >
                  <ChevronLeft size={16} />
                </Box>
                <Box
                  component="select"
                  value={currentPage}
                  onChange={(e) => setPage(Number(e.target.value))}
                  sx={{ border: "1px solid", borderColor: "divider", borderRadius: "1.75px", px: 0.5, py: 0.25, fontSize: 10.5, bgcolor: "background.paper", color: "text.primary" }}
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Box>
                <Box component="span">of {totalPages}</Box>
                <Box
                  component="button"
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  sx={{ p: 0.25, borderRadius: "1.75px", border: 0, bgcolor: "transparent", cursor: "pointer", display: "flex", "&:hover": { bgcolor: "action.selected" }, "&:disabled": { opacity: 0.4, cursor: "not-allowed" } }}
                >
                  <ChevronRight size={16} />
                </Box>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {showColumnDialog && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 40, bgcolor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}
          onClick={() => setShowColumnDialog(false)}
        >
          <Box
            sx={{ width: "100%", maxWidth: 768, bgcolor: "background.paper", borderRadius: "7px", boxShadow: 6, border: "1px solid", borderColor: "divider" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
              <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Personalize List Columns</Typography>
              <Box
                component="button"
                type="button"
                onClick={() => setShowColumnDialog(false)}
                sx={{ color: "text.secondary", border: 0, bgcolor: "transparent", cursor: "pointer", display: "flex", "&:hover": { color: "text.primary" } }}
              >
                <X size={16} />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ px: 2.5, py: 2, alignItems: "stretch" }} style={{ minHeight: 320 }}>
              <Stack sx={{ flex: 1 }}>
                <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 600, color: "text.secondary", mb: 0.75 }}>Available</Typography>
                <Box sx={{ flex: 1, border: "1px solid", borderColor: "divider", borderRadius: "1.75px", overflow: "auto", bgcolor: "background.paper" }} style={{ maxHeight: 280 }}>
                  {draftAvailableColumns.length === 0 ? (
                    <Box sx={{ fontSize: 10.5, color: "text.disabled", p: 1.5, textAlign: "center" }}>All columns selected</Box>
                  ) : (
                    draftAvailableColumns.map((column) => (
                      <Box
                        key={column.key}
                        onClick={() => {
                          setAvailableHighlight(column.key);
                          setSelectedHighlight(null);
                        }}
                        onDoubleClick={() => {
                          setDraftVisibleColumns((prev) => [...prev, column.key]);
                          setDraftSelectedOrder((prev) => [...prev, column.key]);
                          setAvailableHighlight(null);
                        }}
                        sx={{
                          px: 1.5,
                          py: 0.75,
                          fontSize: 10.5,
                          cursor: "pointer",
                          userSelect: "none",
                          borderBottom: 1,
                          borderColor: "divider",
                          "&:last-of-type": { borderBottom: 0 },
                          bgcolor: availableHighlight === column.key ? "primary.main" : "transparent",
                          color: availableHighlight === column.key ? "primary.contrastText" : "text.secondary",
                          "&:hover": { bgcolor: availableHighlight === column.key ? "primary.main" : "action.hover" },
                        }}
                      >
                        {column.label}
                      </Box>
                    ))
                  )}
                </Box>
              </Stack>

              <Stack sx={{ alignItems: "center", justifyContent: "center" }} spacing={1}>
                <Box
                  component="button"
                  type="button"
                  title="Move to selected"
                  onClick={handleMoveToSelected}
                  disabled={!availableHighlight}
                  sx={{ p: 0.75, border: "1px solid", borderColor: "divider", borderRadius: "1.75px", bgcolor: "transparent", color: "text.secondary", cursor: "pointer", display: "flex", "&:hover": { bgcolor: "action.hover" }, "&:disabled": { opacity: 0.4, cursor: "not-allowed" } }}
                >
                  <ChevronRight size={16} />
                </Box>
                <Box
                  component="button"
                  type="button"
                  title="Move all to selected"
                  onClick={handleMoveAllToSelected}
                  disabled={draftAvailableColumns.length === 0}
                  sx={{ p: 0.75, border: "1px solid", borderColor: "divider", borderRadius: "1.75px", bgcolor: "transparent", color: "text.secondary", cursor: "pointer", display: "flex", "&:hover": { bgcolor: "action.hover" }, "&:disabled": { opacity: 0.4, cursor: "not-allowed" } }}
                >
                  <ChevronsRight size={16} />
                </Box>
                <Box
                  component="button"
                  type="button"
                  title="Move to available"
                  onClick={handleMoveToAvailable}
                  disabled={!selectedHighlight || draftVisibleColumns.length <= 1}
                  sx={{ p: 0.75, border: "1px solid", borderColor: "divider", borderRadius: "1.75px", bgcolor: "transparent", color: "text.secondary", cursor: "pointer", display: "flex", "&:hover": { bgcolor: "action.hover" }, "&:disabled": { opacity: 0.4, cursor: "not-allowed" } }}
                >
                  <ChevronLeft size={16} />
                </Box>
                <Box
                  component="button"
                  type="button"
                  title="Move all to available"
                  onClick={handleMoveAllToAvailable}
                  disabled={draftVisibleColumns.length <= 1}
                  sx={{ p: 0.75, border: "1px solid", borderColor: "divider", borderRadius: "1.75px", bgcolor: "transparent", color: "text.secondary", cursor: "pointer", display: "flex", "&:hover": { bgcolor: "action.hover" }, "&:disabled": { opacity: 0.4, cursor: "not-allowed" } }}
                >
                  <ChevronsLeft size={16} />
                </Box>
              </Stack>

              <Stack sx={{ flex: 1 }}>
                <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 600, color: "text.secondary", mb: 0.75 }}>Selected</Typography>
                <Box sx={{ flex: 1, border: "1px solid", borderColor: "divider", borderRadius: "1.75px", overflow: "auto", bgcolor: "background.paper" }} style={{ maxHeight: 280 }}>
                  {draftSelectedColumns.map((column) => (
                    <Box
                      key={column.key}
                      onClick={() => {
                        setSelectedHighlight(column.key);
                        setAvailableHighlight(null);
                      }}
                      onDoubleClick={() => {
                        if (draftVisibleColumns.length <= 1) return;
                        setDraftVisibleColumns((prev) => prev.filter((key) => key !== column.key));
                        setDraftSelectedOrder((prev) => prev.filter((key) => key !== column.key));
                        setSelectedHighlight(null);
                      }}
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        fontSize: 10.5,
                        cursor: "pointer",
                        userSelect: "none",
                        borderBottom: 1,
                        borderColor: "divider",
                        "&:last-of-type": { borderBottom: 0 },
                        bgcolor: selectedHighlight === column.key ? "primary.main" : "transparent",
                        color: selectedHighlight === column.key ? "primary.contrastText" : "text.secondary",
                        "&:hover": { bgcolor: selectedHighlight === column.key ? "primary.main" : "action.hover" },
                      }}
                    >
                      {column.label}
                    </Box>
                  ))}
                </Box>
              </Stack>

              <Stack sx={{ alignItems: "center", justifyContent: "center" }} spacing={1}>
                <Box
                  component="button"
                  type="button"
                  title="Move up"
                  onClick={handleMoveSelectedUp}
                  disabled={!selectedHighlight || draftSelectedOrder.indexOf(selectedHighlight) <= 0}
                  sx={{ p: 0.75, border: "1px solid", borderColor: "divider", borderRadius: "1.75px", bgcolor: "transparent", color: "text.secondary", cursor: "pointer", display: "flex", "&:hover": { bgcolor: "action.hover" }, "&:disabled": { opacity: 0.4, cursor: "not-allowed" } }}
                >
                  <ChevronUp size={16} />
                </Box>
                <Box
                  component="button"
                  type="button"
                  title="Move down"
                  onClick={handleMoveSelectedDown}
                  disabled={
                    !selectedHighlight ||
                    draftSelectedOrder.indexOf(selectedHighlight) >= draftSelectedOrder.length - 1
                  }
                  sx={{ p: 0.75, border: "1px solid", borderColor: "divider", borderRadius: "1.75px", bgcolor: "transparent", color: "text.secondary", cursor: "pointer", display: "flex", "&:hover": { bgcolor: "action.hover" }, "&:disabled": { opacity: 0.4, cursor: "not-allowed" } }}
                >
                  <ChevronDown size={16} />
                </Box>
              </Stack>
            </Stack>

            <Stack direction="row" sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: "divider", alignItems: "center", justifyContent: "space-between" }}>
              <Button
                type="button"
                onClick={handleResetColumnDefaults}
                className="glass-btn glass-btn-secondary"
              >
                Reset to column defaults
              </Button>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Button
                  type="button"
                  onClick={() => setShowColumnDialog(false)}
                  variant="outlined"
                  color="inherit"
                  sx={{ px: 2, py: 0.75, fontSize: 10.5, borderRadius: "1.75px" }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleApplyColumns}
                  className="glass-btn glass-btn-primary"
                >
                  OK
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      )}

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};

export default WarehouseDashboard;
