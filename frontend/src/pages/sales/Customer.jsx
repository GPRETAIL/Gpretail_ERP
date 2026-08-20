import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PlusCircle, Save, Search, Trash2, Edit2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";

const TextInput = ({ label, name, required = false, value, onChange, placeholder = "", type = "text" }) => (
  <div className="flex items-center">
    <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">
      {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ml-2"
    />
  </div>
);

const SelectInput = ({ label, name, required = false, options = [], value, onChange }) => (
  <div className="flex items-center">
    <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">
      {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
      {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ml-2"
    >
      <option value="">Select {label}</option>
      {options.map((o, i) => (
        <option key={i} value={o.value ?? o.label}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
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
          <span className={value ? "text-green-700 dark:text-green-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
            {value ? "Yes" : "No"}
          </span>
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
      await handleSearch();
    } catch {
      toast.error("Failed to delete some records");
    }
  };

  const renderForm = () => (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 w-full">
      <div className="p-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
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

          <div className="flex items-center xl:col-span-2 pt-1">
            <label className="w-[20%] text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 ml-2"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchPage = () => (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border border-gray-200 dark:border-gray-700 w-full">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleEdit(row)}
              title="Edit customer"
              disabled={selectedCount > 1}
              className="glass-btn glass-btn-primary rounded p-1.5"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfirmDlg({ open: true, id: row.id, name: row.name })}
              className="glass-btn glass-btn-danger rounded p-1.5"
              title="Delete customer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
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
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
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
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            aria-label={showSearchPage ? "Back to customer entry" : "Back to sales"}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/sales")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Sales
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Customer {currentId ? `(Edit: #${currentId})` : ""}</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          <button className="topbar-action-btn topbar-action-new" onClick={handleNew}>
            <PlusCircle className="w-4 h-4 mr-1" /> New
          </button>
          <span>|</span>
          <button
            className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || showSearchPage}
          >
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
          </button>
          <span>|</span>
          <button
            className="glass-btn glass-btn-primary flex items-center"
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
          >
            <Search className="w-4 h-4 mr-1" /> {showSearchPage ? "Back" : "Search"}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4">{showSearchPage ? renderSearchPage() : renderForm()}</div>

    </div>
  );
};

export default Customer;
