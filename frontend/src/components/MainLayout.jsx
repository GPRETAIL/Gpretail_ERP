import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import TabBar from "../components/TabBar";
import { useSelector } from "react-redux";
import { TabProvider, useTabs } from "../context/TabContext";
import { TransferActivityProvider, useTransferActivity } from "../context/TransferActivityContext";
import { handleEnterKeyNavigation } from "../utils/enterToNextField";
import { usePrintContext } from "../context/PrintContext";
import { useSyncStatus } from "../context/SyncStatusContext";
import { Printer, Store, Server, Cloud, X, Loader2, CheckCircle2, AlertCircle, Upload, Download } from "lucide-react";
import { Box, ButtonBase, Chip, Stack, Typography } from "@mui/material";
import SubscriptionDuePopup from "./SubscriptionDuePopup";
import useSubscriptionStatus from "../hooks/useSubscriptionStatus";
import useStoreNameMap, { resolveStoreName } from "../hooks/useStoreNameMap";
import { ProtectedLayoutRouteRenderer } from "../routes/protectedLayoutRoutes";
import { useLocation } from "react-router-dom";
import PrintQueueTray from "./PrintQueueTray";

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

// A job's label is usually a plain string, but jobs whose content gets rendered to an image
// before printing (e.g. barcode sticker sheets, or any receipt routed through the image-render
// path) carry a { kind, jobName, imageDataUrl, ... } object instead - fall back to jobName there.
const getPrintJobLabel = (job) =>
  typeof job?.label === "string" ? job.label : job?.label?.jobName || "Print job";

