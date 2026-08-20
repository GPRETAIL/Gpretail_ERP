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
  { value: "cloud", label: "Cloud Storage" },
  { value: "hybrid", label: "Hybrid Storage" },
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

const notifyBackupActivityRefresh = () => {
  window.dispatchEvent(new Event("backup-activity-refresh"));
};

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
  storageMode: "hybrid",
  moduleNames: [],
  encryptionEnabled: false,
  encryptionPassword: "",
  restorePasswordHint: "",
});

const createDefaultSettingsForm = () => ({
  storageMode: "hybrid",
  localStorageEnabled: true,
  cloudStorageEnabled: true,
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
  storageMode: setting.storage_mode || setting.storageMode || "hybrid",
  localStorageEnabled: setting.local_storage_enabled ?? setting.localStorageEnabled ?? true,
  cloudStorageEnabled: setting.cloud_storage_enabled ?? setting.cloudStorageEnabled ?? true,
  encryptionEnabled: setting.encryption_enabled ?? setting.encryptionEnabled ?? false,
  encryptionPassword: "",
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
  const [submittingBackup, setSubmittingBackup] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [importing, setImporting] = useState(false);
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
  });
  const [createForm, setCreateForm] = useState(createDefaultCreateForm);
  const [settingsForm, setSettingsForm] = useState(createDefaultSettingsForm);
  const [restoreForm, setRestoreForm] = useState(createDefaultRestoreForm);
  const [importFile, setImportFile] = useState(null);
  const [historyFilters, setHistoryFilters] = useState({
    status: "",
    module: "",
    branchCompanyId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [restoreCardHighlighted, setRestoreCardHighlighted] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, row: null });

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

  const handleCreateBackup = async () => {
    if (createForm.backupType === "module" && !createForm.moduleNames.length) {
      toast.warning("Select at least one module for module-wise backup");
      return;
    }
    try {
      setSubmittingBackup(true);
      const payload = {
        ...createForm,
        companyId: selectedCompanyId || undefined,
      };
      const response = await api.post("/backups", payload);
      toast.success(response.data?.message || "Backup created");
      notifyBackupActivityRefresh();
      setCreateForm((prev) => ({
        ...createDefaultCreateForm(),
        storageMode: prev.storageMode,
        encryptionEnabled: prev.encryptionEnabled,
        restorePasswordHint: prev.restorePasswordHint,
      }));
      await loadOverview(selectedCompanyId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create backup");
    } finally {
      setSubmittingBackup(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const payload = {
        ...settingsForm,
        companyId: selectedCompanyId || undefined,
      };
      const response = await api.post("/backups/settings", payload);
      toast.success(response.data?.message || "Backup settings saved");
      await loadOverview(selectedCompanyId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save backup settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreForm.backupId) {
      toast.warning("Select a backup to restore");
      return;
    }
    try {
      setRestoring(true);
      const response = await api.post(`/backups/${restoreForm.backupId}/restore`, {
        ...restoreForm,
        companyId: selectedCompanyId || undefined,
        targetCompanyId: restoreForm.targetCompanyId || undefined,
      });
      toast.success(response.data?.message || "Restore completed");
      notifyBackupActivityRefresh();
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
      setImporting(true);
      const formData = new FormData();
      formData.append("backupFile", importFile);
      if (selectedCompanyId) formData.append("companyId", selectedCompanyId);
      if (restoreForm.password) formData.append("password", restoreForm.password);
      const response = await api.post("/backups/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(response.data?.message || "Backup imported");
      notifyBackupActivityRefresh();
      setImportFile(null);
      await loadOverview(selectedCompanyId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to import backup");
    } finally {
      setImporting(false);
    }
  };

  const downloadBlob = async (url, fallbackName) => {
    const response = await api.get(url, { responseType: "blob" });
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleDownload = async (row) => {
    try {
      await downloadBlob(`/backups/${row.id}/download`, row.file_name || `backup-${row.id}.json.gz`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download backup");
    }
  };

  const handleDownloadLogs = async (row) => {
    try {
      await downloadBlob(`/backups/${row.id}/logs`, `backup-${row.id}-logs.txt`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download logs");
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
                  {storageModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

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

              <button type="button" className="glass-btn glass-btn-success flex items-center" onClick={handleCreateBackup} disabled={submittingBackup}>
                <Play className="mr-1 h-4 w-4" /> {submittingBackup ? "Creating..." : "Run Backup"}
              </button>
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
                  {storageModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!settingsForm.localStorageEnabled}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, localStorageEnabled: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  Local storage
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!settingsForm.cloudStorageEnabled}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, cloudStorageEnabled: event.target.checked }))}
                    className="h-4 w-4"
                  />
                  Cloud storage
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

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  min="1"
                  value={settingsForm.retentionDaily}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, retentionDaily: Number(event.target.value) }))}
                  className={inputClass}
                  placeholder="Daily"
                />
                <input
                  type="number"
                  min="1"
                  value={settingsForm.retentionWeekly}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, retentionWeekly: Number(event.target.value) }))}
                  className={inputClass}
                  placeholder="Weekly"
                />
                <input
                  type="number"
                  min="1"
                  value={settingsForm.retentionMonthly}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, retentionMonthly: Number(event.target.value) }))}
                  className={inputClass}
                  placeholder="Monthly"
                />
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

              <button type="button" className="glass-btn glass-btn-success flex items-center" onClick={handleSaveSettings} disabled={savingSettings}>
                <Save className="mr-1 h-4 w-4" /> {savingSettings ? "Saving..." : "Save Settings"}
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

              <button type="button" className="glass-btn glass-btn-danger flex items-center" onClick={handleRestore} disabled={restoring}>
                <RotateCcw className="mr-1 h-4 w-4" /> {restoring ? "Restoring..." : "Run Restore"}
              </button>

              <div className="border-t dark:border-gray-700 pt-3">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Import Backup File</label>
                <input type="file" onChange={(event) => setImportFile(event.target.files?.[0] || null)} className={inputClass} />
                <button type="button" className="glass-btn glass-btn-primary mt-3 flex items-center" onClick={handleImport} disabled={importing}>
                  <Upload className="mr-1 h-4 w-4" /> {importing ? "Importing..." : "Import Backup"}
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
