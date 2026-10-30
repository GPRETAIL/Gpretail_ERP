import React, { useState, useEffect, useCallback } from "react";
import { ERP_UI } from "../theme/erpUi";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import TabBar from "../components/TabBar";
import { useSelector } from "react-redux";
import { TabProvider, useTabs } from "../context/TabContext";
import { TransferActivityProvider, useTransferActivity } from "../context/TransferActivityContext";
import { handleEnterKeyNavigation } from "../utils/enterToNextField";
import { usePrintContext } from "../context/PrintContext";
import { useSyncStatus } from "../context/SyncStatusContext";
import { Printer, Store, Server, Cloud, X, Loader2, CheckCircle2, AlertCircle, Upload, Download, Headphones } from "lucide-react";
import { Alert, Box, ButtonBase, Chip, Stack, Typography } from "@mui/material";
import { isTenantAdmin, canSwitchStores } from "../utils/accessControl";
import SubscriptionDuePopup from "./SubscriptionDuePopup";
import useSubscriptionStatus from "../hooks/useSubscriptionStatus";
import SubscriptionExpiryBanner from "./SubscriptionExpiryBanner";
import { SubscriptionStatusProvider } from "../context/SubscriptionStatusContext";
import useStoreNameMap, { resolveStoreName } from "../hooks/useStoreNameMap";
import { ProtectedLayoutRouteRenderer } from "../routes/protectedLayoutRoutes";
import { Link, useLocation } from "react-router-dom";
import PrintQueueTray from "./PrintQueueTray";

const MOBILE_BREAKPOINT = 768;

// Plan selection lives entirely on VX-Admin's Company Portal, a separate app/session from this one --
// there is no in-tenant plan picker to route to locally.
const COMPANY_PORTAL_LOGIN_URL = "https://company.gpsoftware.in/login";

const TabbedWorkspaces = () => {
  const { tabs, activeTabId } = useTabs();
  const location = useLocation();
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  if (!activeTab) return null;

  return (
    <Box className="erp-workspace" sx={{ height: "100%", minHeight: 0, overflow: "hidden" }}>
      <ProtectedLayoutRouteRenderer location={location} key={activeTab.id} />
    </Box>
  );
};

// A job's label is usually a plain string, but jobs whose content gets rendered to an image
// before printing (e.g. barcode sticker sheets, or any receipt routed through the image-render
// path) carry a { kind, jobName, imageDataUrl, ... } object instead - fall back to jobName there.
const getPrintJobLabel = (job) =>
  typeof job?.label === "string" ? job.label : job?.label?.jobName || "Print job";

