import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";

const toFixed2 = (value) => Number(value || 0).toFixed(2);

const PhysicalStock = () => {
  const navigate = useNavigate();

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [loading, setLoading] = useState(true);
  const [rawStockRows, setRawStockRows] = useState([]);
  const [stats, setStats] = useState({
    rows: 0,
    qty: 0,
    cost: 0,
    net: 0,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [serverSearch, setServerSearch] = useState({ query: "", field: "all", fetchAll: false });
  const [backendPagination, setBackendPagination] = useState({ total: 0, totalPages: 1 });

  const stockTableColumns = useMemo(
    () => [
      {
        key: "barcode",
        label: "Barcode",
        render: (value) => <span className="font-mono text-[11px]">{value || "-"}</span>,
      },
      { key: "batch", label: "Batch" },
      { key: "company", label: "Company" },
      { key: "supplier", label: "Supplier" },
      { key: "product", label: "Product" },
      { key: "brand", label: "Brand" },
      { key: "colour", label: "Colour" },
      { key: "material", label: "Material" },
      { key: "pattern", label: "Pattern" },
      { key: "style", label: "Style" },
      { key: "sleeve", label: "Sleeve" },
      { key: "fit", label: "Fit" },
      { key: "type", label: "Type" },
      { key: "size", label: "Size" },
      { key: "section", label: "Section" },
      { key: "design", label: "Design" },
      {
        key: "qty",
        label: "Qty",
        render: (value) => <div className="text-right">{Number(value || 0)}</div>,
      },
      {
        key: "stock",
        label: "Stock",
        render: (value) => <div className="text-right">{Number(value || 0)}</div>,
      },
      {
        key: "cost",
        label: "Cost",
        render: (value) => <div className="text-right">{toFixed2(value)}</div>,
      },
      {
        key: "net",
        label: "Net",
        render: (value) => <div className="text-right">{toFixed2(value)}</div>,
      },
      {
        key: "sale",
        label: "Sale",
        render: (value) => <div className="text-right">{toFixed2(value)}</div>,
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
    const total = rawStockRows.length;
    const totalPages = Math.max(Math.ceil(total / Math.max(limit, 1)), 1);
    return { total, totalPages };
  }, [isAllMode, backendPagination, rawStockRows.length, limit]);

  const buildStats = (rows) => {
    const summary = rows.reduce(
      (acc, row) => ({
        rows: acc.rows + 1,
        qty: acc.qty + (row.qty || 0),
        cost: acc.cost + (row.cost || 0) * (row.qty || 0),
        net: acc.net + (row.net || 0) * (row.qty || 0),
      }),
      { rows: 0, qty: 0, cost: 0, net: 0 }
    );
    setStats(summary);
  };

  const loadStockData = useCallback(async ({
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

    const params = shouldFetchAll
      ? { all: "true" }
      : { page: pageOverride, limit: limitOverride };
    if (normalizedQuery) params.search = normalizedQuery;
    if (normalizedField && normalizedField !== "all" && shouldFetchAll) params.field = normalizedField;

    const res = await api.get("/barcodes/physical-stock", { params });
    const rows = res.data?.data || [];
    setRawStockRows(rows);
    buildStats(rows);
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
    return rows;
  }, [limit, page]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadStockData({
          query: "",
          field: "all",
          fetchAll: false,
          pageOverride: page,
          limitOverride: limit,
        });
      } catch (err) {
        console.error("Failed to load physical stock data:", err);
        setToast({
          open: true,
          type: "error",
          message: "Failed to load physical stock data",
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAllMode) return;
    init();
  }, [loadStockData, page, limit]);

  const handleServerSearch = useCallback(
    ({ query, field, fetchAll }) => {
      setPage(1);
      loadStockData({
        query,
        field,
        fetchAll,
        pageOverride: 1,
        limitOverride: limit,
      });
    },
    [loadStockData, limit]
  );

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
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
            <span>Physical Stock</span>
          </h1>
        </div>

        <ExportBottomSheet
          columns={stockTableColumns}
          rows={rawStockRows}
          onExportRows={async () => {
            const res = await api.get("/barcodes/physical-stock", { params: { all: "true" } });
            return res.data?.data || [];
          }}
          fileName="physical_stock"
          buttonClassName="topbar-action-btn topbar-action-export"
        />
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-6 text-sm font-semibold bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md border border-gray-300 dark:border-gray-600">
          <div className="text-gray-700 dark:text-gray-300">
            Rows: <span className="text-blue-600 dark:text-blue-400">{stats.rows}</span>
          </div>
          <div className="text-gray-700 dark:text-gray-300">
            Total Qty: <span className="text-purple-600 dark:text-purple-400">{stats.qty}</span>
          </div>
          <div className="text-gray-700 dark:text-gray-300">
            Total Cost: <span className="text-orange-600 dark:text-orange-400">{stats.cost.toFixed(2)}</span>
          </div>
          <div className="text-gray-700 dark:text-gray-300">
            Total Net: <span className="text-green-600 dark:text-green-400">{stats.net.toFixed(2)}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Source: Completed transport entries and direct purchases.
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 pt-0 min-h-0">
        <div className="h-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden flex flex-col p-3 min-h-0">
          <FilterableDataTable
            rows={rawStockRows}
            columns={stockTableColumns}
            loading={loading}
            loadingText="Loading physical stock..."
            emptyText="No stock rows found."
            searchPlaceholder="Search in physical stock fields..."
            showExport={false}
            enableColumnResize
            tablePreferenceKey="warehouse.physical_stock.list"
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
            fillHeight
            enableVirtualization
          />
        </div>
      </div>

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default PhysicalStock;
