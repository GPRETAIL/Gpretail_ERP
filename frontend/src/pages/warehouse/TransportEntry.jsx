import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Eye, PlusCircle, Save, Search, Upload, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchableSelect from "../../components/SearchableSelect";
import PageSkeleton from "../../components/PageSkeleton";
import { getMasterLookups } from "../../utils/lookupCache";

const TRANSPORT_LABEL_CLASS = "block text-[11px] font-medium text-gray-700 dark:text-gray-300";
const TRANSPORT_CONTROL_CLASS = "mt-0.5 h-8 w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 dark:placeholder-gray-500 px-2 py-0.5 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const TRANSPORT_SEARCHABLE_TRIGGER_CLASS = "h-8 px-2 py-0.5 text-[11px]";
const TRANSPORT_SEARCHABLE_INPUT_CLASS = "text-[11px]";

const TextInput = ({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
}) => (
  <div>
    <label className={TRANSPORT_LABEL_CLASS}>
      {required && <span className="text-red-500 dark:text-red-400">* </span>}
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`${TRANSPORT_CONTROL_CLASS} ${
        disabled ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""
      }`}
    />
  </div>
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
  <div>
    <label className={TRANSPORT_LABEL_CLASS}>{label}</label>
    <div className="relative mt-0.5">
      <div className={`flex h-8 items-center rounded-sm border border-gray-300 dark:border-gray-600 ${disabled ? "bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-700"}`}>
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          className="ml-2 h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-500 text-blue-600"
        />
        <input
          type="number"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled || !checked}
          className={`min-w-0 h-full flex-1 rounded-r-sm border-l border-gray-200 dark:border-gray-700 px-2 py-0 text-[11px] focus:outline-none ${
            disabled || !checked ? "cursor-not-allowed bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500" : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          }`}
        />
      </div>
    </div>
  </div>
);

