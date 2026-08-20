import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import UploadImportButton from "../../components/UploadImportButton";

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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [serverSearch, setServerSearch] = useState({
    query: "",
    field: "all",
    fetchAll: false,
  });

  const fetchOrders = useCallback(
    async (
      pageToLoad = page,
      limitToLoad = limit,
      fetchAll = false,
      query = serverSearch.query,
      field = serverSearch.field
    ) => {
      try {
        setLoading(true);
        const trimmedQuery = String(query || "").trim();
        const shouldFetchAll = fetchAll || trimmedQuery !== "";
        const params = shouldFetchAll
          ? {
              all: "true",
              search: trimmedQuery || undefined,
              field: field && field !== "all" ? field : undefined,
            }
          : { page: pageToLoad, limit: limitToLoad };

        const res = await api.get("/customer-orders", { params });
        const rows = (res.data?.data || []).map(mapOrderRow);
        setOrders(rows);

        if (shouldFetchAll || !res.data?.pagination) {
          setPagination({ total: rows.length, totalPages: 1 });
        } else {
          const p = res.data.pagination;
          setPagination({
            total: Number(p.total) || 0,
            totalPages: Math.max(Number(p.totalPages) || 1, 1),
          });
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load customer orders");
      } finally {
        setLoading(false);
      }
    },
    [page, limit, serverSearch]
  );

  useEffect(() => {
    const hasSearch = String(serverSearch.query || "").trim() !== "";
    fetchOrders(page, limit, hasSearch || serverSearch.fetchAll, serverSearch.query, serverSearch.field);
  }, [fetchOrders, page, limit, serverSearch]);

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
    <div className="min-h-[70vh] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
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

      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/crm")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              CRM
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Customer Orders</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            onClick={() => navigate("/crm/customer-orders/new")}
            className="topbar-action-btn topbar-action-new"
          >
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
          <span>|</span>
          <UploadImportButton
            endpoint="/customer-orders/bulk"
            fieldConfig={ORDER_IMPORT_CONFIG}
            onDone={() => fetchOrders()}
          />
        </div>
      </div>

      <div className="p-3 pb-16">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-3">Customer Order Search</h2>
          <FilterableDataTable
            rows={orders}
            columns={visibleColumns}
            loading={loading}
            emptyText="No customer orders found. Click Search to load data."
            searchPlaceholder="Search customer orders..."
            enableColumnResize
            tablePreferenceKey="crm.customer_orders.list"
            onRefresh={() =>
              fetchOrders(
                1,
                limit,
                String(serverSearch.query || "").trim() !== "" || serverSearch.fetchAll,
                serverSearch.query,
                serverSearch.field
              )
            }
            refreshDisabled={loading}
            enableSelection
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            page={page}
            limit={limit}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            onPageChange={setPage}
            onLimitChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
            paginationMode="server"
            enableServerSearch
            onServerSearch={({ query, field, fetchAll }) => {
              const next = {
                query: String(query || "").trim(),
                field: field || "all",
                fetchAll: !!fetchAll,
              };
              setServerSearch((prev) => {
                if (
                  prev.query === next.query
                  && prev.field === next.field
                  && prev.fetchAll === next.fetchAll
                ) {
                  return prev;
                }
                return next;
              });
              if (page !== 1) setPage(1);
            }}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/crm/customer-orders/${row.id}`);
                  }}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary rounded p-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/crm/customer-orders/new?copy=${row.id}`);
                  }}
                  title="Duplicate"
                  disabled={selectedCount > 1}
                  className="glass-btn rounded p-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirm({ open: true, id: row.id, name: row.orderNo });
                  }}
                  title="Delete"
                  className="glass-btn glass-btn-danger rounded p-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          />
        </div>
      </div>

    </div>
  );
};

export default CrmCustomerOrders;