const PrintStatusFooter = () => {
  const { connected, hasActiveJobs, jobs, currentJob, cancelJob, retryJob, clearFinished, STATUS } =
    usePrintContext();
  const syncStatus = useSyncStatus();
  const { activeActivity, recentActivity, clearRecentActivity, TYPE } = useTransferActivity();
  const { navigateActiveTab } = useTabs();
  const authUser = useSelector((state) => state.auth.user);
  const userRole = String(authUser?.role || "").toLowerCase();

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

  const footerTransfer = activeActivity || recentActivity;
  const transferIcon = footerTransfer?.type === TYPE.IMPORT ? Upload : Download;
  const TransferStatusIcon = transferIcon;
  const handleOpenTransferScreen = useCallback(() => {
    if (!footerTransfer?.path) return;
    navigateActiveTab(footerTransfer.path);
    if (!activeActivity) clearRecentActivity();
  }, [activeActivity, clearRecentActivity, footerTransfer, navigateActiveTab]);

  return (
    <Box sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
      <PrintQueueTray
        open={expanded}
        onClose={() => setExpanded(false)}
        jobs={recentJobs}
        STATUS={STATUS}
        connected={connected}
        onCancel={cancelJob}
        onRetry={retryJob}
        onClearFinished={clearFinished}
      />

      {/* Main footer bar */}
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between", alignItems: "center",
          px: { xs: 1.5, md: 3, lg: 4 }, py: 0.5,
          fontSize: { xs: 10, md: 12 }, color: "text.secondary",
        }}
      >
        <Typography component="span" sx={{ fontSize: "inherit" }}>© Vynerix Pvt Ltd.</Typography>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          {footerTransfer ? (
            <ButtonBase
              onClick={handleOpenTransferScreen}
              title={footerTransfer.path ? "Open related screen" : footerTransfer.statusMessage || footerTransfer.label}
              sx={{
                display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, maxWidth: 360,
                fontSize: "inherit", "&:hover": { opacity: 0.9 },
                color: activeActivity ? "primary.main" : recentActivity?.status === "success" ? "success.main" : "error.main",
              }}
            >
              {activeActivity ? (
                <Loader2 className="w-3 h-3 animate-spin" style={{ flexShrink: 0 }} />
              ) : recentActivity?.status === "success" ? (
                <CheckCircle2 className="w-3 h-3" style={{ flexShrink: 0 }} />
              ) : (
                <AlertCircle className="w-3 h-3" style={{ flexShrink: 0 }} />
              )}
              <TransferStatusIcon className="w-3 h-3" style={{ flexShrink: 0 }} />
              <Typography
                component="span"
                noWrap
                sx={{ fontSize: "inherit", fontWeight: activeActivity ? 600 : 400, color: "inherit" }}
              >
                {activeActivity
                  ? `${activeActivity.type === TYPE.IMPORT ? "Import" : "Export"} ${activeActivity.progressPercent}%${activeActivity.statusMessage ? ` - ${activeActivity.statusMessage}` : ""}`
                  : `${recentActivity?.type === TYPE.IMPORT ? "Import" : "Export"} ${recentActivity?.status === "success" ? "completed" : "failed"}${recentActivity?.statusMessage ? ` - ${recentActivity.statusMessage}` : ""}`}
              </Typography>
            </ButtonBase>
          ) : null}

          {canSwitchStore ? (
            <ButtonBase
              onClick={() => window.dispatchEvent(new CustomEvent("vx:open-store-switch"))}
              title="Switch store"
              sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: "inherit", color: "inherit", "&:hover": { color: "text.primary" } }}
            >
              <Store className="w-3 h-3" style={{ color: "inherit", opacity: 0.7 }} />
              <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>{activeStoreLabel}</Typography>
            </ButtonBase>
          ) : (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }} title="Active store context">
              <Store className="w-3 h-3" style={{ opacity: 0.7 }} />
              <Typography component="span" sx={{ fontSize: "inherit" }}>{activeStoreLabel}</Typography>
            </Stack>
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

          <ButtonBase
            onClick={() => setExpanded((p) => !p)}
            sx={{
              display: "flex", alignItems: "center", gap: 0.75, fontSize: "inherit", color: "inherit",
              "&:hover": { color: "text.primary" },
            }}
          >
            {hasActiveJobs ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: "inherit" }} />
                <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 600, color: "primary.main" }}>
                  {currentJob
                    ? currentJob.totalCopies > 1
                      ? `Printing: ${getPrintJobLabel(currentJob)} — Copy ${currentJob.currentCopy}/${currentJob.totalCopies}`
                      : `Printing: ${getPrintJobLabel(currentJob)}`
                    : "Printing..."}
                </Typography>
              </>
            ) : connected ? (
              <>
                <Box sx={{ color: "success.main", display: "inline-flex" }}>
                  <Printer className="w-3 h-3" />
                </Box>
                <Typography component="span" sx={{ fontSize: "inherit", color: "success.main" }}>
                  Print Service
                </Typography>
              </>
            ) : (
              <>
                <Printer className="w-3 h-3" style={{ opacity: 0.6 }} />
                <Typography component="span" sx={{ fontSize: "inherit" }}>Print Service (Offline)</Typography>
              </>
            )}
          </ButtonBase>

          {syncStatus.enabled ? (
            <ButtonBase
              onClick={() => navigateActiveTab("/settings/configure-local-server")}
              title={
                syncStatus.target === "local"
                  ? "Using this store's local server"
                  : "Local server unreachable — failed over to cloud"
              }
              sx={{
                display: "flex", alignItems: "center", gap: 0.75, fontSize: "inherit", color: "inherit",
                "&:hover": { color: "text.primary" },
              }}
            >
              {syncStatus.target === "local" ? (
                <>
                  <Box sx={{ color: "success.main", display: "inline-flex" }}>
                    <Server className="w-3 h-3" />
                  </Box>
                  <Typography component="span" sx={{ fontSize: "inherit", color: "success.main" }}>Local Server</Typography>
                </>
              ) : (
                <>
                  <Box sx={{ color: "warning.main", display: "inline-flex" }}>
                    <Cloud className="w-3 h-3" />
                  </Box>
                  <Typography component="span" sx={{ fontSize: "inherit", color: "warning.main" }}>Cloud (Local Down)</Typography>
                </>
              )}
              {(syncStatus.outboxPending > 0 || syncStatus.outboxFailed > 0) && (
                <Box
                  component="span"
                  sx={{
                    borderRadius: 10, px: 0.75, fontSize: 10, fontWeight: 600,
                    bgcolor: syncStatus.outboxFailed > 0 ? "error.light" : "action.selected",
                    color: syncStatus.outboxFailed > 0 ? "error.dark" : "text.secondary",
                  }}
                >
                  {syncStatus.outboxFailed > 0 ? syncStatus.outboxFailed : syncStatus.outboxPending}
                </Box>
              )}
            </ButtonBase>
          ) : null}

          <Typography component="span" sx={{ fontSize: "inherit" }}>
            Customer Care <b>+91 123456789</b>
          </Typography>
        </Stack>
      </Stack>
    </Box>
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

  // The shell below (mobile sidebar's fixed/translate-x slide-in, the backdrop, the flex/h-screen
  // scaffolding) is left as plain Tailwind markup rather than converted to MUI -- pure layout and
  // transition mechanics with no card/button/color semantics to gain from the swap, and real
  // regression risk in the sliding-drawer z-index/transition behavior for near-zero visible benefit.
  // Same scope call as FilterableDataTable's native Search button in Stage B2.
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
