import { ArrowLeft, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchableSelect from "../../components/SearchableSelect";
import useStoreNameMap from "../../hooks/useStoreNameMap";

// Inline SelectInput matching the project style
const SelectInput = ({ label, name, options, value, onChange }) => (
  <div className="flex items-center">
    <label className="w-2/5 text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-3">
      {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">Select {label}</option>
      {options.map((option, index) => (
        <option key={index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const typeOptions = [
  { label: "LOCATION",              value: "LOCATION" },
  { label: "COUNTER",               value: "COUNTER" },
  { label: "TAILORING UNIT",        value: "TAILORING_UNIT" },
  { label: "PRF REASON",            value: "PRF_REASON" },
  { label: "RETURN REASON",         value: "RETURN_REASON" },
  { label: "SALE REASON",           value: "SALE_REASON" },
  { label: "SEASONS",               value: "SEASONS" },
  { label: "PO TYPE / BUDGET TYPE", value: "PO_TYPE" },
  { label: "SETTINGS",              value: "SETTINGS" },
  { label: "BANK",                  value: "BANK" },
  { label: "SWIPPING MACHINE",      value: "SWIPPING_MACHINE" },
  { label: "CARD TYPES",            value: "CARD_TYPES" },
  { label: "COURIER TYPE",          value: "COURIER_TYPE" },
  { label: "SALE AREA",             value: "SALE_AREA" },
  { label: "DISCOUNT REMARK",       value: "DISCOUNT_REMARK" },
  { label: "AREA GROUP 1",          value: "AREA_GROUP_1" },
  { label: "AREA GROUP 2",          value: "AREA_GROUP_2" },
  { label: "PRIORITY",              value: "PRIORITY" },
  { label: "CITY",                  value: "CITY" },
  { label: "DISTRICT",              value: "DISTRICT" },
  { label: "STATE",                 value: "STATE" },
  { label: "COUNTRY",               value: "COUNTRY" },
  { label: "EXPENSES TYPE",         value: "EXPENSES_TYPE" },
  { label: "CUSTOMER CATEGORY",     value: "CUSTOMER_CATEGORY" },
  { label: "VENDOR",                value: "VENDOR" },
  { label: "OFFLINE CLIENT",        value: "OFFLINE_CLIENT" },
  { label: "AUTO NUMBER",           value: "AUTO_NUMBER" },
  { label: "LOAN PROVIDER",         value: "LOAN_PROVIDER" },
  { label: "DELIVERY LOCATION",     value: "DELIVERY_LOCATION" },
  { label: "ADDITIONAL CHARGES",    value: "ADDITIONAL_CHARGES" },
  { label: "UPI PROVIDER",          value: "UPI_PROVIDER" },
  { label: "JOB WORK CHARGE",       value: "JOB_WORK_CHARGE" },
  { label: "TAILORING CHARGE",      value: "TAILORING_CHARGE" },
  { label: "BUNDLE RACK",           value: "BUNDLE_RACK" },
  { label: "DOCUMENT IMPORT",       value: "DOCUMENT_IMPORT" },
  { label: "SUPPLIER GROUP",        value: "SUPPLIER_GROUP" },
  { label: "VOUCHER TYPE",          value: "VOUCHER_TYPE" },
  { label: "BUYER GROUP",           value: "BUYER_GROUP" },
  { label: "CUSTOMER GROUP",        value: "CUSTOMER_GROUP" },
  { label: "LEAD EVENT",            value: "LEAD_EVENT" },
  { label: "LEAD STATUS",           value: "LEAD_STATUS" },
  { label: "LEAD PRIORITY",         value: "LEAD_PRIORITY" },
  { label: "ASSET TYPES",           value: "ASSET_TYPES" },
  { label: "FOOD COUNTER",          value: "FOOD_COUNTER" },
  { label: "DOCUMENT TYPE",         value: "DOCUMENT_TYPE" },
  { label: "CRM SOURCES",           value: "CRM_SOURCES" },
  { label: "CRM VISITING",          value: "CRM_VISITING" },
  { label: "PURCHASE TYPE",         value: "PURCHASE_TYPE" },
  { label: "ADDRESS TYPE",          value: "ADDRESS_TYPE" },
  { label: "TDS GROUP",             value: "TDS_GROUP" },
  { label: "AGENT TYPE",            value: "AGENT_TYPE" },
];

const Configuration = () => {
  const navigate = useNavigate();
  const [configType, setConfigType] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(20);
  const storeMap = useStoreNameMap();

  const fetchList = async (type) => {
    if (!type) return;
    setLoading(true);
    try {
      const res = await api.get(`/configurations/${type.toLowerCase()}`);
      const data = res.data?.data || [];
      setRows(data);
      if (data.length === 0) toast.info("No records found for this type.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load list");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (configType) fetchList(configType);
    else setRows([]);
    setTablePage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configType]);

  const handleNew = () => {
    if (!configType) { toast.warning("Please select a Configuration Type first!"); return; }
    navigate(`/masters/configuration/new?type=${configType}`);
  };

  const handleEdit = (id) => {
    navigate(`/masters/configuration/new?type=${configType}&id=${id}`);
  };

  const handleDeleteConfirmed = async () => {
    const { id, name } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(`/configurations/${configType.toLowerCase()}/${id}`);
      toast.success(`"${name}" deleted successfully.`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  const configColumns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "sort_order", label: "Sort Order", render: (value) => value ?? 0 },
    {
      key: "is_active",
      label: "Active",
      render: (value) => (value ? "Yes" : "No"),
      searchValue: (row) => (row.is_active ? "yes" : "no"),
    },
    { key: "created_by", label: "Created By", render: (value) => value || "—" },
    {
      key: "company_id",
      label: "Store/Warehouse",
      render: (value) => storeMap[String(value)] ?? "—",
      searchValue: (row) => storeMap[String(row.company_id)] ?? "",
    },
  ];

  return (
    <div className="min-h-[70vh] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
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
            <span>Configuration</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button onClick={handleNew} className="topbar-action-btn topbar-action-new">
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
        </div>
      </div>

      <div className="p-3 pb-16">
        {/* Filter card */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-4 space-y-1.5">
              <SearchableSelect
                label="Configuration Type"
                name="configType"
                options={typeOptions}
                value={configType}
                onChange={(e) => setConfigType(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <FilterableDataTable
            rows={rows}
            columns={configColumns}
            onRowClick={(row) => handleEdit(row.id)}
            enableKeyboardNav
            loading={loading}
            emptyText={configType ? "No records found for this type." : "Select Configuration Type to load records."}
            searchPlaceholder="Search in configuration fields..."
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
            showExport={false}
            tablePreferenceKey="masters.configuration.list"
            paginationMode="client"
            page={tablePage}
            limit={tableLimit}
            totalRows={rows.length}
            totalPages={Math.max(Math.ceil(rows.length / Math.max(tableLimit, 1)), 1)}
            onPageChange={setTablePage}
            onLimitChange={(value) => {
              setTableLimit(value);
              setTablePage(1);
            }}
            renderActions={(row) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(row.id)}
                  title="Edit"
                  className="glass-btn glass-btn-primary"
                  type="button"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setConfirm({ open: true, id: row.id, name: row.name })}
                  title="Delete"
                  className="glass-btn glass-btn-danger rounded p-1.5"
                  type="button"
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

export default Configuration;
