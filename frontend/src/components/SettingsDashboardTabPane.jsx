import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import {
  UsersCard,
  SettingsEmployeesCard,
  SettingsStoresCard,
  LastBackupCard,
} from "./dashboard/settings/SettingsKpiSummary";
import SettingsActionRequiredBanner from "./dashboard/settings/SettingsActionRequiredBanner";
import SettingsBreakdown from "./dashboard/settings/SettingsBreakdown";
import SettingsRecentBackupsTable from "./dashboard/settings/SettingsRecentBackupsTable";

const QUICK_ACTIONS = [
  { label: "User Access", path: "/settings/user-access", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "Backup Center", path: "/settings/backup", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { label: "Company Settings", path: "/settings/company", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "Configure Local Server", path: "/settings/configure-local-server", color: "bg-amber-600 hover:bg-amber-700 text-white" },
  { label: "HR Configuration", path: "/hrms/hr-configuration", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Branding", path: "/settings/branding", color: "bg-slate-700 hover:bg-slate-800 text-white" },
];

export default function SettingsDashboardTabPane({ active, companyId, privacyMode }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!active) return;
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (companyId) params.warehouse_id = companyId;

      const res = await api.get("/settings/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load settings data.");
      }
    } catch (err) {
      console.error("Settings Tab fetch error:", err);
      setError(err.response?.data?.message || "Error communicating with server.");
    } finally {
      setLoading(false);
    }
  }, [active, companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};
  const actionRequired = data?.action_required || [];
  const breakdown = data?.breakdown || {};
  const recentBackups = data?.recent_backups || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-users",
        title: "Users",
        component: UsersCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-employees",
        title: "Employees",
        component: SettingsEmployeesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-stores",
        title: "Stores",
        component: SettingsStoresCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-last-backup",
        title: "Last Backup",
        component: LastBackupCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: SettingsActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "breakdown",
        title: "System Overview",
        component: SettingsBreakdown,
        props: { breakdown, loading },
        defaultLayout: { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "recent-backups",
        title: "Recent Backups",
        component: SettingsRecentBackupsTable,
        props: { recentBackups },
        defaultLayout: { x: 4, y: 4, w: 8, h: 4, minW: 4, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, breakdown, recentBackups, privacyMode]
  );

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchData}
          className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Workflows Bar -- a toolbar, not a data widget, so it stays fixed above the grid */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-gray-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
          Quick Actions:
        </span>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.path)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium shadow-sm transition ${action.color}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      <DashboardGrid tabKey="settings" widgets={widgets} />
    </div>
  );
}
