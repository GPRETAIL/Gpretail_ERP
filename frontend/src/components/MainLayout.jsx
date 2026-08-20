import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import TabBar from "../components/TabBar";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { TabProvider, useTabs } from "../context/TabContext";
import { TransferActivityProvider, useTransferActivity } from "../context/TransferActivityContext";
import { handleEnterKeyNavigation } from "../utils/enterToNextField";
import { usePrintContext } from "../context/PrintContext";
import api from "../api/axios";
import { Printer, Store, X, Loader2, CheckCircle2, AlertCircle, Upload, Download } from "lucide-react";
import { Chip } from "@mui/material";
import SubscriptionDuePopup from "./SubscriptionDuePopup";
import useSubscriptionStatus from "../hooks/useSubscriptionStatus";
import useStoreNameMap, { resolveStoreName } from "../hooks/useStoreNameMap";
import { ProtectedLayoutRouteRenderer } from "../routes/protectedLayoutRoutes";
import { useLocation } from "react-router-dom";

const MOBILE_BREAKPOINT = 768;

// Plan selection lives entirely on VX-Admin's Company Portal, a separate app/session from this one --
// there is no in-tenant plan picker to route to locally.
const COMPANY_PORTAL_LOGIN_URL = "https://company.gpretail.uk/login";

const TabbedWorkspaces = () => {
  const { tabs, activeTabId } = useTabs();
  const location = useLocation();
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  if (!activeTab) return null;

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <ProtectedLayoutRouteRenderer location={location} key={activeTab.id} />
    </div>
  );
};

