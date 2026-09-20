import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Eye, PlusCircle, Save, Search, Upload, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchableSelect from "../../components/SearchableSelect";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import PageSkeleton from "../../components/PageSkeleton";
import { getMasterLookups } from "../../utils/lookupCache";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Checkbox, alpha } from "@mui/material";

const TRANSPORT_SEARCHABLE_TRIGGER_SX = { height: 32, px: 1, py: 0.25, fontSize: 11 };
const TRANSPORT_SEARCHABLE_INPUT_SX = { fontSize: 11 };
const transportLabelSx = { display: "block", fontSize: 11, fontWeight: 500, color: "text.secondary" };
const transportControlSx = { mt: 0.25, "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } };

const TextInput = ({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
}) => (
  <Box>
    <Typography component="label" sx={transportLabelSx}>
      {required && <Box component="span" sx={{ color: "error.main" }}>* </Box>}
      {label}
    </Typography>
    <TextField
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      size="small"
      fullWidth
      sx={{ ...transportControlSx, "& .MuiOutlinedInput-root": disabled ? { bgcolor: "action.hover" } : undefined }}
    />
  </Box>
);

const CheckboxTextInput = ({
  label,
  id,
  name,
  checked,
  onToggle,
  value,
  onChange,
  placeholder = "",
  disabled = false,
}) => (
  <Box>
    <Typography component="label" sx={transportLabelSx}>{label}</Typography>
    <Stack
      direction="row"
      sx={{ position: "relative", mt: 0.25, alignItems: "center", height: 32, borderRadius: "1.75px", border: "1px solid", borderColor: "divider", bgcolor: disabled ? "action.hover" : "background.paper" }}
    >
      <Checkbox
        id={id}
        name={name}
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
        size="small"
        sx={{ ml: 0.5, p: 0.5 }}
      />
      <Box
        component="input"
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled || !checked}
        sx={{
          minWidth: 0,
          height: "100%",
          flex: 1,
          borderRadius: 0,
          borderLeft: "1px solid",
          borderColor: "divider",
          border: 0,
          borderLeftWidth: "1px",
          borderLeftStyle: "solid",
          px: 1,
          py: 0,
          fontSize: 11,
          outline: "none",
          bgcolor: disabled || !checked ? "action.hover" : "transparent",
          color: disabled || !checked ? "text.disabled" : "text.primary",
          cursor: disabled || !checked ? "not-allowed" : "text",
        }}
      />
    </Stack>
  </Box>
);

