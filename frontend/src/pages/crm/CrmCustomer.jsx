import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import UploadImportButton from "../../components/UploadImportButton";

const CUSTOMER_IMPORT_CONFIG = {
  aliases: {
    code: "code", name: "name",
    customertype: "customer_type", type: "customer_type",
    customercategory: "customer_category_id", customercategoryid: "customer_category_id",
    mobile: "mobile_no", mobileno: "mobile_no", phone: "mobile_no", contactno: "mobile_no",
    othernumber: "other_number",
    billingname: "billing_name",
    email: "email_id", emailid: "email_id",
    gender: "gender",
    dateofbirth: "date_of_birth", dob: "date_of_birth",
    sectionreligion: "section_religion",
    married: "married",
    marriagedate: "marriage_date",
    kidsboy: "kids_boy", kidsgirl: "kids_girl",
    loyaltycardnumber: "loyalty_card_number",
    points: "points",
    supplytype: "supply_type",
    gstno: "gst_no", gst: "gst_no",
    tanpan: "tan_pan",
    supportcredit: "support_credit",
    creditdays: "credit_days",
    creditamount: "credit_amount",
    address: "address",
    city: "city_id", cityid: "city_id",
    district: "district_id", districtid: "district_id",
    pincode: "pin_code",
    state: "state_id", stateid: "state_id",
    country: "country_id", countryid: "country_id",
    cardno: "card_no",
    active: "active", isactive: "active",
  },
  required: ["name"],
  boolFields: ["married", "support_credit", "active"],
  sampleFileName: "customer_sample.xlsx",
  sampleHeaders: [
    "code", "name", "customer_type", "mobile_no", "other_number", "billing_name",
    "email_id", "gender", "date_of_birth", "loyalty_card_number", "supply_type",
    "gst_no", "tan_pan", "credit_days", "credit_amount", "address", "pin_code",
    "card_no", "active",
  ],
};

const CUSTOMER_COLUMNS = [
  { key: "code", label: "Code" },
  { key: "name", label: "Name" },
  { key: "customerType", label: "Customer Type" },
  { key: "customerCategory", label: "Category" },
  { key: "mobileNo", label: "Mobile" },
  { key: "billingName", label: "Billing Name" },
  { key: "emailId", label: "Email" },
  { key: "gender", label: "Gender" },
  { key: "dateOfBirth", label: "DOB" },
  { key: "loyaltyCardNumber", label: "Loyalty Card" },
  { key: "points", label: "Points" },
  { key: "supplyType", label: "Supply Type" },
  { key: "gstNo", label: "GST No" },
  { key: "city", label: "City" },
  { key: "district", label: "District" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "registeringAt", label: "Registering At" },
  { key: "approvedBy", label: "Approved By" },
  { key: "active", label: "Active" },
];

const toText = (value, fallback = "--") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
};

const mapCustomerRow = (c) => ({
  id: c.id,
  code: toText(c.code),
  name: toText(c.name),
  customerType: toText(c.customer_type),
  customerCategory: toText(c.customer_category_id),
  mobileNo: toText(c.phone),
  billingName: toText(c.billing_name),
  emailId: toText(c.email),
  gender: toText(c.gender),
  dateOfBirth: toText(c.date_of_birth),
  loyaltyCardNumber: toText(c.loyalty_card_number),
  points: toText(c.loyalty_points),
  supplyType: toText(c.supply_type),
  gstNo: toText(c.gstin),
  city: toText(c.city),
  district: toText(c.district_id),
  state: toText(c.state_id),
  country: toText(c.country_id),
  registeringAt: toText(c.registering_at_id),
  approvedBy: toText(c.approved_by_id),
  active: c.is_active ? "Yes" : "No",
});

