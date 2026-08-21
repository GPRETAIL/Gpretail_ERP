import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../api/axios";
import DashboardCharts from "../components/DashboardCharts";
import DashboardHighlightCards from "../components/DashboardHighlightCards";
import DashboardTables, { DailySalesSummaryTable } from "../components/DashboardTables";
import DashboardPlaceholder from "../components/DashboardPlaceholder";
import ModuleStatCards, { MetricCard } from "../components/DashboardStatCards";
import WarehouseDashboardTabPane from "../components/WarehouseDashboardTabPane";
import CrmDashboardTabPane from "../components/CrmDashboardTabPane";
import useCompanyOptions from "../utils/useCompanyOptions";
import useDashboardRealtime from "../hooks/useDashboardRealtime";
import useModuleDashboardSummary from "../hooks/useModuleDashboardSummary";
import { DASHBOARD_PAGES, MODULE_TABS, currency } from "../utils/dashboardModuleTabs";
import { USER_ROLE, canAccessPath } from "../utils/accessControl";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

// One module tab's content: fetches its own dashboard-summary once it's first opened (`active`),
// then keeps showing what it fetched even after the tab is switched away and back, since this
// component is never unmounted -- only hidden -- by the parent (see the `hidden` wrapper below).
const ModuleTabPane = ({ tab, active }) => {
  const { data, loading, error } = useModuleDashboardSummary(tab.endpoint, { active });

  if (error) {
    return (
      <DashboardPlaceholder
        title={`${tab.label} data unavailable`}
        description={error}
      />
    );
  }

  return <ModuleStatCards cards={tab.mapToCards(data || {})} loading={loading && !data} />;
};

const ANALYTICS_FORMATTERS = {
  percent: (value) => `${Number(value || 0).toFixed(1)}%`,
  currency: (value) => currency(value),
  multiple: (value) => `${Number(value || 0).toFixed(2)}x`,
};

// "Analytical" tab -- reuses the vx-sales analytics endpoint the old (removed) Overview
// "Analytics" section used to read from. Server response is pre-shaped per card
// ({title, subtitle, value, valueType, trend}), so this only needs to format + render it.
const AnalyticalTabPane = ({ active }) => {
  const { data, loading, error } = useModuleDashboardSummary("/dashboard/analytics", { active });
  const cards = data?.cards || [];

  if (error) {
    return <DashboardPlaceholder title="Analytical data unavailable" description={error} />;
  }

  if (loading && !data) {
    return <ModuleStatCards cards={[]} loading />;
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <MetricCard
          key={card.key}
          eyebrow={card.title}
          value={(ANALYTICS_FORMATTERS[card.valueType] || String)(card.value)}
          subtitle={card.subtitle}
          trend={card.trend}
        />
      ))}
    </div>
  );
};

// Derived from the same list Page Access grants from, so a tab can never be grantable but unrendered
// (or rendered but ungrantable).
const DASHBOARD_TABS = DASHBOARD_PAGES.map((page) => ({ id: page.id, label: page.name, path: page.path }));

const Dashboard = () => {
  const authUser = useSelector((state) => state.auth.user);
  const role = String(authUser?.role || "").toLowerCase();
  const isSuperAdmin = role === USER_ROLE.SUPER_ADMIN;
  const companyOptions = useCompanyOptions({
    includeAll: isSuperAdmin,
    allLabel: "All Store",
  });

  const [fromDate, setFromDate] = useState(() => formatYmd(startOfMonth(new Date())));
  const [toDate, setToDate] = useState(() => formatYmd(new Date()));
  const [companyId, setCompanyId] = useState(() => (isSuperAdmin ? "" : String(authUser?.company_id || "")));
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [charts, setCharts] = useState(null);
  const [tables, setTables] = useState(null);

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

  useDashboardRealtime({
    enabled: Boolean(authUser?.id),
    companyId: isSuperAdmin ? companyId : String(authUser?.company_id || ""),
    onUpdate: loadDashboard,
  });

  const totalBills = metrics?.totalBills || {};
  const settlements = metrics?.settlements || {};
  const employees = metrics?.employees || {};
  const stockValue = metrics?.stockValue || {};

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="w-full min-w-0 space-y-6 px-9 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Dashboard</h1>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-sm border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 min-w-[160px] rounded-sm border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 min-w-[160px] rounded-sm border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 px-3 text-sm"
            />
          </div>
        </div>

        <div className="w-full lg:w-72">
          <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">Company</label>
          {isSuperAdmin ? (
            <select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="h-10 w-full rounded-sm border border-slate-300 dark:border-gray-600 px-3 text-sm bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100"
            >
              {companyOptions.map((row) => (
                <option key={row.value || "all"} value={row.value}>
                  {row.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="h-10 flex items-center rounded-sm border border-slate-300 dark:border-gray-600 px-3 text-sm bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-300">
              {lockedCompanyLabel}
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-1">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={activeTab === "overview" ? "space-y-6" : "hidden"}>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            eyebrow="Total Bills"
            title="Total bill amount"
            value={loading ? "..." : formatMoney(totalBills.amount)}
            subtitle={
              loading
                ? "..."
                : `${totalBills.count || 0} Bills (${totalBills.unsettledCount || 0} UNSETTLED)`
            }
            trend={totalBills.trend}
          />
          <MetricCard
            eyebrow="Settlement"
            title="Total settlement amount"
            value={loading ? "..." : formatMoney(settlements.amount)}
            trend={settlements.trend}
          />
          <MetricCard
            eyebrow="Employees"
            value={loading ? "..." : `${employees.present || 0}/${employees.total || 0}`}
            valueSubheading="Present / total"
          />
          <MetricCard
            eyebrow="Stock value"
            title="Total stock value"
            value={loading ? "..." : formatMoney(stockValue.amount)}
            trend={stockValue.trend}
          />
        </div>

        <DashboardCharts charts={charts} loading={loading} />
        <DashboardTables tables={tables} loading={loading} />
        <DashboardHighlightCards tables={tables} loading={loading} />
      </div>

      {openedTabs.has("store") && (
        <div className={activeTab === "store" ? "" : "hidden"}>
          <DailySalesSummaryTable table={tables?.dailySalesSummary} loading={loading} />
        </div>
      )}

      {openedTabs.has("warehouse") && (
        <div className={activeTab === "warehouse" ? "" : "hidden"}>
          <WarehouseDashboardTabPane
            active={openedTabs.has("warehouse")}
            fromDate={fromDate}
            toDate={toDate}
            companyId={companyId}
          />
        </div>
      )}

      {openedTabs.has("crm") && (
        <div className={activeTab === "crm" ? "" : "hidden"}>
          <CrmDashboardTabPane
            active={openedTabs.has("crm")}
            fromDate={fromDate}
            toDate={toDate}
            companyId={companyId}
          />
        </div>
      )}

      {openedTabs.has("analytical") && (
        <div className={activeTab === "analytical" ? "" : "hidden"}>
          <AnalyticalTabPane active={openedTabs.has("analytical")} />
        </div>
      )}

      {MODULE_TABS.map((tab) =>
        openedTabs.has(tab.id) ? (
          <div key={tab.id} className={activeTab === tab.id ? "" : "hidden"}>
            <ModuleTabPane tab={tab} active={openedTabs.has(tab.id)} />
          </div>
        ) : null
      )}
      </div>
    </div>
  );
};

export default Dashboard;
