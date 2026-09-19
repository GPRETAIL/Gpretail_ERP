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
import { alpha } from "@mui/material/styles";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import FilterableDataTable from "../../components/FilterableDataTable";
import PageSkeleton from "../../components/PageSkeleton";

const fieldSx = { "& .MuiInputBase-input": { fontSize: 12.25 } };
const cardSx = { borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 3, p: 2 };

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
    <Stack spacing={0.5}>
      <Typography component="label" sx={{ display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
      <Box sx={{ position: "relative" }} ref={wrapperRef}>
        <Box
          component="button"
          type="button"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          sx={{
            display: "flex", minHeight: 40, width: "100%", alignItems: "center", justifyContent: "space-between",
            borderRadius: "4px", border: "1px solid", borderColor: "divider", px: 1.5, py: 1, textAlign: "left",
            fontSize: 12.25, fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer",
            bgcolor: disabled ? "action.hover" : "background.paper", color: disabled ? "text.disabled" : "text.primary",
            "&:focus": { borderColor: "primary.main", outline: "none" },
          }}
        >
          <Box component="span" sx={{ color: selectedLabels.length ? "text.primary" : "text.disabled" }}>
            {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
          </Box>
          <Box sx={{ color: "text.disabled", display: "inline-flex" }}>
            <Search className="h-4 w-4" />
          </Box>
        </Box>
        {isOpen ? (
          <Box
            sx={{
              position: "absolute", zIndex: 20, mt: 0.5, maxHeight: 224, width: "100%", overflow: "auto",
              borderRadius: "4px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 4,
            }}
          >
            {options.map((option) => {
              const checked = selectedSet.has(String(option.value));
              return (
                <Stack
                  key={option.value}
                  component="label"
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: "center", cursor: "pointer", borderBottom: "1px solid", borderColor: "divider",
                    px: 1.5, py: 1, fontSize: 12.25, color: "text.secondary",
                    "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 },
                  }}
                >
                  <Checkbox checked={checked} onChange={() => toggle(option.value)} size="small" sx={{ p: 0 }} />
                  <Box component="span">{option.label}</Box>
                </Stack>
              );
            })}
          </Box>
        ) : null}
      </Box>
      {helperText ? <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>{helperText}</Typography> : null}
    </Stack>
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
  // FilterableDataTable's page-size dropdown only offers 20/60/100/150 - a
  // default outside that list still paginates correctly (safeLimit isn't
  // clamped to the list), but the dropdown shows nothing selected. Match it.
  const DEFAULT_HISTORY_LIMIT = 20;
  const [backupHistoryPage, setBackupHistoryPage] = useState(1);
  const [backupHistoryLimit, setBackupHistoryLimit] = useState(DEFAULT_HISTORY_LIMIT);
  const [restoreHistoryPage, setRestoreHistoryPage] = useState(1);
  const [restoreHistoryLimit, setRestoreHistoryLimit] = useState(DEFAULT_HISTORY_LIMIT);
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

  const loadOverviewAbortRef = useRef(null);

  const loadOverview = useCallback(async (companyId = "") => {
    // The single-company auto-select below changes selectedCompanyId, which
    // re-triggers the effect that calls this - so an unscoped load is almost
    // always immediately followed by a second, scoped one. Cancel any load
    // still in flight so the two never race/overlap against the backend.
    loadOverviewAbortRef.current?.abort();
    const controller = new AbortController();
    loadOverviewAbortRef.current = controller;
    try {
      setLoading(true);
      const response = await api.get("/backups/overview", {
        params: companyId ? { companyId } : {},
        signal: controller.signal,
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
      // A superseded request being cancelled is expected, not a real failure
      if (err.code !== "ERR_CANCELED" && !api.isCancel?.(err)) {
        toast.error(err.response?.data?.message || "Failed to load backup center");
      }
    } finally {
      // Only the still-current request should clear the loading state - an
      // aborted, superseded one finishing late shouldn't flip it back off.
      if (loadOverviewAbortRef.current === controller) {
        setLoading(false);
      }
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
    return <PageSkeleton variant="form" rows={10} />;
  }

  return (
    <Box className="master-responsive" sx={{ display: "flex", height: "100%", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Backup"
        message={`Are you sure you want to delete "${deleteDialog.row?.file_name || `Backup #${deleteDialog.row?.id || ""}`}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteDialog({ open: false, row: null })}
      />

      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 2, py: 1.5, boxShadow: 1 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} sx={{ alignItems: { lg: "center" }, justifyContent: { lg: "space-between" } }}>
          <Box>
            <Typography component="h1" sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>Settings / Backup Center</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 12.25, color: "text.secondary" }}>
              Full, incremental and module-wise backups with restore, import, scheduling, retention and audit history.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "center" }}>
            <Box sx={{ minWidth: 220 }}>
              <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Current Scope</Typography>
              <Box sx={{ borderRadius: "4px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", color: "text.secondary", p: 1, fontSize: 12.25 }}>{selectedScopeLabel}</Box>
            </Box>
            <Button type="button" className="glass-btn glass-btn-primary flex items-center" onClick={() => loadOverview(selectedCompanyId)}>
              <Search className="mr-1 h-4 w-4" /> Refresh
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Stack spacing={3} sx={{ flex: 1, p: 2 }}>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" } }}>
          <Box sx={{ ...cardSx, borderRadius: "10.5px" }}>
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Last Backup</Typography>
                <Typography sx={{ mt: 1, fontSize: 15.75, fontWeight: 700, color: "text.primary" }}>{toText(overview.stats?.last_backup_status, "Never").replace(/\b\w/g, (char) => char.toUpperCase())}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>{toDateTime(overview.stats?.last_backup_at)}</Typography>
              </Box>
              <Box sx={{ color: "success.main", display: "inline-flex" }}>
                <CheckCircle2 className="h-8 w-8" />
              </Box>
            </Stack>
          </Box>
          <Box sx={{ ...cardSx, borderRadius: "10.5px" }}>
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Next Schedule</Typography>
                <Typography sx={{ mt: 1, fontSize: 15.75, fontWeight: 700, color: "text.primary" }}>{toDateTime(overview.stats?.next_scheduled_backup)}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>Automatic scheduler</Typography>
              </Box>
              <Box sx={{ color: "primary.main", display: "inline-flex" }}>
                <Clock3 className="h-8 w-8" />
              </Box>
            </Stack>
          </Box>
          <Box sx={{ ...cardSx, borderRadius: "10.5px" }}>
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>Storage Usage</Typography>
                <Typography sx={{ mt: 1, fontSize: 15.75, fontWeight: 700, color: "text.primary" }}>{overview.stats?.storage_usage?.total_label || "0 B"}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                  Local {overview.stats?.storage_usage?.local_label || "0 B"} / Cloud {overview.stats?.storage_usage?.cloud_label || "0 B"}
                </Typography>
              </Box>
              <Box sx={{ color: "warning.main", display: "inline-flex" }}>
                <HardDrive className="h-8 w-8" />
              </Box>
            </Stack>
          </Box>
          <Box sx={{ ...cardSx, borderRadius: "10.5px" }}>
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "text.secondary" }}>History</Typography>
                <Typography sx={{ mt: 1, fontSize: 15.75, fontWeight: 700, color: "text.primary" }}>{overview.stats?.total_backups || 0} backups</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                  {overview.stats?.success_count || 0} success / {overview.stats?.failed_count || 0} failed
                </Typography>
              </Box>
              <Box sx={{ color: "#6366f1", display: "inline-flex" }}>
                <History className="h-8 w-8" />
              </Box>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xl: "repeat(3, 1fr)" } }}>
          <Box sx={cardSx}>
            <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", pb: 1 }}>
              <Box>
                <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>Create Backup</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Run full, incremental or module-wise backups for the selected store scope.</Typography>
              </Box>
              <Box sx={{ color: "primary.main", display: "inline-flex" }}>
                <Archive className="h-5 w-5" />
              </Box>
            </Stack>

            <Stack spacing={1.5}>
              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Backup Type</Typography>
                <TextField select size="small" fullWidth sx={fieldSx} value={createForm.backupType} onChange={(event) => setCreateForm((prev) => ({ ...prev, backupType: event.target.value }))}>
                  {backupTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              </Box>

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

              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Backup Scope</Typography>
                {isSuperAdmin ? (
                  <TextField select size="small" fullWidth sx={fieldSx} value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)}>
                    <MenuItem value="">All Stores</MenuItem>
                    {companyOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Box sx={{ borderRadius: "4px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", color: "text.secondary", p: 1, fontSize: 12.25 }}>{currentStoreLabel}</Box>
                )}
              </Box>

              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Storage Mode</Typography>
                <TextField select size="small" fullWidth sx={fieldSx} value={createForm.storageMode} onChange={(event) => setCreateForm((prev) => ({ ...prev, storageMode: event.target.value }))}>
                  {storageModeOptions.map((option) => {
                    const needsCloud = option.value === "cloud" || option.value === "hybrid";
                    const isDisabled = needsCloud && !settingsForm.cloudConfigured;
                    return (
                      <MenuItem key={option.value} value={option.value} disabled={isDisabled}>
                        {option.label}{isDisabled ? " (configure OCI in Settings first)" : ""}
                      </MenuItem>
                    );
                  })}
                </TextField>
                {settingsForm.cloudConfigured ? (
                  <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "success.main" }}>✓ OCI Object Storage is configured for this store.</Typography>
                ) : (
                  <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>Cloud options require OCI credentials saved in Storage Settings.</Typography>
                )}
              </Box>

              {createFormIncludesUsers && !createForm.encryptionEnabled ? (
                <Typography
                  sx={{
                    fontSize: 10.5, color: "warning.dark", bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.2 : 0.08),
                    border: "1px solid", borderColor: "warning.main", borderRadius: "5.25px", p: 1,
                  }}
                >
                  This backup includes the Users table (login accounts with password hashes). Encryption is required to include it.
                </Typography>
              ) : null}

              <FormControlLabel
                sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "text.secondary" } }}
                control={
                  <Checkbox
                    size="small"
                    checked={createForm.encryptionEnabled}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, encryptionEnabled: event.target.checked }))}
                  />
                }
                label="Enable backup encryption"
              />

              {createForm.encryptionEnabled ? (
                <>
                  <Box>
                    <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Encryption Password</Typography>
                    <TextField
                      type="password"
                      size="small"
                      fullWidth
                      sx={fieldSx}
                      value={createForm.encryptionPassword}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, encryptionPassword: event.target.value }))}
                    />
                  </Box>
                  <Box>
                    <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Password Hint</Typography>
                    <TextField
                      size="small"
                      fullWidth
                      sx={fieldSx}
                      value={createForm.restorePasswordHint}
                      onChange={(event) => setCreateForm((prev) => ({ ...prev, restorePasswordHint: event.target.value }))}
                    />
                  </Box>
                </>
              ) : null}

              <Typography
                sx={{
                  borderRadius: "5.25px", border: "1px solid", borderColor: "primary.main",
                  bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.08),
                  p: 1.5, fontSize: 10.5, color: "primary.dark",
                }}
              >
                Local storage writes to the system backup folder, cloud storage writes to the server backup folder, and hybrid writes to both.
              </Typography>

              <Button
                type="button"
                className="glass-btn glass-btn-success flex items-center"
                onClick={handleCreateBackup}
                disabled={creatingBackup}
              >
                <Play className="mr-1 h-4 w-4" />
                {creatingBackup ? `Backing up… ${formatElapsed(createElapsedMs)}` : "Run Backup"}
              </Button>
              {creatingBackup ? (
                <Typography sx={{ fontSize: 10.5, color: "warning.main" }}>
                  Please don&apos;t close this window or navigate away until the backup finishes.
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Box
            ref={restoreCardRef}
            sx={{ ...cardSx, ...(restoreCardHighlighted ? { boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}` } : {}) }}
          >
            <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", pb: 1 }}>
              <Box>
                <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>Storage, Schedule & Retention</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Automatic backups, retention windows and cleanup policy for the selected store scope.</Typography>
              </Box>
              <Box sx={{ color: "#6366f1", display: "inline-flex" }}>
                <Cloud className="h-5 w-5" />
              </Box>
            </Stack>

            <Stack spacing={1.5}>
              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Default Storage</Typography>
                <TextField select size="small" fullWidth sx={fieldSx} value={settingsForm.storageMode} onChange={(event) => setSettingsForm((prev) => ({ ...prev, storageMode: event.target.value }))}>
                  {storageModeOptions.map((option) => {
                    const needsCloud = option.value === "cloud" || option.value === "hybrid";
                    const isDisabled = needsCloud && !settingsForm.cloudConfigured;
                    return (
                      <MenuItem key={option.value} value={option.value} disabled={isDisabled}>
                        {option.label}{isDisabled ? " (configure OCI below first)" : ""}
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Box>

              {/* Oracle Cloud Infrastructure (OCI) Credentials */}
              <Stack
                spacing={1.5}
                sx={{
                  borderRadius: "7px", border: "1px solid", borderColor: "#6366f1",
                  bgcolor: (theme) => alpha("#6366f1", theme.palette.mode === "dark" ? 0.16 : 0.08), p: 1.5,
                }}
              >
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "#6366f1" }}>☁ Oracle Cloud (OCI) Object Storage</Typography>
                  {settingsForm.cloudConfigured ? (
                    <Box component="span" sx={{ fontSize: 10.5, fontWeight: 500, px: 1, py: 0.25, borderRadius: "50px", bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.24 : 0.15), color: "success.main" }}>✓ Configured</Box>
                  ) : (
                    <Box component="span" sx={{ fontSize: 10.5, fontWeight: 500, px: 1, py: 0.25, borderRadius: "50px", bgcolor: "action.selected", color: "text.secondary" }}>Not configured</Box>
                  )}
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    placeholder="Object Storage Namespace"
                    value={settingsForm.ociNamespace}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociNamespace: event.target.value }))}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    placeholder="Region (e.g. ap-mumbai-1, us-ashburn-1)"
                    value={settingsForm.ociRegion}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociRegion: event.target.value }))}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    placeholder="Customer Secret Key (Access Key)"
                    value={settingsForm.ociAccessKeyId}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociAccessKeyId: event.target.value }))}
                  />
                  <TextField
                    type="password"
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    placeholder="Secret Key"
                    value={settingsForm.ociSecretAccessKey}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociSecretAccessKey: event.target.value }))}
                    autoComplete="new-password"
                  />
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  sx={fieldSx}
                  placeholder="Bucket Name (e.g. gpretail-backups)"
                  value={settingsForm.ociBucket}
                  onChange={(event) => setSettingsForm((prev) => ({ ...prev, ociBucket: event.target.value }))}
                />
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Button
                    type="button"
                    variant="contained"
                    size="small"
                    onClick={handleTestCloudConnection}
                    disabled={cloudTestStatus === "testing"}
                    startIcon={<Cloud className="h-3.5 w-3.5" />}
                    sx={{ fontSize: 11, bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
                  >
                    {cloudTestStatus === "testing" ? "Testing..." : "Test Connection"}
                  </Button>
                  {cloudTestStatus === "ok" && (
                    <Box component="span" sx={{ fontSize: 10.5, fontWeight: 500, color: "success.main" }}>✓ {cloudTestMessage}</Box>
                  )}
                  {cloudTestStatus === "fail" && (
                    <Box component="span" sx={{ fontSize: 10.5, color: "error.main" }}>{cloudTestMessage}</Box>
                  )}
                </Stack>
                <FormControlLabel
                  sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "#6366f1" } }}
                  control={
                    <Checkbox
                      size="small"
                      checked={!!settingsForm.cloudStorageEnabled}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, cloudStorageEnabled: event.target.checked }))}
                    />
                  }
                  label="Enable cloud storage for scheduled backups"
                />
              </Stack>

              <FormControlLabel
                sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "text.secondary" } }}
                control={
                  <Checkbox
                    size="small"
                    checked={!!settingsForm.localStorageEnabled}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, localStorageEnabled: event.target.checked }))}
                  />
                }
                label="Enable local storage for scheduled backups"
              />
              <Typography sx={{ mt: -1, fontSize: 10.5, color: "text.secondary" }}>
                Enabling both stores a copy in each location (Hybrid). Cloud storage requires the OCI credentials above to be configured; scheduled backups fall back to local storage automatically if they are not.
              </Typography>

              <FormControlLabel
                sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "text.secondary" } }}
                control={
                  <Checkbox
                    size="small"
                    checked={!!settingsForm.encryptionEnabled}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, encryptionEnabled: event.target.checked }))}
                  />
                }
                label="Default encryption"
              />

              {settingsForm.encryptionEnabled ? (
                <>
                  <TextField
                    type="password"
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    placeholder="Default encryption password"
                    value={settingsForm.encryptionPassword}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, encryptionPassword: event.target.value }))}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    placeholder="Restore password hint"
                    value={settingsForm.restorePasswordHint}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, restorePasswordHint: event.target.value }))}
                  />
                </>
              ) : null}

              <FormControlLabel
                sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "text.secondary" } }}
                control={
                  <Checkbox
                    size="small"
                    checked={!!settingsForm.scheduleEnabled}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleEnabled: event.target.checked }))}
                  />
                }
                label="Enable automatic backup scheduling"
              />

              {settingsForm.scheduleEnabled ? (
                settingsForm.lastScheduledAt ? (
                  <Typography
                    sx={{
                      borderRadius: "7px", border: "1px solid", borderColor: "success.main",
                      bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.2 : 0.08),
                      p: 1.5, fontSize: 10.5, color: "success.dark",
                    }}
                  >
                    ✓ Scheduled backups are actively running — last one completed {toDateTime(settingsForm.lastScheduledAt)}. Your external trigger is working.
                  </Typography>
                ) : (
                  <Typography
                    sx={{
                      borderRadius: "7px", border: "1px solid", p: 1.5, fontSize: 10.5,
                      ...(overview.cronSecretConfigured
                        ? { borderColor: "warning.main", bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.2 : 0.08), color: "warning.dark" }
                        : { borderColor: "error.main", bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.2 : 0.08), color: "error.dark" }),
                    }}
                  >
                    {overview.cronSecretConfigured
                      ? "⚠ The server is ready (BACKUP_CRON_SECRET is set), but no scheduled run has completed yet. Double-check your external trigger (cron-job.org etc.) is actually calling the URL below with the correct token."
                      : "⚠ BACKUP_CRON_SECRET is not configured on this server yet. The trigger URL below will be rejected (403) no matter what token is used until it's set."}
                  </Typography>
                )
              ) : null}

              {settingsForm.scheduleEnabled ? (
                <Box
                  sx={{
                    borderRadius: "7px", border: "1px solid", borderColor: "primary.main",
                    bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.08),
                    p: 1.5, fontSize: 10.5, color: "primary.dark",
                  }}
                >
                  This server has no background job runner, so scheduled backups need an
                  external trigger to actually run. Set up a free service like{" "}
                  <Box component="span" sx={{ fontWeight: 600 }}>cron-job.org</Box>, or your hosting
                  panel&apos;s cron jobs, to periodically call:
                  <Box sx={{ mt: 0.5, borderRadius: 1, bgcolor: "action.hover", p: 1, fontFamily: "monospace", wordBreak: "break-all" }}>
                    GET {(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/api$/, "")}/api/backups/scheduled-run?token=YOUR_SECRET
                  </Box>
                  Get the real secret value from the server&apos;s{" "}
                  <Box component="span" sx={{ fontFamily: "monospace" }}>BACKUP_CRON_SECRET</Box> environment
                  variable — it is never shown here.
                  {settingsForm.encryptionEnabled && (settingsForm.encryptionPassword || settingsForm.scheduledEncryptionConfigured) ? (
                    <Typography sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "primary.main", color: "success.main", fontSize: "inherit" }}>
                      ✓ A password is saved above, so scheduled backups will run encrypted and include the Users table. The password is stored encrypted at rest on the server - this protects the backup file if it leaks or gets stolen separately, but not against someone who fully compromises this server.
                    </Typography>
                  ) : (
                    <Typography sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "primary.main", fontSize: "inherit" }}>
                      Scheduled backups will run unencrypted (no password saved above), so the
                      Users table is skipped automatically to avoid storing password hashes
                      unencrypted. Enable &quot;Default encryption&quot; and save a password
                      above to include it in scheduled runs too.
                    </Typography>
                  )}
                </Box>
              ) : null}

              {settingsForm.scheduleEnabled ? (
                <>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                    <TextField select size="small" fullWidth sx={fieldSx} value={settingsForm.scheduleFrequency} onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleFrequency: event.target.value }))}>
                      {scheduleFrequencyOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      type="time"
                      size="small"
                      fullWidth
                      sx={fieldSx}
                      value={settingsForm.scheduleTime}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleTime: event.target.value }))}
                    />
                  </Box>

                  {settingsForm.scheduleFrequency === "weekly" ? (
                    <TextField select size="small" fullWidth sx={fieldSx} value={settingsForm.scheduleDayOfWeek} onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleDayOfWeek: Number(event.target.value) }))}>
                      {weekDayOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </TextField>
                  ) : null}

                  {settingsForm.scheduleFrequency === "monthly" ? (
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      sx={fieldSx}
                      slotProps={{ htmlInput: { min: 1, max: 28 } }}
                      value={settingsForm.scheduleDayOfMonth}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleDayOfMonth: Number(event.target.value) }))}
                    />
                  ) : null}

                  <TextField select size="small" fullWidth sx={fieldSx} value={settingsForm.scheduleBackupType} onChange={(event) => setSettingsForm((prev) => ({ ...prev, scheduleBackupType: event.target.value }))}>
                    {backupTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>

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

              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>
                  Retention (how many old scheduled backups to keep)
                </Typography>
                <Typography sx={{ mb: 1, fontSize: 10.5, color: "text.secondary" }}>
                  Only the box matching your Schedule Frequency above is actually used right now - it&apos;s highlighted below. The other two are just saved for whenever you switch frequency later.
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
                  {[
                    { key: "retentionDaily", label: "Daily backups to keep", freq: "daily" },
                    { key: "retentionWeekly", label: "Weekly backups to keep", freq: "weekly" },
                    { key: "retentionMonthly", label: "Monthly backups to keep", freq: "monthly" },
                  ].map(({ key, label, freq }) => {
                    const active = settingsForm.scheduleFrequency === freq;
                    return (
                      <Box
                        key={key}
                        sx={{
                          borderRadius: "5.25px", border: "1px solid", p: 1,
                          ...(active
                            ? { borderColor: "primary.main", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) }
                            : { borderColor: "divider" }),
                        }}
                      >
                        <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 500, color: active ? "primary.main" : "text.secondary" }}>
                          {label}
                          {active ? " (active)" : ""}
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          sx={fieldSx}
                          slotProps={{ htmlInput: { min: 1 } }}
                          value={settingsForm[key]}
                          onChange={(event) => setSettingsForm((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <FormControlLabel
                sx={{ ml: 0, "& .MuiFormControlLabel-label": { fontSize: 12.25, color: "text.secondary" } }}
                control={
                  <Checkbox
                    size="small"
                    checked={!!settingsForm.autoCleanupEnabled}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, autoCleanupEnabled: event.target.checked }))}
                  />
                }
                label="Auto cleanup old scheduled backups"
              />

              <Button type="button" className="glass-btn glass-btn-success flex items-center" onClick={handleSaveSettings}>
                <Save className="mr-1 h-4 w-4" /> Save Settings
              </Button>
            </Stack>
          </Box>

          <Box sx={cardSx}>
            <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", pb: 1 }}>
              <Box>
                <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>Restore & Import</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Restore a saved version or import backups from another system.</Typography>
              </Box>
              <Box sx={{ color: "success.main", display: "inline-flex" }}>
                <Shield className="h-5 w-5" />
              </Box>
            </Stack>

            <Stack spacing={1.5}>
              <Typography
                sx={{
                  borderRadius: "5.25px", border: "1px solid", borderColor: "warning.main",
                  bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.2 : 0.08),
                  p: 1.5, fontSize: 10.5, color: "warning.dark",
                }}
              >
                Click the restore icon in Backup History to select a backup here, then press <Box component="span" sx={{ fontWeight: 600 }}>Run Restore</Box>.
              </Typography>
              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Selected Backup</Typography>
                <TextField
                  select
                  size="small"
                  fullWidth
                  sx={fieldSx}
                  value={restoreForm.backupId}
                  onChange={(event) => {
                    const nextBackup = (overview.backups || []).find((row) => String(row.id) === String(event.target.value));
                    setRestoreForm((prev) => ({
                      ...prev,
                      backupId: event.target.value,
                      moduleNames: nextBackup?.backup_type === "module" ? nextBackup.module_names || [] : [],
                    }));
                  }}
                >
                  <MenuItem value="">Select backup</MenuItem>
                  {(overview.backups || []).map((row) => (
                    <MenuItem key={row.id} value={row.id}>
                      #{row.id} {row.file_name || row.backup_type}
                    </MenuItem>
                  ))}
                </TextField>
                {restoreForm.backupId ? (
                  <Typography sx={{ mt: 0.5, fontSize: 10.5, fontWeight: 500, color: "success.main" }}>Backup #{restoreForm.backupId} is selected for restore.</Typography>
                ) : null}
              </Box>

              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Restore Type</Typography>
                <TextField select size="small" fullWidth sx={fieldSx} value={restoreForm.restoreType} onChange={(event) => setRestoreForm((prev) => ({ ...prev, restoreType: event.target.value }))}>
                  {restoreTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              </Box>

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

              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Restore Into Store</Typography>
                <TextField select size="small" fullWidth sx={fieldSx} value={restoreForm.targetCompanyId} onChange={(event) => setRestoreForm((prev) => ({ ...prev, targetCompanyId: event.target.value }))}>
                  <MenuItem value="">Original store(s) from backup</MenuItem>
                  {companyOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                <Typography sx={{ mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                  Leave this on <Box component="span" sx={{ fontWeight: 500 }}>Original store(s) from backup</Box> to restore rows back to the same store saved inside the backup file.
                </Typography>
              </Box>

              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Password</Typography>
                <TextField
                  type="password"
                  size="small"
                  fullWidth
                  sx={fieldSx}
                  value={restoreForm.password}
                  onChange={(event) => setRestoreForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Needed for encrypted backups"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <Box sx={{ color: "text.disabled", display: "inline-flex" }}>
                          <KeyRound className="h-4 w-4" />
                        </Box>
                      ),
                    },
                  }}
                />
              </Box>

              <Button
                type="button"
                className="glass-btn glass-btn-danger flex items-center"
                onClick={handleRestore}
                disabled={restoring}
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                {restoring ? `Restoring… ${formatElapsed(restoreElapsedMs)}` : "Run Restore"}
              </Button>
              {restoring ? (
                <Typography sx={{ fontSize: 10.5, color: "warning.main" }}>
                  Please don&apos;t close this window or navigate away until the restore finishes. Larger restores can take a while.
                </Typography>
              ) : null}

              <Stack spacing={1.5} sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
                <Typography component="label" sx={{ display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Import Backup File</Typography>
                <Box
                  component="input"
                  type="file"
                  ref={importFileInputRef}
                  onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                  sx={{ fontSize: 12.25, color: "text.secondary" }}
                />
                <Box>
                  <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Import Password</Typography>
                  <TextField
                    type="password"
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    value={importPassword}
                    onChange={(event) => setImportPassword(event.target.value)}
                    placeholder="Only required for encrypted backup files"
                    slotProps={{
                      input: {
                        endAdornment: (
                          <Box sx={{ color: "text.disabled", display: "inline-flex" }}>
                            <KeyRound className="h-4 w-4" />
                          </Box>
                        ),
                      },
                    }}
                  />
                </Box>
                <Button type="button" className="glass-btn glass-btn-primary flex items-center" onClick={handleImport}>
                  <Upload className="mr-1 h-4 w-4" /> Import Backup
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>

        <Box sx={cardSx}>
          <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>Backup History</Typography>
              <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Track created by, time, size, status, storage target, store and module scope.</Typography>
            </Box>
            <Button
              type="button"
              className="glass-btn glass-btn-secondary flex items-center"
              sx={{ flexShrink: 0 }}
              onClick={() => {
                setBackupHistoryLimit(Math.max(filteredBackups.length, DEFAULT_HISTORY_LIMIT));
                setBackupHistoryPage(1);
              }}
            >
              View All
            </Button>
          </Stack>

          <Box sx={{ mb: 2, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "repeat(5, 1fr)" } }}>
            <TextField select size="small" fullWidth sx={fieldSx} value={historyFilters.status} onChange={(event) => setHistoryFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="running">Running</MenuItem>
            </TextField>
            <TextField select size="small" fullWidth sx={fieldSx} value={historyFilters.module} onChange={(event) => setHistoryFilters((prev) => ({ ...prev, module: event.target.value }))}>
              <MenuItem value="">All Modules</MenuItem>
              {moduleOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" fullWidth sx={fieldSx} value={historyFilters.branchCompanyId} onChange={(event) => setHistoryFilters((prev) => ({ ...prev, branchCompanyId: event.target.value }))}>
              <MenuItem value="">All Stores</MenuItem>
              {companyOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              size="small"
              fullWidth
              sx={fieldSx}
              value={historyFilters.dateFrom}
              onChange={(event) => setHistoryFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
            />
            <TextField
              type="date"
              size="small"
              fullWidth
              sx={fieldSx}
              value={historyFilters.dateTo}
              onChange={(event) => setHistoryFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
            />
          </Box>

          <FilterableDataTable
            rows={filteredBackups}
            columns={backupColumns}
            loading={false}
            emptyText="No backups found."
            searchPlaceholder="Search backups..."
            showExport={false}
            tablePreferenceKey="settings.backup.history"
            paginationMode="client"
            page={backupHistoryPage}
            limit={backupHistoryLimit}
            totalRows={filteredBackups.length}
            totalPages={Math.max(Math.ceil(filteredBackups.length / Math.max(backupHistoryLimit, 1)), 1)}
            onPageChange={setBackupHistoryPage}
            onLimitChange={(value) => {
              setBackupHistoryLimit(value);
              setBackupHistoryPage(1);
            }}
            renderActions={(row) => (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Button type="button" className="glass-btn glass-btn-primary rounded p-1.5" sx={{ minWidth: "auto" }} onClick={() => handleDownload(row)} title="Download">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" className="glass-btn glass-btn-secondary rounded p-1.5" sx={{ minWidth: "auto" }} onClick={() => handleDownloadLogs(row)} title="Logs">
                  <Archive className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" className="glass-btn glass-btn-success rounded p-1.5" sx={{ minWidth: "auto" }} onClick={() => selectBackupForRestore(row)} title="Restore">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" className="glass-btn glass-btn-danger rounded p-1.5" sx={{ minWidth: "auto" }} onClick={() => handleDeleteBackup(row)} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Stack>
            )}
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
          />
        </Box>

        <Box sx={cardSx}>
          <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>Restore History</Typography>
              <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Audit trail of restore operations, status and affected rows.</Typography>
            </Box>
            <Button
              type="button"
              className="glass-btn glass-btn-secondary flex items-center"
              sx={{ flexShrink: 0 }}
              onClick={() => {
                setRestoreHistoryLimit(Math.max((overview.restores || []).length, DEFAULT_HISTORY_LIMIT));
                setRestoreHistoryPage(1);
              }}
            >
              View All
            </Button>
          </Stack>
          <FilterableDataTable
            rows={overview.restores || []}
            columns={restoreColumns}
            loading={false}
            emptyText="No restore history found."
            searchPlaceholder="Search restores..."
            showExport={false}
            tablePreferenceKey="settings.backup.restores"
            paginationMode="client"
            page={restoreHistoryPage}
            limit={restoreHistoryLimit}
            totalRows={(overview.restores || []).length}
            totalPages={Math.max(Math.ceil((overview.restores || []).length / Math.max(restoreHistoryLimit, 1)), 1)}
            onPageChange={setRestoreHistoryPage}
            onLimitChange={(value) => {
              setRestoreHistoryLimit(value);
              setRestoreHistoryPage(1);
            }}
            searchButtonClassName="glass-btn glass-btn-primary flex items-center disabled:opacity-50"
          />
        </Box>
      </Stack>
    </Box>
  );
}
