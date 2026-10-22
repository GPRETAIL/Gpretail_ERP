import PageHeader from "../../components/PageHeader";
import SearchGridPanel from "../../components/SearchGridPanel";
import { masterSearchAreaSx } from "../../theme/erpUi";
import useSearchGrid, { createSearchGridAdapter } from "../../hooks/useSearchGrid";
import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import Breadcrumbs from "../../components/Breadcrumbs";
import { createGroupFetchers } from "../../utils/serverGrouping";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import { usePrintContext } from "../../context/PrintContext";
import { Box, Stack, IconButton, Button } from "@mui/material";

// Matches config('pagination.resources.purchase_returns.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchPurchaseReturnGroupSummaries, onFetchGroupRows: fetchPurchaseReturnGroupRows } =
  createGroupFetchers("/purchase-returns", { supplier: "supplier_id" });

const toNumber = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
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

const PurchaseReturnSearchPage = () => {
  const navigate = useNavigate();
  const { printHtml } = usePrintContext();

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

  const columns = useMemo(
    () => [
      {
        key: "return_no",
        label: "Return No",
        valueGetter: (row) => row.return_no || "-",
      },
      {
        key: "return_date",
        label: "Date",
        valueGetter: (row) => row.return_date || "",
        render: (value) => formatDate(value),
        searchValue: (row) => formatDate(row.return_date),
      },
      {
        key: "supplier",
        label: "Supplier",
        valueGetter: (row) => row.supplier?.name || "-",
      },
      {
        key: "company",
        label: "Company",
        valueGetter: (row) => row.company?.name || "-",
      },
      {
        key: "transport",
        label: "Transport",
        valueGetter: (row) => row.transport?.name || "-",
      },
      {
        key: "total_qty",
        label: "Qty",
        valueGetter: (row) => Number(row.total_qty || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0)}</Box>,
      },
      {
        key: "total_amount",
        label: "Amount",
        valueGetter: (row) => toNumber(row.total_amount),
        render: (value) => <Box sx={{ textAlign: "right" }}>{toNumber(value).toFixed(2)}</Box>,
      },
    ],
    []
  );

  const grid = useSearchGrid({
    adapter: createSearchGridAdapter("/purchase-returns"),
    onError: err => setToast({ open: true, type: "error", message: err.response?.data?.message || "Failed to load records" }),
  });
  const { rows: results, loading, page, setPage, limit, setLimit, pagination } = grid;
  const handleSearch = grid.refresh;
  const handleServerSearch = grid.onServerSearch;

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/purchase-returns/${id}`)));
      setToast({ open: true, type: "success", message: `${keys.length} record(s) deleted` });
      setSelectedRows([]);
      handleSearch();
    } catch {
      setToast({ open: true, type: "error", message: "Failed to delete some records" });
    }
  };

  const handlePrint = (entry) => {
    const rows = (entry.items || [])
      .map(
        (item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.barcode || "-"}</td>
            <td>${item.product_name || "-"}</td>
            <td>${item.return_qty || 0}</td>
            <td style="text-align:right;">${toNumber(item.amount).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Purchase Return ${entry.return_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h2>Purchase Return</h2>
          <div>Return No: ${entry.return_no}</div>
          <div>Date: ${entry.return_date}</div>
          <div>Supplier: ${entry.supplier?.name || "-"}</div>
          <div>Company: ${entry.company?.name || "-"}</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Barcode</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    printHtml(html, {
      label: `PurchaseReturn-${entry.return_no || entry.id || "print"}`,
      docType: "purchase_return",
      companyId: Number(entry.company_id || entry.company?.id || 0) || undefined,
      copies: 1,
    });
  };


  return (
    <Box sx={{ height: "100%", bgcolor: "background.default", color: "text.primary", display: "flex", flexDirection: "column" }} className="master-responsive">
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
      <PageHeader
        onBack={() => navigate("/warehouse/purchase-return")}
        backLabel="Back"
        title={<>
          <Breadcrumbs
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: "Purchase Return Search" },
            ]}
          />
        </>}
        actions={<>
          <ExportBottomSheet
          columns={columns}
          rows={results}
          selectedRowKeys={selectedRows}
          onExportRows={async () => {
            const res = await api.get("/purchase-returns", { params: { all: "true" } });
            return res.data?.data || [];
          }}
          fileName="purchase_return_search"
          buttonClassName="topbar-action-btn topbar-action-export"
        />
        </>}
      />

      <Box sx={masterSearchAreaSx}>
        <SearchGridPanel>
          <FilterableDataTable
            rows={results}
            columns={columns}
            loading={loading}
            loadingText="Searching purchase returns..."
            emptyText="No purchase return records found."
            searchPlaceholder="Search in purchase return fields..."
            showExport={false}
            tablePreferenceKey="warehouse.purchase_return_search.list"
            onRefresh={handleSearch}
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
            onFetchGroupSummaries={fetchPurchaseReturnGroupSummaries}
            onFetchGroupRows={fetchPurchaseReturnGroupRows}
            enableVirtualization
            paginationMode="server"
            fillHeight
            onRowClick={(entry) => navigate(`/warehouse/purchase-return?edit=${entry.id}`)}
            enableKeyboardNav
            enableSelection
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            renderActions={(entry, { selectedCount } = {}) => (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                <IconButton
                  type="button"
                  onClick={() => navigate(`/warehouse/purchase-return?edit=${entry.id}`)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary"
                  sx={{ borderRadius: "3.5px", p: 0.75 }}
                >
                  <Pencil size={14} />
                </IconButton>
                <Button
                  type="button"
                  variant="text"
                  onClick={() => handlePrint(entry)}
                  sx={{ minWidth: "auto", p: 0, fontSize: 12.25, "&:hover": { textDecoration: "underline" } }}
                >
                  Print
                </Button>
              </Stack>
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

export default PurchaseReturnSearchPage;
