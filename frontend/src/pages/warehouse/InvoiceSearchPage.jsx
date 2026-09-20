import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";
import { Box, Stack, IconButton, Button } from "@mui/material";

// Matches config('pagination.resources.purchase_invoices.groupable_columns') on the backend
// (the /invoices route is backed by PurchaseInvoiceController, which pages the
// 'purchase_invoices' resource key, not the unused 'invoices' key).
const { onFetchGroupSummaries: fetchInvoiceGroupSummaries, onFetchGroupRows: fetchInvoiceGroupRows } =
  createGroupFetchers("/invoices", { supplier: "supplier_id" });

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
        render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
      },
      {
        key: "tax_charges",
        label: "Tax",
        valueGetter: (row) => Number(row.tax_charges || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0).toFixed(2)}</Box>,
      },
      {
        key: "net_amount",
        label: "Net Amount",
        valueGetter: (row) => Number(row.net_amount || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0).toFixed(2)}</Box>,
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
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }} className="master-responsive">
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate("/warehouse/invoice")} aria-label="Back" sx={{ mr: 1.5, color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/warehouse")} sx={{ minWidth: "auto", p: 0, fontSize: 12.25, fontWeight: 600 }}>
              Warehouse
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span" sx={{ color: "primary.main" }}>Invoice Search</Box>
            <Box component="span" sx={{ fontSize: 12.25, fontWeight: 400, color: "text.secondary", ml: 1 }}>
              | {results.length} Results
            </Box>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
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
        </Stack>
      </Stack>

      <Box sx={{ p: 2, flex: 1, minHeight: 0 }}>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "1.75px", p: 1.5, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
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
            onFetchGroupSummaries={fetchInvoiceGroupSummaries}
            onFetchGroupRows={fetchInvoiceGroupRows}
            enableVirtualization
            paginationMode={isAllMode ? "client" : "server"}
            enableSelection
            enableKeyboardNav
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            onRowClick={(invoice) => openInvoiceEditor(invoice)}
            fillHeight
            renderActions={(invoice, { selectedCount } = {}) => (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                <IconButton
                  type="button"
                  onClick={() => openInvoiceEditor(invoice)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary"
                  sx={{ borderRadius: "3.5px", p: 0.75 }}
                >
                  <Pencil size={14} />
                </IconButton>
                <IconButton
                  type="button"
                  onClick={(e) => handleDeleteClick(e, invoice)}
                  className="glass-btn glass-btn-danger"
                  title="Delete"
                  sx={{ borderRadius: "3.5px", p: 0.75 }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Stack>
            )}
          />
        </Box>
      </Box>

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
    </Box>
  );
};

export default InvoiceSearchPage;
