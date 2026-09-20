import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, LayoutGrid, Check, RotateCcw, Eye, EyeOff, Package, Users } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../api/axios";
import { HourlySalesChart, DailyTrendChart } from "../components/DashboardCharts";
import { LeaderboardCard } from "../components/DashboardHighlightCards";
import { DailySalesSummaryTable, SettlementDetailsTable } from "../components/DashboardTables";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import {
  TotalBillsCard,
  SettlementCard,
  EmployeesCard,
  StockValueCard,
} from "../components/dashboard/overview/OverviewKpiGrid";
import OverviewActionRequiredCard from "../components/dashboard/overview/OverviewActionRequiredCard";
import WarehouseDashboardTabPane from "../components/WarehouseDashboardTabPane";
import CrmDashboardTabPane from "../components/CrmDashboardTabPane";
import SalesDashboardTabPane from "../components/SalesDashboardTabPane";
import FinanceDashboardTabPane from "../components/FinanceDashboardTabPane";
import StoreDashboardTabPane from "../components/StoreDashboardTabPane";
import MastersDashboardTabPane from "../components/MastersDashboardTabPane";
import SettingsDashboardTabPane from "../components/SettingsDashboardTabPane";
import AnalyticalDashboardTabPane from "../components/AnalyticalDashboardTabPane";
import useCompanyOptions from "../utils/useCompanyOptions";
import useDashboardRealtime from "../hooks/useDashboardRealtime";
import { DASHBOARD_PAGES } from "../utils/dashboardModuleTabs";
import { USER_ROLE, canAccessPath } from "../utils/accessControl";
import { DashboardLayoutProvider, useDashboardLayout } from "../context/DashboardLayoutContext";
import { Box, Button, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";

const formatYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

// Derived from the same list Page Access grants from, so a tab can never be grantable but unrendered
// (or rendered but ungrantable).
const DASHBOARD_TABS = DASHBOARD_PAGES.map((page) => ({ id: page.id, label: page.name, path: page.path }));

const Dashboard = () => {
  const { editMode, setEditMode, resetLayout } = useDashboardLayout();
  const authUser = useSelector((state) => state.auth.user);
  const role = String(authUser?.role || "").toLowerCase();
  const isSuperAdmin = role === USER_ROLE.SUPER_ADMIN;
  const companyOptions = useCompanyOptions({
    includeAll: isSuperAdmin,
    allLabel: "All Store",
  });

  // Blurs currency/quantity figures across the dashboard for screen-sharing -- persisted so it
  // survives a reload instead of silently re-exposing numbers the user deliberately hid.
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem("dashboardPrivacyMode") === "true");
  useEffect(() => {
    localStorage.setItem("dashboardPrivacyMode", String(privacyMode));
  }, [privacyMode]);

  const [fromDate, setFromDate] = useState(() => formatYmd(startOfMonth(new Date())));
  const [toDate, setToDate] = useState(() => formatYmd(new Date()));
  const [companyId, setCompanyId] = useState(() => (isSuperAdmin ? "" : String(authUser?.company_id || "")));
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [charts, setCharts] = useState(null);
  const [tables, setTables] = useState(null);
  const [actionRequiredItems, setActionRequiredItems] = useState([]);
  const [actionRequiredLoading, setActionRequiredLoading] = useState(true);

  // Tabs the signed-in user may actually see. canAccessPath returns true for everyone not in
  // page-permission mode, so this is a no-op for owners/admins and only narrows a permissioned user.
  const visibleTabs = useMemo(
    () => DASHBOARD_TABS.filter((tab) => canAccessPath(tab.path, authUser)),
    [authUser]
  );

  const [activeTab, setActiveTab] = useState("overview");
  // If Overview itself is not granted, land on the first tab that is, rather than an empty pane.
  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);
  // Every tab's own pane stays mounted (just hidden) once opened, so its fetched data survives
  // switching away and back. This set is only ever how a pane learns it should fetch at all --
  // never re-fetch, that's each pane's own hook's job.
  const [openedTabs, setOpenedTabs] = useState(() => new Set(["overview"]));
  useEffect(() => {
    setOpenedTabs((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab]);

  const lockedCompanyLabel = useMemo(() => {
    if (isSuperAdmin) return "";
    const match = companyOptions.find((row) => row.value === String(authUser?.company_id || ""));
    return match?.label || metrics?.company?.companyLabel || "Company";
  }, [authUser?.company_id, companyOptions, isSuperAdmin, metrics?.company?.companyLabel]);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = {
        from: fromDate,
        to: toDate,
        timezoneOffset: new Date().getTimezoneOffset(),
      };
      if (isSuperAdmin) {
        if (companyId) {
          params.company_id = companyId;
        } else {
          // "All companies" selected: an explicit override so this always reads unrestricted, even
          // if the Navbar's Switch Store has scoped every other request down to one store.
          params.allStores = "true";
        }
      }
      const snapshotRes = await api.get("/dashboard", { params });
      const snapshot = snapshotRes.data?.data || {};
      setMetrics(snapshot.metrics || null);
      setCharts(snapshot.charts || null);
      setTables(snapshot.tables || null);
      if (!silent && Object.keys(snapshot.errors || {}).length > 0) {
        toast.warn("Some dashboard sections could not be loaded.");
      }
    } catch (err) {
      if (!silent) {
        toast.error(err?.response?.data?.message || "Failed to load dashboard");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [companyId, fromDate, isSuperAdmin, toDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Every module tab has its own "Action Required" banner surfacing that module's urgent
  // conditions -- Overview didn't have an equivalent, even though it's the first thing anyone
  // sees. Rather than re-deriving those 40-odd conditions again here, this reuses the same
  // cross-module alert scan the notification bell already runs (see NotificationController),
  // so the two stay in sync automatically instead of drifting into two parallel definitions of
  // "urgent". Kept as its own request, independent of loadDashboard's date/company params --
  // notifications aren't range-scoped -- so it can't add to the main dashboard load's timing.
  const loadActionRequired = useCallback(async () => {
    setActionRequiredLoading(true);
    try {
      const res = await api.get("/notifications", { params: { limit: 8 } });
      setActionRequiredItems(res.data?.data || []);
    } catch {
      // Non-critical widget -- a failed fetch here shouldn't block or warn over the rest of an
      // otherwise-successful dashboard load.
      setActionRequiredItems([]);
    } finally {
      setActionRequiredLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActionRequired();
  }, [loadActionRequired]);

  // Optimistic local update so a clicked item's unread dot clears immediately instead of
  // waiting on a full re-fetch -- the item stays visible (it may still be genuinely unresolved),
  // just no longer marked unread.
  const handleActionRequiredItem = useCallback((id) => {
    setActionRequiredItems((prev) => prev.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item)));
  }, []);

  useDashboardRealtime({
    enabled: Boolean(authUser?.id),
    companyId: isSuperAdmin ? companyId : String(authUser?.company_id || ""),
    onUpdate: loadDashboard,
  });

  const totalBills = metrics?.totalBills || {};
  const settlements = metrics?.settlements || {};
  const employees = metrics?.employees || {};
  const stockValue = metrics?.stockValue || {};

  // Every card below the KPI row -- charts, tables, leaderboards alike -- is the same height,
  // matching Sales Graph/Business Trend/Settlement Details, so the Overview grid reads as one
  // uniform set of cards rather than some being taller or shorter than their neighbors depending
  // on how much data they currently have.
  const BELOW_KPI_ROW_H = 4;

  const overviewWidgets = useMemo(
    () => [
      // Each KPI card is its own grid item (not one bundled "KPI Summary" row) so it can be
      // dragged/resized independently in the layout customizer.
      {
        key: "kpi-total-bills",
        title: "Total Bills",
        component: TotalBillsCard,
        props: { totalBills, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-settlement",
        title: "Settlement",
        component: SettlementCard,
        props: { settlements, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-employees",
        title: "Employees",
        component: EmployeesCard,
        props: { employees, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-stock-value",
        title: "Stock value",
        component: StockValueCard,
        props: { stockValue, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: OverviewActionRequiredCard,
        props: { items: actionRequiredItems, loading: actionRequiredLoading, onItemHandled: handleActionRequiredItem },
        // Every other module tab places its own Action Required banner right after its KPI row
        // (y:0 h:2) at the same h:2 -- matched here so Overview's shifts everything below it down
        // by exactly the same 2 units those tabs already budget for it. The widget itself is
        // omitted entirely (see below) when there's nothing to show, instead of rendering an
        // empty h:2 box, so this stays sized for the common 1-row case rather than padded for
        // the rare 2-row (5-8 item) one -- that rarer case gets an internal scrollbar instead.
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      // Charts/tables/highlights used to be 3 bundled two-card widgets, which meant the two
      // cards inside each (e.g. Sales Graph and Business Trend) could only be dragged, resized,
      // or hidden together. Split into one grid item per card -- so each is independently
      // draggable/removable like every KPI card already is, matching the pattern every other
      // tab's dashboard (Crm/Finance/Sales/...) already uses.
      {
        key: "chart-hourly-sales",
        title: "Sales Graph (Hourly)",
        component: HourlySalesChart,
        props: { chart: charts?.hourlySales, loading, privacyMode },
        defaultLayout: { x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
      },
      {
        key: "chart-daily-trend",
        title: "Business Trend (Daily)",
        component: DailyTrendChart,
        props: { chart: charts?.dailyTrend, loading, privacyMode },
        defaultLayout: { x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
      },
      {
        key: "table-daily-sales-summary",
        title: "Daily Sales Summary",
        component: DailySalesSummaryTable,
        props: { table: tables?.dailySalesSummary, loading, privacyMode },
        defaultLayout: { x: 0, y: 8, w: 6, h: BELOW_KPI_ROW_H, minW: 4, minH: 3 },
      },
      {
        key: "table-settlement-details",
        title: "Settlement Details",
        component: SettlementDetailsTable,
        props: { table: tables?.settlementDetails, loading, privacyMode },
        defaultLayout: { x: 6, y: 8, w: 6, h: BELOW_KPI_ROW_H, minW: 4, minH: 3 },
      },
      {
        key: "highlight-fast-moving-products",
        title: "Fast Moving Products",
        component: LeaderboardCard,
        props: {
          table: tables?.fastMovingSection || tables?.topSellingItems,
          defaultTitle: "Fast Moving Products",
          icon: Package,
          emptyMessage: "No product sales in this range",
          loading,
          privacyMode,
        },
        defaultLayout: { x: 0, y: 8 + BELOW_KPI_ROW_H, w: 6, h: BELOW_KPI_ROW_H, minW: 4, minH: 3 },
      },
      {
        key: "highlight-sales-person-of-the-day",
        title: "Sales Person of the Day",
        component: LeaderboardCard,
        props: {
          table: tables?.salesPersonOfTheDay || tables?.topCustomers,
          defaultTitle: "Sales Person of the Day",
          icon: Users,
          emptyMessage: "No salesman sales in this range",
          loading,
          privacyMode,
        },
        defaultLayout: { x: 6, y: 8 + BELOW_KPI_ROW_H, w: 6, h: BELOW_KPI_ROW_H, minW: 4, minH: 3 },
      },
    ].filter((widget) => {
      // Skip Action Required entirely once we know it's empty, instead of rendering an empty
      // h:2 box -- while it's still loading, keep it (it briefly shows a "Loading..." state
      // rather than popping in after the fetch resolves).
      if (widget.key !== "action-required") return true;
      return actionRequiredLoading || actionRequiredItems.length > 0;
    }),
    [
      totalBills, settlements, employees, stockValue, loading, charts, tables, privacyMode,
      actionRequiredItems, actionRequiredLoading, handleActionRequiredItem,
    ]
  );

  return (
    <Box sx={{ height: "100%", minHeight: 0, overflowY: "auto", bgcolor: "background.default" }}>
      <Stack spacing={3} sx={{ width: "100%", minWidth: 0, px: 2.5, py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "text.primary" }}>
          Dashboard
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Button
            type="button"
            onClick={() => setEditMode((prev) => !prev)}
            variant={editMode ? "contained" : "outlined"}
            startIcon={editMode ? <Check className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            aria-label="Toggle dashboard layout customization"
            sx={editMode
              ? { bgcolor: "#4f46e5", borderColor: "#4f46e5", textTransform: "none", "&:hover": { bgcolor: "#4338ca", borderColor: "#4338ca" } }
              : { textTransform: "none", borderColor: "divider", color: "text.secondary" }}
          >
            {editMode ? "Done Customizing" : "Customize Layout"}
          </Button>
          <Button
            type="button"
            onClick={() => setPrivacyMode((prev) => !prev)}
            variant={privacyMode ? "contained" : "outlined"}
            startIcon={privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            aria-label="Toggle privacy mode (blur amounts)"
            title="Blur bill amounts, stock value, and other figures"
            sx={privacyMode
              ? { bgcolor: "#4f46e5", borderColor: "#4f46e5", textTransform: "none", "&:hover": { bgcolor: "#4338ca", borderColor: "#4338ca" } }
              : { textTransform: "none", borderColor: "divider", color: "text.secondary" }}
          >
            Privacy
          </Button>
          {editMode && (
            <Button
              type="button"
              onClick={() => resetLayout(activeTab)}
              variant="outlined"
              startIcon={<RotateCcw className="h-4 w-4" />}
              aria-label="Reset this tab's layout to default"
              title="Reset this tab's layout to default"
              sx={{ textTransform: "none", borderColor: "divider", color: "text.secondary" }}
            >
              Reset Layout
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              loadDashboard();
              loadActionRequired();
            }}
            disabled={loading}
            variant="outlined"
            startIcon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
            aria-label="Refresh dashboard"
            sx={{ textTransform: "none", borderColor: "divider", color: "text.secondary" }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <Stack spacing={1.5} sx={{ flexDirection: { xs: "column", lg: "row" }, alignItems: { lg: "flex-end" }, justifyContent: { lg: "space-between" } }}>
        <Stack spacing={1.5} sx={{ flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "flex-end" } }}>
          <TextField
            type="date"
            label="From"
            size="small"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            sx={{ minWidth: 160 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            label="To"
            size="small"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            sx={{ minWidth: 160 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>

        <Box sx={{ width: "100%", maxWidth: { lg: 288 } }}>
          {isSuperAdmin ? (
            <TextField
              select
              label="Company"
              size="small"
              fullWidth
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            >
              {companyOptions.map((row) => (
                <MenuItem key={row.value || "all"} value={row.value}>
                  {row.label}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Company"
              size="small"
              fullWidth
              value={lockedCompanyLabel}
              slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
            />
          )}
        </Box>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={(event, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: 14, minHeight: 40, color: "text.secondary" },
            "& .Mui-selected": { color: "#4f46e5 !important" },
            "& .MuiTabs-indicator": { bgcolor: "#4f46e5" },
          }}
        >
          {visibleTabs.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ display: activeTab === "overview" ? "block" : "none" }}>
        <DashboardGrid tabKey="overview" widgets={overviewWidgets} />
      </Box>

      {openedTabs.has("store") && (
        <Box sx={{ display: activeTab === "store" ? "block" : "none" }}>
          <StoreDashboardTabPane
            active={openedTabs.has("store")}
            fromDate={fromDate}
            toDate={toDate}
            privacyMode={privacyMode}
          />
        </Box>
      )}

      {openedTabs.has("warehouse") && (
        <Box sx={{ display: activeTab === "warehouse" ? "block" : "none" }}>
          <WarehouseDashboardTabPane
            active={openedTabs.has("warehouse")}
            fromDate={fromDate}
            toDate={toDate}
            companyId={companyId}
            privacyMode={privacyMode}
          />
        </Box>
      )}

      {openedTabs.has("crm") && (
        <Box sx={{ display: activeTab === "crm" ? "block" : "none" }}>
          <CrmDashboardTabPane
            active={openedTabs.has("crm")}
            fromDate={fromDate}
            toDate={toDate}
            companyId={companyId}
            privacyMode={privacyMode}
          />
        </Box>
      )}

      {openedTabs.has("sales") && (
        <Box sx={{ display: activeTab === "sales" ? "block" : "none" }}>
          <SalesDashboardTabPane
            active={openedTabs.has("sales")}
            fromDate={fromDate}
            toDate={toDate}
            companyId={companyId}
            privacyMode={privacyMode}
          />
        </Box>
      )}

      {openedTabs.has("finance") && (
        <Box sx={{ display: activeTab === "finance" ? "block" : "none" }}>
          <FinanceDashboardTabPane
            active={openedTabs.has("finance")}
            fromDate={fromDate}
            toDate={toDate}
            companyId={companyId}
            privacyMode={privacyMode}
          />
        </Box>
      )}

      {openedTabs.has("masters") && (
        <Box sx={{ display: activeTab === "masters" ? "block" : "none" }}>
          <MastersDashboardTabPane
            active={openedTabs.has("masters")}
            companyId={companyId}
            privacyMode={privacyMode}
          />
        </Box>
      )}

      {openedTabs.has("settings") && (
        <Box sx={{ display: activeTab === "settings" ? "block" : "none" }}>
          <SettingsDashboardTabPane
            active={openedTabs.has("settings")}
            companyId={companyId}
            privacyMode={privacyMode}
          />
        </Box>
      )}

      {openedTabs.has("analytical") && (
        <Box sx={{ display: activeTab === "analytical" ? "block" : "none" }}>
          <AnalyticalDashboardTabPane
            active={openedTabs.has("analytical")}
            fromDate={fromDate}
            toDate={toDate}
            companyId={companyId}
            privacyMode={privacyMode}
          />
        </Box>
      )}
      </Stack>
    </Box>
  );
};

export default function DashboardPage() {
  return (
    <DashboardLayoutProvider>
      <Dashboard />
    </DashboardLayoutProvider>
  );
}