const SelectInput = ({ label, required = false, options, value, onChange }) => (
  <div>
    <label className={TRANSPORT_LABEL_CLASS}>
      {required && <span className="text-red-500 dark:text-red-400">* </span>}
      {label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className={`${TRANSPORT_CONTROL_CLASS} bg-white dark:bg-gray-700`}
    >
      <option value="">{`Select ${label}`}</option>
      {options.map((option, index) => (
        <option key={option.value || index} value={option.value ?? option.label}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
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
    const code = String(employee?.employee_code || "").trim();
    const name = [employee?.name, employee?.surname].map((part) => String(part || "").trim()).filter(Boolean).join(" ") || "Unnamed";
    const designationName = String(employee?.designation?.name || employee?.designation?.role_name || "").trim();
    const suffix = designationName ? ` - ${designationName}` : "";
    return {
      label: `${code ? `${code} - ` : ""}${name}${suffix}`,
      value: name,
    };
  });

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
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      {/* Header */}
      <div className="flex items-center justify-between border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            onClick={handleBackClick}
            type="button"
            aria-label="Back to warehouse module"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/warehouse")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Warehouse
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-900 dark:text-gray-100">
              Transport Entry{isViewMode ? " (View)" : paramMode === "edit" ? " (Edit)" : ""}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
          <button
            className="topbar-action-btn topbar-action-new text-xs"
            onClick={handleNew}
          >
            <PlusCircle className="mr-1 h-3.5 w-3.5" /> New
          </button>
          {!isViewMode && (
            <>
              <span>|</span>
              <button
                className="glass-btn glass-btn-primary flex items-center text-xs"
                onClick={handleSaveAndNext}
                disabled={saving}
              >
                <Save className="mr-1 h-3.5 w-3.5" /> Save & Next
              </button>
              <span>|</span>
              <button
                className="glass-btn glass-btn-success flex items-center text-xs"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
          <span>|</span>
          <button
            className="glass-btn glass-btn-primary flex items-center text-xs"
            onClick={handleSearchClick}
          >
            <Search className="mr-1 h-3.5 w-3.5" /> Search
          </button>
        </div>
      </div>

      {/* Main Form */}
      <div className="flex-1 min-h-0 p-3">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 h-full overflow-y-auto">
          <div className="grid grid-cols-12 gap-2.5 p-2.5">
            {/* === Column 1 (Left) === */}
            <div className="col-span-12 space-y-2.5 lg:col-span-3">
              {/* Company dropdown from DB */}
              <div>
                <label className={TRANSPORT_LABEL_CLASS}>
                  <span className="text-red-500 dark:text-red-400">* </span>Company
                </label>
                <div className="mt-0.5">
                  <SearchableSelect
                    name="companyId"
                    options={companies.map((c) => ({ label: c.name, value: String(c.id) }))}
                    value={String(formData.companyId)}
                    onChange={(e) => { handleFieldChange("companyId")(e); focusRef(lrModeRef); }}
                    placeholder="Select Company"
                    triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                    searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                  />
                </div>
              </div>

              {/* LR Mode / No - two fields side by side */}
              <div className="grid grid-cols-2 gap-2.5">
                <div ref={lrModeRef}>
                  <label className={TRANSPORT_LABEL_CLASS}>
                    <span className="text-red-500 dark:text-red-400">* </span>LR Mode
                  </label>
                  <div className="mt-0.5">
                    <SearchableSelect
                      name="lrMode"
                      options={lrModeOptions}
                      value={formData.lrMode}
                      onChange={(e) => { handleFieldChange("lrMode")(e); focusRef(lrNoRef); }}
                      placeholder="Select LR Mode"
                      triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                      searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                    />
                  </div>
                </div>
                <div ref={lrNoRef}>
                  <TextInput
                    label="LR No"
                    value={formData.lrNo}
                    onChange={handleFieldChange("lrNo")}
                    placeholder="Enter LR No"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
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
              </div>

              {/* Supplier dropdown from DB */}
              <div ref={supplierRef}>
                <label className={TRANSPORT_LABEL_CLASS}>
                  <span className="text-red-500 dark:text-red-400">* </span>Supplier
                </label>
                <div className="mt-0.5">
                  <SearchableSelect
                    name="supplierId"
                    options={suppliers.map((s) => ({ label: s.name, value: String(s.id) }))}
                    value={String(formData.supplierId)}
                    onChange={(e) => { handleFieldChange("supplierId")(e); focusRef(agentRef); }}
                    placeholder="Select Supplier"
                    triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                    searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Agent / Commission - two fields */}
              <div className="grid grid-cols-2 gap-2.5">
                <div ref={agentRef}>
                  <label className={TRANSPORT_LABEL_CLASS}>
                    <span className="text-red-500 dark:text-red-400">* </span>Agent
                  </label>
                  <div className="mt-0.5">
                    <SearchableSelect
                      name="agentId"
                      options={agents.map((a) => ({ label: a.name, value: String(a.id) }))}
                      value={String(formData.agentId)}
                      onChange={(e) => { handleFieldChange("agentId")(e); focusRef(commissionRef); }}
                      placeholder="Select Agent"
                      triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                      searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                    />
                  </div>
                </div>
                <div ref={commissionRef}>
                  <TextInput
                    label="Commission"
                    value={formData.commission}
                    onChange={handleFieldChange("commission")}
                    placeholder="Enter commission"
                  />
                </div>
              </div>

              {/* Transport dropdown from DB */}
              <div ref={transportRef}>
                <label className={TRANSPORT_LABEL_CLASS}>Transport</label>
                <div className="mt-0.5">
                  <SearchableSelect
                    name="transportId"
                    options={transports.map((t) => ({ label: t.name, value: String(t.id) }))}
                    value={String(formData.transportId)}
                    onChange={(e) => { handleFieldChange("transportId")(e); focusRef(fromCityRef); }}
                    placeholder="Select Transport"
                    triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                    searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                  />
                </div>
              </div>

              {/* City dropdowns from DB (cfg_city) */}
              <div ref={fromCityRef}>
                <label className={TRANSPORT_LABEL_CLASS}>From City</label>
                <div className="mt-0.5">
                  <SearchableSelect
                    name="fromCityId"
                    options={cities.map((c) => ({ label: c.name, value: String(c.id) }))}
                    value={String(formData.fromCityId)}
                    onChange={(e) => { handleFieldChange("fromCityId")(e); focusRef(receivingCityRef); }}
                    placeholder="Select From City"
                    triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                    searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                  />
                </div>
              </div>
              <div ref={receivingCityRef}>
                <label className={TRANSPORT_LABEL_CLASS}>Receiving City</label>
                <div className="mt-0.5">
                  <SearchableSelect
                    name="receivingCityId"
                    options={cities.map((c) => ({ label: c.name, value: String(c.id) }))}
                    value={String(formData.receivingCityId)}
                    onChange={(e) => { handleFieldChange("receivingCityId")(e); focusRef(autoTransferRef); }}
                    placeholder="Select Receiving City"
                    triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                    searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                  />
                </div>
              </div>

              {String(formData.lrNo || "").trim() && (
                <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2">
                  {duplicateLrLoading ? (
                    <div className="text-[11px] text-amber-900 dark:text-amber-300">Checking duplicate LR entries...</div>
                  ) : duplicateLrEntries.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                        {duplicateLrEntries.length} Duplicate LR {duplicateLrEntries.length === 1 ? "Entry" : "Entries"} Found
                      </div>
                      {duplicateLrEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800 px-2.5 py-2 text-[11px] text-gray-700 dark:text-gray-300"
                        >
                          <div className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1">
                            <div className="font-medium text-gray-600 dark:text-gray-400">LR Info</div>
                            <div>
                              Date : {formatDisplayDate(entry.lr_date)} , Entry No : {entry.lr_entry_no || "-"}
                            </div>
                            <div className="font-medium text-gray-600 dark:text-gray-400">Invoice</div>
                            <div>
                              Date : {formatDisplayDate(entry.invoice?.invoice_date)} , Invoice No : {entry.invoice?.invoice_no || "-"}
                            </div>
                            <div className="font-medium text-gray-600 dark:text-gray-400">Entered By</div>
                            <div>{entry.entered_by || "-"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* === Column 2 (Left-Center) === */}
            <div className="col-span-12 space-y-2.5 border-gray-100 dark:border-gray-700 px-2.5 lg:col-span-3 lg:border-l">
              <div ref={autoTransferRef}>
                <TextInput
                  label="Auto Transfer Location"
                  value={formData.autoTransferLocation}
                  onChange={handleFieldChange("autoTransferLocation")}
                  placeholder="Enter location"
                />
              </div>

              <div>
                <label className={TRANSPORT_LABEL_CLASS}>Purchase Manager</label>
                <div className="mt-0.5">
                  <SearchableSelect
                    name="purchaseManager"
                    options={purchaseManagerOptions}
                    value={String(formData.purchaseManager || "")}
                    onChange={handleFieldChange("purchaseManager")}
                    placeholder="Select Purchase Manager"
                    triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                    searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                  />
                </div>
              </div>

              <TextInput
                label="Stock Holding Period (days)"
                type="number"
                value={formData.stockHoldingPeriod}
                onChange={handleFieldChange("stockHoldingPeriod")}
              />

              <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-1.5">
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
              </div>
            </div>

            {/* === Column 3 (Middle) === */}
            <div className="col-span-12 space-y-2.5 border-gray-100 dark:border-gray-700 px-2.5 lg:col-span-3 lg:border-l">
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
              <div className="pt-2">
                <h3 className="mb-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100">
                  File Attachments
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={TRANSPORT_LABEL_CLASS}>Type</label>
                    <div className="mt-0.5">
                      <SearchableSelect
                        name="fileType"
                        options={fileTypeOptions}
                        value={formData.fileType}
                        onChange={handleFieldChange("fileType")}
                        placeholder="Select Type"
                        triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                        searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                      />
                    </div>
                  </div>
                  <div className="self-end pt-5">
                    <label
                      htmlFor="fileUpload"
                      className="flex cursor-pointer items-center justify-center rounded-sm bg-green-500 px-3 py-1 text-[11px] text-white transition hover:bg-green-600"
                    >
                      <Upload className="mr-1 h-3.5 w-3.5" /> Upload Files
                    </label>
                    <input
                      id="fileUpload"
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                <div className="mt-4 border border-gray-300 dark:border-gray-600 rounded-sm">
                  <div className="flex bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    <div className="w-1/3 px-3 py-1">Type</div>
                    <div className="w-1/3 px-3 py-1">File Name</div>
                    <div className="w-1/3 px-3 py-1">Action</div>
                  </div>
                  {attachments.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400 text-xs italic p-3">
                      No files uploaded
                    </div>
                  ) : (
                    attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center border-b dark:border-gray-700 last:border-b-0 text-xs"
                      >
                        <div className="w-1/3 px-3 py-2">
                          {att.file_type || "Other"}
                        </div>
                        <div className="w-1/3 px-3 py-2 truncate">
                          {att.file_name}
                        </div>
                        <div className="w-1/3 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              title="View file"
                              onClick={() => handleViewAttachment(att)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete file"
                              onClick={() => handleDeleteAttachment(att)}
                              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="flex justify-end p-2 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600">
                    <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-100">
                      {attachments.length} file(s)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* === Column 4 (Right) === */}
            <div className="col-span-12 space-y-2.5 border-gray-100 dark:border-gray-700 pl-2.5 lg:col-span-3 lg:border-l">
              {/* LR Entry No - disabled, auto-generated */}
              <TextInput
                label="LR Entry No"
                value={formData.lrEntryNo}
                disabled
                onChange={() => {}}
              />
              <div>
                <label className={TRANSPORT_LABEL_CLASS}>
                  <span className="text-red-500 dark:text-red-400">* </span>Pay Mode
                </label>
                <div className="mt-0.5">
                  <SearchableSelect
                    name="payMode"
                    options={payModeOptions}
                    value={formData.payMode}
                    onChange={(e) => { handleFieldChange("payMode")(e); focusRef(devDateRef); }}
                    placeholder="Select Pay Mode"
                    triggerClassName={TRANSPORT_SEARCHABLE_TRIGGER_CLASS}
                    searchInputClassName={TRANSPORT_SEARCHABLE_INPUT_CLASS}
                  />
                </div>
              </div>
              <div ref={devDateRef}>
                <TextInput
                  label="Dev Date"
                  type="date"
                  value={formData.devDate}
                  onChange={handleFieldChange("devDate")}
                />
              </div>
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
            </div>
          </div>
        </div>
      </div>


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
    </div>
  );
};

export default TransportEntry;
