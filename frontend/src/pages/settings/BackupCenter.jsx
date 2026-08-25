import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Clock3,
  Cloud,
  Download,
  HardDrive,
  History,
  KeyRound,
  Play,
  RotateCcw,
  Save,
  Search,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";

const inputClass =
  "w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

const cardClass = "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg";

const storageModeOptions = [
  { value: "local", label: "Local Storage" },
  { value: "cloud", label: "Cloud Storage (OCI Object Storage)" },
  { value: "hybrid", label: "Hybrid (Local + OCI Cloud)" },
];

const backupTypeOptions = [
  { value: "full", label: "Full Backup" },
  { value: "incremental", label: "Incremental Backup" },
  { value: "module", label: "Module-wise Backup" },
];

const restoreTypeOptions = [
  { value: "partial", label: "Partial Restore" },
  { value: "full", label: "Full Restore" },
];

const scheduleFrequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const weekDayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const toText = (value, fallback = "--") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const toDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
};

const parseJsonLike = (value) => {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
};

const toStringArray = (value) => {
  const parsed = parseJsonLike(value);
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean);
  }
  if (parsed === null || parsed === undefined) return [];
  const text = String(parsed).trim();
  return text ? [text] : [];
};

const toNumberArray = (value) => {
  const parsed = parseJsonLike(value);
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry));
  }
  const numeric = Number(parsed);
  return Number.isFinite(numeric) ? [numeric] : [];
};

