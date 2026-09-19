import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import FilterableDataTable from "../../components/FilterableDataTable";
import { Box, Stack, Typography, IconButton, Button } from "@mui/material";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

const BarcodeSearchPage = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const showToast = (type, message) => setToast({ open: true, type, message });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [serverSearch, setServerSearch] = useState({ query: "", field: "all", fetchAll: false });
  const [backendPagination, setBackendPagination] = useState({ total: 0, totalPages: 1 });

  const columns = useMemo(
    () => [
      {
        key: "barcode",
        label: "Barcode No",
        valueGetter: (row) => row.barcode || "-",
      },
      {
        key: "product",
        label: "Product",
        valueGetter: (row) => row.product?.name || row.product_name || "-",
      },
      {
        key: "size",
        label: "Size",
        valueGetter: (row) => row.size || "-",
      },
      {
        key: "design_no",
        label: "Design",
        valueGetter: (row) => row.design_no || "-",
      },
      {
        key: "batch_no",
        label: "Batch No",
        valueGetter: (row) => row.batch_no || "-",
      },
      {
        key: "mrp",
        label: "MRP",
        valueGetter: (row) => Number(row.mrp || 0),
        render: (value) => <div className="text-right">{formatMoney(value)}</div>,
      },
      {
        key: "final_price",
        label: "Final Price",
        valueGetter: (row) => Number(row.final_price || 0),
        render: (value) => <div className="text-right">{formatMoney(value)}</div>,
      },
      {
        key: "supplier",
        label: "Supplier",
        valueGetter: (row) => row.direct_purchase?.supplier_name || "-",
      },
      {
        key: "invoice_no",
        label: "Invoice No",
        valueGetter: (row) => row.direct_purchase?.invoice_no || "-",
      },
      {
        key: "purchase_date",
        label: "Purchase Date",
        valueGetter: (row) => row.direct_purchase?.purchase_date || "",
        render: (value) => formatDate(value),
        searchValue: (row) => formatDate(row.direct_purchase?.purchase_date),
      },
      {
        key: "created_at",
        label: "Generated",
        valueGetter: (row) => row.created_at || "",
        render: (value) => formatDate(value),
        searchValue: (row) => formatDate(row.created_at),
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

  const fetchBarcodes = useCallback(async ({
    query = "",
    fetchAll = false,
    pageOverride = page,
    limitOverride = limit,
  } = {}) => {
    const normalizedQuery = String(query || "").trim();
    const shouldFetchAll = Boolean(fetchAll) || normalizedQuery !== "";
    setServerSearch({ query: normalizedQuery, field: "all", fetchAll: shouldFetchAll });
    setLoading(true);
    try {
      const params = shouldFetchAll
        ? { all: "true" }
        : { page: pageOverride, limit: limitOverride };
      if (normalizedQuery) params.search = normalizedQuery;
      const res = await api.get("/barcodes", { params });
      const rows = res.data?.data || [];
      setResults(rows);
      if (shouldFetchAll) {
        const total = rows.length;
        setBackendPagination({
          total,
          totalPages: Math.max(Math.ceil(total / Math.max(limitOverride, 1)), 1),
        });
      } else {
        const total = Number(res.data?.total ?? rows.length) || 0;
        const perPage = Number(res.data?.limit ?? limitOverride) || limitOverride;
        setBackendPagination({
          total,
          totalPages: Math.max(Math.ceil(total / Math.max(perPage, 1)), 1),
        });
      }
    } catch (err) {
      console.error("Failed to fetch barcodes:", err);
      showToast("error", "Failed to load barcodes");
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    if (isAllMode) return;
    fetchBarcodes({ query: "", fetchAll: false, pageOverride: page, limitOverride: limit });
  }, [fetchBarcodes, page, limit]);

  const handleServerSearch = useCallback(
    ({ query, fetchAll }) => {
      setPage(1);
      fetchBarcodes({
        query,
        fetchAll,
        pageOverride: 1,
        limitOverride: limit,
      });
    },
    [fetchBarcodes, limit]
  );

  const handleReprint = (row) => {
    if (row.direct_purchase_id) {
      navigate(`/warehouse/barcode?direct_purchase_id=${row.direct_purchase_id}`);
      return;
    }
    showToast("error", "This barcode isn't linked to a direct purchase - it can't be reprinted from here yet.");
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }} className="master-responsive">
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate("/warehouse")} aria-label="Back" sx={{ mr: 1.5, color: "text.secondary" }}>
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/warehouse")} sx={{ minWidth: "auto", p: 0, fontSize: 12.25, fontWeight: 600 }}>
              Warehouse
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Barcode Search</Box>
          </Stack>
        </Stack>
      </Stack>

      <Box sx={{ p: 2, flex: 1, minHeight: 0 }}>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "1.75px", p: 1.5, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <FilterableDataTable
            rows={results}
            columns={columns}
            loading={loading}
            loadingText="Loading barcodes..."
            emptyText="No barcodes found."
            searchPlaceholder="Search by barcode, batch no, or product..."
            showExport={false}
            enableColumnResize
            tablePreferenceKey="warehouse.barcode_search.list"
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
            renderActions={(row) => (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconButton
                  type="button"
                  onClick={() => handleReprint(row)}
                  title={row.direct_purchase_id ? "Reprint this barcode" : "Not linked to a direct purchase"}
                  disabled={!row.direct_purchase_id}
                  className="glass-btn glass-btn-primary"
                  sx={{ borderRadius: "3.5px", p: 0.75 }}
                >
                  <Printer className="w-3.5 h-3.5" />
                </IconButton>
              </Box>
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
    </Box>
  );
};

export default BarcodeSearchPage;