const SelectInput = ({ label, required = false, options, value, onChange }) => (
  <Box>
    <Typography component="label" sx={transportLabelSx}>
      {required && <Box component="span" sx={{ color: "error.main" }}>* </Box>}
      {label}
    </Typography>
    <TextField select value={value} onChange={onChange} size="small" fullWidth sx={transportControlSx}>
      <MenuItem value="">{`Select ${label}`}</MenuItem>
      {options.map((option, index) => (
        <MenuItem key={option.value || index} value={option.value ?? option.label}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  </Box>
);

const toAbsoluteUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;

  const apiBase = String(api?.defaults?.baseURL || "").trim();
  const apiBaseIsAbsolute = /^https?:\/\//i.test(apiBase);

  try {
    if (apiBaseIsAbsolute) return new URL(raw, apiBase).toString();
    return new URL(raw, window.location.origin).toString();
  } catch {
    return raw;
  }
};

const resolveAttachmentUrl = (attachment) => {
  if (!attachment) return "";
  if (attachment.file_url) return toAbsoluteUrl(attachment.file_url);
  if (attachment.file_path) return toAbsoluteUrl(`/api/uploads/transport-entries/${attachment.file_path}`);
  return "";
};

const formatDisplayDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB").replace(/\//g, "-");
};

const TransportEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramId = searchParams.get("id");
  const paramMode = searchParams.get("mode"); // "view" or "edit"
  const isViewMode = paramMode === "view";
  const today = new Date().toISOString().split("T")[0];

  const initialFormData = {
    companyId: "",
    lrMode: "",
    lrNo: "",
    lrDate: today,
    receivedDate: today,
    supplierId: "",
    agentId: "",
    commission: "",
    transportId: "",
    fromCityId: "",
    receivingCityId: "",
    autoTransferLocation: "",
    purchaseManager: "",
    stockHoldingPeriod: "",
    noOfBundles: "",
    noOfPieces: "",
    goodsValue: "",
    additionalMargin: "",
    noOfBoxes: "",
    actualWgt: "",
    chargedWeight: "",
    lrEntryDate: today,
    lrEntryNo: "",
    dueDate: "",
    payMode: "",
    invoiceNo: "",
    devDate: today,
    packageSlipNo: "",
    slipDate: "",
    freightCharge: false,
    freightChargeAmount: "",
    loadingCharge: false,
    loadingChargeAmount: "",
    bundleRate: "",
    section: "",
    remark: "",
    fileType: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [attachments, setAttachments] = useState([]);
  const [duplicateLrEntries, setDuplicateLrEntries] = useState([]);
  const [duplicateLrLoading, setDuplicateLrLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);

  // Toast state
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const showToast = (type, message) => setToast({ open: true, type, message });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({ open: false, onConfirm: null });

  // Refs for auto-focus after dropdown selection
  const lrModeRef = useRef(null);
  const lrNoRef = useRef(null);
  const supplierRef = useRef(null);
  const agentRef = useRef(null);
  const commissionRef = useRef(null);
  const transportRef = useRef(null);
  const fromCityRef = useRef(null);
  const receivingCityRef = useRef(null);
  const autoTransferRef = useRef(null);
  const devDateRef = useRef(null);

  // Helper to focus the next field (SearchableSelect trigger or input)
  const focusRef = (ref) => {
    setTimeout(() => {
      if (!ref.current) return;
      const trigger = ref.current.querySelector("[data-searchable-select-trigger]");
      if (trigger) { trigger.focus(); return; }
      const input = ref.current.querySelector("input, select");
      if (input) {
        input.focus();
        if (
          input instanceof HTMLInputElement &&
          ["date", "datetime-local", "month", "time", "week"].includes(input.type)
        ) {
          try {
            if (typeof input.showPicker === "function") input.showPicker();
            else input.click();
          } catch {
            // ignore browser-level picker restrictions
          }
        }
      }
    }, 50);
  };

  // Dropdown data from DB
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [transports, setTransports] = useState([]);
  const [cities, setCities] = useState([]);
  const [bundleRacks, setBundleRacks] = useState([]);
  const [sections, setSections] = useState([]);
  const [purchaseManagers, setPurchaseManagers] = useState([]);

  // /lookups only preloads the first 100 of each of these (suppliers/agents/transports commonly
  // hold 100k+ rows in this deployment) -- these hit each resource's own ?search= endpoint so
  // AsyncSearchSelect can find anything beyond that initial batch.
  const handleAsyncSupplierSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/suppliers", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setSuppliers((prev) => {
          const existingIds = new Set((prev || []).map((s) => String(s.id)));
          const newItems = results.filter((s) => !existingIds.has(String(s.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch {
      return [];
    }
  }, []);

  const handleAsyncAgentSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/agents", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setAgents((prev) => {
          const existingIds = new Set((prev || []).map((a) => String(a.id)));
          const newItems = results.filter((a) => !existingIds.has(String(a.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch {
      return [];
    }
  }, []);

  const handleAsyncTransportSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/transports", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setTransports((prev) => {
          const existingIds = new Set((prev || []).map((t) => String(t.id)));
          const newItems = results.filter((t) => !existingIds.has(String(t.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch {
      return [];
    }
  }, []);

  // Hardcoded LR Mode options
  const lrModeOptions = [
    { label: "Lorry", value: "Lorry" },
    { label: "Hand Delivery", value: "Hand Delivery" },
    { label: "Tailoring", value: "Tailoring" },
    { label: "Delivery Challan", value: "Delivery Challan" },
    { label: "Temporary", value: "Temporary" },
    { label: "MFG - Jobwork", value: "MFG - Jobwork" },
    { label: "MFG - BOM", value: "MFG - BOM" },
    { label: "Inter Transfer", value: "Inter Transfer" },
    { label: "Expenses", value: "Expenses" },
    { label: "RCM - Transports", value: "RCM - Transports" },
  ];

  const payModeOptions = [
    { label: "Intermediate", value: "Intermediate" },
    { label: "Agreed Days", value: "Agreed Days" },
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" },
    { label: "After Sales", value: "After Sales" },
  ];

  const fileTypeOptions = [
    { label: "Invoice", value: "Invoice" },
    { label: "LR Copy", value: "LR Copy" },
    { label: "Other", value: "Other" },
  ];

  const purchaseManagerOptions = purchaseManagers.map((employee) => {
    const code = String(employee?.code || "").trim();
    const name = String(employee?.name || "").trim() || "Unnamed";
    const designationName = String(employee?.designation?.name || employee?.designation?.role_name || "").trim();
    const suffix = designationName ? ` - ${designationName}` : "";
    return {
      label: `${code ? `${code} - ` : ""}${name}${suffix}`,
      value: name,
    };
  });

  // /lookups' 'employees' case was selecting a nonexistent 'employee_code' column, which threw
  // and got silently swallowed -- this dropdown loaded empty on every page view. Fixed on the
  // backend; this hits the working /employees?search= endpoint for anything beyond that preload.
  const handleAsyncPurchaseManagerSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/employees", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setPurchaseManagers((prev) => {
          const existingIds = new Set((prev || []).map((e) => String(e.id)));
          const newItems = results.filter((e) => !existingIds.has(String(e.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results.map((employee) => {
        const code = String(employee?.code || "").trim();
        const name = String(employee?.name || "").trim() || "Unnamed";
        const designationName = String(employee?.designation?.name || "").trim();
        const suffix = designationName ? ` - ${designationName}` : "";
        return {
          label: `${code ? `${code} - ` : ""}${name}${suffix}`,
          value: name,
        };
      });
    } catch {
      return [];
    }
  }, []);

  // Fetch all dropdown data on mount via high-speed consolidated lookup
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const lookups = await getMasterLookups("transport_entry");

        setCompanies(lookups.companies || []);
        setSuppliers(lookups.suppliers || []);
        setAgents(lookups.agents || []);
        setTransports(lookups.transports || []);
        setCities(lookups.cities || []);
        setBundleRacks(lookups.bundle_racks || []);
        setSections(lookups.divisions || []);
        setPurchaseManagers(Array.isArray(lookups.employees) ? lookups.employees : []);

        if (lookups.next_lr) {
          setFormData((prev) => ({
            ...prev,
            lrEntryNo: prev.lrEntryNo || lookups.next_lr,
          }));
        }
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDropdownData();
  }, []);

  // Load existing entry when navigating from dashboard with id param
  useEffect(() => {
    if (!paramId) return;
    const loadEntry = async () => {
      try {
        const res = await api.get(`/transport-entries/${paramId}`);
        const entry = res.data.data || res.data;
        setEditId(entry.id);
        setFormData({
          companyId: entry.company_id ? String(entry.company_id) : "",
          lrMode: entry.lr_mode || "",
          lrNo: entry.lr_no || "",
          lrDate: entry.lr_date || today,
          receivedDate: entry.received_date || today,
          supplierId: entry.supplier_id ? String(entry.supplier_id) : "",
          agentId: entry.agent_id ? String(entry.agent_id) : "",
          commission: entry.commission || "",
          transportId: entry.transport_id ? String(entry.transport_id) : "",
          fromCityId: entry.from_city_id ? String(entry.from_city_id) : "",
          receivingCityId: entry.receiving_city_id ? String(entry.receiving_city_id) : "",
          autoTransferLocation: entry.auto_transfer_location || "",
          purchaseManager: entry.purchase_manager || "",
          stockHoldingPeriod: entry.stock_holding_period || "",
          noOfBundles: entry.no_of_bundles || "",
          noOfPieces: entry.no_of_pieces || "",
          goodsValue: entry.goods_value || "",
          additionalMargin: entry.additional_margin || "",
          noOfBoxes: entry.no_of_boxes || "",
          actualWgt: entry.actual_wgt || "",
          chargedWeight: entry.charged_weight || "",
          lrEntryDate: entry.lr_entry_date || today,
          lrEntryNo: entry.lr_entry_no || "",
          dueDate: entry.due_date || "",
          payMode: entry.pay_mode || "",
          invoiceNo: entry.invoice_no || "",
          devDate: entry.dev_date || today,
          packageSlipNo: entry.package_slip_no || "",
          slipDate: entry.slip_date || "",
          freightCharge: entry.freight_charge || false,
          freightChargeAmount: entry.freight_charge_amount ?? "",
          loadingCharge: entry.loading_charge || false,
          loadingChargeAmount: entry.loading_charge_amount ?? "",
          bundleRate: entry.bundle_rate || "",
          section: entry.section || "",
          remark: entry.remark || "",
          fileType: "",
        });
        if (entry.attachments) setAttachments(entry.attachments);
      } catch (err) {
        console.error("Failed to load entry:", err);
        showToast("error", "Failed to load transport entry");
      }
    };
    loadEntry();
  }, [paramId]);

  useEffect(() => {
    const lrNo = String(formData.lrNo || "").trim();
    if (!lrNo) {
      setDuplicateLrEntries([]);
      setDuplicateLrLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setDuplicateLrLoading(true);
      try {
        const res = await api.get("/transport-entries/duplicates", {
          params: {
            lrNo,
            companyId: formData.companyId || undefined,
            excludeId: editId || undefined,
          },
        });
        setDuplicateLrEntries(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error("Failed to fetch duplicate LR entries:", err);
        setDuplicateLrEntries([]);
      } finally {
        setDuplicateLrLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [formData.lrNo, formData.companyId, editId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFieldChange = (name) => (e) => {
    handleChange({
      target: { name, value: e.target.value, type: e.target.type },
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (!editId) {
      // Store files temporarily until entry is saved
      const tempFiles = files.map((f) => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        file_name: f.name,
        file_type: formData.fileType || "Other",
        file: f,
        isTemp: true,
      }));
      setAttachments((prev) => [...prev, ...tempFiles]);
      e.target.value = "";
      return;
    }

    // Upload to existing entry
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("file_type", formData.fileType || "Other");

    try {
      const res = await api.post(`/transport-entries/${editId}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachments((prev) => [...prev, ...(res.data.data || res.data)]);
    } catch (err) {
      console.error("Upload failed:", err);
      showToast("error", "File upload failed");
    }
    e.target.value = "";
  };

  const handleDeleteAttachment = async (att) => {
    if (att.isTemp) {
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      return;
    }
    try {
      await api.delete(`/transport-entries/attachments/${att.id}`);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch (err) {
      console.error("Delete attachment failed:", err);
    }
  };

  const handleViewAttachment = (attachment) => {
    if (attachment?.isTemp && attachment?.file instanceof File) {
      const tempUrl = URL.createObjectURL(attachment.file);
      window.open(tempUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(tempUrl), 60_000);
      return;
    }

    const url = resolveAttachmentUrl(attachment);
    if (!url) {
      showToast("warning", "File URL not found");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const uploadTempFiles = async (entryId) => {
    const tempFiles = attachments.filter((a) => a.isTemp);
    if (!tempFiles.length) return;

    const fd = new FormData();
    tempFiles.forEach((t) => fd.append("files", t.file));
    fd.append("file_type", tempFiles[0].file_type || "Other");

    try {
      const res = await api.post(`/transport-entries/${entryId}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachments((prev) => [
        ...prev.filter((a) => !a.isTemp),
        ...(res.data.data || res.data),
      ]);
    } catch (err) {
      console.error("Failed to upload temp files:", err);
    }
  };

  const handleSave = async () => {
    if (!formData.companyId) {
      showToast("warning", "Company is required");
      return false;
    }
    setSaving(true);
    try {
      let savedEntry;
      const companyName = companies.find((c) => String(c.id) === String(formData.companyId))?.name || "";
      const supplierName = suppliers.find((s) => String(s.id) === String(formData.supplierId))?.name || "";
      const transportName = transports.find((t) => String(t.id) === String(formData.transportId))?.name || "";
      const payload = {
        ...formData,
        companyName,
        supplierName,
        transportName,
      };

      if (editId) {
        const res = await api.put(`/transport-entries/${editId}`, payload);
        savedEntry = res.data.data;
      } else {
        const res = await api.post("/transport-entries", payload);
        savedEntry = res.data.data;
        setEditId(savedEntry.id);
      }

      // Upload any temp files
      await uploadTempFiles(savedEntry.id);

      showToast("success", "Transport entry saved successfully!");
      return savedEntry;
    } catch (err) {
      console.error("Save failed:", err);
      showToast("error", err.response?.data?.message || "Failed to save transport entry");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNext = async () => {
    const savedEntry = await handleSave();
    if (savedEntry) {
      const lrMode = String(savedEntry.lr_mode || formData.lrMode || "").trim().toLowerCase();
      if (lrMode === "lorry") {
        navigate(`/warehouse/transport-issue?transport_entry_id=${savedEntry.id}`);
        return;
      }

      // Pass saved entry data to Invoice page
      const companyName = companies.find((c) => String(c.id) === String(formData.companyId))?.name || "";
      const supplierName = suppliers.find((s) => String(s.id) === String(formData.supplierId))?.name || "";
      navigate("/warehouse/invoice", {
        state: {
          fromTransportEntry: true,
          companyId: formData.companyId,
          companyName,
          supplierId: formData.supplierId,
          supplierName,
          lrEntryNo: savedEntry.lr_entry_no || formData.lrEntryNo,
          lrNo: formData.lrNo,
          transportEntryId: savedEntry.id,
          pieces: formData.noOfPieces || 0,
          bundles: formData.noOfBundles || 0,
        },
      });
    }
  };

  const handleNew = () => {
    setEditId(null);
    setAttachments([]);
    setDuplicateLrEntries([]);
    setFormData({ ...initialFormData, lrEntryNo: "" });
    api.get("/transport-entries/next-lr-number").then((res) => {
      setFormData((prev) => ({ ...prev, lrEntryNo: res.data.next_no || "" }));
    });
  };

  const handleSearchClick = () => {
    navigate("/warehouse/transport-entry/search");
  };

  const handleBackClick = () => {
    navigate("/warehouse");
  };

  if (loading) {
    return <PageSkeleton variant="form" rows={10} />;
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }} className="master-responsive">
      {/* Header */}
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 0.75, boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton onClick={handleBackClick} type="button" aria-label="Back to warehouse module" sx={{ color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/warehouse")} sx={{ minWidth: "auto", p: 0, fontSize: 12.25, fontWeight: 600 }}>
              Warehouse
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span" sx={{ color: "text.primary" }}>
              Transport Entry{isViewMode ? " (View)" : paramMode === "edit" ? " (Edit)" : ""}
            </Box>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
          <Button className="topbar-action-btn topbar-action-new" onClick={handleNew} startIcon={<PlusCircle size={14} />} sx={{ fontSize: 10.5 }}>
            New
          </Button>
          {!isViewMode && (
            <>
              <Box component="span">|</Box>
              <Button className="glass-btn glass-btn-primary" onClick={handleSaveAndNext} disabled={saving} startIcon={<Save size={14} />} sx={{ fontSize: 10.5 }}>
                Save & Next
              </Button>
              <Box component="span">|</Box>
              <Button className="glass-btn glass-btn-success" onClick={handleSave} disabled={saving} startIcon={<Save size={14} />} sx={{ fontSize: 10.5 }}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
          <Box component="span">|</Box>
          <Button className="glass-btn glass-btn-primary" onClick={handleSearchClick} startIcon={<Search size={14} />} sx={{ fontSize: 10.5 }}>
            Search
          </Button>
        </Stack>
      </Stack>

      {/* Main Form */}
      <Box sx={{ flex: 1, minHeight: 0, p: 1.5 }}>
        <Box sx={{ bgcolor: "background.paper", boxShadow: 3, borderRadius: "7px", border: "1px solid", borderColor: "divider", height: "100%", overflowY: "auto" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 1.25, p: 1.25 }}>
            {/* === Column 1 (Left) === */}
            <Stack spacing={1.25} sx={{ gridColumn: { xs: "span 12", lg: "span 3" } }}>
              {/* Company dropdown from DB */}
              <Box>
                <Typography component="label" sx={transportLabelSx}>
                  <Box component="span" sx={{ color: "error.main" }}>* </Box>Company
                </Typography>
                <Box sx={{ mt: 0.25 }}>
                  <SearchableSelect
                    name="companyId"
                    options={companies.map((c) => ({ label: c.name, value: String(c.id) }))}
                    value={String(formData.companyId)}
                    onChange={(e) => { handleFieldChange("companyId")(e); focusRef(lrModeRef); }}
                    placeholder="Select Company"
                    triggerSx={TRANSPORT_SEARCHABLE_TRIGGER_SX}
                    searchInputSx={TRANSPORT_SEARCHABLE_INPUT_SX}
                  />
                </Box>
              </Box>

              {/* LR Mode / No - two fields side by side */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25 }}>
                <Box ref={lrModeRef}>
                  <Typography component="label" sx={transportLabelSx}>
                    <Box component="span" sx={{ color: "error.main" }}>* </Box>LR Mode
                  </Typography>
                  <Box sx={{ mt: 0.25 }}>
                    <SearchableSelect
                      name="lrMode"
                      options={lrModeOptions}
                      value={formData.lrMode}
                      onChange={(e) => { handleFieldChange("lrMode")(e); focusRef(lrNoRef); }}
                      placeholder="Select LR Mode"
                      triggerSx={TRANSPORT_SEARCHABLE_TRIGGER_SX}
                      searchInputSx={TRANSPORT_SEARCHABLE_INPUT_SX}
                    />
                  </Box>
                </Box>
                <Box ref={lrNoRef}>
                  <TextInput
                    label="LR No"
                    value={formData.lrNo}
                    onChange={handleFieldChange("lrNo")}
                    placeholder="Enter LR No"
                  />
                </Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25 }}>
                <TextInput
                  label="LR Date"
                  required
                  type="date"
                  value={formData.lrDate}
                  onChange={handleFieldChange("lrDate")}
                />
                <TextInput
                  label="Received Date"
                  type="date"
                  value={formData.receivedDate}
                  onChange={handleFieldChange("receivedDate")}
                />
              </Box>

              {/* Supplier dropdown from DB */}
              <Box ref={supplierRef}>
                <Typography component="label" sx={transportLabelSx}>
                  <Box component="span" sx={{ color: "error.main" }}>* </Box>Supplier
                </Typography>
                <Box sx={{ mt: 0.25 }}>
                  <AsyncSearchSelect
                    name="supplierId"
                    options={suppliers}
                    onAsyncSearch={handleAsyncSupplierSearch}
                    value={String(formData.supplierId)}
                    onChange={(e) => { handleFieldChange("supplierId")(e); focusRef(agentRef); }}
                    placeholder="Select Supplier"
                    searchPlaceholder="Search supplier..."
                  />
                </Box>
              </Box>

              {/* Agent / Commission - two fields */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25 }}>
                <Box ref={agentRef}>
                  <Typography component="label" sx={transportLabelSx}>
                    <Box component="span" sx={{ color: "error.main" }}>* </Box>Agent
                  </Typography>
                  <Box sx={{ mt: 0.25 }}>
                    <AsyncSearchSelect
                      name="agentId"
                      options={agents}
                      onAsyncSearch={handleAsyncAgentSearch}
                      value={String(formData.agentId)}
                      onChange={(e) => { handleFieldChange("agentId")(e); focusRef(commissionRef); }}
                      placeholder="Select Agent"
                      searchPlaceholder="Search agent..."
                    />
                  </Box>
                </Box>
                <Box ref={commissionRef}>
                  <TextInput
                    label="Commission"
                    value={formData.commission}
                    onChange={handleFieldChange("commission")}
                    placeholder="Enter commission"
                  />
                </Box>
              </Box>

              {/* Transport dropdown from DB */}
              <Box ref={transportRef}>
                <Typography component="label" sx={transportLabelSx}>Transport</Typography>
                <Box sx={{ mt: 0.25 }}>
                  <AsyncSearchSelect
                    name="transportId"
                    options={transports}
                    onAsyncSearch={handleAsyncTransportSearch}
                    value={String(formData.transportId)}
                    onChange={(e) => { handleFieldChange("transportId")(e); focusRef(fromCityRef); }}
                    placeholder="Select Transport"
                    searchPlaceholder="Search transport..."
                  />
                </Box>
              </Box>

              {/* City dropdowns from DB (cfg_city) */}
              <Box ref={fromCityRef}>
                <Typography component="label" sx={transportLabelSx}>From City</Typography>
                <Box sx={{ mt: 0.25 }}>
                  <SearchableSelect
                    name="fromCityId"
                    options={cities.map((c) => ({ label: c.name, value: String(c.id) }))}
                    value={String(formData.fromCityId)}
                    onChange={(e) => { handleFieldChange("fromCityId")(e); focusRef(receivingCityRef); }}
                    placeholder="Select From City"
                    triggerSx={TRANSPORT_SEARCHABLE_TRIGGER_SX}
                    searchInputSx={TRANSPORT_SEARCHABLE_INPUT_SX}
                  />
                </Box>
              </Box>
              <Box ref={receivingCityRef}>
                <Typography component="label" sx={transportLabelSx}>Receiving City</Typography>
                <Box sx={{ mt: 0.25 }}>
                  <SearchableSelect
                    name="receivingCityId"
                    options={cities.map((c) => ({ label: c.name, value: String(c.id) }))}
                    value={String(formData.receivingCityId)}
                    onChange={(e) => { handleFieldChange("receivingCityId")(e); focusRef(autoTransferRef); }}
                    placeholder="Select Receiving City"
                    triggerSx={TRANSPORT_SEARCHABLE_TRIGGER_SX}
                    searchInputSx={TRANSPORT_SEARCHABLE_INPUT_SX}
                  />
                </Box>
              </Box>

              {String(formData.lrNo || "").trim() && (
                <Box sx={(theme) => ({ borderRadius: "5.25px", border: "1px solid", borderColor: alpha(theme.palette.warning.main, 0.4), bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.1), px: 1.5, py: 1 })}>
                  {duplicateLrLoading ? (
                    <Box sx={{ fontSize: 11, color: "warning.main" }}>Checking duplicate LR entries...</Box>
                  ) : duplicateLrEntries.length > 0 ? (
                    <Stack spacing={1}>
                      <Box sx={{ fontSize: 11, fontWeight: 600, color: "warning.main" }}>
                        {duplicateLrEntries.length} Duplicate LR {duplicateLrEntries.length === 1 ? "Entry" : "Entries"} Found
                      </Box>
                      {duplicateLrEntries.map((entry) => (
                        <Box
                          key={entry.id}
                          sx={(theme) => ({ borderRadius: "3.5px", border: "1px solid", borderColor: alpha(theme.palette.warning.main, 0.3), bgcolor: "background.paper", px: 1.25, py: 1, fontSize: 11, color: "text.secondary" })}
                        >
                          <Box sx={{ display: "grid", gridTemplateColumns: "88px 1fr", columnGap: 1.5, rowGap: 0.5 }}>
                            <Box sx={{ fontWeight: 500, color: "text.secondary" }}>LR Info</Box>
                            <Box>
                              Date : {formatDisplayDate(entry.lr_date)} , Entry No : {entry.lr_entry_no || "-"}
                            </Box>
                            <Box sx={{ fontWeight: 500, color: "text.secondary" }}>Invoice</Box>
                            <Box>
                              Date : {formatDisplayDate(entry.invoice?.invoice_date)} , Invoice No : {entry.invoice?.invoice_no || "-"}
                            </Box>
                            <Box sx={{ fontWeight: 500, color: "text.secondary" }}>Entered By</Box>
                            <Box>{entry.entered_by || "-"}</Box>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  ) : null}
                </Box>
              )}
            </Stack>

            {/* === Column 2 (Left-Center) === */}
            <Stack spacing={1.25} sx={{ gridColumn: { xs: "span 12", lg: "span 3" }, borderColor: "divider", px: 1.25, borderLeft: { lg: "1px solid" }, borderLeftColor: { lg: "divider" } }}>
              <Box ref={autoTransferRef}>
                <TextInput
                  label="Auto Transfer Location"
                  value={formData.autoTransferLocation}
                  onChange={handleFieldChange("autoTransferLocation")}
                  placeholder="Enter location"
                />
              </Box>

              <Box>
                <Typography component="label" sx={transportLabelSx}>Purchase Manager</Typography>
                <Box sx={{ mt: 0.25 }}>
                  <AsyncSearchSelect
                    name="purchaseManager"
                    options={purchaseManagerOptions}
                    onAsyncSearch={handleAsyncPurchaseManagerSearch}
                    value={String(formData.purchaseManager || "")}
                    onChange={handleFieldChange("purchaseManager")}
                    placeholder="Select Purchase Manager"
                    searchPlaceholder="Search employees..."
                  />
                </Box>
              </Box>

              <TextInput
                label="Stock Holding Period (days)"
                type="number"
                value={formData.stockHoldingPeriod}
                onChange={handleFieldChange("stockHoldingPeriod")}
              />

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 1.25, rowGap: 0.75, borderTop: 1, borderColor: "divider", pt: 0.75 }}>
                <TextInput
                  label="No Of Bundles"
                  required
                  type="number"
                  value={formData.noOfBundles}
                  onChange={handleFieldChange("noOfBundles")}
                />
                <TextInput
                  label="Additional Margin"
                  value={formData.additionalMargin}
                  onChange={handleFieldChange("additionalMargin")}
                />
                <TextInput
                  label="No Of Pieces"
                  required
                  type="number"
                  value={formData.noOfPieces}
                  onChange={handleFieldChange("noOfPieces")}
                />
                <TextInput
                  label="No Of Boxes"
                  required
                  type="number"
                  value={formData.noOfBoxes}
                  onChange={handleFieldChange("noOfBoxes")}
                />
                <TextInput
                  label="Goods Value"
                  type="number"
                  value={formData.goodsValue}
                  onChange={handleFieldChange("goodsValue")}
                />
                <TextInput
                  label="Actual Wgt"
                  type="number"
                  value={formData.actualWgt}
                  onChange={handleFieldChange("actualWgt")}
                />
                <TextInput
                  label="Charged Weight"
                  type="number"
                  value={formData.chargedWeight}
                  onChange={handleFieldChange("chargedWeight")}
                />
              </Box>
            </Stack>

            {/* === Column 3 (Middle) === */}
            <Stack spacing={1.25} sx={{ gridColumn: { xs: "span 12", lg: "span 3" }, borderColor: "divider", px: 1.25, borderLeft: { lg: "1px solid" }, borderLeftColor: { lg: "divider" } }}>
              <TextInput
                label="LR Entry Date"
                required
                type="date"
                value={formData.lrEntryDate}
                onChange={handleFieldChange("lrEntryDate")}
              />
              <TextInput
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={handleFieldChange("dueDate")}
              />
              <TextInput
                label="Invoice No"
                value={formData.invoiceNo}
                onChange={handleFieldChange("invoiceNo")}
              />
              <TextInput
                label="Package/Slip No"
                value={formData.packageSlipNo}
                onChange={handleFieldChange("packageSlipNo")}
              />

              <CheckboxTextInput
                label="Freight Charge"
                id="freightCharge"
                name="freightCharge"
                checked={formData.freightCharge}
                onToggle={handleChange}
                value={formData.freightChargeAmount}
                onChange={handleFieldChange("freightChargeAmount")}
                placeholder="Enter freight charge"
                disabled={isViewMode}
              />

              <SelectInput
                label="Bundle Rack"
                options={bundleRacks.map((row) => ({ label: row.name, value: row.name }))}
                value={formData.bundleRate}
                onChange={handleFieldChange("bundleRate")}
              />

              <TextInput
                label="Remark"
                value={formData.remark}
                onChange={handleFieldChange("remark")}
              />

              {/* File Attachments */}
              <Box sx={{ pt: 1 }}>
                <Typography component="h3" sx={{ mb: 0.75, fontSize: 10.5, fontWeight: 600, color: "text.primary" }}>
                  File Attachments
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25 }}>
                  <Box>
                    <Typography component="label" sx={transportLabelSx}>Type</Typography>
                    <Box sx={{ mt: 0.25 }}>
                      <SearchableSelect
                        name="fileType"
                        options={fileTypeOptions}
                        value={formData.fileType}
                        onChange={handleFieldChange("fileType")}
                        placeholder="Select Type"
                        triggerSx={TRANSPORT_SEARCHABLE_TRIGGER_SX}
                        searchInputSx={TRANSPORT_SEARCHABLE_INPUT_SX}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ alignSelf: "flex-end", pt: 2.5 }}>
                    <Box
                      component="label"
                      htmlFor="fileUpload"
                      sx={{ display: "flex", cursor: "pointer", alignItems: "center", justifyContent: "center", borderRadius: "1.75px", bgcolor: "#22c55e", px: 1.5, py: 0.5, fontSize: 11, color: "#fff", transition: "background-color 0.15s", "&:hover": { bgcolor: "#16a34a" } }}
                    >
                      <Upload size={14} style={{ marginRight: 4 }} /> Upload Files
                    </Box>
                    <Box
                      component="input"
                      id="fileUpload"
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      sx={{ display: "none" }}
                    />
                  </Box>
                </Box>

                <Box sx={{ mt: 2, border: "1px solid", borderColor: "divider", borderRadius: "1.75px" }}>
                  <Stack direction="row" sx={{ bgcolor: "action.hover", borderBottom: 1, borderColor: "divider", fontSize: 10.5, fontWeight: 600, color: "text.secondary" }}>
                    <Box sx={{ width: "33.33%", px: 1.5, py: 0.5 }}>Type</Box>
                    <Box sx={{ width: "33.33%", px: 1.5, py: 0.5 }}>File Name</Box>
                    <Box sx={{ width: "33.33%", px: 1.5, py: 0.5 }}>Action</Box>
                  </Stack>
                  {attachments.length === 0 ? (
                    <Box sx={{ color: "text.secondary", fontSize: 10.5, fontStyle: "italic", p: 1.5 }}>
                      No files uploaded
                    </Box>
                  ) : (
                    attachments.map((att) => (
                      <Stack
                        key={att.id}
                        direction="row"
                        sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", fontSize: 10.5, "&:last-of-type": { borderBottom: 0 } }}
                      >
                        <Box sx={{ width: "33.33%", px: 1.5, py: 1 }}>
                          {att.file_type || "Other"}
                        </Box>
                        <Box sx={{ width: "33.33%", px: 1.5, py: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {att.file_name}
                        </Box>
                        <Box sx={{ width: "33.33%", px: 1.5, py: 1 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                            <IconButton
                              type="button"
                              title="View file"
                              onClick={() => handleViewAttachment(att)}
                              size="small"
                              sx={{ color: "primary.main", p: 0.25 }}
                            >
                              <Eye size={14} />
                            </IconButton>
                            <IconButton
                              type="button"
                              title="Delete file"
                              onClick={() => handleDeleteAttachment(att)}
                              size="small"
                              sx={{ color: "error.main", p: 0.25 }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </Stack>
                        </Box>
                      </Stack>
                    ))
                  )}
                  <Stack direction="row" sx={{ justifyContent: "flex-end", p: 1, bgcolor: "action.hover", borderTop: 1, borderColor: "divider" }}>
                    <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: "text.primary" }}>
                      {attachments.length} file(s)
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Stack>

            {/* === Column 4 (Right) === */}
            <Stack spacing={1.25} sx={{ gridColumn: { xs: "span 12", lg: "span 3" }, borderColor: "divider", pl: 1.25, borderLeft: { lg: "1px solid" }, borderLeftColor: { lg: "divider" } }}>
              {/* LR Entry No - disabled, auto-generated */}
              <TextInput
                label="LR Entry No"
                value={formData.lrEntryNo}
                disabled
                onChange={() => {}}
              />
              <Box>
                <Typography component="label" sx={transportLabelSx}>
                  <Box component="span" sx={{ color: "error.main" }}>* </Box>Pay Mode
                </Typography>
                <Box sx={{ mt: 0.25 }}>
                  <SearchableSelect
                    name="payMode"
                    options={payModeOptions}
                    value={formData.payMode}
                    onChange={(e) => { handleFieldChange("payMode")(e); focusRef(devDateRef); }}
                    placeholder="Select Pay Mode"
                    triggerSx={TRANSPORT_SEARCHABLE_TRIGGER_SX}
                    searchInputSx={TRANSPORT_SEARCHABLE_INPUT_SX}
                  />
                </Box>
              </Box>
              <Box ref={devDateRef}>
                <TextInput
                  label="Dev Date"
                  type="date"
                  value={formData.devDate}
                  onChange={handleFieldChange("devDate")}
                />
              </Box>
              <TextInput
                label="Slip Date"
                type="date"
                value={formData.slipDate}
                onChange={handleFieldChange("slipDate")}
              />

              <CheckboxTextInput
                label="Loading Charge"
                id="loadingCharge"
                name="loadingCharge"
                checked={formData.loadingCharge}
                onToggle={handleChange}
                value={formData.loadingChargeAmount}
                onChange={handleFieldChange("loadingChargeAmount")}
                placeholder="Enter loading charge"
                disabled={isViewMode}
              />

              <SelectInput
                label="Section"
                options={sections.map((row) => ({ label: row.name, value: row.name }))}
                value={formData.section}
                onChange={handleFieldChange("section")}
              />
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Toast Notification */}
      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          setConfirmDialog({ open: false, onConfirm: null });
        }}
        onCancel={() => setConfirmDialog({ open: false, onConfirm: null })}
      />
    </Box>
  );
};

export default TransportEntry;
