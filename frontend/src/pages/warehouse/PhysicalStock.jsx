import PageHeader from "../../components/PageHeader";
import SearchGridPanel from "../../components/SearchGridPanel";
import { masterSearchAreaSx } from "../../theme/erpUi";
import useSearchGrid, { createSearchGridAdapter } from "../../hooks/useSearchGrid";
import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import FilterableDataTable from "../../components/FilterableDataTable";
import Breadcrumbs from "../../components/Breadcrumbs";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import { Box, Stack, Typography, Button } from "@mui/material";

const toFixed2 = (value) => Number(value || 0).toFixed(2);

const PhysicalStock = () => {
  const navigate = useNavigate();

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });

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

  const grid = useSearchGrid({
    adapter: createSearchGridAdapter("/barcodes/physical-stock"),
    onError: err => setToast({ open: true, type: "error", message: err.response?.data?.message || "Failed to load stock" }),
  });
  const { rows: rawStockRows, loading, page, setPage, limit, setLimit, pagination } = grid;
  const handleServerSearch = grid.onServerSearch;
  const loadStockData = grid.refresh;
  const stats = rawStockRows.reduce((acc, row) => ({
    rows: acc.rows + 1, qty: acc.qty + (row.qty || 0),
    cost: acc.cost + (row.cost || 0) * (row.qty || 0), net: acc.net + (row.net || 0) * (row.qty || 0),
  }), { rows: 0, qty: 0, cost: 0, net: 0 });

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }} className="master-responsive">
      <PageHeader
        onBack={() => navigate(-1)}
        backLabel="Back"
        title={<>
          <Breadcrumbs
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: "Physical Stock" },
            ]}
          />
        </>}
        actions={<>
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
        </>}
      />

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

      <Box sx={masterSearchAreaSx}>
        <SearchGridPanel>
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
            onRefresh={loadStockData}
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
            paginationMode="server"
            pagination={grid.rawPagination}
            onNextCursor={grid.navigateCursor}
            onPreviousCursor={grid.navigateCursor}
            fillHeight
            enableVirtualization
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

export default PhysicalStock;
