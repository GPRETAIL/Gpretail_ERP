import { ArrowLeft, Pencil, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import ExportBottomSheet from "../../components/ExportBottomSheet";
import SearchableSelect from "../../components/SearchableSelect";
import UploadImportButton from "../../components/UploadImportButton";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import useStoreNameMap from "../../hooks/useStoreNameMap";

const AGENT_IMPORT_CONFIG = {
  aliases: {
    agenttypeid: "agent_type_id", agenttype: "agent_type_id",
    agenttypename: "agent_type_id",
    name: "name",
    contactperson: "contact_person",
    contactno: "contact_no", phone: "contact_no", mobile: "contact_no",
    emailid: "email_id", email: "email_id",
    pan: "pan", gst: "gst",
    commissionamt: "commission_amt", commissionamount: "commission_amt",
    commissionpct: "commission_pct", commission: "commission_pct",
    address: "address", pincode: "pincode",
    city: "city_id", tax: "tax_id", bank: "bank_id", state: "state_id",
    cityid: "city_id", taxid: "tax_id", bankid: "bank_id",
    bankaccountname: "bank_account_name", ifsc: "ifsc", accountno: "account_no",
    stateid: "state_id",
    isactive: "is_active", active: "is_active",
  },
  required: ["name"],
  boolFields: ["is_active"],
  sampleFileName: "agent_sample.xlsx",
  sampleHeaders: [
    "agent_type", "name", "contact_person", "contact_no", "email",
    "address", "pan", "gst", "commission_amt", "commission_pct",
    "city", "tax", "bank", "bank_account_name", "ifsc", "account_no",
    "state", "pincode", "is_active",
  ],
};

// ─── Module-level helper components (must NOT be inside the main component) ───

const TextInput = ({ label, name, required = false, type = "text", value, onChange, placeholder = "" }) => (
  <div className="flex items-center">
    <label className="w-2/5 text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-3">
      {required && <span className="text-red-500 mr-1">*</span>}
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-sm p-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);

const TextareaInput = ({ label, name, value, onChange, rows = 3 }) => (
  <div className="flex items-start">
    <label className="w-2/5 text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-3 pt-1">
      {label}
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-sm p-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);

const CheckboxInput = ({ label, name, checked, onChange }) => (
  <div className="flex items-center">
    <label className="w-2/5 text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-3">{label}</label>
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      className="w-3 h-3 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500"
    />
  </div>
);

// ─── Initial blank form ───────────────────────────────────────────────────────

const blank = () => ({
  agentTypeId: "", name: "", contactPerson: "", contactNo: "",
  emailId: "", address: "", pan: "", gst: "",
  commissionAmt: "", commissionPct: "",
  cityId: "", taxId: "", bankId: "",
  bankAccountName: "", ifsc: "", accountNo: "",
  stateId: "", pincode: "", active: true,
});

// ─── Main Component ───────────────────────────────────────────────────────────

const Agent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");

  const [formData, setFormData] = useState(blank());
  const [currentId, setCurrentId] = useState(null);
  const storeMap = useStoreNameMap();
  const initialFormRef = useRef({ id: null, sig: null });
  // Snapshot each loaded record (edit mode) so an unchanged save reports "No changes detected".
  useEffect(() => {
    if (currentId != null && initialFormRef.current.id !== currentId) {
      initialFormRef.current = { id: currentId, sig: JSON.stringify(formData) };
    }
  }, [currentId, formData]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous double-submit guard

  // Search page state
  const [showSearch, setShowSearch] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [forceFetchAll, setForceFetchAll] = useState(false);

  // Dropdown options
  const [agentTypes, setAgentTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [banks, setBanks] = useState([]);
  const [states, setStates] = useState([]);

  // Confirm dialog
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

  // ─── Load dropdown options on mount ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [atRes, cityRes, taxRes, bankRes, stateRes] = await Promise.all([
          api.get("/configurations/agent_type"),
          api.get("/configurations/city"),
          api.get("/taxes"),
          api.get("/configurations/bank"),
          api.get("/configurations/state"),
        ]);
        const cfg = (res) =>
          (res.data?.data || []).map((r) => ({ value: String(r.id), label: r.name }));
        setAgentTypes(cfg(atRes));
        setCities(cfg(cityRes));
        setTaxes((taxRes.data?.data || []).map((t) => ({ value: String(t.id), label: t.name })));
        setBanks(cfg(bankRes));
        setStates(cfg(stateRes));
      } catch {
        // non-fatal
      }
    };
    load();
  }, []);

  // ─── Load record when editing from URL ───────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    api.get(`/agents/${editId}`)
      .then((res) => {
        const d = res.data.data;
        setCurrentId(d.id);
        setFormData({
          agentTypeId:     d.agent_type_id    != null ? String(d.agent_type_id)  : "",
          name:            d.name             || "",
          contactPerson:   d.contact_person   || "",
          contactNo:       d.contact_no       || "",
          emailId:         d.email_id         || "",
          address:         d.address          || "",
          pan:             d.pan              || "",
          gst:             d.gst              || "",
          commissionAmt:   d.commission_amt   != null ? String(d.commission_amt) : "",
          commissionPct:   d.commission_pct   != null ? String(d.commission_pct) : "",
          cityId:          d.city_id          != null ? String(d.city_id)        : "",
          taxId:           d.tax_id           != null ? String(d.tax_id)         : "",
          bankId:          d.bank_id          != null ? String(d.bank_id)        : "",
          bankAccountName: d.bank_account_name || "",
          ifsc:            d.ifsc             || "",
          accountNo:       d.account_no       || "",
          stateId:         d.state_id         != null ? String(d.state_id)       : "",
          pincode:         d.pincode          || "",
          active:          d.is_active !== false,
        });
      })
      .catch(() => toast.error("Failed to load agent record"));
  }, [editId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleNew = () => {
    setFormData(blank());
    setCurrentId(null);
    setShowSearch(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.warning("Name is required"); return; }
    if (currentId && initialFormRef.current.id === currentId
        && JSON.stringify(formData) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (currentId) {
        await api.put(`/agents/${currentId}`, formData);
        toast.success("Agent updated successfully");
      } else {
        const res = await api.post("/agents", formData);
        setCurrentId(res.data.data.id);
        toast.success("Agent saved successfully");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save agent");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const fetchSearchResults = async (queryOverride = tableSearch) => {
    setSearchLoading(true);
    try {
      const query = String(queryOverride || "").trim();
      const params = (query || forceFetchAll)
        ? { all: "true", search: query || undefined, field: tableSearchField !== "all" ? tableSearchField : undefined }
        : { page, limit };
      const res = await api.get("/agents", { params });
      const rows = res.data?.data || [];
      setSearchResults(rows);
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
    } catch {
      toast.error("Failed to load agents");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchOpen = () => {
    setShowSearch(true);
    fetchSearchResults();
  };

  useEffect(() => {
    if (showSearch) fetchSearchResults();
  }, [showSearch, page, limit, tableSearch, forceFetchAll]);

  const handleServerSearch = useCallback(({ query, field, fetchAll }) => {
    setTableSearch(query);
    setTableSearchField(field || "all");
    setForceFetchAll(!!fetchAll);
    setPage(1);
  }, []);

  const handleEditFromSearch = (row) => {
    setCurrentId(row.id);
    setFormData({
      agentTypeId:     row.agent_type_id    != null ? String(row.agent_type_id)  : "",
      name:            row.name             || "",
      contactPerson:   row.contact_person   || "",
      contactNo:       row.contact_no       || "",
      emailId:         row.email_id         || "",
      address:         row.address          || "",
      pan:             row.pan              || "",
      gst:             row.gst              || "",
      commissionAmt:   row.commission_amt   != null ? String(row.commission_amt) : "",
      commissionPct:   row.commission_pct   != null ? String(row.commission_pct) : "",
      cityId:          row.city_id          != null ? String(row.city_id)        : "",
      taxId:           row.tax_id           != null ? String(row.tax_id)         : "",
      bankId:          row.bank_id          != null ? String(row.bank_id)        : "",
      bankAccountName: row.bank_account_name || "",
      ifsc:            row.ifsc             || "",
      accountNo:       row.account_no       || "",
      stateId:         row.state_id         != null ? String(row.state_id)       : "",
      pincode:         row.pincode          || "",
      active:          row.is_active !== false,
    });
    setShowSearch(false);
  };

  const handleDeleteConfirmed = async () => {
    const { id, name } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    try {
      await api.delete(`/agents/${id}`);
      toast.success(`"${name}" deleted successfully`);
      setSearchResults((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete agent");
    }
  };

  const handleBulkDelete = (keys) => {
    setBulkConfirm({ open: true, keys });
  };

  const handleBulkDeleteConfirmed = async () => {
    const { keys } = bulkConfirm;
    setBulkConfirm({ open: false, keys: [] });
    try {
      await Promise.all(keys.map((id) => api.delete(`/agents/${id}`)));
      toast.success(`${keys.length} record(s) deleted`);
      setSelectedRows([]);
      fetchSearchResults();
    } catch {
      toast.error("Failed to delete some records");
    }
  };

  const labelOf = (options, id) =>
    options.find((o) => o.value === String(id))?.label || "—";

  const tableColumns = [
    { key: "__serial", label: "S.No." },
    {
      key: "agent_type_id",
      label: "Agent Type",
      render: (_, row) => labelOf(agentTypes, row.agent_type_id),
      searchValue: (row) => labelOf(agentTypes, row.agent_type_id),
    },
    { key: "name", label: "Name" },
    { key: "contact_person", label: "Contact Person" },
    { key: "contact_no", label: "Contact No" },
    {
      key: "commission_pct",
      label: "Commission %",
      render: (value) => (value != null ? `${value}%` : "—"),
      searchValue: (row) => row.commission_pct,
    },
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      <ConfirmDialog
        open={confirm.open}
        message={`Are you sure you want to delete "${confirm.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
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
            <span>Agent</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button onClick={handleNew} className="topbar-action-btn topbar-action-new">
            <PlusCircle className="w-3 h-3 mr-1" /> New
          </button>
          <span>|</span>
          <UploadImportButton
            endpoint="/agents/bulk"
            fieldConfig={AGENT_IMPORT_CONFIG}
            onDone={() => {
              setShowSearch(true);
              if (page === 1) fetchSearchResults();
              else setPage(1);
            }}
          />
          {showSearch && (
            <>
              <span>|</span>
              <ExportBottomSheet
                columns={tableColumns}
                rows={searchResults.map((row, index) => ({ ...row, __serial: index + 1 }))}
                selectedRowKeys={selectedRows}
                onExportRows={async () => {
                  const res = await api.get("/agents", { params: { all: "true" } });
                  return (res.data?.data || []).map((row, index) => ({
                    ...row,
                    __serial: index + 1,
                  }));
                }}
                fileName="agents"
                buttonClassName="topbar-action-btn topbar-action-export"
              />
            </>
          )}
          <span>|</span>
          {!showSearch && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
              >
                <Save className="w-3 h-3 mr-1" /> {saving ? "Saving…" : "Save"}
              </button>
              <span>|</span>
            </>
          )}
          <button onClick={handleSearchOpen} className="glass-btn glass-btn-primary flex items-center">
            <Search className="w-3 h-3 mr-1" /> Search
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 min-h-0">
        {!showSearch ? (
          /* ── Form ── */
          <div
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-4 lg:h-full"
            data-enter-scope="true"
            onKeyDownCapture={handleEnterKeyNavigation}
          >
            <div className="grid grid-cols-12 gap-x-6 gap-y-3">

              {/* Column 1 */}
              <div className="col-span-12 lg:col-span-6 space-y-2">
                <SearchableSelect label="Agent Type" name="agentTypeId" options={agentTypes} value={formData.agentTypeId} onChange={handleChange} />
                <TextInput label="Name"            name="name"          required value={formData.name}           onChange={handleChange} />
                <TextInput label="Contact Person"  name="contactPerson"          value={formData.contactPerson}   onChange={handleChange} />
                <TextInput label="Contact No"      name="contactNo"               value={formData.contactNo}       onChange={handleChange} />
                <TextInput label="Email ID"        name="emailId"     type="email" value={formData.emailId}        onChange={handleChange} />
                <TextareaInput label="Address"     name="address"                 value={formData.address}         onChange={handleChange} rows={3} />
                <TextInput label="PAN"             name="pan"                     value={formData.pan}             onChange={handleChange} />
                <TextInput label="GST"             name="gst"                     value={formData.gst}             onChange={handleChange} />
                <TextInput label="Commission Amt"  name="commissionAmt"           value={formData.commissionAmt}   onChange={handleChange} />
                <TextInput label="Commission %"    name="commissionPct"           value={formData.commissionPct}   onChange={handleChange} />
              </div>

              {/* Column 2 */}
              <div className="col-span-12 lg:col-span-6 space-y-2">
                <SearchableSelect label="City"  name="cityId"  options={cities} value={formData.cityId}  onChange={handleChange} />
                <SearchableSelect label="State" name="stateId" options={states} value={formData.stateId} onChange={handleChange} />
                <TextInput label="Pincode"          name="pincode"          value={formData.pincode}          onChange={handleChange} />
                <SearchableSelect label="Tax"  name="taxId"  options={taxes} value={formData.taxId}  onChange={handleChange} />
                <SearchableSelect label="Bank" name="bankId" options={banks} value={formData.bankId} onChange={handleChange} />
                <TextInput label="Bank Account Name" name="bankAccountName" value={formData.bankAccountName} onChange={handleChange} />
                <TextInput label="IFSC"             name="ifsc"             value={formData.ifsc}             onChange={handleChange} />
                <TextInput label="Account No"       name="accountNo"        value={formData.accountNo}        onChange={handleChange} />
                <CheckboxInput label="Active"       name="active"           checked={formData.active}         onChange={handleChange} />
              </div>

            </div>
          </div>
        ) : (
          /* ── Search page ── */
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 p-4 h-full flex flex-col min-h-0">
            <FilterableDataTable
              rows={searchResults.map((row, index) => ({ ...row, __serial: index + 1 }))}
              columns={tableColumns}
              loading={searchLoading}
              searchPlaceholder="Search in agent fields..."
              searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
              showExport={false}
              enableColumnResize
              tablePreferenceKey="masters.agents.list"
              onRefresh={() => fetchSearchResults()}
              refreshDisabled={searchLoading}
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
              onRowClick={(row) => handleEditFromSearch(row)}
              fillHeight
              renderActions={(row, { selectedCount } = {}) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditFromSearch(row)}
                    title="Edit"
                    disabled={selectedCount > 1}
                    className="glass-btn glass-btn-primary rounded p-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirm({ open: true, id: row.id, name: row.name })}
                    title="Delete"
                    className="glass-btn glass-btn-danger rounded p-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default Agent;
