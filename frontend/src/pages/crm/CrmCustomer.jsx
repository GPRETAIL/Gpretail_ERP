import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";
import UploadImportButton from "../../components/UploadImportButton";

// Matches config('pagination.resources.customers.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchCustomerGroupSummaries, onFetchGroupRows: fetchCustomerGroupRows } =
  createGroupFetchers("/customers", {
    customerType: "customer_type",
    supplyType: "supply_type",
    active: "is_active",
  });

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
    <Box className="master-responsive" sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default", color: "text.primary" }}>
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
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1, flexShrink: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 13, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/crm")} sx={{ minWidth: "auto", p: 0, fontSize: 13, fontWeight: 600 }}>
              CRM
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Customers</Box>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
          <UploadImportButton
            endpoint="/customers/bulk"
            fieldConfig={CUSTOMER_IMPORT_CONFIG}
            onDone={() => fetchCustomers(1, limit, true)}
          />
          <Button onClick={() => navigate("/crm/customer/new")} className="topbar-action-btn topbar-action-new">
            <PlusCircle size={12} style={{marginRight: 4}} /> New
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, p: 2, minHeight: 0 }}>
        <Stack sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: "7px", p: 2.5, border: "1px solid", borderColor: "divider", width: "100%", height: "100%", minHeight: 0, overflow: "auto" }}>
          <Typography sx={{ fontSize: 15.75, fontWeight: 700, mb: 1.5 }}>Customer Search</Typography>
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
            onFetchGroupSummaries={fetchCustomerGroupSummaries}
            onFetchGroupRows={fetchCustomerGroupRows}
            paginationMode="server"
            enableVirtualization
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
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/crm/customer/${row.id}/profile`);
                  }}
                  title="View Profile"
                  disabled={selectedCount > 1}
                  className="glass-btn"
                  sx={{ minWidth: "auto" }}
                >
                  <Eye size={14} />
                </Button>
                <Button
                  onClick={() => navigate(`/crm/customer/${row.id}`)}
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
                    setConfirm({ open: true, id: row.id, name: row.name });
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
        </Stack>
      </Box>
    </Box>
  );
};

export default CrmCustomer;
