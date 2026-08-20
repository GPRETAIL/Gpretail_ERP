import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";

const INVENTORY_ENTRY_IMPORT_CONFIG = {
  aliases: {
    companyid: "company_id", company: "company_id", store: "company_id",
    supplierid: "supplier_id", supplier: "supplier_id", suppliername: "supplier_name",
    productid: "product_id", product: "product_id", productname: "product_name",
    brandid: "brand_id", brand: "brand_id", brandname: "brand_name",
    hsncode: "hsn_code", hsn: "hsn_code",
    taxid: "tax_id", tax: "tax_id",
    buyingprice: "buying_price", cost: "buying_price",
    ptax: "p_tax",
    discount: "discount",
    itemvalue: "item_value",
    total: "total",
    purchaseorder: "purchase_order",
    serialno: "serial_no",
    batchexpiry: "batch_expiry",
    itemname: "item_name",
    weight: "weight",
    wastage: "wastage",
    workingcharge: "working_charge",
  },
  required: ["product_name"],
  sampleFileName: "inventory_entry_sample.xlsx",
  sampleHeaders: [
    "company", "supplier_name", "product_name", "brand_name", "hsn_code",
    "buying_price", "p_tax", "discount", "item_value", "total",
    "purchase_order", "serial_no", "batch_expiry", "item_name", "weight", "wastage", "working_charge",
  ],
};

const InventoryEntrySearchPage = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const showToast = (type, message) => setToast({ open: true, type, message });

  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [selectedRows, setSelectedRows] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [serverSearch, setServerSearch] = useState({ query: "", field: "all", fetchAll: false });
  const [backendPagination, setBackendPagination] = useState({ total: 0, totalPages: 1 });

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        valueGetter: (row) => row.id,
      },
      {
        key: "supplier",
        label: "Supplier",
        valueGetter: (row) => row.supplier?.name || "-",
      },
      {
        key: "product",
        label: "Product",
        valueGetter: (row) => row.product?.name || "-",
      },
      {
        key: "brand",
        label: "Brand",
        valueGetter: (row) => row.brand?.name || "-",
      },
      {
        key: "hsn_code",
        label: "HSN",
        valueGetter: (row) => row.hsn_code || "-",
      },
      {
        key: "tax",
        label: "Tax",
        valueGetter: (row) => (row.tax ? `${row.tax.name} ${row.tax.tax_percentage}%` : "-"),
      },
      {
        key: "item_value",
        label: "Item Value",
        valueGetter: (row) => Number(row.item_value || 0),
        render: (value) => <div className="text-right">{Number(value || 0).toFixed(2)}</div>,
      },
      {
        key: "total",
        label: "Total",
        valueGetter: (row) => Number(row.total || 0),
        render: (value) => <div className="text-right">{Number(value || 0).toFixed(2)}</div>,
      },
      {
        key: "created_at",
        label: "Created",
        valueGetter: (row) => row.created_at || "",
        render: (value) => {
          if (!value) return "-";
          return new Date(value).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        },
        searchValue: (row) => {
          if (!row.created_at) return "";
          return new Date(row.created_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        },
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

  const fetchEntries = useCallback(async ({
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
      const res = await api.get("/inventory-entries", { params });
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
      console.error("Failed to fetch inventory entries:", err);
      showToast("error", "Failed to load inventory entries");
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    if (isAllMode) return;
    fetchEntries({ query: "", field: "all", fetchAll: false, pageOverride: page, limitOverride: limit });
  }, [fetchEntries, page, limit]);

  const handleServerSearch = useCallback(
    ({ query, field, fetchAll }) => {
      setPage(1);
      fetchEntries({
        query,
        field,
        fetchAll,
        pageOverride: 1,
        limitOverride: limit,
      });
    },
    [fetchEntries, limit]
  );

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/inventory-entries/${id}`)));
      showToast("success", `${keys.length} record(s) deleted`);
      setSelectedRows([]);
      fetchEntries(serverSearch);
    } catch {
      showToast("error", "Failed to delete some records");
    }
  };

  const handleDelete = async () => {
    if (!confirm.id) return;
    try {
      await api.delete(`/inventory-entries/${confirm.id}`);
      setResults((prev) => prev.filter((r) => r.id !== confirm.id));
      showToast("success", "Inventory entry deleted");
      fetchEntries(serverSearch);
    } catch {
      showToast("error", "Failed to delete entry");
    } finally {
      setConfirm({ open: false, id: null });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => navigate("/warehouse/inventory-entry")}
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
            <span>Inventory Entry Search</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <UploadImportButton
            endpoint="/inventory-entries/bulk"
            fieldConfig={INVENTORY_ENTRY_IMPORT_CONFIG}
            onDone={() => fetchEntries({ pageOverride: 1 })}
          />
          <ExportBottomSheet
            columns={columns}
            rows={results}
            selectedRowKeys={selectedRows}
            onExportRows={async () => {
              try {
                const res = await api.get("/inventory-entries", { params: { all: "true" } });
                return res.data?.data || [];
              } catch {
                const res = await api.get("/inventory-entries");
                return res.data?.data || [];
              }
            }}
            fileName="inventory_entry_search"
            buttonClassName="topbar-action-btn topbar-action-export"
          />
        </div>
      </div>

      <div className="p-4 flex-1 min-h-0">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm p-3 h-full flex flex-col min-h-0">
          <FilterableDataTable
            rows={results}
            columns={columns}
            loading={loading}
            loadingText="Loading inventory entries..."
            emptyText="No inventory entries found."
            searchPlaceholder="Search in inventory entry fields..."
            showExport={false}
            enableColumnResize
            tablePreferenceKey="warehouse.inventory_entry_search.list"
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
            onRowClick={(entry) => navigate(`/warehouse/inventory-entry?edit=${entry.id}`)}
            fillHeight
            renderActions={(entry, { selectedCount } = {}) => (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/warehouse/inventory-entry?edit=${entry.id}`)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary rounded p-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm({ open: true, id: entry.id })}
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
        title="Confirm Delete"
        message="Are you sure you want to delete this inventory entry? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, id: null })}
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

export default InventoryEntrySearchPage;
