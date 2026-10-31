import PageHeader from "../../components/PageHeader";
import SearchGridPanel from "../../components/SearchGridPanel";
import { masterSearchAreaSx } from "../../theme/erpUi";
import useSearchGrid, { createSearchGridAdapter } from "../../hooks/useSearchGrid";
import { useEffect, useMemo, useState } from "react";
import { Printer, X } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import FilterableDataTable from "../../components/FilterableDataTable";
import Breadcrumbs from "../../components/Breadcrumbs";
import { usePrintContext } from "../../context/PrintContext";
import {
  DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION,
  fetchWarehouseBarcodeCustomization,
} from "../../utils/warehouseBarcodeCustomization";
import { buildLabelQrSources, buildStickerLabels, printWarehouseBarcodeLabels } from "./BarcodeGeneration";
import { Box, Button, Chip, IconButton, Stack } from "@mui/material";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

// Each barcode row is one physical sticker, so a reprint renders exactly the stored number/price.
const labelsForRows = (rows, customization) => rows.flatMap((row) => buildStickerLabels({
  item: { sourceItemId: `reprint-${row.id}`, productName: row.product?.name || row.product_name || "" },
  barcodeRows: [row],
  customization,
}));

const BarcodeSearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authUser = useSelector((state) => state.auth.user);
  const { printHtml: queuePrintHtml } = usePrintContext();
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [selectedRows, setSelectedRows] = useState([]);
  const [printing, setPrinting] = useState(false);
  const [labelCustomization, setLabelCustomization] = useState(DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION);
  const showToast = (type, message) => setToast({ open: true, type, message });

  // Opened from the Warehouse Dashboard for a completed entry: limit the list to that entry.
  const directPurchaseId = searchParams.get("direct_purchase_id") || "";
  const transportEntryId = searchParams.get("transport_entry_id") || "";
  // Labels a store printed for goods received on a store-to-store transfer.
  const transferId = searchParams.get("stock_outward_id") || "";
  const entryLabel = searchParams.get("label") || "";
  const sourceFilter = useMemo(
    () => (directPurchaseId ? { direct_purchase_id: directPurchaseId } : transportEntryId ? { transport_entry_id: transportEntryId }
      : transferId ? { stock_outward_id: transferId } : {}),
    [directPurchaseId, transportEntryId, transferId]
  );

  useEffect(() => {
    let cancelled = false;
    // No "default" placeholder: a non-numeric company_id is rejected by store-context resolution
    // and pops the store chooser. Without an id the API uses the resolved store.
    fetchWarehouseBarcodeCustomization(api, authUser?.company_id || undefined).then((config) => {
      if (!cancelled) setLabelCustomization(config);
    });
    return () => {
      cancelled = true;
    };
  }, [authUser?.company_id]);

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
    adapter: createSearchGridAdapter("/barcodes", undefined, sourceFilter),
    scopeKey: JSON.stringify(sourceFilter),
    onError: err => setToast({ open: true, type: "error", message: err.response?.data?.message || "Failed to load records" }),
  });
  const { rows: results, loading, page, setPage, limit, setLimit, pagination } = grid;
  const fetchBarcodes = grid.refresh;
  const handleServerSearch = grid.onServerSearch;

  // Selection is kept by id across pages; printing needs the row data, so keep the selected rows
  // as they are picked (a row on another page is no longer in results).
  const [selectedRowData, setSelectedRowData] = useState([]);
  const handleSelectionChange = (ids) => {
    setSelectedRows(ids);
    setSelectedRowData((prev) => {
      const byId = Object.fromEntries([...prev, ...results].map((row) => [row.id, row]));
      return ids.map((id) => byId[id]).filter(Boolean);
    });
  };
  const clearSelection = () => handleSelectionChange([]);

  const printRows = async (rows) => {
    if (rows.length === 0 || printing) return;
    setPrinting(true);
    try {
      const labels = labelsForRows(rows, labelCustomization);
      if (labels.length === 0) {
        showToast("error", "The selected rows have no barcode numbers to print.");
        return;
      }
      const result = await printWarehouseBarcodeLabels({
        labels,
        qrSources: await buildLabelQrSources(labels),
        customization: labelCustomization,
        storeName: String(authUser?.company_name || "").trim() || "Store",
        queuePrintHtml,
        jobName: rows.length === 1 ? `Reprint ${rows[0].barcode}` : `Reprint ${rows.length} barcodes`,
      });
      if (result.message) showToast(result.ok ? "success" : "error", result.message);
      if (result.ok) clearSelection();
    } catch (err) {
      showToast("error", err?.message || "Failed to print barcode stickers.");
    } finally {
      setPrinting(false);
    }
  };

  const clearSourceFilter = () => {
    clearSelection();
    setSearchParams({});
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }} className="master-responsive">
      <PageHeader
        onBack={() => navigate("/warehouse")}
        backLabel="Back"
        title={<>
          <Breadcrumbs
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: "Barcode Search & Reprint" },
            ]}
          />
        </>}
        actions={(
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            {(directPurchaseId || transportEntryId || transferId) && (
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${transferId ? "Transfer" : "Entry"}: ${entryLabel || directPurchaseId || transportEntryId || transferId}`}
                onDelete={clearSourceFilter}
                deleteIcon={<X size={14} />}
                aria-label="Showing barcodes of one entry; remove to show all"
              />
            )}
            <Button
              variant="contained"
              size="small"
              startIcon={<Printer size={15} />}
              disabled={selectedRowData.length === 0 || printing}
              onClick={() => printRows(selectedRowData)}
            >
              {printing ? "Printing..." : `Print selected${selectedRowData.length ? ` (${selectedRowData.length})` : ""}`}
            </Button>
          </Stack>
        )}
      />

      <Box sx={masterSearchAreaSx}>
        <SearchGridPanel>
          <FilterableDataTable
            rows={results}
            columns={columns}
            loading={loading}
            loadingText="Loading barcodes..."
            emptyText={transportEntryId
              // LR entries are not yet linked to their barcode rows in the database schema.
              ? "Barcodes can't be matched to this LR entry yet. Remove the entry filter and search by barcode or product."
              : directPurchaseId ? "No barcodes were generated for this entry." : "No barcodes found."}
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
            enableSelection
            selectedRows={selectedRows}
            onSelectionChange={handleSelectionChange}
            getRowSelectionLabel={(row) => `Select barcode ${row.barcode}`}
            renderActions={(row) => (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconButton
                  type="button"
                  onClick={() => printRows([row])}
                  title={`Reprint ${row.barcode}`}
                  aria-label={`Reprint ${row.barcode}`}
                  disabled={printing}
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
