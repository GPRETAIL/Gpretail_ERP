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

const STATUS_COLORS = {
  lr_entry: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  issue_generated: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  receipt_generated: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
  invoice_generated: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  product_added: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  barcode_generated: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  completed: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const STATUS_ICON_MAP = {
  lr_entry: { icon: Truck, colorClass: "text-blue-600 dark:text-blue-400", title: "LR No" },
  issue_generated: { icon: FileText, colorClass: "text-amber-600 dark:text-amber-400", title: "Issue" },
  receipt_generated: { icon: Package, colorClass: "text-cyan-600 dark:text-cyan-400", title: "Receipt" },
  invoice_generated: { icon: FileText, colorClass: "text-green-600 dark:text-green-400", title: "Invoice" },
  product_added: { icon: Package, colorClass: "text-purple-600 dark:text-purple-400", title: "Product Added" },
  barcode_generated: { icon: Barcode, colorClass: "text-orange-500 dark:text-orange-400", title: "Barcode Generated" },
  pending: { icon: Barcode, colorClass: "text-orange-500 dark:text-orange-400", title: "Barcode Generated" },
  completed: { icon: Barcode, colorClass: "text-orange-500 dark:text-orange-400", title: "Barcode Generated" },
  cancelled: { icon: Truck, colorClass: "text-blue-600 dark:text-blue-400", title: "LR No" },
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
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
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleBackClick}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            type="button"
            aria-label="Back to warehouse module"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/warehouse")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Warehouse
            </button>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-800 dark:text-gray-100">Dashboard</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {selectedEntry && selectedEntry.status === "barcode_generated" && (
            <>
              <button
                onClick={() => handleStatusUpdate(selectedEntry.id, "completed")}
                disabled={statusUpdatingId === selectedEntry.id}
                className="glass-btn glass-btn-success px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                Complete
              </button>
              {selectedEntry.entry_source === "transport_entry" && (
                <button
                  onClick={() => handleStatusUpdate(selectedEntry.id, "cancelled")}
                  disabled={statusUpdatingId === selectedEntry.id}
                  className="glass-btn glass-btn-danger px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              )}
            </>
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">{entries.length} entries</span>
        </div>
      </div>

      {/* Workflow Action Bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
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
            <button
              key={step.key}
              disabled={!isEnabled}
              onClick={() => isEnabled && handleWorkflowClick(index)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition ${isEnabled
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-600"
                }`}
            >
              <Icon className="w-4 h-4" />
              {step.label}
            </button>
          );
        })}

        {selectedEntry && (
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            Selected: <strong>#{selectedEntry.lr_entry_no || selectedEntry.invoice_no || selectedEntry.id}</strong> —{" "}
            {STATUS_LABELS[selectedEntry.status] || selectedEntry.status}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="p-4 overflow-x-auto">
        {/* Tabs + Search */}
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${active
                      ? "border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-600 text-white"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                >
                  {tab.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-blue-500" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                    {getTabCount(tab.key)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex w-full items-center gap-2 lg:w-auto">
            <div className="w-40 lg:w-44">
              <SearchableSelect
                name="searchField"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                options={SEARCH_FIELDS.map((field) => ({ label: field.label, value: field.key }))}
                placeholder="Search By"
                showEmptyOption={false}
              />
            </div>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 lg:w-56"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-sm min-w-max relative">
          {/* Header */}
          <div className="flex bg-blue-50 dark:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-700 select-none">
            <div className="p-2 w-[50px] text-center border-r border-gray-300 dark:border-gray-600 flex-shrink-0 flex items-center justify-center gap-1">
              <span className="text-[10px] leading-none">Select</span>
              <button
                type="button"
                title="Personalize List Columns"
                onClick={handleOpenColumnDialog}
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {visibleColumns.map((col) => (
              <div
                key={col.key}
                draggable
                onDragStart={(e) => onDragStart(e, col.key)}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragEnter={(e) => onDragEnter(e, col.key)}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className="relative p-2 border-r border-gray-300 dark:border-gray-600 overflow-hidden cursor-grab active:cursor-grabbing"
                style={{ width: col.width, minWidth: col.width, flexShrink: 0 }}
              >
                <div className="flex items-center justify-between gap-1 pr-2">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <GripVertical className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
                    {col.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={`Sort ${col.label}`}
                      onClick={() => toggleSort(col.key)}
                      className={`flex flex-col items-center leading-none ${sortColumn === col.key ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        }`}
                    >
                      <ChevronUp
                        className={`w-3 h-3 -mb-1 ${sortColumn === col.key && sortDirection === "asc"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-300 dark:text-gray-600"
                          }`}
                      />
                      <ChevronDown
                        className={`w-3 h-3 ${sortColumn === col.key && sortDirection === "desc"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-300 dark:text-gray-600"
                          }`}
                      />
                    </button>
                    <button
                      type="button"
                      title={`Filter ${col.label}`}
                      onClick={(event) => toggleColumnFilterPopup(col.key, event.currentTarget)}
                      className={`${isFilterActive(col.key)
                          ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {/* Resize handle */}
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => handleResizeStart(e, col.key)}
                />

                {activeFilterColumn === col.key && (
                  <div
                    ref={filterPopupRef}
                    className="fixed z-[120] w-56 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-2"
                    style={{ top: `${filterPopupPos.top}px`, left: `${filterPopupPos.left}px` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{col.label}</span>
                      <button
                        type="button"
                        onClick={() => setActiveFilterColumn(null)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <select
                        value={getColumnFilter(col.key).operator}
                        onChange={(e) => setColumnFilter(col.key, { operator: e.target.value })}
                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-[11px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        {FILTER_OPERATORS.map((operator) => (
                          <option key={operator.value} value={operator.value}>
                            {operator.label}
                          </option>
                        ))}
                      </select>
                      {!INPUT_FREE_OPERATORS.has(getColumnFilter(col.key).operator) && (
                        <input
                          type="text"
                          value={getColumnFilter(col.key).value}
                          onChange={(e) => setColumnFilter(col.key, { value: e.target.value })}
                          placeholder="Enter filter value"
                          className="block w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-[11px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => clearColumnFilter(col.key)}
                      className="mt-2 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="p-2 w-[220px] text-center border-r border-gray-300 dark:border-gray-600 flex-shrink-0">
              Action
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[65vh] overflow-y-auto">
            {loading ? (
              Array.from({ length: 8 }).map((_, rowIdx) => (
                <div key={rowIdx} className="flex border-b border-gray-100 dark:border-gray-700 animate-pulse">
                  <div className="p-2 w-[50px] flex-shrink-0 border-r border-gray-100 dark:border-gray-700 flex items-center justify-center">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  {visibleColumns.map((col) => (
                    <div
                      key={col.key}
                      className="p-2 border-r border-gray-100 dark:border-gray-700"
                      style={{ width: col.width, minWidth: col.width, flexShrink: 0 }}
                    >
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: `${55 + (rowIdx * 7 + col.width) % 35}%` }} />
                    </div>
                  ))}
                  <div className="p-2 w-[220px] flex-shrink-0 flex items-center gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    ))}
                  </div>
                </div>
              ))
            ) : paginatedEntries.length === 0 ? (
              <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                No entries found for current filters.
              </div>
            ) : (
              paginatedEntries.map((entry) => {
                const isSelected = selectedRowKey === entry.dashboardKey;
                const isCompletedEntry = String(entry.status || "").trim().toLowerCase() === "completed";
                return (
                  <div
                    key={entry.dashboardKey}
                    className={`flex border-b border-gray-100 dark:border-gray-700 text-sm cursor-pointer transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    onClick={() => handleRowSelect(entry.dashboardKey)}
                  >
                    <div className="p-2 w-[50px] text-center flex-shrink-0 border-r border-gray-100 dark:border-gray-700 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(entry.dashboardKey)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-blue-600"
                      />
                    </div>
                    {visibleColumns.map((col) => (
                      <div
                        key={col.key}
                        className={`p-2 border-r border-gray-100 dark:border-gray-700 ${col.key === "files" || col.key === "workflow_icons" ? "" : "truncate"}`}
                        style={{ width: col.width, minWidth: col.width, flexShrink: 0 }}
                      >
                        {col.key === "workflow_icons" ? (
                          (() => {
                            const iconConfig = STATUS_ICON_MAP[entry.status] || STATUS_ICON_MAP.lr_entry;
                            const IconComp = iconConfig.icon;
                            return (
                              <div className="flex items-center justify-start pl-1">
                                <IconComp className={`w-4 h-4 ${iconConfig.colorClass}`} title={iconConfig.title} />
                              </div>
                            );
                          })()
                        ) : col.key === "status" ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[entry.status] || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                              }`}
                          >
                            {STATUS_LABELS[entry.status] || entry.status || "-"}
                          </span>
                        ) : col.key === "files" ? (
                          (() => {
                            const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
                            if (attachments.length === 0) return <span className="text-gray-400 dark:text-gray-500">-</span>;
                            const previewItems = attachments.slice(0, 2);
                            const remaining = attachments.length - previewItems.length;
                            return (
                              <div className="flex flex-wrap items-center gap-1">
                                {previewItems.map((attachment) => {
                                  const url = resolveAttachmentUrl(attachment);
                                  return (
                                    <a
                                      key={attachment.id || attachment.file_name}
                                      href={url || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!url) e.preventDefault();
                                      }}
                                      className="inline-flex max-w-[95px] items-center rounded bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                      title={attachment.file_name || "Attachment"}
                                    >
                                      <span className="truncate">{attachment.file_name || "File"}</span>
                                    </a>
                                  );
                                })}
                                {remaining > 0 && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">+{remaining} more</span>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          getCellValue(entry, col.key)
                        )}
                      </div>
                    ))}
                    <div className="p-2 w-[220px] flex-shrink-0 border-r border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          title="View"
                          onClick={(e) => {
                            e.stopPropagation();
                            getEntryNavigation(entry, "view");
                          }}
                          className="glass-btn glass-btn-primary rounded p-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCompletedEntry) return;
                            getEntryNavigation(entry, "edit");
                          }}
                          disabled={isCompletedEntry}
                          className="glass-btn glass-btn-primary rounded p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry);
                          }}
                          disabled={deletingId === entry.dashboardKey}
                          className="glass-btn glass-btn-danger rounded p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — Pagination */}
          <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <span>Total: {totalRows}</span>

            <div className="flex items-center gap-3">
              {/* Rows per page */}
              <div className="flex items-center gap-1">
                <span>Rows</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-gray-300 dark:border-gray-600 rounded-sm px-1 py-0.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {[20, 60, 100, 150].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={currentPage}
                  onChange={(e) => setPage(Number(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded-sm px-1 py-0.5 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <span>of {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showColumnDialog && (
        <div
          className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setShowColumnDialog(false)}
        >
          <div
            className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Personalize List Columns</h3>
              <button
                type="button"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => setShowColumnDialog(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 flex items-stretch gap-3" style={{ minHeight: 320 }}>
              <div className="flex-1 flex flex-col">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Available</span>
                <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm overflow-auto bg-white dark:bg-gray-800" style={{ maxHeight: 280 }}>
                  {draftAvailableColumns.length === 0 ? (
                    <div className="text-xs text-gray-400 dark:text-gray-500 p-3 text-center">All columns selected</div>
                  ) : (
                    draftAvailableColumns.map((column) => (
                      <div
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
                        className={`px-3 py-1.5 text-xs cursor-pointer select-none border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${availableHighlight === column.key
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                      >
                        {column.label}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  title="Move to selected"
                  onClick={handleMoveToSelected}
                  disabled={!availableHighlight}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  title="Move all to selected"
                  onClick={handleMoveAllToSelected}
                  disabled={draftAvailableColumns.length === 0}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  title="Move to available"
                  onClick={handleMoveToAvailable}
                  disabled={!selectedHighlight || draftVisibleColumns.length <= 1}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  title="Move all to available"
                  onClick={handleMoveAllToAvailable}
                  disabled={draftVisibleColumns.length <= 1}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>

              <div className="flex-1 flex flex-col">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Selected</span>
                <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm overflow-auto bg-white dark:bg-gray-800" style={{ maxHeight: 280 }}>
                  {draftSelectedColumns.map((column) => (
                    <div
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
                      className={`px-3 py-1.5 text-xs cursor-pointer select-none border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${selectedHighlight === column.key
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                      {column.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  title="Move up"
                  onClick={handleMoveSelectedUp}
                  disabled={!selectedHighlight || draftSelectedOrder.indexOf(selectedHighlight) <= 0}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  onClick={handleMoveSelectedDown}
                  disabled={
                    !selectedHighlight ||
                    draftSelectedOrder.indexOf(selectedHighlight) >= draftSelectedOrder.length - 1
                  }
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-t dark:border-gray-700 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetColumnDefaults}
                className="glass-btn glass-btn-secondary"
              >
                Reset to column defaults
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowColumnDialog(false)}
                  className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyColumns}
                  className="glass-btn glass-btn-primary"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default WarehouseDashboard;
