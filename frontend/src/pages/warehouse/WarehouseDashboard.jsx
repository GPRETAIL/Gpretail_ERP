import PageHeader from "../../components/PageHeader";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, FileText, Package, Barcode, Eye, Pencil, Trash2, Printer } from "lucide-react";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import Toast from "../../components/Toast";
import Breadcrumbs from "../../components/Breadcrumbs";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchGridPanel from "../../components/SearchGridPanel";
import { masterSearchAreaSx } from "../../theme/erpUi";
import useSearchGrid from "../../hooks/useSearchGrid";
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

const PENDING_STATUSES = [
  "lr_entry",
  "issue_generated",
  "receipt_generated",
  "invoice_generated",
  "product_added",
  "barcode_generated",
  "pending",
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
        return STATUS_LABELS[entry.status] || entry.status || "-";
      case "files": {
        const totalFiles = Array.isArray(entry.attachments) ? entry.attachments.length : 0;
        return totalFiles > 0 ? `${totalFiles} file(s)` : "-";
      }
      default:
        return entry[colKey] ?? "-";
    }
  };

const WarehouseDashboard = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [activeTab, setActiveTab] = useState("all");
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    const fetchEntries = async () => {
      try {
        const [transportRes, directPurchaseRes, inventoryRes] = await Promise.all([
          api.get("/transport-entries", { signal: controller.signal, params: { all: "true" } }),
          api.get("/direct-purchases", { signal: controller.signal, params: { all: "true" } }),
          api.get("/inventory-entries", { signal: controller.signal, params: { all: "true" } }),
        ]);
        if (controller.signal.aborted) return;
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
        if (controller.signal.aborted) return;
        console.error("Failed to fetch entries:", err);
        setToast({ open: true, type: "error", message: "Failed to load dashboard data" });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchEntries();
    return () => controller.abort();
  }, []);

  const selectedEntry = entries.find((e) => e.dashboardKey === selectedRowKey);
  const workflowSteps = useMemo(() => getWorkflowSteps(selectedEntry), [selectedEntry]);
  const nextStepKey = getNextStepKeyForEntry(selectedEntry);

  const matchesTab = useCallback((entry, tab) => {
    if (tab === "all") return true;
    if (tab === "pending") return PENDING_STATUSES.includes(entry.status);
    return entry.status === tab;
  }, []);

  const getTabCount = useCallback(
    (tab) => entries.filter((entry) => matchesTab(entry, tab)).length,
    [entries, matchesTab]
  );

  const handleRowSelect = key => setSelectedRowKey(previous => previous === key ? null : key);
  const rows = useMemo(() => entries.filter(entry => matchesTab(entry, activeTab)), [entries, matchesTab, activeTab]);
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: activeTab });
  const { page, limit, setPage, setLimit } = grid;

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

    // A completed entry's barcodes are only reprinted, never regenerated.
    if (entry.status === "completed" && target.stepKey === "barcode") {
      navigate(`/warehouse/barcode/search?${new URLSearchParams({ transport_entry_id: String(entry.id), label: String(entry.lr_entry_no || entry.id) })}`);
      return;
    }

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

  const handleBackClick = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate("/warehouse");
    }
  };

  const tableColumns = [
    ...RAW_INITIAL_COLUMNS.map(column => ({ key: column.key, label: column.label, valueGetter: entry => getCellValue(entry, column.key),
      ...(column.key === "workflow_icons" ? { render: (_value, entry) => {
        const config = STATUS_ICON_MAP[entry.status] || STATUS_ICON_MAP.lr_entry;
        return <Box component={config.icon} title={config.title} sx={{ width: 16, height: 16, color: config.color }} />;
      } } : {}),
      ...(column.key === "status" ? { render: (value, entry) => <Box component="span" sx={[{ px: 1, py: 0.25, borderRadius: 999, fontSize: 11 }, statusChipSx(entry.status)]}>{value}</Box> } : {}),
      ...(column.key === "files" ? { render: (_value, entry) => {
        const files = Array.isArray(entry.attachments) ? entry.attachments : [];
        return files.length ? <Stack direction="row" useFlexGap spacing={0.5} sx={{ flexWrap: "wrap" }}>{files.map(file => {
          const url = resolveAttachmentUrl(file);
          return <Box component="a" key={file.id || file.file_name} href={url || "#"} target="_blank" rel="noopener noreferrer"
            onClick={event => { event.stopPropagation(); if (!url) event.preventDefault(); }} sx={{ color: "primary.main" }}>{file.file_name || "File"}</Box>;
        })}</Stack> : "-";
      } } : {}),
    })),
    { key: "invoice_no", label: "Invoice No", valueGetter: entry => entry.invoice_no || "-" },
    { key: "barcodes", label: "Barcodes", valueGetter: entry => (entry.barcodes || []).map(barcode => barcode.barcode || "").join(", ") },
  ];
  return (
    <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default", color: "text.primary" }}>
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
      <PageHeader
        onBack={handleBackClick}
        backLabel="Back to warehouse module"
        title={<>
          <Breadcrumbs
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: "Dashboard" },
            ]}
          />
        </>}
        actions={<>
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
        </>}
      />

      {/* Workflow Action Bar */}
      <Stack direction="row" useFlexGap spacing={1.5} sx={{ flexWrap: "wrap", flexShrink: 0, alignItems: "center", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        {workflowSteps.map((step, index) => {
          const isLREntry = index === 0;
          // While barcodes are generated but the entry is not yet completed, the generation screen
          // stays reachable. A completed entry is closed: reprints go through Barcode Search only.
          const isBarcodeRevisit =
            step.key === "barcode"
            && selectedEntry
            && String(selectedEntry.status || "").trim().toLowerCase() === "barcode_generated";
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

        {selectedEntry && ["barcode_generated", "completed"].includes(String(selectedEntry.status || "").trim().toLowerCase()) && (
          <Button
            variant="outlined"
            startIcon={<Printer size={16} />}
            onClick={() => {
              const params = new URLSearchParams({
                [selectedEntry.entry_source === "direct_purchase" ? "direct_purchase_id" : "transport_entry_id"]: String(selectedEntry.id),
                label: String(selectedEntry.lr_entry_no || selectedEntry.invoice_no || selectedEntry.id),
              });
              navigate(`/warehouse/barcode/search?${params}`);
            }}
            sx={{ borderRadius: "3.5px", px: 2, py: 1, fontSize: 12.25, fontWeight: 500 }}
          >
            Reprint barcodes
          </Button>
        )}

        {selectedEntry && (
          <Typography sx={{ ml: "auto", fontSize: 10.5, color: "text.secondary" }}>
            Selected: <Box component="strong">#{selectedEntry.lr_entry_no || selectedEntry.invoice_no || selectedEntry.id}</Box> —{" "}
            {STATUS_LABELS[selectedEntry.status] || selectedEntry.status}
          </Typography>
        )}
      </Stack>

      <Box sx={masterSearchAreaSx}>
        <SearchGridPanel>
          <Stack direction="row" useFlexGap spacing={1} role="group" aria-label="Workflow status filters" sx={{ flexWrap: "wrap", alignItems: "center", flexShrink: 0, mb: 1 }}>
            {STATUS_TABS.map(tab => (
              <Button key={tab.key} aria-pressed={activeTab === tab.key} onClick={() => { setActiveTab(tab.key); setSelectedRowKey(null); setPage(1); }}
                variant={activeTab === tab.key ? "contained" : "outlined"} color={activeTab === tab.key ? "primary" : "inherit"}
                sx={{ minWidth: 0, height: 30, borderRadius: 999, px: 1.5, gap: 0.75, fontSize: 11, whiteSpace: "nowrap", textTransform: "none" }}>
                {tab.label}<Box component="span" sx={{ minWidth: 18, borderRadius: 999, px: 0.5, bgcolor: "action.hover", fontSize: 10 }}>{getTabCount(tab.key)}</Box>
              </Button>
            ))}
          </Stack>
          <FilterableDataTable rows={grid.rows} columns={tableColumns} rowKey="dashboardKey" loading={loading}
            tablePreferenceKey="warehouse-dashboard" emptyText="No entries found for current filters."
            searchPlaceholder="Search warehouse entries..." exportFileName="warehouse_dashboard"
            fillHeight enableColumnResize paginationMode="client" page={page} limit={limit}
            onPageChange={setPage} onLimitChange={value => { setLimit(value); setPage(1); }} onRowClick={entry => handleRowSelect(entry.dashboardKey)}
            enableSelection singleSelection selectedRows={selectedRowKey ? [selectedRowKey] : []}
            getRowSelectionLabel={entry => `Select ${entry.lr_entry_no || entry.id}`}
            onSelectionChange={keys => setSelectedRowKey(keys.length ? keys[keys.length - 1] : null)}
            renderActions={entry => <Stack direction="row" spacing={0.5}>
              <IconButton title="View" aria-label="View" onClick={event => { event.stopPropagation(); getEntryNavigation(entry, "view"); }}><Eye size={14} /></IconButton>
              <IconButton title="Edit" aria-label="Edit" disabled={entry.status === "completed"} onClick={event => { event.stopPropagation(); getEntryNavigation(entry, "edit"); }}><Pencil size={14} /></IconButton>
              <IconButton title="Delete" aria-label="Delete" disabled={deletingId === entry.dashboardKey} onClick={event => { event.stopPropagation(); handleDelete(entry); }}><Trash2 size={14} /></IconButton>
            </Stack>}
          />
        </SearchGridPanel>
      </Box>
      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={() => setToast(previous => ({ ...previous, open: false }))} />
    </Box>
  );
};
export default WarehouseDashboard;
