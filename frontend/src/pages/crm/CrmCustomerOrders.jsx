import SearchGridPanel from "../../components/SearchGridPanel";
import { masterSearchAreaSx } from "../../theme/erpUi";
import useSearchGrid, { createSearchGridAdapter } from "../../hooks/useSearchGrid";
import React, { useMemo, useState } from "react";
import { ArrowLeft, Copy, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";
import UploadImportButton from "../../components/UploadImportButton";
import Breadcrumbs from "../../components/Breadcrumbs";

// Matches config('pagination.resources.customer_orders.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchCustomerOrderGroupSummaries, onFetchGroupRows: fetchCustomerOrderGroupRows } =
  createGroupFetchers("/customer-orders", { customerName: "customer_id", supplier: "supplier_id" });

const ORDER_COLUMNS = [
  { key: "orderNo", label: "Order No" },
  { key: "orderDate", label: "Order Date" },
  { key: "deliveryDate", label: "Delivery Date" },
  { key: "customerName", label: "Customer" },
  { key: "customerMobile", label: "Mobile" },
  { key: "company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "supplier", label: "Supplier" },
  { key: "counter", label: "Counter" },
  { key: "totalQty", label: "Total Qty" },
  { key: "totalAmount", label: "Total Amount" },
  { key: "paidAmount", label: "Paid" },
  { key: "balanceAmount", label: "Balance" },
  { key: "status", label: "Status" },
  { key: "receivedBy", label: "Received By" },
  { key: "remarks", label: "Remarks" },
];

const ORDER_IMPORT_CONFIG = {
  aliases: {
    orderno: "orderNo",
    orderdate: "orderDate",
    deliverydate: "deliveryDate",
    customername: "customerName",
    customermobile: "customerMobile",
    address: "customerAddress",
    cityid: "cityId",
    companyid: "companyId",
    locationid: "locationId",
    supplierid: "supplierId",
    counterid: "counterId",
    totalqty: "totalQty",
    totalamount: "totalAmount",
    paidamount: "paidAmount",
    receivedbyid: "receivedById",
    status: "status",
    remarks: "remarks",
  },
  required: ["customerName"],
  sampleFileName: "customer_order_sample.xlsx",
  sampleHeaders: [
    "orderDate",
    "deliveryDate",
    "customerName",
    "customerMobile",
    "customerAddress",
    "cityId",
    "companyId",
    "locationId",
    "supplierId",
    "counterId",
    "totalQty",
    "totalAmount",
    "paidAmount",
    "receivedById",
    "status",
    "remarks",
  ],
};

const toText = (value, fallback = "--") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
};

const toMoney = (value) => Number(value || 0).toFixed(2);

const mapOrderRow = (row) => ({
  id: row.id,
  orderNo: toText(row.order_no),
  orderDate: toText(row.order_date),
  deliveryDate: toText(row.delivery_date),
  customerName: toText(row.customer_name || row.customer?.name),
  customerMobile: toText(row.customer_mobile || row.customer?.mobile_no),
  company: toText(row.company?.name),
  location: toText(row.location?.name),
  supplier: toText(row.supplier?.name),
  counter: toText(row.counter?.name),
  totalQty: toText(row.total_qty, "0"),
  totalAmount: toMoney(row.total_amount),
  paidAmount: toMoney(row.paid_amount),
  balanceAmount: toMoney(row.balance_amount),
  status: toText(row.status),
  receivedBy: row.receivedBy
    ? `${toText(row.receivedBy.name)} ${toText(row.receivedBy.surname, "")}`.trim()
    : "--",
  remarks: toText(row.remarks),
});

const CrmCustomerOrders = () => {
  const navigate = useNavigate();
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

  const grid = useSearchGrid({
    adapter: createSearchGridAdapter("/customer-orders", mapOrderRow),
    onError: err => toast.error(err.response?.data?.message || "Failed to load records"),
  });
  const { rows: orders, loading, page, setPage, limit, setLimit, pagination } = grid;
  const fetchOrders = grid.refresh;

  const handleDeleteConfirmed = async () => {
    const { id, name } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(`/customer-orders/${id}`);
      toast.success(`Order "${name}" deleted successfully.`);
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete order");
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/customer-orders/${id}`)));
      toast.success(`${keys.length} customer order(s) deleted`);
      setSelectedRows([]);
      fetchOrders();
    } catch {
      toast.error("Failed to delete some customer orders");
    }
  };

  const visibleColumns = useMemo(() => ORDER_COLUMNS, []);

  return (
    <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected customer order(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />

      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 0.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Breadcrumbs
            sx={{ fontSize: 13, fontWeight: 600 }}
            items={[
              { label: "CRM", onClick: () => navigate("/crm") },
              { label: "Customer Orders" },
            ]}
          />
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
          <Button onClick={() => navigate("/crm/customer-orders/new")} className="topbar-action-btn topbar-action-new">
            <PlusCircle size={12} style={{marginRight: 4}} /> New
          </Button>
          <Box component="span">|</Box>
          <UploadImportButton
            endpoint="/customer-orders/bulk"
            fieldConfig={ORDER_IMPORT_CONFIG}
            onDone={() => fetchOrders()}
          />
        </Stack>
      </Stack>

      <Box sx={masterSearchAreaSx}>
        <SearchGridPanel>
          <Typography sx={{ fontSize: 15.75, fontWeight: 700, mb: 1.5 }}>Customer Order Search</Typography>
          <FilterableDataTable
            rows={orders}
            columns={visibleColumns}
            loading={loading}
            emptyText="No customer orders found. Click Search to load data."
            searchPlaceholder="Search customer orders..."
            enableColumnResize
            tablePreferenceKey="crm.customer_orders.list"
            onRefresh={grid.refresh}
            refreshDisabled={loading}
            enableSelection
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            pagination={grid.rawPagination}
            onNextCursor={grid.navigateCursor}
            onPreviousCursor={grid.navigateCursor}
            fillHeight
            page={page}
            limit={limit}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            onPageChange={setPage}
            onLimitChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
            onFetchGroupSummaries={fetchCustomerOrderGroupSummaries}
            onFetchGroupRows={fetchCustomerOrderGroupRows}
            paginationMode="server"
            enableVirtualization
            enableServerSearch
            onServerSearch={grid.onServerSearch}
            onExportRows={async ({ query, field }) => {
              const params = { all: "true" };
              const trimmed = String(query || "").trim();
              if (trimmed) params.search = trimmed;
              if (field && field !== "all") params.field = field;
              const res = await api.get("/customer-orders", { params });
              return (res.data?.data || []).map(mapOrderRow);
            }}
            onRowClick={(row) => navigate(`/crm/customer-orders/${row.id}`)}
            renderActions={(row, { selectedCount } = {}) => (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/crm/customer-orders/${row.id}`);
                  }}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary"
                  sx={{ minWidth: "auto" }}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/crm/customer-orders/new?copy=${row.id}`);
                  }}
                  title="Duplicate"
                  disabled={selectedCount > 1}
                  className="glass-btn"
                  sx={{ minWidth: "auto" }}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirm({ open: true, id: row.id, name: row.orderNo });
                  }}
                  title="Delete"
                  className="glass-btn glass-btn-danger"
                  sx={{ minWidth: "auto" }}
                >
                  <Trash2 size={14} />
                </Button>
              </Stack>
            )}
          />
        </SearchGridPanel>
      </Box>
    </Box>
  );
};

export default CrmCustomerOrders;