const PrintStatusFooter = () => {
  const { connected, printer, hasActiveJobs, jobs, currentJob, cancelJob, clearFinished, STATUS } =
    usePrintContext();
  const { activeActivity, recentActivity, clearRecentActivity, TYPE } = useTransferActivity();
  const { navigateActiveTab } = useTabs();
  const authUser = useSelector((state) => state.auth.user);
  const userRole = String(authUser?.role || "").toLowerCase();
  const canManageBackups = userRole === "super_admin" || userRole === "admin";

  // Active-store indicator: the Navbar's Switch Store choice, or "All Stores" when a super-admin
  // hasn't switched into one yet (they read unrestricted across the whole tenant in that state --
  // see GatewayAuthFilter.resolveCompanyScope). A non-super-admin always has a real store even
  // before choosing one from a multi-store grant, so they fall back to their own default rather
  // than "All Stores", which would be misleading for the common single-store case.
  const storeNameMap = useStoreNameMap();
  const activeStoreId = localStorage.getItem("activeStoreId") || "";
  const defaultStoreId = userRole === "super_admin" ? "" : String(authUser?.company_id || authUser?.companyId || "");
  const effectiveStoreId = activeStoreId || defaultStoreId;
  const activeStoreLabel = effectiveStoreId ? resolveStoreName(storeNameMap, effectiveStoreId) : "All Stores";
  // Mirrors Navbar's own canSwitchStore -- only offer the shortcut to whoever actually has a dialog
  // to open. A single-store user clicking it would open a picker with nothing useful in it.
  const canSwitchStore =
    userRole === "super_admin" || (Array.isArray(authUser?.company_ids) && authUser.company_ids.length > 1);
  // Trial / due marker sits with the store indicator: the footer is already where "which context am
  // I working in" lives, so subscription state belongs beside it rather than in a new chrome slot.
  const subscription = useSubscriptionStatus();

  const recentJobs = jobs.slice(-5);
  const [expanded, setExpanded] = useState(false);
  const [activeOperation, setActiveOperation] = useState(null);
  const [recentOperation, setRecentOperation] = useState(null);
  const previousOperationStatusRef = React.useRef(new Map());
  const backupOpsLoadedRef = React.useRef(false);
  const pollingIntervalRef = React.useRef(null);

  useEffect(() => {
    if (!recentOperation) return undefined;
    const timer = window.setTimeout(() => setRecentOperation(null), 8000);
    return () => window.clearTimeout(timer);
  }, [recentOperation]);

  useEffect(() => {
    if (!canManageBackups) {
      setActiveOperation(null);
      setRecentOperation(null);
      previousOperationStatusRef.current = new Map();
      backupOpsLoadedRef.current = false;
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return undefined;
    }

    let cancelled = false;

    const stopPolling = () => {
      if (!pollingIntervalRef.current) return;
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    };

    const ensurePolling = () => {
      if (pollingIntervalRef.current) return;
      pollingIntervalRef.current = window.setInterval(() => {
        pollOperations();
      }, 3000);
    };

    const pollOperations = async () => {
      try {
        const response = await api.get("/backups/overview");
        const data = response.data?.data || {};
        const operationRows = [
          ...((data.backups || []).map((row) => ({
            key: `backup:${row.id}`,
            id: row.id,
            type: "backup",
            status: String(row.status || "").toLowerCase(),
            label: row.file_name || `Backup #${row.id}`,
            progressPercent: Math.max(0, Math.min(100, Number(row.summary?.progress_percent) || 0)),
            statusMessage: String(row.summary?.status_message || "").trim(),
            startedAt: row.started_at || row.created_at || null,
            completedAt: row.completed_at || null,
          }))),
          ...((data.restores || []).map((row) => ({
            key: `restore:${row.id}`,
            id: row.id,
            type: "restore",
            status: String(row.status || "").toLowerCase(),
            label: `Restore #${row.id}`,
            progressPercent: Math.max(0, Math.min(100, Number(row.summary?.progress_percent) || 0)),
            statusMessage: String(row.summary?.status_message || "").trim(),
            startedAt: row.started_at || row.created_at || null,
            completedAt: row.completed_at || null,
          }))),
        ];

        const nextStatusMap = new Map(operationRows.map((row) => [row.key, row.status]));
        const runningOperations = operationRows
          .filter((row) => row.status === "running")
          .sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());
        const hasRunningOperation = runningOperations.length > 0;

        if (hasRunningOperation) ensurePolling();
        else stopPolling();

        if (!cancelled) {
          setActiveOperation(runningOperations[0] || null);
        }

        if (backupOpsLoadedRef.current) {
          for (const row of operationRows) {
            const previousStatus = previousOperationStatusRef.current.get(row.key);
            if (previousStatus !== "running" || row.status === "running") continue;

            if (!cancelled) {
              setRecentOperation({ ...row, at: Date.now() });
            }

            const label = row.type === "backup" ? "Backup" : "Restore";
            if (row.status === "success") {
              toast.success(`${label} completed successfully.`);
            } else if (row.status === "failed") {
              toast.error(row.statusMessage || `${label} failed.`);
            }
          }
        }

        previousOperationStatusRef.current = nextStatusMap;
        backupOpsLoadedRef.current = true;
      } catch {
        // Footer polling should stay silent.
      }
    };

    pollOperations();
    const handleRefreshRequest = () => {
      pollOperations();
    };
    window.addEventListener("backup-activity-refresh", handleRefreshRequest);
    return () => {
      cancelled = true;
      stopPolling();
      window.removeEventListener("backup-activity-refresh", handleRefreshRequest);
    };
  }, [canManageBackups]);

  const footerTransfer = activeActivity || recentActivity;
  const transferIcon = footerTransfer?.type === TYPE.IMPORT ? Upload : Download;
  const TransferStatusIcon = transferIcon;
  const handleOpenTransferScreen = useCallback(() => {
    if (!footerTransfer?.path) return;
    navigateActiveTab(footerTransfer.path);
    if (!activeActivity) clearRecentActivity();
  }, [activeActivity, clearRecentActivity, footerTransfer, navigateActiveTab]);

  return (
    <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
      {/* Expandable job list */}
      {expanded && recentJobs.length > 0 && (
        <div className="px-3 md:px-6 lg:px-8 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 max-h-32 overflow-auto">
          {recentJobs.map((job) => (
            <React.Fragment key={job.id}>
              <div className="flex items-center justify-between gap-2 py-0.5 text-[10px] md:text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  {job.status === STATUS.PRINTING && (
                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin shrink-0" />
                  )}
                  {job.status === STATUS.QUEUED && (
                    <Printer className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
                  )}
                  {job.status === STATUS.DONE && (
                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                  )}
                  {job.status === STATUS.FAILED && (
                    <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                  )}
                  {job.status === STATUS.CANCELLED && (
                    <X className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
                  )}
                  <span className="truncate text-gray-700 dark:text-gray-300">{job.label}</span>
                  {job.totalCopies > 1 &&
                    (job.status === STATUS.PRINTING || job.status === STATUS.DONE || job.status === STATUS.CANCELLED) && (
                      <span className="text-gray-500 dark:text-gray-400 shrink-0">
                        ({job.completedCopies || 0}/{job.totalCopies} copies)
                      </span>
                    )}
                  {job.error && <span className="text-red-500 truncate">— {job.error}</span>}
                </div>
                {(job.status === STATUS.QUEUED || job.status === STATUS.PRINTING) && (
                  <button
                    type="button"
                    onClick={() => cancelJob(job.id)}
                    className="text-red-500 hover:text-red-700 shrink-0"
                    title="Cancel printing"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {job.totalCopies > 1 && job.status === STATUS.PRINTING && (
                <div className="ml-5 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mb-0.5">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${((job.completedCopies || 0) / job.totalCopies) * 100}%` }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
          {jobs.some((j) => j.status === STATUS.DONE || j.status === STATUS.FAILED || j.status === STATUS.CANCELLED) && (
            <button type="button" onClick={clearFinished} className="text-[10px] text-blue-600 hover:underline mt-0.5">
              Clear finished
            </button>
          )}
        </div>
      )}

      {/* Main footer bar */}
      <div className="flex justify-between items-center px-3 md:px-6 lg:px-8 py-1 text-[10px] md:text-xs text-gray-600 dark:text-gray-400">
        <span>© Vynerix Pvt Ltd.</span>

        <div className="flex items-center gap-3">
          {footerTransfer ? (
            <button
              type="button"
              onClick={handleOpenTransferScreen}
              className="flex items-center gap-1.5 min-w-0 max-w-[360px] hover:opacity-90"
              title={footerTransfer.path ? "Open related screen" : footerTransfer.statusMessage || footerTransfer.label}
            >
              {activeActivity ? (
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin shrink-0" />
              ) : recentActivity?.status === "success" ? (
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
              )}
              <TransferStatusIcon
                className={`w-3 h-3 shrink-0 ${
                  activeActivity
                    ? "text-blue-500"
                    : recentActivity?.status === "success"
                      ? "text-green-500"
                      : "text-red-500"
                }`}
              />
              <span
                className={`truncate ${
                  activeActivity
                    ? "text-blue-600 dark:text-blue-400 font-medium"
                    : recentActivity?.status === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {activeActivity
                  ? `${activeActivity.type === TYPE.IMPORT ? "Import" : "Export"} ${activeActivity.progressPercent}%${activeActivity.statusMessage ? ` - ${activeActivity.statusMessage}` : ""}`
                  : `${recentActivity?.type === TYPE.IMPORT ? "Import" : "Export"} ${recentActivity?.status === "success" ? "completed" : "failed"}${recentActivity?.statusMessage ? ` - ${recentActivity.statusMessage}` : ""}`}
              </span>
            </button>
          ) : null}

          {canManageBackups && (activeOperation || recentOperation) ? (
            <div className="flex items-center gap-1.5 min-w-0 max-w-[320px]">
              {activeOperation ? (
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin shrink-0" />
              ) : recentOperation?.status === "success" ? (
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
              )}
              <span
                className={`truncate ${
                  activeOperation
                    ? "text-blue-600 dark:text-blue-400 font-medium"
                    : recentOperation?.status === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                }`}
                title={
                  activeOperation
                    ? `${activeOperation.type === "backup" ? "Backup" : "Restore"} ${activeOperation.progressPercent}%`
                    : recentOperation?.statusMessage || ""
                }
              >
                {activeOperation
                  ? `${activeOperation.type === "backup" ? "Backup" : "Restore"} ${activeOperation.progressPercent}%${activeOperation.statusMessage ? ` - ${activeOperation.statusMessage}` : ""}`
                  : `${recentOperation?.type === "backup" ? "Backup" : "Restore"} ${recentOperation?.status === "success" ? "completed" : "failed"}`}
              </span>
            </div>
          ) : null}

          {canSwitchStore ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("vx:open-store-switch"))}
              className="flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              title="Switch store"
            >
              <Store className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <span>{activeStoreLabel}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5" title="Active store context">
              <Store className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <span>{activeStoreLabel}</span>
            </span>
          )}

          {subscription?.onTrial ? (
            <Chip
              size="small"
              color="warning"
              onClick={() => window.open(COMPANY_PORTAL_LOGIN_URL, "_blank", "noopener,noreferrer")}
              title={
                subscription.soonestDaysLeft === null || subscription.soonestDaysLeft === undefined
                  ? "Free trial — activate a plan to continue"
                  : `Free trial — ${subscription.soonestDaysLeft} day(s) remaining. Click to view plans.`
              }
              label={`TRIAL${
                subscription.soonestDaysLeft !== null && subscription.soonestDaysLeft !== undefined
                  ? ` · ${subscription.soonestDaysLeft}d`
                  : ""
              }`}
              sx={{ height: 20, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
            />
          ) : subscription?.dueSoon ? (
            <Chip
              size="small"
              color="error"
              onClick={() => window.open(COMPANY_PORTAL_LOGIN_URL, "_blank", "noopener,noreferrer")}
              title={`Subscription due in ${subscription.soonestDaysLeft} day(s). Click to view plans.`}
              label={`DUE · ${subscription.soonestDaysLeft}d`}
              sx={{ height: 20, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
            />
          ) : null}

          <button
            type="button"
            onClick={() => recentJobs.length > 0 && setExpanded((p) => !p)}
            className="flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {hasActiveJobs ? (
              <>
                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {currentJob
                    ? currentJob.totalCopies > 1
                      ? `Printing: ${currentJob.label} — Copy ${currentJob.currentCopy}/${currentJob.totalCopies}`
                      : `Printing: ${currentJob.label}`
                    : "Printing..."}
                </span>
              </>
            ) : connected ? (
              <>
                <Printer className="w-3 h-3 text-green-500" />
                <span className="text-green-600 dark:text-green-400">
                  {printer?.name || "Printer Service Connected"}
                </span>
              </>
            ) : (
              <>
                <Printer className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                <span>No Printer</span>
              </>
            )}
          </button>

          <span>Customer Care <b>+91 123456789</b></span>
        </div>
      </div>
    </div>
  );
};

const MainLayout = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) setMobileOpen((prev) => !prev);
    else setIsExpanded((prev) => !prev);
  }, [isMobile]);

  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);

  return (
    <TransferActivityProvider>
      <TabProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-700">
          {isMobile && mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={closeMobileSidebar}
            />
          )}

          <div
            className={`
              ${isMobile
                ? `fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                  }`
                : "relative shrink-0"
              }
            `}
          >
            <Sidebar
              isExpanded={isMobile ? true : isExpanded}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              onNavigate={closeMobileSidebar}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0 transition-all duration-300 ease-in-out">
            <Navbar sidebarExpanded={isExpanded} isMobile={isMobile} toggleSidebar={toggleSidebar} />
            <TabBar />

            <main
              className="flex-1 overflow-hidden min-h-0"
              data-enter-scope="true"
              onKeyDownCapture={handleEnterKeyNavigation}
            >
              <TabbedWorkspaces />
            </main>

            <PrintStatusFooter />
            {/* Rendered once at the layout level, not per page, so its hourly cycle survives
                navigation instead of restarting on every route change. */}
            <SubscriptionDuePopup />
          </div>
        </div>
      </TabProvider>
    </TransferActivityProvider>
  );
};

export default MainLayout;
