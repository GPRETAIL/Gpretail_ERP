import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";

const INVOICE_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    transportentryid: "transport_entry_id", transportentry: "transport_entry_id", lrentryno: "transport_entry_id",
    supplierid: "supplier_id", supplier: "supplier_id", suppliername: "supplier_name",
    invoiceno: "invoice_no",
    entrydate: "entry_date",
    invoicedate: "invoice_date",
    lrno: "lr_no",
    lrexpense: "lr_expense",
    billvalue: "bill_value",
    expenseperc: "expense_perc",
    expenseamt: "expense_amt",
    pieces: "pieces",
    bundles: "bundles",
    baseamount: "base_amount",
    discount: "discount",
    taxcharges: "tax_charges",
    grossamount: "gross_amount",
    netamount: "net_amount",
    interstate: "interstate",
    creditnote: "credit_note",
  },
  required: ["transport_entry_id", "supplier_id", "invoice_no", "entry_date", "invoice_date"],
  boolFields: ["interstate", "credit_note"],
  sampleFileName: "invoice_sample.xlsx",
  sampleHeaders: [
    "company", "transport_entry_id", "supplier_id", "invoice_no", "entry_date", "invoice_date",
    "lr_no", "bill_value", "pieces", "bundles", "base_amount", "discount", "tax_charges",
    "gross_amount", "net_amount",
  ],
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

