import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import { Box, Stack, Typography, IconButton, Button } from "@mui/material";

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
        render: (value) => (
          <Box component="span" sx={{ fontFamily: "monospace", fontSize: 11 }}>
            {value || "-"}
          </Box>
        ),
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
        render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
      },
      {
        key: "stock",
        label: "Stock",
        render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
      },
      {
        key: "cost",
        label: "Cost",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toFixed2(value)}</Box>,
      },
      {
        key: "net",
        label: "Net",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toFixed2(value)}</Box>,
      },
      {
        key: "sale",
        label: "Sale",
        render: (value) => <Box sx={{ textAlign: "right" }}>{toFixed2(value)}</Box>,
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
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }} className="master-responsive">
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ mr: 1.5, color: "text.secondary" }}>
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/warehouse")} sx={{ minWidth: "auto", p: 0, fontSize: 12.25, fontWeight: 600 }}>
              Warehouse
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Physical Stock</Box>
          </Stack>
        </Stack>

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
      </Stack>

      <Box sx={{ p: 2 }}>
        <Stack
          direction="row"
          spacing={3}
          sx={{ flexWrap: "wrap", alignItems: "center", fontSize: 12.25, fontWeight: 600, bgcolor: "background.paper", p: 1.5, borderRadius: "7px", boxShadow: 3, border: "1px solid", borderColor: "divider" }}
        >
          <Box sx={{ color: "text.secondary" }}>
            Rows: <Box component="span" sx={{ color: "primary.main" }}>{stats.rows}</Box>
          </Box>
          <Box sx={{ color: "text.secondary" }}>
            Total Qty: <Box component="span" sx={{ color: "#9333ea" }}>{stats.qty}</Box>
          </Box>
          <Box sx={{ color: "text.secondary" }}>
            Total Cost: <Box component="span" sx={{ color: "warning.main" }}>{stats.cost.toFixed(2)}</Box>
          </Box>
          <Box sx={{ color: "text.secondary" }}>
            Total Net: <Box component="span" sx={{ color: "success.main" }}>{stats.net.toFixed(2)}</Box>
          </Box>
          <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
            Source: Completed transport entries and direct purchases.
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, p: 2, pt: 0, minHeight: 0 }}>
        <Box sx={{ height: "100%", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "hidden", display: "flex", flexDirection: "column", p: 1.5, minHeight: 0 }}>
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

export default PhysicalStock;
