import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";

const DIRECT_PURCHASE_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    supplierid: "supplier_id", supplier: "supplier_id", suppliername: "supplier_name",
    purchasetype: "purchase_type",
    pono: "po_no",
    transportid: "transport_id", transport: "transport_id", transportname: "transport_name",
    lrno: "lr_no",
    lrdate: "lr_date",
    bundles: "bundles",
    retaillocation: "retail_location",
    invoiceno: "invoice_no",
    invoicedate: "invoice_date",
    igst: "igst",
    idiscount: "i_discount",
    billvalue: "bill_value",
    othercharges: "other_charges",
    billtax: "bill_tax",
    purdiscountperc: "pur_discount_perc",
    purdiscount: "pur_discount",
    total: "total",
  },
  required: ["supplier_name"],
  sampleFileName: "direct_purchase_sample.xlsx",
  sampleHeaders: [
    "company", "supplier_name", "purchase_type", "po_no", "transport_name", "lr_no", "lr_date",
    "bundles", "retail_location", "invoice_no", "invoice_date", "bill_value", "other_charges",
    "bill_tax", "pur_discount_perc", "pur_discount", "total",
  ],
};

const toNumber = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getDirectPurchaseItemSummary = (row) => {
  const items = Array.isArray(row?.items) ? row.items : [];

  return items.reduce(
    (acc, item) => {
      const qty = Math.max(0, parseInt(item?.qty, 10) || 0);
      const cost = Math.max(0, toNumber(item?.cost));
      const marginPerc = toNumber(item?.margin_perc ?? item?.marginPerc);
      const discount = Math.max(0, toNumber(item?.discount));
      const baseRate = round2(cost + (cost * marginPerc) / 100);
      const baseAmount = round2(baseRate * qty);
      const taxableAmount = round2(Math.max(0, baseAmount - discount));
      const amount = round2(toNumber(item?.amount) || taxableAmount);
      const tax = round2(Math.max(0, amount - taxableAmount));
      const gross = round2(amount + discount);

      return {
        gross: acc.gross + gross,
        tax: acc.tax + tax,
        total: acc.total + amount,
      };
    },
    { gross: 0, tax: 0, total: 0 }
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

const WORKFLOW_STATUS_LABELS = {
  invoice_completed: "Invoice Completed",
  temporary: "Temporary",
  invoice_progress: "Invoice Progress",
};

const DirectPurchaseSearchPage = () => {
  const navigate = useNavigate();

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [results, setResults] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, entry: null });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        valueGetter: (row) => row.id,
      },
      {
        key: "invoice_no",
        label: "Invoice No",
        valueGetter: (row) => row.invoice_no || "-",
      },
      {
        key: "invoice_date",
        label: "Invoice Date",
        valueGetter: (row) => row.invoice_date || "",
        render: (value) => formatDate(value),
        searchValue: (row) => formatDate(row.invoice_date),
      },
      {
        key: "company",
        label: "Company",
        valueGetter: (row) => getSnapshotLabel(row.company?.name, row.company_name),
      },
      {
        key: "supplier",
        label: "Supplier",
        valueGetter: (row) => getSnapshotLabel(row.supplier?.name, row.supplier_name),
      },
      {
        key: "status",
        label: "Status",
        valueGetter: (row) => WORKFLOW_STATUS_LABELS[row.invoice_workflow_status] || row.invoice_workflow_status || "-",
      },
      {
        key: "transport",
        label: "Transport",
        valueGetter: (row) => getSnapshotLabel(row.transport?.name, row.transport_name),
      },
      {
        key: "lr_no",
        label: "LR No",
        valueGetter: (row) => row.lr_no || "-",
      },
      {
        key: "lr_date",
        label: "LR Date",
        valueGetter: (row) => row.lr_date || "",
        render: (value) => formatDate(value),
        searchValue: (row) => formatDate(row.lr_date),
      },
      {
        key: "bundles",
        label: "Bundles",
        valueGetter: (row) => Number(row.bundles || 0),
        render: (value) => <div className="text-right">{Number(value || 0)}</div>,
      },
      {
        key: "gross",
        label: "Gross",
        valueGetter: (row) => getDirectPurchaseItemSummary(row).gross,
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
      },
      {
        key: "tax",
        label: "Tax",
        valueGetter: (row) => getDirectPurchaseItemSummary(row).tax,
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
      },
      {
        key: "total",
        label: "Total",
        valueGetter: (row) => getDirectPurchaseItemSummary(row).total,
        render: (value) => <div className="text-right">{toNumber(value).toFixed(2)}</div>,
      },
      {
        key: "created_at",
        label: "Created",
        valueGetter: (row) => row.created_at || "",
        render: (value) => formatDate(value),
        searchValue: (row) => formatDate(row.created_at),
      },
    ],
    []
  );

  const pagination = useMemo(() => {
    const total = results.length;
    const totalPages = Math.max(Math.ceil(total / Math.max(limit, 1)), 1);
    return { total, totalPages };
  }, [results.length, limit]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await api.get("/direct-purchases", { params: { all: "true" } });
      setResults(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch direct purchases:", err);
      setToast({
        open: true,
        type: "error",
        message: "Failed to load direct purchases",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/direct-purchases/${id}`)));
      setToast({ open: true, type: "success", message: `${keys.length} record(s) deleted` });
      setSelectedRows([]);
      fetchEntries();
    } catch {
      setToast({ open: true, type: "error", message: "Failed to delete some records" });
    }
  };

  const handleDeleteConfirm = async () => {
    const entry = confirm.entry;
    if (!entry) return;

    setConfirm({ open: false, entry: null });
    try {
      await api.delete(`/direct-purchases/${entry.id}`);
      setResults((prev) => prev.filter((row) => row.id !== entry.id));
      setToast({
        open: true,
        type: "success",
        message: `Direct purchase #${entry.id} deleted`,
      });
    } catch (err) {
      console.error("Failed to delete direct purchase:", err);
      setToast({
        open: true,
        type: "error",
        message: err.response?.data?.message || "Failed to delete direct purchase",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => navigate("/warehouse/direct-purchase")}
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/warehouse")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Warehouse
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Direct Purchase Search</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <UploadImportButton
            endpoint="/direct-purchases/bulk"
            fieldConfig={DIRECT_PURCHASE_IMPORT_CONFIG}
            onDone={fetchEntries}
          />
          <ExportBottomSheet
            columns={columns}
            rows={results}
            selectedRowKeys={selectedRows}
            onExportRows={async () => {
              const res = await api.get("/direct-purchases", { params: { all: "true" } });
              return res.data?.data || [];
            }}
            fileName="direct_purchase_search"
            buttonClassName="topbar-action-btn topbar-action-export"
          />
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm p-3">
          <FilterableDataTable
            rows={results}
            columns={columns}
            loading={loading}
            loadingText="Loading direct purchases..."
            emptyText="No direct purchases found."
            searchPlaceholder="Search in direct purchase fields..."
            showExport={false}
            enableColumnResize
            tablePreferenceKey="warehouse.direct_purchase_search.list"
            onRefresh={fetchEntries}
            refreshDisabled={loading}
            page={page}
            limit={limit}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
            paginationMode="client"
            onRowClick={(entry) => navigate(`/warehouse/direct-purchase?edit=${entry.id}`)}
            enableKeyboardNav
            enableSelection
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            renderActions={(entry, { selectedCount } = {}) => (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/warehouse/direct-purchase?edit=${entry.id}`)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary rounded p-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm({ open: true, entry })}
                  className="glass-btn glass-btn-danger rounded p-1.5"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Delete Direct Purchase"
        message={`Are you sure you want to delete direct purchase #${confirm.entry?.id || ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirm({ open: false, entry: null })}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default DirectPurchaseSearchPage;
