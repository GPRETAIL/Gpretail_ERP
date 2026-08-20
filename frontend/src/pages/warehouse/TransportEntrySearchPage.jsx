import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";

const TRANSPORT_ENTRY_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    lrmode: "lr_mode",
    lrno: "lr_no",
    lrdate: "lr_date",
    receiveddate: "received_date",
    supplierid: "supplier_id", supplier: "supplier_id",
    agentid: "agent_id", agent: "agent_id",
    commission: "commission",
    transportid: "transport_id", transport: "transport_id",
    fromcityid: "from_city_id", fromcity: "from_city_id",
    receivingcityid: "receiving_city_id", receivingcity: "receiving_city_id",
    purchasemanager: "purchase_manager",
    noofbundles: "no_of_bundles",
    noofpieces: "no_of_pieces",
    noofboxes: "no_of_boxes",
    goodsvalue: "goods_value",
    additionalmargin: "additional_margin",
    actualwgt: "actual_wgt", actualweight: "actual_wgt",
    chargedweight: "charged_weight",
    invoiceno: "invoice_no",
    remark: "remark",
  },
  required: ["lr_no"],
  sampleFileName: "transport_entry_sample.xlsx",
  sampleHeaders: [
    "company", "lr_mode", "lr_no", "lr_date", "supplier", "agent", "transport",
    "from_city", "receiving_city", "no_of_bundles", "no_of_pieces", "no_of_boxes",
    "goods_value", "actual_wgt", "charged_weight", "invoice_no", "remark",
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

const TransportEntrySearchPage = () => {
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [serverSearch, setServerSearch] = useState({ query: "", field: "all", fetchAll: false });
  const [backendPagination, setBackendPagination] = useState({ total: 0, totalPages: 1 });

  const [selectedRows, setSelectedRows] = useState([]);
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, entry: null });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

  const showToast = (type, message) => setToast({ open: true, type, message });

  const tableColumns = useMemo(
    () => [
      {
        key: "lr_entry_no",
        label: "LR Entry#",
        valueGetter: (row) => row.lr_entry_no || row.id,
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
        key: "lr_mode",
        label: "LR Mode",
        valueGetter: (row) => row.lr_mode || "-",
      },
      {
        key: "supplier",
        label: "Supplier",
        valueGetter: (row) => row.supplier?.name || "-",
      },
      {
        key: "transport",
        label: "Transport",
        valueGetter: (row) => row.transport?.name || "-",
      },
      {
        key: "from_city",
        label: "From City",
        valueGetter: (row) => row.fromCity?.name || "-",
      },
      {
        key: "receiving_city",
        label: "Recv City",
        valueGetter: (row) => row.receivingCity?.name || "-",
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
      const res = await api.get("/transport-entries", { params });
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
      console.error("Failed to fetch entries:", err);
      showToast("error", "Failed to fetch entries");
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
      await Promise.all(keys.map((id) => api.delete(`/transport-entries/${id}`)));
      showToast("success", `${keys.length} record(s) deleted`);
      setSelectedRows([]);
      fetchResults(serverSearch);
    } catch {
      showToast("error", "Failed to delete some records");
    }
  };

  const handleBack = () => {
    navigate("/warehouse/transport-entry");
  };

  const handleDeleteClick = (e, entry) => {
    e.stopPropagation();
    setDeleteDialog({ open: true, entry });
  };

  const handleDeleteConfirm = async () => {
    const entry = deleteDialog.entry;
    if (!entry) return;
    setDeleteDialog({ open: false, entry: null });

    try {
      await api.delete(`/transport-entries/${entry.id}`);
      setResults((prev) => prev.filter((r) => r.id !== entry.id));
      showToast("success", `Entry #${entry.lr_entry_no || entry.id} deleted successfully`);
      fetchResults(serverSearch);
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("error", err.response?.data?.message || "Failed to delete entry");
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3"
            aria-label="Back"
            onClick={handleBack}
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
            <span className="text-blue-800 dark:text-blue-400">Transport Entry Search</span>
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">| {results.length} Results</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <UploadImportButton
            endpoint="/transport-entries/bulk"
            fieldConfig={TRANSPORT_ENTRY_IMPORT_CONFIG}
            onDone={() => fetchResults({ pageOverride: 1 })}
          />
          <ExportBottomSheet
            columns={tableColumns}
            rows={results}
            selectedRowKeys={selectedRows}
            onExportRows={async () => {
              const res = await api.get("/transport-entries", { params: { all: "true" } });
              return res.data?.data || [];
            }}
            fileName="transport_entry_search"
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
            loadingText="Loading transport entries..."
            emptyText="No entries found."
            searchPlaceholder="Search in transport entry fields..."
            showExport={false}
            enableColumnResize
            tablePreferenceKey="warehouse.transport_entry_search.list"
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
            onRowClick={(entry) => navigate(`/warehouse/transport-entry?edit=${entry.id}`)}
            fillHeight
            renderActions={(entry, { selectedCount } = {}) => (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/warehouse/transport-entry?edit=${entry.id}`)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary rounded p-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, entry)}
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
        title="Delete Transport Entry"
        message={`Are you sure you want to delete entry #${deleteDialog.entry?.lr_entry_no || deleteDialog.entry?.id || ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false, entry: null })}
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

export default TransportEntrySearchPage;
