import { ArrowLeft, Pencil, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Stack, Card, Typography, Button } from "@mui/material";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import { TextInput, TextareaInput, CheckboxInput } from "../../components/CustomInputs";
import { createGroupFetchers } from "../../utils/serverGrouping";

// Matches config('pagination.resources.agents.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchAgentGroupSummaries, onFetchGroupRows: fetchAgentGroupRows } =
  createGroupFetchers("/agents", { is_active: "is_active" });
import ExportBottomSheet from "../../components/ExportBottomSheet";
import SearchableSelect from "../../components/SearchableSelect";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import UploadImportButton from "../../components/UploadImportButton";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";
import { normalizeFormSignature } from "../../utils/formSignature";

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

const blank = () => ({
  agentTypeId: "", name: "", contactPerson: "", contactNo: "",
  emailId: "", address: "", pan: "", gst: "",
  commissionAmt: "", commissionPct: "",
  cityId: "", taxId: "", bankId: "",
  bankAccountName: "", ifsc: "", accountNo: "",
  stateId: "", pincode: "", active: true,
});

const Agent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");

  const [formData, setFormData] = useState(blank());
  const [currentId, setCurrentId] = useState(null);
  const initialFormRef = useRef({ id: null, sig: null });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const [showSearch, setShowSearch] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [rawPagination, setRawPagination] = useState(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableSearchField, setTableSearchField] = useState("all");
  const [forceFetchAll, setForceFetchAll] = useState(false);

  const [agentTypes, setAgentTypes] = useState([]);
  const [cities, setCities] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [banks, setBanks] = useState([]);
  const [states, setStates] = useState([]);

  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
  const [bulkConfirm, setBulkConfirm] = useState({ open: false, keys: [] });

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
        setTaxes((taxRes.data?.data || []).map((t) => ({ id: String(t.id), value: String(t.id), name: t.name, label: t.name })));
        setBanks(cfg(bankRes));
        setStates(cfg(stateRes));
      } catch {
        // non-fatal
      }
    };
    load();
  }, []);

  const handleAsyncTaxSearch = useCallback(async (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    try {
      const res = await api.get("/taxes", { params: { search: trimmed, limit: 50 } });
      const mapped = (res.data?.data || []).map((t) => ({ id: String(t.id), value: String(t.id), name: t.name, label: t.name }));
      if (mapped.length) {
        setTaxes((prev) => {
          const existingIds = new Set(prev.map((t) => t.value));
          const newOnes = mapped.filter((t) => !existingIds.has(t.value));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!editId) return;
    api.get(`/agents/${editId}`)
      .then((res) => {
        const d = res.data.data;
        setCurrentId(d.id);
        const loadedData = {
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
        };
        setFormData(loadedData);
        initialFormRef.current = { id: d.id, sig: normalizeFormSignature(loadedData) };
      })
      .catch(() => toast.error("Failed to load agent record"));
  }, [editId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleNew = () => {
    setFormData(blank());
    setCurrentId(null);
    initialFormRef.current = { id: null, sig: null };
    setShowSearch(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.warning("Name is required"); return; }
    if (currentId && initialFormRef.current.id === currentId
        && normalizeFormSignature(formData) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (currentId) {
        await api.put(`/agents/${currentId}`, formData);
        initialFormRef.current = { id: currentId, sig: normalizeFormSignature(formData) };
        toast.success("Agent updated successfully");
      } else {
        const res = await api.post("/agents", formData);
        const newId = res.data.data.id;
        setCurrentId(newId);
        initialFormRef.current = { id: newId, sig: normalizeFormSignature(formData) };
        toast.success("Agent saved successfully");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save agent");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const fetchSearchResults = async (queryOverride = tableSearch, cursorToken = null) => {
    setSearchLoading(true);
    try {
      const query = String(queryOverride || "").trim();
      const params = (query || forceFetchAll)
        ? { all: "true", search: query || undefined, field: tableSearchField !== "all" ? tableSearchField : undefined }
        : { ...(cursorToken ? { cursor: cursorToken } : { page }), limit };
      const res = await api.get("/agents", { params });
      const rows = res.data?.data || [];
      setSearchResults(rows);
      if (query) {
        setPagination({ total: rows.length, totalPages: 1 });
        setRawPagination(null);
      } else {
        const p = res.data?.pagination || {};
        const total = Number(p.total ?? res.data?.total ?? rows.length) || 0;
        const totalPages = Math.max(
          Number(p.totalPages ?? res.data?.totalPages ?? Math.ceil(total / Math.max(limit, 1))) || 1,
          1
        );
        setPagination({ total, totalPages });
        setRawPagination(res.data?.pagination || null);
      }
    } catch {
      toast.error("Failed to load agents");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAgentNextCursor = (cursor) => fetchSearchResults(tableSearch, cursor);
  const handleAgentPreviousCursor = (cursor) => fetchSearchResults(tableSearch, cursor);

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
    const loadedData = {
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
    };
    setFormData(loadedData);
    initialFormRef.current = { id: row.id, sig: normalizeFormSignature(loadedData) };
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
  ];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
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

      <PageHeader
        title={
          <Breadcrumbs
            items={[
              { label: "Master", onClick: () => navigate("/masters") },
              { label: "Agent" },
            ]}
          />
        }
        onBack={() => navigate(-1)}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              onClick={handleNew}
              className="topbar-action-btn topbar-action-new"
              startIcon={<PlusCircle size={12} />}
              size="small"
            >
              New
            </Button>
            <Typography sx={{ color: "text.secondary" }}>|</Typography>
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
                <Typography sx={{ color: "text.secondary" }}>|</Typography>
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
            <Typography sx={{ color: "text.secondary" }}>|</Typography>
            {!showSearch && (
              <>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="glass-btn glass-btn-success"
                  startIcon={<Save size={12} />}
                  size="small"
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Typography sx={{ color: "text.secondary" }}>|</Typography>
              </>
            )}
            <Button
              onClick={handleSearchOpen}
              className="glass-btn glass-btn-primary"
              startIcon={<Search size={12} />}
              size="small"
            >
              Search
            </Button>
          </Stack>
        }
      />

      <Box sx={{ p: 1.5, flex: 1, minHeight: 0, overflowY: "auto" }}>
        {!showSearch ? (
          <Card
            variant="outlined"
            sx={{ p: 2 }}
            data-enter-scope="true"
            onKeyDownCapture={handleEnterKeyNavigation}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" }, columnGap: 3, rowGap: 1.5 }}>
              <Box sx={{ gridColumn: { xs: "span 12", lg: "span 6" }, display: "flex", flexDirection: "column", gap: 1 }}>
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
              </Box>

              <Box sx={{ gridColumn: { xs: "span 12", lg: "span 6" }, display: "flex", flexDirection: "column", gap: 1 }}>
                <SearchableSelect label="City"  name="cityId"  options={cities} value={formData.cityId}  onChange={handleChange} />
                <SearchableSelect label="State" name="stateId" options={states} value={formData.stateId} onChange={handleChange} />
                <TextInput label="Pincode"          name="pincode"          value={formData.pincode}          onChange={handleChange} />
                <Stack direction="row" sx={{ alignItems: "center", width: "100%" }}>
                  <Typography component="label" sx={{ width: "40%", flexShrink: 0, fontSize: 10.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5 }}>Tax</Typography>
                  <Box sx={{ flex: 1 }}>
                    <AsyncSearchSelect name="taxId" options={taxes} value={formData.taxId} onChange={handleChange} onAsyncSearch={handleAsyncTaxSearch} searchPlaceholder="Search tax..." />
                  </Box>
                </Stack>
                <SearchableSelect label="Bank" name="bankId" options={banks} value={formData.bankId} onChange={handleChange} />
                <TextInput label="Bank Account Name" name="bankAccountName" value={formData.bankAccountName} onChange={handleChange} />
                <TextInput label="IFSC"             name="ifsc"             value={formData.ifsc}             onChange={handleChange} />
                <TextInput label="Account No"       name="accountNo"        value={formData.accountNo}        onChange={handleChange} />
                <CheckboxInput label="Active"       name="active"           checked={formData.active}         onChange={handleChange} />
              </Box>
            </Box>
          </Card>
        ) : (
          <Card variant="outlined" sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <FilterableDataTable
              rows={searchResults.map((row, index) => ({ ...row, __serial: index + 1 }))}
              columns={tableColumns}
              loading={searchLoading}
              searchPlaceholder="Search in agent fields..."
              searchButtonClassName="glass-btn glass-btn-primary"
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
              pagination={rawPagination}
              enableVirtualization
              onPageChange={setPage}
              onNextCursor={handleAgentNextCursor}
              onPreviousCursor={handleAgentPreviousCursor}
              onFetchGroupSummaries={fetchAgentGroupSummaries}
              onFetchGroupRows={fetchAgentGroupRows}
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
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <button
                    onClick={() => handleEditFromSearch(row)}
                    title="Edit"
                    disabled={selectedCount > 1}
                    className="glass-btn glass-btn-primary"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirm({ open: true, id: row.id, name: row.name })}
                    title="Delete"
                    className="glass-btn glass-btn-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </Stack>
              )}
            />
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default Agent;
