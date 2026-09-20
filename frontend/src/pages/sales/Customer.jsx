import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, PlusCircle, Save, Search, Trash2, Edit2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import { Box, Stack, Typography, TextField, MenuItem, Button, Checkbox } from "@mui/material";

const TextInput = ({ label, name, required = false, value, onChange, placeholder = "", type = "text" }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "40%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
      {label}
    </Typography>
    <TextField
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size="small"
      sx={{ flex: 1, ml: 1, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
    />
  </Stack>
);

const SelectInput = ({ label, name, required = false, options = [], value, onChange }) => (
  <Stack direction="row" sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: "40%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
      {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
      {label}
    </Typography>
    <TextField
      select
      name={name}
      value={value}
      onChange={onChange}
      size="small"
      sx={{ flex: 1, ml: 1, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
    >
      <MenuItem value="">Select {label}</MenuItem>
      {options.map((o, i) => (
        <MenuItem key={i} value={o.value ?? o.label}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  </Stack>
);

const Customer = () => {
  const navigate = useNavigate();
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLimit, setSearchLimit] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirmDlg, setConfirmDlg] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

  const blankForm = {
    mobileNo: "",
    name: "",
    dateOfBirth: "",
    billingName: "",
    cardNo: "",
    gstId: "",
    address: "",
    cityId: "",
    stateId: "",
    customerCategoryId: "",
    emailId: "",
    areaId: "",
    active: true,
  };

  const [formData, setFormData] = useState({ ...blankForm });
  const [opts, setOpts] = useState({
    cities: [],
    states: [],
    customerCategories: [],
    areas: [],
    taxes: [],
  });

  useEffect(() => {
    const cfg = (type) =>
      api
        .get(`/configurations/${type}`)
        .then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name })))
        .catch(() => []);

    Promise.all([
      cfg("city"),
      cfg("state"),
      cfg("customer_category"),
      cfg("sale_area"),
      api
        .get("/taxes")
        .then((r) => (r.data?.data || []).map((x) => ({ value: String(x.id), label: x.name })))
        .catch(() => []),
    ]).then(([cities, states, customerCategories, areas, taxes]) => {
      setOpts({ cities, states, customerCategories, areas, taxes });
    });
  }, []);

  const cityMap = useMemo(() => new Map(opts.cities.map((row) => [String(row.value), row.label])), [opts.cities]);
  const stateMap = useMemo(() => new Map(opts.states.map((row) => [String(row.value), row.label])), [opts.states]);
  const categoryMap = useMemo(
    () => new Map(opts.customerCategories.map((row) => [String(row.value), row.label])),
    [opts.customerCategories]
  );

  const customerSearchColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        valueGetter: (row) => row.name || "-",
      },
      {
        key: "mobile_no",
        label: "Mobile No",
        valueGetter: (row) => row.mobile_no || "-",
      },
      {
        key: "email_id",
        label: "Email",
        valueGetter: (row) => row.email_id || "-",
      },
      {
        key: "city",
        label: "City",
        valueGetter: (row) => row.city?.name || cityMap.get(String(row.city_id || "")) || "-",
      },
      {
        key: "state",
        label: "State",
        valueGetter: (row) => row.state?.name || stateMap.get(String(row.state_id || "")) || "-",
      },
      {
        key: "customer_category",
        label: "Category",
        valueGetter: (row) =>
          row.customerCategory?.name || categoryMap.get(String(row.customer_category_id || "")) || "-",
      },
      {
        key: "is_active",
        label: "Active",
        valueGetter: (row) => !!row.is_active,
        render: (value) => (
          <Box component="span" sx={{ color: value ? "success.main" : "text.secondary", fontWeight: value ? 500 : 400 }}>
            {value ? "Yes" : "No"}
          </Box>
        ),
      },
    ],
    [cityMap, stateMap, categoryMap]
  );

  const [searchPagination, setSearchPagination] = useState({ total: 0, totalPages: 1 });
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleNew = () => {
    setCurrentId(null);
    setFormData({ ...blankForm });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (currentId) {
        await api.put(`/customers/${currentId}`, formData);
        toast.success("Customer updated successfully");
      } else {
        const res = await api.post("/customers", formData);
        setCurrentId(res.data.data.id);
        toast.success("Customer saved successfully");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const fetchCustomers = async (pageToLoad = searchPage, limitToLoad = searchLimit, query = tableSearch) => {
    setSearching(true);
    try {
      const params = {
        page: pageToLoad,
        limit: limitToLoad,
        search: query ? String(query).trim() : undefined,
        field: tableSearchField !== "all" ? tableSearchField : undefined,
      };
      const res = await api.get("/customers", { params });
      const rows = res.data?.data || [];
      setSearchResults(rows);

      const total = Number(res.data?.total ?? res.data?.pagination?.total ?? rows.length) || 0;
      const totalPages = Math.max(
        Number(res.data?.totalPages ?? res.data?.pagination?.last_page ?? Math.ceil(total / Math.max(limitToLoad, 1))) || 1,
        1
      );
      setSearchPagination({ total, totalPages });
    } catch {
      toast.error("Failed to search customers");
    } finally {
      setSearching(false);
    }
  };

  const handleServerSearch = useCallback(({ query, field }) => {
    setTableSearch(query || "");
    setTableSearchField(field || "all");
    setSearchPage(1);
    fetchCustomers(1, searchLimit, query);
  }, [searchLimit]);

  const openSearchPage = async () => {
    setShowSearchPage(true);
    await fetchCustomers(1, searchLimit, tableSearch);
  };

  const handleEdit = (customer) => {
    setCurrentId(customer.id);
    setFormData({
      mobileNo: customer.mobile_no || "",
      name: customer.name || "",
      dateOfBirth: customer.date_of_birth || "",
      billingName: customer.billing_name || "",
      cardNo: customer.card_no || "",
      gstId: customer.gst_id ? String(customer.gst_id) : "",
      address: customer.address || "",
      cityId: customer.city_id ? String(customer.city_id) : "",
      stateId: customer.state_id ? String(customer.state_id) : "",
      customerCategoryId: customer.customer_category_id ? String(customer.customer_category_id) : "",
      emailId: customer.email_id || "",
      areaId: customer.area_id ? String(customer.area_id) : "",
      active: customer.is_active ?? true,
    });
    setShowSearchPage(false);
  };

  const handleDeleteConfirmed = async () => {
    const { id } = confirmDlg;
    setConfirmDlg({ open: false, id: null, name: "" });
    try {
      await api.delete(`/customers/${id}`);
      toast.success("Customer deleted");
      setSearchResults((prev) => prev.filter((row) => row.id !== id));
    } catch {
      toast.error("Failed to delete customer");
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
      toast.success(`${keys.length} record(s) deleted`);
      setSelectedRows([]);
      await fetchCustomers();
    } catch {
      toast.error("Failed to delete some records");
    }
  };

  const renderForm = () => (
    <Box sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: "7px", border: "1px solid", borderColor: "divider", width: "100%" }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 1.5 }}>
          <TextInput label="Mobile No" name="mobileNo" value={formData.mobileNo} onChange={handleChange} />
          <TextInput label="Name" name="name" required value={formData.name} onChange={handleChange} />
          <TextInput
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
          <TextInput label="Billing Name" name="billingName" value={formData.billingName} onChange={handleChange} />
          <TextInput label="Card No" name="cardNo" value={formData.cardNo} onChange={handleChange} />
          <SelectInput label="GST No" name="gstId" options={opts.taxes} value={formData.gstId} onChange={handleChange} />
          <TextInput label="Address" name="address" value={formData.address} onChange={handleChange} />
          <SelectInput label="City" name="cityId" options={opts.cities} value={formData.cityId} onChange={handleChange} />
          <SelectInput label="State" name="stateId" options={opts.states} value={formData.stateId} onChange={handleChange} />
          <SelectInput
            label="Customer Category"
            name="customerCategoryId"
            options={opts.customerCategories}
            value={formData.customerCategoryId}
            onChange={handleChange}
          />
          <TextInput label="Email Id" name="emailId" type="email" value={formData.emailId} onChange={handleChange} />
          <SelectInput label="Area" name="areaId" options={opts.areas} value={formData.areaId} onChange={handleChange} />

          <Stack direction="row" sx={{ alignItems: "center", gridColumn: { xl: "span 2" }, pt: 0.5 }}>
            <Typography component="label" sx={{ width: "20%", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Active</Typography>
            <Checkbox
              name="active"
              checked={formData.active}
              onChange={handleChange}
              sx={{ ml: 1, p: 0 }}
            />
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  const renderSearchPage = () => (
    <Box sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: "7px", p: 2, border: "1px solid", borderColor: "divider", width: "100%" }}>
      <FilterableDataTable
        rows={searchResults}
        columns={customerSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No customers found"
        searchPlaceholder="Search in customer fields..."
        showExport={false}
        tablePreferenceKey="sales.customer.search"
        onRefresh={() => fetchCustomers()}
        refreshDisabled={searching}
        enableServerSearch
        onServerSearch={handleServerSearch}
        onRowClick={handleEdit}
        enableKeyboardNav
        enableSelection
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onBulkDelete={handleBulkDelete}
        renderActions={(row, { selectedCount } = {}) => (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Button
              type="button"
              onClick={() => handleEdit(row)}
              title="Edit customer"
              disabled={selectedCount > 1}
              className="glass-btn glass-btn-primary"
              sx={{ borderRadius: "3.5px", p: 0.75, minWidth: 0 }}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setConfirmDlg({ open: true, id: row.id, name: row.name })}
              className="glass-btn glass-btn-danger"
              sx={{ borderRadius: "3.5px", p: 0.75, minWidth: 0 }}
              title="Delete customer"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Stack>
        )}
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={(p) => {
          setSearchPage(p);
          fetchCustomers(p, searchLimit, tableSearch);
        }}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
          fetchCustomers(1, value, tableSearch);
        }}
        paginationMode="server"
      />
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
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
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            sx={{ color: "text.secondary", minWidth: 0, p: 0.5 }}
            aria-label={showSearchPage ? "Back to customer entry" : "Back to sales"}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
            <Button
              type="button"
              onClick={() => navigate("/sales")}
              sx={{ color: "primary.main", textTransform: "none", minWidth: "auto", p: 0, "&:hover": { textDecoration: "underline", bgcolor: "transparent" } }}
            >
              Sales
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Customer {currentId ? `(Edit: #${currentId})` : ""}</Box>
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
          <Button className="topbar-action-btn topbar-action-new" onClick={handleNew}>
            <PlusCircle className="w-4 h-4 mr-1" /> New
          </Button>
          <Box component="span">|</Box>
          <Button
            className="glass-btn glass-btn-success disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || showSearchPage}
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
          <Box component="span">|</Box>
          <Button
            className="glass-btn glass-btn-primary"
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Search className="w-4 h-4 mr-1" /> {showSearchPage ? "Back" : "Search"}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, p: 2 }}>{showSearchPage ? renderSearchPage() : renderForm()}</Box>

    </Box>
  );
};

export default Customer;