const toObject = (value) => {
  const parsed = parseJsonLike(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
};

const statCardClass =
  "rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-md";

const createDefaultCreateForm = () => ({
  backupType: "full",
  storageMode: "local",
  moduleNames: [],
  encryptionEnabled: false,
  encryptionPassword: "",
  restorePasswordHint: "",
});

const createDefaultSettingsForm = () => ({
  storageMode: "local",
  localStorageEnabled: true,
  cloudStorageEnabled: false,
  encryptionEnabled: false,
  encryptionPassword: "",
  restorePasswordHint: "",
  scheduleEnabled: false,
  scheduleFrequency: "daily",
  scheduleTime: "02:00",
  scheduleDayOfWeek: 1,
  scheduleDayOfMonth: 1,
  scheduleBackupType: "full",
  scheduleModuleNames: [],
  retentionDaily: 7,
  retentionWeekly: 4,
  retentionMonthly: 12,
  autoCleanupEnabled: true,
  // Oracle Cloud Infrastructure (OCI) Object Storage
  ociNamespace: "",
  ociRegion: "ap-mumbai-1",
  ociAccessKeyId: "",
  ociSecretAccessKey: "",
  ociBucket: "",
});

const createDefaultRestoreForm = () => ({
  backupId: "",
  restoreType: "partial",
  moduleNames: [],
  targetCompanyId: "",
  password: "",
  selectedDate: "",
});

const normalizeSetting = (setting = {}) => ({
  storageMode: setting.storage_mode || setting.storageMode || "local",
  localStorageEnabled: setting.local_storage_enabled ?? setting.localStorageEnabled ?? true,
  cloudStorageEnabled: setting.cloud_storage_enabled ?? setting.cloudStorageEnabled ?? false,
  encryptionEnabled: setting.encryption_enabled ?? setting.encryptionEnabled ?? false,
  encryptionPassword: setting.encryption_password || setting.encryptionPassword || "",
  scheduledEncryptionConfigured: setting.scheduled_encryption_configured ?? setting.scheduledEncryptionConfigured ?? false,
  restorePasswordHint: setting.restore_password_hint || setting.restorePasswordHint || "",
  scheduleEnabled: setting.schedule_enabled ?? setting.scheduleEnabled ?? false,
  scheduleFrequency: setting.schedule_frequency || setting.scheduleFrequency || "daily",
  scheduleTime: setting.schedule_time || setting.scheduleTime || "02:00",
  scheduleDayOfWeek: setting.schedule_day_of_week ?? setting.scheduleDayOfWeek ?? 1,
  scheduleDayOfMonth: setting.schedule_day_of_month ?? setting.scheduleDayOfMonth ?? 1,
  scheduleBackupType: (setting.schedule_backup_type || setting.scheduleBackupType || "full") === "branch"
    ? "full"
    : (setting.schedule_backup_type || setting.scheduleBackupType || "full"),
  scheduleModuleNames: toStringArray(setting.schedule_module_names ?? setting.scheduleModuleNames),
  retentionDaily: setting.retention_daily ?? setting.retentionDaily ?? 7,
  retentionWeekly: setting.retention_weekly ?? setting.retentionWeekly ?? 4,
  retentionMonthly: setting.retention_monthly ?? setting.retentionMonthly ?? 12,
  autoCleanupEnabled: setting.auto_cleanup_enabled ?? setting.autoCleanupEnabled ?? true,
  nextScheduledAt: setting.next_scheduled_at || setting.nextScheduledAt || null,
  lastScheduledAt: setting.last_scheduled_at || setting.lastScheduledAt || null,
  // Oracle Cloud Infrastructure (OCI) Object Storage
  ociNamespace: setting.oci_namespace || setting.ociNamespace || "",
  ociRegion: setting.oci_region || setting.ociRegion || "ap-mumbai-1",
  ociAccessKeyId: setting.oci_access_key_id || setting.ociAccessKeyId || "",
  ociSecretAccessKey: setting.oci_secret_access_key || setting.ociSecretAccessKey || "",
  ociBucket: setting.oci_bucket || setting.ociBucket || "",
  cloudConfigured: setting.cloud_configured ?? false,
});

const normalizeBackupRow = (row = {}) => ({
  ...row,
  module_names: toStringArray(row.module_names),
  branch_company_ids: toNumberArray(row.branch_company_ids),
  summary: toObject(row.summary),
  company:
    row.company && typeof row.company === "object"
      ? row.company
      : row.company_name
        ? { id: row.company_id ?? null, name: row.company_name }
        : null,
});

const normalizeRestoreRow = (row = {}) => ({
  ...row,
  module_names: toStringArray(row.module_names),
  summary: toObject(row.summary),
});

const MultiSelectInput = ({
  label,
  value = [],
  onChange,
  options = [],
  helperText = "",
  placeholder = "Select options",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const safeValue = useMemo(() => toStringArray(value), [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSet = new Set(safeValue.map(String));
  const selectedLabels = options
    .filter((option) => selectedSet.has(String(option.value)))
    .map((option) => option.label);

  const toggle = (optionValue) => {
    if (disabled) return;
    const normalized = String(optionValue);
    const next = selectedSet.has(normalized)
      ? safeValue.filter((entry) => String(entry) !== normalized)
      : [...safeValue, normalized];
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative" ref={wrapperRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`flex min-h-[40px] w-full items-center justify-between rounded-sm border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
            disabled ? "cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : "bg-white dark:bg-gray-700"
          }`}
          disabled={disabled}
        >
          <span className={selectedLabels.length ? "text-gray-800 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>
            {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
          </span>
          <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </button>
        {isOpen ? (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
            {options.map((option) => {
              const checked = selectedSet.has(String(option.value));
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 border-b border-gray-100 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(option.value)} className="h-4 w-4" />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>
      {helperText ? <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p> : null}
    </div>
  );
};

export default function BackupCenter() {
  const restoreCardRef = useRef(null);
  const authUser = useSelector((state) => state.auth.user);
  const userRole = String(authUser?.role || "").toLowerCase();
  const isSuperAdmin = userRole === "super_admin";
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [overview, setOverview] = useState({
    companies: [],
    moduleOptions: [],
    setting: createDefaultSettingsForm(),
    stats: {
      last_backup_status: "never",
      last_backup_at: null,
      next_scheduled_backup: null,
      storage_usage: {
        local_label: "0 B",
        cloud_label: "0 B",
        total_label: "0 B",
      },
      total_backups: 0,
      success_count: 0,
      failed_count: 0,
    },
    backups: [],
    restores: [],
    cronSecretConfigured: false,
  });
  const [createForm, setCreateForm] = useState(createDefaultCreateForm);
  const [settingsForm, setSettingsForm] = useState(createDefaultSettingsForm);
  const [restoreForm, setRestoreForm] = useState(createDefaultRestoreForm);
  const [historyFilters, setHistoryFilters] = useState({
    status: "",
    module: "",
    branchCompanyId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [restoreCardHighlighted, setRestoreCardHighlighted] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, row: null });
  const [importFile, setImportFile] = useState(null);
  const [importPassword, setImportPassword] = useState("");
  const importFileInputRef = useRef(null);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [createElapsedMs, setCreateElapsedMs] = useState(0);
  const [restoring, setRestoring] = useState(false);
  const [restoreElapsedMs, setRestoreElapsedMs] = useState(0);

  useEffect(() => {
    if (!creatingBackup) return undefined;
    const start = Date.now();
    const interval = setInterval(() => setCreateElapsedMs(Date.now() - start), 200);
    return () => clearInterval(interval);
  }, [creatingBackup]);

  useEffect(() => {
    if (!restoring) return undefined;
    const start = Date.now();
    const interval = setInterval(() => setRestoreElapsedMs(Date.now() - start), 200);
    return () => clearInterval(interval);
  }, [restoring]);

  const formatElapsed = (ms) => `${(ms / 1000).toFixed(1)}s`;

  const loadOverview = useCallback(async (companyId = "") => {
    try {
      setLoading(true);
      const response = await api.get("/backups/overview", {
        params: companyId ? { companyId } : {},
      });
      const data = response.data?.data || {};
      const normalizedSetting = normalizeSetting(data.setting || {});
      setOverview({
        companies: Array.isArray(data.companies)
          ? data.companies.filter((company) => company && typeof company === "object")
          : [],
        moduleOptions: toStringArray(data.moduleOptions),
        setting: normalizedSetting,
        stats: data.stats || {},
        backups: Array.isArray(data.backups) ? data.backups.map(normalizeBackupRow) : [],
        restores: Array.isArray(data.restores) ? data.restores.map(normalizeRestoreRow) : [],
        cronSecretConfigured: !!data.cronSecretConfigured,
      });
      setSettingsForm(normalizedSetting);
      setCreateForm((prev) => ({
        ...prev,
        storageMode: normalizedSetting.storageMode || prev.storageMode,
        encryptionEnabled: !!normalizedSetting.encryptionEnabled,
        restorePasswordHint: normalizedSetting.restorePasswordHint || "",
      }));
      if (!companyId && data.companies?.length === 1) {
        setSelectedCompanyId(String(data.companies[0].id));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load backup center");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview(selectedCompanyId);
  }, [selectedCompanyId, loadOverview]);

  const companyOptions = useMemo(
    () => (overview.companies || []).map((company) => ({ value: String(company.id), label: company.name })),
    [overview.companies]
  );

  const moduleOptions = useMemo(
    () => (overview.moduleOptions || []).map((name) => ({ value: name, label: name })),
    [overview.moduleOptions]
  );

  const companyNameById = useMemo(
    () => Object.fromEntries((overview.companies || []).map((company) => [String(company.id), company.name])),
    [overview.companies]
  );

  const currentStoreLabel = useMemo(() => {
    if (selectedCompanyId) return companyNameById[String(selectedCompanyId)] || `Store ${selectedCompanyId}`;
    if (authUser?.company_id) return companyNameById[String(authUser.company_id)] || authUser?.company_name || `Store ${authUser.company_id}`;
    return companyOptions[0]?.label || "Current Store";
  }, [authUser?.company_id, authUser?.company_name, companyNameById, companyOptions, selectedCompanyId]);

  const selectedScopeLabel = useMemo(() => {
    if (isSuperAdmin) {
      return selectedCompanyId
        ? companyNameById[String(selectedCompanyId)] || `Store ${selectedCompanyId}`
        : "All Stores";
    }
    return currentStoreLabel;
  }, [companyNameById, currentStoreLabel, isSuperAdmin, selectedCompanyId]);

  const selectedBackupRecord = useMemo(
    () => (overview.backups || []).find((row) => String(row.id) === String(restoreForm.backupId)) || null,
    [overview.backups, restoreForm.backupId]
  );

  const restoreModuleLocked = selectedBackupRecord?.backup_type === "module";

  useEffect(() => {
    if (createForm.backupType !== "module" && createForm.moduleNames.length) {
      setCreateForm((prev) => ({ ...prev, moduleNames: [] }));
    }
  }, [createForm.backupType, createForm.moduleNames.length]);

  useEffect(() => {
    if (settingsForm.scheduleBackupType !== "module" && settingsForm.scheduleModuleNames.length) {
      setSettingsForm((prev) => ({ ...prev, scheduleModuleNames: [] }));
    }
  }, [settingsForm.scheduleBackupType, settingsForm.scheduleModuleNames.length]);

  useEffect(() => {
    if (!selectedBackupRecord || selectedBackupRecord.backup_type !== "module") return;
    const selectedModules = Array.isArray(selectedBackupRecord.module_names) ? selectedBackupRecord.module_names : [];
    setRestoreForm((prev) => {
      const sameLength = prev.moduleNames.length === selectedModules.length;
      const sameItems = sameLength && prev.moduleNames.every((entry, index) => entry === selectedModules[index]);
      return sameItems ? prev : { ...prev, moduleNames: selectedModules };
    });
  }, [selectedBackupRecord]);

  const filteredBackups = useMemo(() => {
    return (overview.backups || []).filter((row) => {
      if (historyFilters.status && row.status !== historyFilters.status) return false;
      if (historyFilters.module && !row.module_names?.includes(historyFilters.module)) return false;
      if (historyFilters.branchCompanyId) {
        const branchId = Number(historyFilters.branchCompanyId);
        if (!row.branch_company_ids?.includes(branchId) && Number(row.company_id) !== branchId) return false;
      }
      if (historyFilters.dateFrom) {
        const createdAt = new Date(row.created_at || row.completed_at || row.started_at || 0);
        if (createdAt < new Date(historyFilters.dateFrom)) return false;
      }
      if (historyFilters.dateTo) {
        const createdAt = new Date(row.created_at || row.completed_at || row.started_at || 0);
        const maxDate = new Date(historyFilters.dateTo);
        maxDate.setHours(23, 59, 59, 999);
        if (createdAt > maxDate) return false;
      }
      return true;
    });
  }, [overview.backups, historyFilters]);

  const backupColumns = [
    {
      key: "file_name",
      label: "Backup",
      render: (_, row) => row.file_name || `Backup #${row.id}`,
      searchValue: (row) => `${row.file_name || ""} ${row.backup_type} ${row.status} ${row.storage_mode}`,
    },
    { key: "backup_type", label: "Type", render: (value) => toText(value).replace(/\b\w/g, (char) => char.toUpperCase()) },
    { key: "status", label: "Status", render: (value) => toText(value).replace(/\b\w/g, (char) => char.toUpperCase()) },
    { key: "storage_mode", label: "Storage", render: (value) => toText(value).replace(/\b\w/g, (char) => char.toUpperCase()) },
    {
      key: "scope",
      label: "Scope",
      render: (_, row) => {
        const storeLabel = row.company?.name
          || (row.branch_company_ids?.length === 1 ? companyNameById[String(row.branch_company_ids[0])] || `Store ${row.branch_company_ids[0]}` : "");
        if (row.module_names?.length && storeLabel) return `${row.module_names.join(", ")} / ${storeLabel}`;
        if (row.module_names?.length) return row.module_names.join(", ");
        if (storeLabel) return storeLabel;
        return "All Stores";
      },
      searchValue: (row) => `${(row.module_names || []).join(" ")} ${(row.branch_company_ids || []).join(" ")}`,
    },
    { key: "file_size_label", label: "Size" },
    {
      key: "completed_at",
      label: "Completed",
      render: (value, row) => toDateTime(value || row.created_at),
    },
  ];

  const restoreColumns = [
    { key: "id", label: "Restore #" },
    { key: "restore_type", label: "Type", render: (value) => toText(value).replace(/\b\w/g, (char) => char.toUpperCase()) },
    { key: "status", label: "Status", render: (value) => toText(value).replace(/\b\w/g, (char) => char.toUpperCase()) },
    {
      key: "summary",
      label: "Summary",
      render: (_, row) => `${row.summary?.restoredRows || 0} rows`,
      searchValue: (row) => JSON.stringify(row.summary || {}),
    },
    { key: "target_company_id", label: "Target Store", render: (value) => companyNameById[String(value)] || value || "--" },
    { key: "completed_at", label: "Completed", render: (value, row) => toDateTime(value || row.created_at) },
  ];

  const createFormIncludesUsers = createForm.backupType !== "module" || createForm.moduleNames.includes("store");

  const handleCreateBackup = async () => {
    if (createForm.backupType === "module" && !createForm.moduleNames.length) {
      toast.warning("Select at least one module for module-wise backup");
      return;
    }
    if (createFormIncludesUsers && !createForm.encryptionEnabled) {
      toast.warning('This backup includes the Users table (login accounts) - enable encryption first, or pick a module-wise backup that excludes "Store".');
      return;
    }
    if (createForm.encryptionEnabled && !createForm.encryptionPassword) {
      toast.warning("Enter an encryption password before running an encrypted backup.");
      return;
    }
    setCreateElapsedMs(0);
    setCreatingBackup(true);
    try {
      const response = await api.post("/backups", {
        ...createForm,
        companyId: selectedCompanyId || undefined,
      });
      const backupData = response.data?.data;
      const status = backupData?.status;
      const statusMessage = backupData?.summary?.status_message;
      if (status === "failed") {
        toast.error(statusMessage || "Backup failed");
      } else {
        toast.success(response.data?.message || "Backup created");
        // Show warning if incremental silently fell back to a full backup
        if (statusMessage) {
          toast.warning(statusMessage);
        }
      }
      setCreateForm((prev) => ({
        ...createDefaultCreateForm(),
        encryptionEnabled: prev.encryptionEnabled,
        restorePasswordHint: prev.restorePasswordHint,
      }));
      await loadOverview(selectedCompanyId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create backup");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleSaveSettings = async () => {
    // Non-super-admin users always operate under their own store scope
    if (!isSuperAdmin && !selectedCompanyId) {
      toast.error("Select a store first.");
      return;
    }
    try {
      const response = await api.post("/backups/settings", {
        ...settingsForm,
        // Super Admin with no store selected sends no companyId → global save across all stores
        companyId: selectedCompanyId || undefined,
        ociNamespace: settingsForm.ociNamespace,
        ociRegion: settingsForm.ociRegion,
        ociAccessKeyId: settingsForm.ociAccessKeyId,
        ociSecretAccessKey: settingsForm.ociSecretAccessKey,
        ociBucket: settingsForm.ociBucket,
      });
      toast.success(response.data?.message || "Backup settings saved");
      await loadOverview(selectedCompanyId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save backup settings");
    }
  };

  const [cloudTestStatus, setCloudTestStatus] = useState(null); // null | 'testing' | 'ok' | 'fail'
  const [cloudTestMessage, setCloudTestMessage] = useState("");

  const handleTestCloudConnection = async () => {
    setCloudTestStatus("testing");
    setCloudTestMessage("");
    try {
      const response = await api.post("/backups/cloud-test", {
        companyId: selectedCompanyId || undefined,
        ociNamespace: settingsForm.ociNamespace,
        ociRegion: settingsForm.ociRegion,
        ociAccessKeyId: settingsForm.ociAccessKeyId,
        ociSecretAccessKey: settingsForm.ociSecretAccessKey,
        ociBucket: settingsForm.ociBucket,
      });
      setCloudTestStatus("ok");
      setCloudTestMessage(response.data?.message || "Connection successful");
    } catch (err) {
      setCloudTestStatus("fail");
      setCloudTestMessage(err.response?.data?.message || "Connection failed");
    }
  };

  const handleRestore = async () => {
    if (!restoreForm.backupId) {
      toast.warning("Select a backup to restore");
      return;
    }
    setRestoreElapsedMs(0);
    setRestoring(true);
    try {
      const response = await api.post(`/backups/${restoreForm.backupId}/restore`, {
        ...restoreForm,
        companyId: selectedCompanyId || undefined,
        targetCompanyId: restoreForm.targetCompanyId || undefined,
      });
      const status = response.data?.data?.status;
      if (status === "failed") {
        toast.error(response.data?.data?.summary?.status_message || "Restore failed");
      } else {
        toast.success(response.data?.message || "Restore completed");
      }
      setRestoreForm(createDefaultRestoreForm());
      await loadOverview(selectedCompanyId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore backup");
    } finally {
      setRestoring(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.warning("Choose a backup file first");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("backupFile", importFile);
      if (selectedCompanyId) formData.append("companyId", selectedCompanyId);
      // Use dedicated import password field (not the restore card password)
      if (importPassword) formData.append("password", importPassword);
      const response = await api.post("/backups/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(response.data?.message || "Backup imported");
      setImportFile(null);
      setImportPassword("");
      if (importFileInputRef.current) importFileInputRef.current.value = "";
      await loadOverview(selectedCompanyId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to import backup");
    }
  };

  // Helper: when Axios returns an error response as a Blob (responseType:'blob'),
  // the JSON error body is wrapped in a Blob — decode it to get the real message.
  const readBlobErrorMessage = async (err) => {
    const data = err?.response?.data;
    if (data instanceof Blob && data.type?.includes("application/json")) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text);
        return parsed?.message || null;
      } catch {
        return null;
      }
    }
    // Non-blob error: standard axios response
    return err?.response?.data?.message || null;
  };

  const downloadBlob = async (url, fallbackName) => {
    const response = await api.get(url, { responseType: "blob" });
    const disposition = response.headers?.["content-disposition"];
    const match = disposition && /filename="?([^"]+)"?/.exec(disposition);
    const fileName = match ? match[1] : fallbackName;
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleDownload = async (row) => {
    try {
      await downloadBlob(`/backups/${row.id}/download`, row.file_name || `backup-${row.id}.zip`);
    } catch (err) {
      const message = await readBlobErrorMessage(err);
      toast.error(message || "Failed to download backup");
    }
  };

  const handleDownloadLogs = async (row) => {
    try {
      await downloadBlob(`/backups/${row.id}/logs`, `backup-${row.id}-log.txt`);
    } catch (err) {
      const message = await readBlobErrorMessage(err);
      toast.error(message || "Failed to download logs");
    }
  };

  const selectBackupForRestore = (row) => {
    setRestoreForm((prev) => ({
      ...prev,
      backupId: String(row.id),
      moduleNames: row.backup_type === "module" ? row.module_names || [] : [],
    }));
    setRestoreCardHighlighted(true);
    window.requestAnimationFrame(() => {
      restoreCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    window.setTimeout(() => setRestoreCardHighlighted(false), 1800);
    toast.info(`Backup ${row.file_name || `#${row.id}`} selected. Run restore from the card below.`);
  };

  const handleDeleteBackup = async (row) => {
    setDeleteDialog({ open: true, row });
  };

  const handleDeleteConfirmed = async () => {
    const row = deleteDialog.row;
    setDeleteDialog({ open: false, row: null });
    if (!row) return;
    try {
      const response = await api.delete(`/backups/${row.id}`);
      toast.success(response.data?.message || "Backup deleted");
      if (String(restoreForm.backupId) === String(row.id)) {
        setRestoreForm((prev) => ({ ...prev, backupId: "", moduleNames: [] }));
      }
      await loadOverview(selectedCompanyId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete backup");
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-600 dark:text-gray-300">Loading backup center...</div>;
  }

  return (
    <div className="master-responsive flex h-full flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Backup"
        message={`Are you sure you want to delete "${deleteDialog.row?.file_name || `Backup #${deleteDialog.row?.id || ""}`}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteDialog({ open: false, row: null })}
      />

      <div className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Settings / Backup Center</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Full, incremental and module-wise backups with restore, import, scheduling, retention and audit history.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Current Scope</label>
              <div className={`${inputClass} bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300`}>{selectedScopeLabel}</div>
            </div>
            <button type="button" className="glass-btn glass-btn-primary flex items-center" onClick={() => loadOverview(selectedCompanyId)}>
              <Search className="mr-1 h-4 w-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={statCardClass}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Last Backup</p>
                <p className="mt-2 text-lg font-bold text-gray-800 dark:text-gray-100">{toText(overview.stats?.last_backup_status, "Never").replace(/\b\w/g, (char) => char.toUpperCase())}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{toDateTime(overview.stats?.last_backup_at)}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <div className={statCardClass}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Next Schedule</p>
                <p className="mt-2 text-lg font-bold text-gray-800 dark:text-gray-100">{toDateTime(overview.stats?.next_scheduled_backup)}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Automatic scheduler</p>
              </div>
              <Clock3 className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className={statCardClass}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Storage Usage</p>
                <p className="mt-2 text-lg font-bold text-gray-800 dark:text-gray-100">{overview.stats?.storage_usage?.total_label || "0 B"}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Local {overview.stats?.storage_usage?.local_label || "0 B"} / Cloud {overview.stats?.storage_usage?.cloud_label || "0 B"}
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          <div className={statCardClass}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">History</p>
                <p className="mt-2 text-lg font-bold text-gray-800 dark:text-gray-100">{overview.stats?.total_backups || 0} backups</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {overview.stats?.success_count || 0} success / {overview.stats?.failed_count || 0} failed
                </p>
              </div>
              <History className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className={cardClass + " xl:col-span-1"}>
            <div className="mb-4 flex items-center justify-between border-b dark:border-gray-700 pb-2">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Create Backup</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Run full, incremental or module-wise backups for the selected store scope.</p>
              </div>
              <Archive className="h-5 w-5 text-blue-500" />
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Backup Type</label>
                <select
                  value={createForm.backupType}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, backupType: event.target.value }))}
                  className={inputClass}
                >
                  {backupTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {createForm.backupType === "module" ? (
                <MultiSelectInput
                  label="Modules"
                  value={createForm.moduleNames}
                  onChange={(moduleNames) => setCreateForm((prev) => ({ ...prev, moduleNames }))}
                  options={moduleOptions}
                  placeholder="Choose modules"
                  helperText="Only the selected module data will be included in this backup."
                />
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Backup Scope</label>
                {isSuperAdmin ? (
                  <select
                    value={selectedCompanyId}
                    onChange={(event) => setSelectedCompanyId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">All Stores</option>
                    {companyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={`${inputClass} bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300`}>{currentStoreLabel}</div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Storage Mode</label>
                <select
                  value={createForm.storageMode}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, storageMode: event.target.value }))}
                  className={inputClass}
                >
                  {storageModeOptions.map((option) => {
                    const needsCloud = option.value === "cloud" || option.value === "hybrid";
                    const isDisabled = needsCloud && !settingsForm.cloudConfigured;
                    return (
                      <option key={option.value} value={option.value} disabled={isDisabled}>
                        {option.label}{isDisabled ? " (configure OCI in Settings first)" : ""}
                      </option>
                    );
                  })}
                </select>
                {settingsForm.cloudConfigured ? (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ OCI Object Storage is configured for this store.</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Cloud options require OCI credentials saved in Storage Settings.</p>
                )}
              </div>

              {createFormIncludesUsers && !createForm.encryptionEnabled ? (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                  This backup includes the Users table (login accounts with password hashes). Encryption is required to include it.
                </p>
              ) : null}

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={createForm.encryptionEnabled}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, encryptionEnabled: event.target.checked }))}
                  className="h-4 w-4"
                />
                Enable backup encryption
              </label>

              {createForm.encryptionEnabled ? (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Encryption Password</label>
                    <input
                      type="password"
                      value={createForm.encryptionPassword}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, encryptionPassword: event.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password Hint</label>
                    <input
                      value={createForm.restorePasswordHint}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, restorePasswordHint: event.target.value }))}
                      className={inputClass}
                    />
                  </div>
                </>
              ) : null}

              <div className="rounded-md border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 p-3 text-xs text-blue-700 dark:text-blue-400">
                Local storage writes to the system backup folder, cloud storage writes to the server backup folder, and hybrid writes to both.
              </div>

              <button
                type="button"
                className="glass-btn glass-btn-success flex items-center disabled:opacity-70"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
              >
                <Play className="mr-1 h-4 w-4" />
                {creatingBackup ? `Backing up… ${formatElapsed(createElapsedMs)}` : "Run Backup"}
              </button>
              {creatingBackup ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Please don&apos;t close this window or navigate away until the backup finishes.
                </p>
              ) : null}
            </div>
          </div>

          <div
            ref={restoreCardRef}
            className={`${cardClass} xl:col-span-1 ${restoreCardHighlighted ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
          >
            <div className="mb-4 flex items-center justify-between border-b dark:border-gray-700 pb-2">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Storage, Schedule & Retention</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Automatic backups, retention windows and cleanup policy for the selected store scope.</p>
              </div>
              <Cloud className="h-5 w-5 text-indigo-500" />
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Default Storage</label>
                <select
                  value={settingsForm.storageMode}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, storageMode: event.target.value }))}
                  className={inputClass}
                >
                  {storageModeOptions.map((option) => {
                    const needsCloud = option.value === "cloud" || option.value === "hybrid";
                    const isDisabled = needsCloud && !settingsForm.cloudConfigured;
                    return (
                      <option key={option.value} value={option.value} disabled={isDisabled}>
                        {option.label}{isDisabled ? " (configure OCI below first)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Oracle Cloud Infrastructure (OCI) Credentials */}
              <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">☁ Oracle Cloud (OCI) Object Storage</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400">Always Free: 20 GB Storage · 10 TB Egress/mo · 50k API Calls</p>
                  </div>
                  {settingsForm.cloudConfigured ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">✓ Configured</span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Not configured</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Object Storage Namespace"
                    value={settingsForm.ociNamespace}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociNamespace: event.target.value }))}
                    className={inputClass}
                  />
                  <input
                    placeholder="Region (e.g. ap-mumbai-1, us-ashburn-1)"
                    value={settingsForm.ociRegion}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociRegion: event.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Customer Secret Key (Access Key)"
                    value={settingsForm.ociAccessKeyId}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociAccessKeyId: event.target.value }))}
                    className={inputClass}
                  />
                  <input
                    type="password"
                    placeholder="Secret Key"
                    value={settingsForm.ociSecretAccessKey}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociSecretAccessKey: event.target.value }))}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </div>
                <input
                  placeholder="Bucket Name (e.g. gpretail-backups)"
                  value={settingsForm.ociBucket}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociBucket: event.target.value }))}
                  className={inputClass}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestCloudConnection}
                    disabled={cloudTestStatus === "testing"}
                    className="flex items-center gap-1.5 rounded-sm bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    <Cloud className="h-3.5 w-3.5" />
                    {cloudTestStatus === "testing" ? "Testing..." : "Test Connection"}
                  </button>
                  {cloudTestStatus === "ok" && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ {cloudTestMessage}</span>
                  )}
                  {cloudTestStatus === "fail" && (
                    <span className="text-xs text-red-600 dark:text-red-400">{cloudTestMessage}</span>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm text-indigo-800 dark:text-indigo-200">
                  <input
                    type="checkbox"
                    checked={!!settingsForm.cloudStorageEnabled}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, cloudStorageEnabled: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  Enable cloud storage for scheduled backups
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={!!settingsForm.encryptionEnabled}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, encryptionEnabled: event.target.checked }))}
                  className="h-4 w-4"
                />
                Default encryption
              </label>

              {settingsForm.encryptionEnabled ? (
                <>
                  <input
                    type="password"
                    placeholder="Default encryption password"
                    value={settingsForm.encryptionPassword}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, encryptionPassword: event.target.value }))}
                    className={inputClass}
                  />
                  <input
                    placeholder="Restore password hint"
                    value={settingsForm.restorePasswordHint}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, restorePasswordHint: event.target.value }))}
                    className={inputClass}
                  />
                </>
              ) : null}

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={!!settingsForm.scheduleEnabled}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleEnabled: event.target.checked }))}
                  className="h-4 w-4"
                />
                Enable automatic backup scheduling
              </label>

              {settingsForm.scheduleEnabled ? (
                settingsForm.lastScheduledAt ? (
                  <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-xs text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200">
                    ✓ Scheduled backups are actively running — last one completed {toDateTime(settingsForm.lastScheduledAt)}. Your external trigger is working.
                  </div>
                ) : (
                  <div className={`rounded-lg border p-3 text-xs ${
                    overview.cronSecretConfigured
                      ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                      : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
                  }`}>
                    {overview.cronSecretConfigured
                      ? "⚠ The server is ready (BACKUP_CRON_SECRET is set), but no scheduled run has completed yet. Double-check your external trigger (cron-job.org etc.) is actually calling the URL below with the correct token."
                      : "⚠ BACKUP_CRON_SECRET is not configured on this server yet. The trigger URL below will be rejected (403) no matter what token is used until it's set."}
                  </div>
                )
              ) : null}

              {settingsForm.scheduleEnabled ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                  This server has no background job runner, so scheduled backups need an
                  external trigger to actually run. Set up a free service like{" "}
                  <span className="font-semibold">cron-job.org</span>, or your hosting
                  panel&apos;s cron jobs, to periodically call:
                  <div className="mt-1 rounded bg-white/60 p-2 font-mono dark:bg-black/20 break-all">
                    GET {(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/api$/, "")}/api/backups/scheduled-run?token=YOUR_SECRET
                  </div>
                  Get the real secret value from the server&apos;s{" "}
                  <span className="font-mono">BACKUP_CRON_SECRET</span> environment
                  variable — it is never shown here.
                  {settingsForm.encryptionEnabled && (settingsForm.encryptionPassword || settingsForm.scheduledEncryptionConfigured) ? (
                    <p className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800 text-green-700 dark:text-green-400">
                      ✓ A password is saved above, so scheduled backups will run encrypted and include the Users table. The password is stored encrypted at rest on the server - this protects the backup file if it leaks or gets stolen separately, but not against someone who fully compromises this server.
                    </p>
                  ) : (
                    <p className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      Scheduled backups will run unencrypted (no password saved above), so the
                      Users table is skipped automatically to avoid storing password hashes
                      unencrypted. Enable &quot;Default encryption&quot; and save a password
                      above to include it in scheduled runs too.
                    </p>
                  )}
                </div>
              ) : null}

              {settingsForm.scheduleEnabled ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={settingsForm.scheduleFrequency}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleFrequency: event.target.value }))}
                      className={inputClass}
                    >
                      {scheduleFrequencyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={settingsForm.scheduleTime}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleTime: event.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  {settingsForm.scheduleFrequency === "weekly" ? (
                    <select
                      value={settingsForm.scheduleDayOfWeek}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleDayOfWeek: Number(event.target.value) }))}
                      className={inputClass}
                    >
                      {weekDayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {settingsForm.scheduleFrequency === "monthly" ? (
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={settingsForm.scheduleDayOfMonth}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleDayOfMonth: Number(event.target.value) }))}
                      className={inputClass}
                    />
                  ) : null}

                  <select
                    value={settingsForm.scheduleBackupType}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleBackupType: event.target.value }))}
                    className={inputClass}
                  >
                    {backupTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {settingsForm.scheduleBackupType === "module" ? (
                    <MultiSelectInput
                      label="Scheduled Modules"
                      value={settingsForm.scheduleModuleNames}
                      onChange={(scheduleModuleNames) => setSettingsForm((prev) => ({ ...prev, scheduleModuleNames }))}
                      options={moduleOptions}
                      placeholder="Choose modules"
                      helperText="Scheduled module-wise backups will only include the selected modules."
                    />
                  ) : null}
                </>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Retention (how many old scheduled backups to keep)
                </label>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  Only the box matching your Schedule Frequency above is actually used right now - it&apos;s highlighted below. The other two are just saved for whenever you switch frequency later.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "retentionDaily", label: "Daily backups to keep", freq: "daily" },
                    { key: "retentionWeekly", label: "Weekly backups to keep", freq: "weekly" },
                    { key: "retentionMonthly", label: "Monthly backups to keep", freq: "monthly" },
                  ].map(({ key, label, freq }) => {
                    const active = settingsForm.scheduleFrequency === freq;
                    return (
                      <div
                        key={key}
                        className={`rounded-md border p-2 ${
                          active
                            ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <label className={`mb-1 block text-xs font-medium ${active ? "text-blue-700 dark:text-blue-300" : "text-gray-500 dark:text-gray-400"}`}>
                          {label}
                          {active ? " (active)" : ""}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={settingsForm[key]}
                          onChange={(event) => setSettingsForm((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
                          className={inputClass}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={!!settingsForm.autoCleanupEnabled}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, autoCleanupEnabled: event.target.checked }))}
                  className="h-4 w-4"
                />
                Auto cleanup old scheduled backups
              </label>

              <button type="button" className="glass-btn glass-btn-success flex items-center" onClick={handleSaveSettings}>
                <Save className="mr-1 h-4 w-4" /> Save Settings
              </button>
            </div>
          </div>

          <div className={`${cardClass} xl:col-span-1`}>
            <div className="mb-4 flex items-center justify-between border-b dark:border-gray-700 pb-2">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Restore & Import</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Restore a saved version or import backups from another system.</p>
              </div>
              <Shield className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/30 p-3 text-xs text-amber-700 dark:text-amber-400">
                Click the restore icon in Backup History to select a backup here, then press <span className="font-semibold">Run Restore</span>.
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Selected Backup</label>
                <select
                  value={restoreForm.backupId}
                  onChange={(event) => {
                    const nextBackup = (overview.backups || []).find((row) => String(row.id) === String(event.target.value));
                    setRestoreForm((prev) => ({
                      ...prev,
                      backupId: event.target.value,
                      moduleNames: nextBackup?.backup_type === "module" ? nextBackup.module_names || [] : [],
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">Select backup</option>
                  {(overview.backups || []).map((row) => (
                    <option key={row.id} value={row.id}>
                      #{row.id} {row.file_name || row.backup_type}
                    </option>
                  ))}
                </select>
                {restoreForm.backupId ? (
                  <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-400">Backup #{restoreForm.backupId} is selected for restore.</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Restore Type</label>
                <select
                  value={restoreForm.restoreType}
                  onChange={(event) => setRestoreForm((prev) => ({ ...prev, restoreType: event.target.value }))}
                  className={inputClass}
                >
                  {restoreTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <MultiSelectInput
                label="Restore Modules"
                value={restoreForm.moduleNames}
                onChange={(moduleNames) => setRestoreForm((prev) => ({ ...prev, moduleNames }))}
                options={moduleOptions}
                helperText={
                  restoreModuleLocked
                    ? "This backup already contains only the selected module scope, so restore is locked to those modules."
                    : "Leave empty to restore the entire content of the selected backup."
                }
                placeholder="All modules"
                disabled={restoreModuleLocked}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Restore Into Store</label>
                <select
                  value={restoreForm.targetCompanyId}
                  onChange={(event) => setRestoreForm((prev) => ({ ...prev, targetCompanyId: event.target.value }))}
                  className={inputClass}
                >
                  <option value="">Original store(s) from backup</option>
                  {companyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave this on <span className="font-medium">Original store(s) from backup</span> to restore rows back to the same store saved inside the backup file.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={restoreForm.password}
                    onChange={(event) => setRestoreForm((prev) => ({ ...prev, password: event.target.value }))}
                    className={`${inputClass} pr-10`}
                    placeholder="Needed for encrypted backups"
                  />
                  <KeyRound className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>

              <button
                type="button"
                className="glass-btn glass-btn-danger flex items-center disabled:opacity-70"
                onClick={handleRestore}
                disabled={restoring}
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                {restoring ? `Restoring… ${formatElapsed(restoreElapsedMs)}` : "Run Restore"}
              </button>
              {restoring ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Please don&apos;t close this window or navigate away until the restore finishes. Larger restores can take a while.
                </p>
              ) : null}

              <div className="border-t dark:border-gray-700 pt-3 space-y-3">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Import Backup File</label>
                <input
                  type="file"
                  ref={importFileInputRef}
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  className={inputClass}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Import Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={importPassword}
                      onChange={(event) => setImportPassword(event.target.value)}
                      className={`${inputClass} pr-10`}
                      placeholder="Only required for encrypted backup files"
                    />
                    <KeyRound className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <button type="button" className="glass-btn glass-btn-primary flex items-center" onClick={handleImport}>
                  <Upload className="mr-1 h-4 w-4" /> Import Backup
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Backup History</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track created by, time, size, status, storage target, store and module scope.</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={historyFilters.status}
              onChange={(event) => setHistoryFilters((prev) => ({ ...prev, status: event.target.value }))}
              className={inputClass}
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
            </select>
            <select
              value={historyFilters.module}
              onChange={(event) => setHistoryFilters((prev) => ({ ...prev, module: event.target.value }))}
              className={inputClass}
            >
              <option value="">All Modules</option>
              {moduleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={historyFilters.branchCompanyId}
              onChange={(event) => setHistoryFilters((prev) => ({ ...prev, branchCompanyId: event.target.value }))}
              className={inputClass}
            >
              <option value="">All Stores</option>
              {companyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={historyFilters.dateFrom}
              onChange={(event) => setHistoryFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
              className={inputClass}
            />
            <input
              type="date"
              value={historyFilters.dateTo}
              onChange={(event) => setHistoryFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
              className={inputClass}
            />
          </div>

          <FilterableDataTable
            rows={filteredBackups}
            columns={backupColumns}
            loading={false}
            emptyText="No backups found."
            searchPlaceholder="Search backups..."
            showExport={false}
            tablePreferenceKey="settings.backup.history"
            renderActions={(row) => (
              <div className="flex items-center gap-2">
                <button type="button" className="glass-btn glass-btn-primary rounded p-1.5" onClick={() => handleDownload(row)} title="Download">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="glass-btn glass-btn-secondary rounded p-1.5" onClick={() => handleDownloadLogs(row)} title="Logs">
                  <Archive className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="glass-btn glass-btn-success rounded p-1.5" onClick={() => selectBackupForRestore(row)} title="Restore">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="glass-btn glass-btn-danger rounded p-1.5" onClick={() => handleDeleteBackup(row)} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
          />
        </div>

        <div className={cardClass}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Restore History</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit trail of restore operations, status and affected rows.</p>
            </div>
          </div>
          <FilterableDataTable
            rows={overview.restores || []}
            columns={restoreColumns}
            loading={false}
            emptyText="No restore history found."
            searchPlaceholder="Search restores..."
            showExport={false}
            tablePreferenceKey="settings.backup.restores"
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