const CrmCustomer = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [forceFetchAll, setForceFetchAll] = useState(false);

  const fetchCustomers = useCallback(
    async (pageToLoad = page, limitToLoad = limit, fetchAll = false) => {
      try {
        setLoading(true);
        const params = fetchAll
          ? { search: searchQuery || undefined }
          : { page: pageToLoad, limit: limitToLoad, search: searchQuery || undefined };
        const res = await api.get("/customers", { params });
        const rows = (res.data?.data || []).map(mapCustomerRow);
        setCustomers(rows);
        if (fetchAll) {
          setPagination({ total: rows.length, totalPages: 1 });
        } else {
          // The backend returns total/totalPages flat on the response, not nested
          // under a `pagination` key - `res.data?.pagination` is always undefined,
          // so this used to always take the branch above and report "page 1 of 1"
          // (total = current page's row count) no matter how many customers exist.
          const p = res.data?.pagination || {};
          const total = Number(p.total ?? res.data?.total ?? rows.length) || 0;
          const totalPages = Math.max(
            Number(p.totalPages ?? res.data?.totalPages ?? Math.ceil(total / Math.max(limitToLoad, 1))) || 1,
            1
          );
          setPagination({ total, totalPages });
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load customers");
      } finally {
        setLoading(false);
      }
    },
    [page, limit, searchQuery]
  );

  const prevSearchQueryRef = useRef(searchQuery);

  useEffect(() => {
    const hasSearch = String(searchQuery || "").trim() !== "";
    const searchChanged = prevSearchQueryRef.current !== searchQuery;
    prevSearchQueryRef.current = searchQuery;

    // Only debounce when the search query actually changed
    if (searchChanged && hasSearch) {
      const timer = setTimeout(() => {
        if (page !== 1) setPage(1);
        fetchCustomers(1, limit, true);
      }, 300);
      return () => clearTimeout(timer);
    }

    // For initial load, page/limit changes — fetch immediately
    if (hasSearch || forceFetchAll) {
      fetchCustomers(1, limit, true);
    } else {
      fetchCustomers(page, limit, false);
    }
  }, [fetchCustomers, page, limit, searchQuery, forceFetchAll]);

  const handleDeleteConfirmed = async () => {
    const { id, name } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(`/customers/${id}`);
      toast.success(`"${name}" deleted successfully.`);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete customer");
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/customers/${id}`)));
      toast.success(`${keys.length} customer(s) deleted`);
      setSelectedRows([]);
      fetchCustomers();
    } catch {
      toast.error("Failed to delete some customers");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />
      <ConfirmDialog
        open={bulkConfirm.open}
        message={`Are you sure you want to delete ${bulkConfirm.keys.length} selected customer(s)? This action cannot be undone.`}
        onConfirm={handleBulkDeleteConfirmed}
        onCancel={() => setBulkConfirm({ open: false, keys: [] })}
      />
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
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
            <span>Customers</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <UploadImportButton
            endpoint="/customers/bulk"
            fieldConfig={CUSTOMER_IMPORT_CONFIG}
            onDone={() => fetchCustomers(1, limit, true)}
          />
          <button
            onClick={() => navigate("/crm/customer/new")}
            className="topbar-action-btn topbar-action-new"
          >
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 min-h-0">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 border border-gray-200 dark:border-gray-700 w-full h-full flex flex-col min-h-0 overflow-auto">
          <h2 className="text-lg font-bold mb-3">Customer Search</h2>
          <FilterableDataTable
            rows={customers}
            columns={CUSTOMER_COLUMNS}
            loading={loading}
            loadingText="Loading..."
            emptyText="No customers found. Click Search to load data."
            searchPlaceholder="Search customers..."
            tablePreferenceKey="crm.customer.list"
            onRefresh={() => fetchCustomers(page, limit, String(searchQuery || "").trim() !== "")}
            refreshDisabled={loading}
            onRowClick={(row) => navigate(`/crm/customer/${row.id}`)}
            enableKeyboardNav
            enableColumnResize
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
            onServerSearch={({ query, fetchAll }) => { setSearchQuery(query); setForceFetchAll(!!fetchAll); }}
            onExportRows={async ({ query }) => {
              const params = { all: "true" };
              const trimmed = String(query || "").trim();
              if (trimmed) params.search = trimmed;
              const res = await api.get("/customers", { params });
              return (res.data?.data || []).map(mapCustomerRow);
            }}
            renderActions={(row, { selectedCount } = {}) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/crm/customer/${row.id}/profile`);
                  }}
                  title="View Profile"
                  disabled={selectedCount > 1}
                  className="glass-btn rounded p-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => navigate(`/crm/customer/${row.id}`)}
                  title="Edit"
                  disabled={selectedCount > 1}
                  className="glass-btn glass-btn-primary rounded p-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirm({ open: true, id: row.id, name: row.name });
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

export default CrmCustomer;