const PrintStatusFooter = () => {
  const { connected, hasActiveJobs, jobs, currentJob, cancelJob, retryJob, browserPrintJob, clearFinished, STATUS } =
    usePrintContext();
  const syncStatus = useSyncStatus();
  const { activeActivity, recentActivity, clearRecentActivity, TYPE } = useTransferActivity();
  const { navigateActiveTab } = useTabs();
  const authUser = useSelector((state) => state.auth.user);
  const userRole = String(authUser?.role || "").toLowerCase();
  const companyPortalUrl = authUser?.subscription_portal_url || COMPANY_PORTAL_LOGIN_URL;

  const canSwitchStore = canSwitchStores(authUser);
  const storeNameMap = useStoreNameMap();
  const activeStoreId = sessionStorage.getItem("activeStoreId") || "";
  // Switchable accounts with no selection are viewing all of their assigned stores.
  const defaultStoreId = canSwitchStore ? "" : String(authUser?.company_id || authUser?.companyId || "");
  const effectiveStoreId = activeStoreId || defaultStoreId;
  const activeStoreLabel = effectiveStoreId ? resolveStoreName(storeNameMap, effectiveStoreId) : "All Stores";
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
        onBrowserPrint={browserPrintJob}
        onClearFinished={clearFinished}
      />

      {/* Main footer bar */}
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between", alignItems: "center",
          px: { xs: 1.5, md: 3, lg: 4 }, py: 0.5,
          fontSize: { xs: 10, md: 12 }, color: "text.secondary",
          minWidth: 0, gap: 2, whiteSpace: "nowrap", overflowX: "auto",
          "& > *": { flexShrink: 0 },
        }}
      >
        <Typography component="span" sx={{ fontSize: "inherit" }}>© Vynerix Pvt Ltd.</Typography>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", "& > *": { flexShrink: 0 }, "& .MuiButtonBase-root": { minHeight: { xs: 32, md: 20 } } }}>
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
                <Loader2 size={12} style={{ flexShrink: 0, animation: "app-spin 1s linear infinite" }} />
              ) : recentActivity?.status === "success" ? (
                <CheckCircle2 size={12} style={{ flexShrink: 0 }} />
              ) : (
                <AlertCircle size={12} style={{ flexShrink: 0 }} />
              )}
              <TransferStatusIcon size={12} style={{ flexShrink: 0 }} />
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
              <Store size={12} style={{ color: "inherit", opacity: 0.7 }} />
              <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>{activeStoreLabel}</Typography>
            </ButtonBase>
          ) : (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }} title="Active store context">
              <Store size={12} style={{ opacity: 0.7 }} />
              <Typography component="span" sx={{ fontSize: "inherit" }}>{activeStoreLabel}</Typography>
            </Stack>
          )}

          {subscription?.onTrial ? (
            <Chip
              size="small"
              color="warning"
              onClick={() => window.open(companyPortalUrl, "_blank", "noopener,noreferrer")}
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
              onClick={() => window.open(companyPortalUrl, "_blank", "noopener,noreferrer")}
              title={subscription.soonestDaysLeft < 0
                ? "Subscription expired. Click to renew."
                : `Subscription due in ${subscription.soonestDaysLeft} day(s). Click to view plans.`}
              label={subscription.soonestDaysLeft < 0 ? "EXPIRED · Renew" : subscription.soonestDaysLeft === 0 ? "DUE · today" : `DUE · ${subscription.soonestDaysLeft}d`}
              sx={{ height: 20, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
            />
          ) : null}

          {isTenantAdmin(authUser) && <ButtonBase component={Link} to="/store-activation" sx={{ fontSize: "inherit", mr: 2 }}>Store Activation</ButtonBase>}
          {["admin", "super_admin"].includes(userRole) && <ButtonBase onClick={() => window.open(companyPortalUrl, "_blank", "noopener,noreferrer")} sx={{ fontSize: "inherit" }}>My Subscription</ButtonBase>}
          <ButtonBase
            onClick={() => setExpanded((p) => !p)}
            sx={{
              display: "flex", alignItems: "center", gap: 0.75, fontSize: "inherit", color: "inherit",
              "&:hover": { color: "text.primary" },
            }}
          >
            {hasActiveJobs ? (
              <>
                <Loader2 size={12} style={{ color: "inherit", animation: "app-spin 1s linear infinite" }} />
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
                  <Printer size={12} />
                </Box>
                <Typography component="span" sx={{ fontSize: "inherit", color: "success.main" }}>
                  Print Service
                </Typography>
              </>
            ) : (
              <>
                <Printer size={12} style={{ opacity: 0.6 }} />
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
                    <Server size={12} />
                  </Box>
                  <Typography component="span" sx={{ fontSize: "inherit", color: "success.main" }}>Local Server</Typography>
                </>
              ) : (
                <>
                  <Box sx={{ color: "warning.main", display: "inline-flex" }}>
                    <Cloud size={12} />
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

          <ButtonBase
            onClick={() => navigateActiveTab("/settings/remote-support")}
            title="Request Instant Remote Screen Share & Technical Assistance"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              fontSize: "inherit",
              fontWeight: 600,
              color: "primary.main",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(59, 130, 246, 0.15)"
                  : "rgba(37, 99, 235, 0.08)",
              px: 1.25,
              py: 0.35,
              borderRadius: "6px",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(59, 130, 246, 0.3)"
                  : "rgba(37, 99, 235, 0.25)",
              "&:hover": {
                bgcolor: "primary.main",
                color: "common.white",
                borderColor: "primary.main",
              },
              transition: "all 0.15s ease",
            }}
          >
            <Headphones size={13} style={{ flexShrink: 0 }} />
            <Typography component="span" sx={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit" }}>
              Help & Support
            </Typography>
          </ButtonBase>

          <Typography component="span" sx={{ fontSize: "inherit" }}>
            Customer Care <b>+91 123456789</b>
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
};

const MainLayout = () => {
  const authUser = useSelector((state) => state.auth.user);
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
    <SubscriptionStatusProvider>
    <TransferActivityProvider>
      <TabProvider>
        <Box className="erp-app-shell" sx={{ "--erp-control-radius": ERP_UI.controlRadius, "--erp-action-height": `${ERP_UI.actionHeight}px`, display: "flex", height: "100dvh", width: "100%", overflow: "hidden", bgcolor: "background.default" }}>
          {isMobile && mobileOpen && (
            <Box
              sx={{ position: "fixed", inset: 0, zIndex: 40, bgcolor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", transition: "opacity 0.15s" }}
              onClick={closeMobileSidebar}
            />
          )}

          <Box
            sx={isMobile
              ? {
                  position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 50,
                  transition: "transform 0.3s ease-in-out",
                  transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
                }
              : { position: "relative", flexShrink: 0 }
            }
          >
            <Sidebar
              isExpanded={isMobile ? true : isExpanded}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              onNavigate={closeMobileSidebar}
            />
          </Box>

          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%", minWidth: 0, transition: "all 0.3s ease-in-out" }}>
            <Navbar sidebarExpanded={isExpanded} isMobile={isMobile} toggleSidebar={toggleSidebar} />
            <TabBar />
            <SubscriptionExpiryBanner />
            {isTenantAdmin(authUser) && authUser?.store_ids?.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 0 }}>
                Tenant Administrator · {authUser.platform_company_code}. No stores are available in this deployment yet.
                Create your stores in Vynerix Admin, then <ButtonBase component={Link} to="/store-activation" sx={{ textDecoration: "underline" }}>refresh and activate stores</ButtonBase>.
                Company management and Settings remain available. Data entry requires an activated store.
              </Alert>
            )}

            <Box
              component="main"
              sx={{ flex: 1, overflow: "hidden", minHeight: 0 }}
              data-enter-scope="true"
              onKeyDownCapture={handleEnterKeyNavigation}
            >
              <TabbedWorkspaces />
            </Box>

            <PrintStatusFooter />
            {/* Rendered once at the layout level, not per page, so its hourly cycle survives
                navigation instead of restarting on every route change. */}
            <SubscriptionDuePopup />
          </Box>
        </Box>
      </TabProvider>
    </TransferActivityProvider>
    </SubscriptionStatusProvider>
  );
};

export default MainLayout;
