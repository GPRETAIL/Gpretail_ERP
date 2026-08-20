import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Eye, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import UploadImportButton from "../../components/UploadImportButton";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import useStoreNameMap from "../../hooks/useStoreNameMap";

const TRANSPORT_IMPORT_CONFIG = {
  aliases: {
    businessmode: "business_mode",
    name: "name",
    contactperson: "contact_person",
    contactno: "contact_no",
    email: "email_id",
    emailid: "email_id",
    address: "address",
    city: "city_id",
    cityid: "city_id",
    state: "state_id",
    stateid: "state_id",
    pan: "pan",
    gst: "gst",
    bank: "bank_id",
    bankid: "bank_id",
    branch: "branch",
    bankaccountname: "bank_account_name",
    ifsc: "ifsc",
    accountno: "account_no",
    price: "price",
    tax: "tax_id",
    taxid: "tax_id",
    vehicles: "vehicles",
    loadingperbox: "loading_per_box",
    loadingperbundle: "loading_per_bundle",
    allowedpaymentmode: "allowed_payment_mode",
    rcm: "rcm",
    isactive: "is_active",
    active: "is_active",
  },
  required: ["name"],
  boolFields: ["rcm", "is_active"],
  sampleFileName: "transport_sample.xlsx",
  sampleHeaders: [
    "business_mode", "name", "contact_person", "contact_no", "email", "address",
    "city", "state", "pan", "gst", "bank", "branch", "bank_account_name",
    "ifsc", "account_no", "price", "tax", "vehicles", "loading_per_box",
    "loading_per_bundle", "allowed_payment_mode", "rcm", "is_active",
  ],
};

const Transport = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirmDlg, setConfirmDlg] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [forceFetchAll, setForceFetchAll] = useState(false);
  const storeMap = useStoreNameMap();

  useEffect(() => {
    fetchData();
  }, [page, limit, tableSearch, forceFetchAll]);

  const fetchData = async (queryOverride = tableSearch) => {
    try {
      setLoading(true);
      const query = String(queryOverride || "").trim();
      const params = (query || forceFetchAll)
        ? { all: "true", search: query || undefined, field: tableSearchField !== "all" ? tableSearchField : undefined }
        : { page, limit };
      const res = await api.get("/transports", { params });
      const rows = res.data?.data || [];
      setData(rows);
      if (query) {
        setPagination({ total: rows.length, totalPages: 1 });
      } else {
        const p = res.data?.pagination || {};
        const total = Number(p.total ?? res.data?.total ?? rows.length) || 0;
        const totalPages = Math.max(
          Number(p.totalPages ?? res.data?.totalPages ?? Math.ceil(total / Math.max(limit, 1))) || 1,
          1
        );
        setPagination({ total, totalPages });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load transports");
    } finally {
      setLoading(false);
    }
  };

  const handleServerSearch = useCallback(({ query, field, fetchAll }) => {
    setTableSearch(query);
    setTableSearchField(field || "all");
    setForceFetchAll(!!fetchAll);
    setPage(1);
  }, []);

  const columns = [
    { key: "name", label: "Name" },
    { key: "business_mode", label: "Business Mode" },
    { key: "contact_person", label: "Contact Person" },
    { key: "contact_no", label: "Contact No" },
    { key: "allowed_payment_mode", label: "Payment Mode" },
    {
      key: "is_active",
      label: "Active",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.is_active ? "yes" : "no"),
    },
    {
      key: "created_by",
      label: "Created By",
      render: (value) => value || "—",
      searchValue: (row) => row.created_by || "",
    },
    {
      key: "company_id",
      label: "Store/Warehouse",
      render: (value) => storeMap[String(value)] ?? "—",
      searchValue: (row) => storeMap[String(row.company_id)] ?? "",
    },
  ];

  const handleDeleteConfirmed = async () => {
    const { id } = confirmDlg;
    setConfirmDlg({ open: false, id: null, name: "" });
    try {
      await api.delete(`/transports/${id}`);
      toast.success("Transport deleted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/transports/${id}`)));
      toast.success(`${keys.length} record(s) deleted`);
      setSelectedRows([]);
      fetchData();
    } catch {
      toast.error("Failed to delete some records");
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <ConfirmDialog
        open={confirmDlg.open}
        message={`Are you sure you want to delete "${confirmDlg.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDlg({ open: false, id: null, name: "" })}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected record(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/masters")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Master
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Transport</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            onClick={() => navigate("/masters/transport/new")}
            className="topbar-action-btn topbar-action-new"
          >
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
          <span>|</span>
          <UploadImportButton
            endpoint="/transports/bulk"
            fieldConfig={TRANSPORT_IMPORT_CONFIG}
            onDone={() => {
              if (page === 1) fetchData();
              else setPage(1);
            }}
          />
          <span>|</span>
          <ExportBottomSheet
            columns={columns}
            rows={data}
            selectedRowKeys={selectedRows}
            onExportRows={async () => {
              const res = await api.get("/transports", { params: { all: "true" } });
              return res.data?.data || [];
            }}
            fileName="transports"
            buttonClassName="topbar-action-btn topbar-action-export"
          />
        </div>
      </div>

      <div className="p-3 flex-1 min-h-0">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 border border-gray-200 dark:border-gray-700 h-full flex flex-col min-h-0">
          <h2 className="text-lg font-bold mb-3">Transport Search</h2>
          <FilterableDataTable
            rows={data}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search in transport fields..."
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
            showExport={false}
            enableColumnResize
            tablePreferenceKey="masters.transports.list"
            onRefresh={() => fetchData()}
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
            enableSelection
            enableKeyboardNav
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onBulkDelete={handleBulkDelete}
            onRowClick={(t) => navigate(`/masters/transport/edit/${t.id}`)}
            fillHeight
            renderActions={(t, { selectedCount } = {}) => (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/masters/transport/${t.id}`)}
                  className="glass-btn glass-btn-primary"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate(`/masters/transport/edit/${t.id}`)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary rounded p-1.5"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDlg({ open: true, id: t.id, name: t.name })}
                  className="glass-btn glass-btn-danger rounded p-1.5"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default Transport;
