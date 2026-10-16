import SearchGridPanel from "../../components/SearchGridPanel";
import { masterSearchAreaSx } from "../../theme/erpUi";
import useSearchGrid, { createSearchGridAdapter } from "../../hooks/useSearchGrid";
import { useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Toast from "../../components/Toast";
import FilterableDataTable from "../../components/FilterableDataTable";
import Breadcrumbs from "../../components/Breadcrumbs";
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
        render: (value) => <div style={{ textAlign: "right" }}>{formatMoney(value)}</div>,
      },
      {
        key: "final_price",
        label: "Final Price",
        valueGetter: (row) => Number(row.final_price || 0),
        render: (value) => <div style={{ textAlign: "right" }}>{formatMoney(value)}</div>,
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

  const grid = useSearchGrid({
    adapter: createSearchGridAdapter("/barcodes"),
    onError: err => setToast({ open: true, type: "error", message: err.response?.data?.message || "Failed to load records" }),
  });
  const { rows: results, loading, page, setPage, limit, setLimit, pagination } = grid;
  const fetchBarcodes = grid.refresh;
  const handleServerSearch = grid.onServerSearch;

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
            <ArrowLeft size={16} />
          </IconButton>
          <Breadcrumbs
            sx={{ fontSize: 12.25, fontWeight: 600 }}
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: "Barcode Search" },
            ]}
          />
        </Stack>
      </Stack>

      <Box sx={masterSearchAreaSx}>
        <SearchGridPanel>
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
            onRefresh={fetchBarcodes}
            refreshDisabled={loading}
            enableServerSearch
            onServerSearch={handleServerSearch}
            pagination={grid.rawPagination}
            onNextCursor={grid.navigateCursor}
            onPreviousCursor={grid.navigateCursor}
            page={page}
            limit={limit}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
            paginationMode="server"
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
                  <Printer size={14} />
                </IconButton>
              </Box>
            )}
          />
        </SearchGridPanel>
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
