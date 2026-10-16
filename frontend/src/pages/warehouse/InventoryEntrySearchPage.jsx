import SearchGridPanel from "../../components/SearchGridPanel";
import { masterSearchAreaSx } from "../../theme/erpUi";
import useSearchGrid, { createSearchGridAdapter } from "../../hooks/useSearchGrid";
import { useMemo, useState } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import Breadcrumbs from "../../components/Breadcrumbs";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import UploadImportButton from "../../components/UploadImportButton";
import { Box, Stack, IconButton, Button } from "@mui/material";

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
        render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0).toFixed(2)}</Box>,
      },
      {
        key: "total",
        label: "Total",
        valueGetter: (row) => Number(row.total || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{Number(value || 0).toFixed(2)}</Box>,
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

  const grid = useSearchGrid({
    adapter: createSearchGridAdapter("/inventory-entries"),
    onError: err => setToast({ open: true, type: "error", message: err.response?.data?.message || "Failed to load records" }),
  });
  const { rows: results, setRows: setResults, loading, page, setPage, limit, setLimit, pagination } = grid;
  const fetchEntries = grid.refresh;
  const handleServerSearch = grid.onServerSearch;

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
      fetchEntries();
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
      fetchEntries();
    } catch {
      showToast("error", "Failed to delete entry");
    } finally {
      setConfirm({ open: false, id: null });
    }
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }} className="master-responsive">
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate("/warehouse/inventory-entry")} aria-label="Back" sx={{ mr: 1.5, color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Breadcrumbs
            sx={{ fontSize: 12.25, fontWeight: 600 }}
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: "Inventory Entry Search" },
            ]}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
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
        </Stack>
      </Stack>

      <Box sx={masterSearchAreaSx}>
        <SearchGridPanel>
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
            onRefresh={fetchEntries}
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
            enableSelection
            enableKeyboardNav
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            onRowClick={(entry) => navigate(`/warehouse/inventory-entry?edit=${entry.id}`)}
            fillHeight
            renderActions={(entry, { selectedCount } = {}) => (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                <IconButton
                  type="button"
                  onClick={() => navigate(`/warehouse/inventory-entry?edit=${entry.id}`)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary"
                  sx={{ borderRadius: "3.5px", p: 0.75 }}
                >
                  <Pencil size={14} />
                </IconButton>
                <IconButton
                  type="button"
                  onClick={() => setConfirm({ open: true, id: entry.id })}
                  className="glass-btn glass-btn-danger"
                  title="Delete"
                  sx={{ borderRadius: "3.5px", p: 0.75 }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Stack>
            )}
          />
        </SearchGridPanel>
      </Box>

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
    </Box>
  );
};

export default InventoryEntrySearchPage;