const InvoiceSearchPage = () => {
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [serverSearch, setServerSearch] = useState({ query: "", field: "all", fetchAll: false });
  const [backendPagination, setBackendPagination] = useState({ total: 0, totalPages: 1 });

  const [selectedRows, setSelectedRows] = useState([]);
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, invoice: null });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

  const showToast = (type, message) => setToast({ open: true, type, message });

  const tableColumns = useMemo(
    () => [
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
        key: "entry_date",
        label: "Entry Date",
        valueGetter: (row) => row.entry_date || "",
        render: (value) => formatDate(value),
        searchValue: (row) => formatDate(row.entry_date),
      },
      {
        key: "company",
        label: "Company",
        valueGetter: (row) => row.company?.name || "-",
      },
      {
        key: "supplier",
        label: "Supplier",
        valueGetter: (row) => row.supplier?.name || "-",
      },
      {
        key: "bundles",
        label: "Bundles",
        valueGetter: (row) => Number(row.bundles || 0),
        render: (value) => <div className="text-right">{Number(value || 0)}</div>,
      },
      {
        key: "tax_charges",
        label: "Tax",
        valueGetter: (row) => Number(row.tax_charges || 0),
        render: (value) => <div className="text-right">{Number(value || 0).toFixed(2)}</div>,
      },
      {
        key: "net_amount",
        label: "Net Amount",
        valueGetter: (row) => Number(row.net_amount || 0),
        render: (value) => <div className="text-right">{Number(value || 0).toFixed(2)}</div>,
      },
    ],
    []
  );

  const isAllMode = useMemo(
    () => Boolean(serverSearch.fetchAll) || String(serverSearch.query || "").trim() !== "",
    [serverSearch.fetchAll, serverSearch.query]
  );

  const pagination = useMemo(() => {
    if (!isAllMode) return backendPagination;
    const total = results.length;
    const totalPages = Math.max(Math.ceil(total / Math.max(limit, 1)), 1);
    return { total, totalPages };
  }, [isAllMode, backendPagination, results.length, limit]);

  const fetchResults = useCallback(async ({
    query = "",
    field = "all",
    fetchAll = false,
    pageOverride = page,
    limitOverride = limit,
  } = {}) => {
    const normalizedQuery = String(query || "").trim();
    const normalizedField = String(field || "all").trim();
    const shouldFetchAll = Boolean(fetchAll) || normalizedQuery !== "";
    setServerSearch({ query: normalizedQuery, field: normalizedField, fetchAll: shouldFetchAll });
    setLoading(true);
    try {
      const params = shouldFetchAll
        ? { all: "true" }
        : { page: pageOverride, limit: limitOverride };
      if (normalizedQuery) params.search = normalizedQuery;
      if (normalizedField && normalizedField !== "all" && shouldFetchAll) params.field = normalizedField;
      const res = await api.get("/invoices", { params });
      const rows = res.data?.data || [];
      setResults(rows);
      if (shouldFetchAll) {
        const total = rows.length;
        setBackendPagination({
          total,
          totalPages: Math.max(Math.ceil(total / Math.max(limitOverride, 1)), 1),
        });
      } else {
        const p = res.data?.pagination || {};
        const total = Number(p.total ?? rows.length) || 0;
        const totalPages = Math.max(Number(p.totalPages ?? 1) || 1, 1);
        setBackendPagination({ total, totalPages });
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      showToast("error", "Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    if (isAllMode) return;
    fetchResults({ query: "", field: "all", fetchAll: false, pageOverride: page, limitOverride: limit });
  }, [fetchResults, page, limit]);

  const handleServerSearch = useCallback(
    ({ query, field, fetchAll }) => {
      setPage(1);
      fetchResults({
        query,
        field,
        fetchAll,
        pageOverride: 1,
        limitOverride: limit,
      });
    },
    [fetchResults, limit]
  );

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/invoices/${id}`)));
      showToast("success", `${keys.length} record(s) deleted`);
      setSelectedRows([]);
      fetchResults(serverSearch);
    } catch {
      showToast("error", "Failed to delete some records");
    }
  };

  const handleDeleteClick = (e, invoice) => {
    e.stopPropagation();
    setDeleteDialog({ open: true, invoice });
  };

  const handleDeleteConfirm = async () => {
    const invoice = deleteDialog.invoice;
    if (!invoice) return;
    setDeleteDialog({ open: false, invoice: null });

    try {
      await api.delete(`/invoices/${invoice.id}`);
      setResults((prev) => prev.filter((r) => r.id !== invoice.id));
      showToast("success", `Invoice #${invoice.invoice_no || invoice.id} deleted successfully`);
      fetchResults(serverSearch);
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("error", err.response?.data?.message || "Failed to delete invoice");
    }
  };

  const openInvoiceEditor = (invoice) => {
    const invoiceId = invoice?.id ?? invoice?.invoice_id ?? invoice?.invoiceId ?? null;
    if (!invoiceId) {
      showToast("warning", "Selected row does not have an invoice id");
      return;
    }

    const query = new URLSearchParams({
      mode: "edit",
      invoice_id: String(invoiceId),
    });

    navigate(`/warehouse/invoice?${query.toString()}`, {
      state: {
        mode: "edit",
        invoiceId,
        fromSearch: true,
      },
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3"
            aria-label="Back"
            onClick={() => navigate("/warehouse/invoice")}
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
            <span className="text-blue-800 dark:text-blue-400">Invoice Search</span>
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">| {results.length} Results</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <UploadImportButton
            endpoint="/invoices/bulk"
            fieldConfig={INVOICE_IMPORT_CONFIG}
            onDone={() => fetchResults({ pageOverride: 1 })}
          />
          <ExportBottomSheet
            columns={tableColumns}
            rows={results}
            selectedRowKeys={selectedRows}
            onExportRows={async () => {
              try {
                const res = await api.get("/invoices", { params: { all: "true" } });
                return res.data?.data || [];
              } catch {
                const res = await api.get("/invoices");
                return res.data?.data || [];
              }
            }}
            fileName="invoice_search"
            buttonClassName="topbar-action-btn topbar-action-export"
          />
        </div>
      </div>

      <div className="p-4 flex-1 min-h-0">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm p-3 h-full flex flex-col min-h-0">
          <FilterableDataTable
            rows={results}
            columns={tableColumns}
            loading={loading}
            loadingText="Loading invoices..."
            emptyText="No invoices found."
            searchPlaceholder="Search in invoice fields..."
            showExport={false}
            enableColumnResize
            tablePreferenceKey="warehouse.invoice_search.list"
            onRefresh={() => {}}
            refreshDisabled={loading}
            enableServerSearch
            onServerSearch={handleServerSearch}
            page={page}
            limit={limit}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
            paginationMode={isAllMode ? "client" : "server"}
            enableSelection
            enableKeyboardNav
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            onRowClick={(invoice) => openInvoiceEditor(invoice)}
            fillHeight
            renderActions={(invoice, { selectedCount } = {}) => (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openInvoiceEditor(invoice)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary rounded p-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, invoice)}
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

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice "${deleteDialog.invoice?.invoice_no || ""}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false, invoice: null })}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
    </div>
  );
};

export default InvoiceSearchPage;
