import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCog,
  Store as StoreIcon,
  DatabaseBackup,
  AlertOctagon,
  LayoutGrid,
  AlertTriangle,
  History,
} from "lucide-react";
import api from "../api/axios";

const wholeNumber = (val) => Number(val || 0).toLocaleString("en-IN");

const QUICK_ACTIONS = [
  { label: "User Access", path: "/settings/user-access", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "Backup Center", path: "/settings/backup-center", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { label: "Company Settings", path: "/settings/company", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "Configure Local Server", path: "/settings/configure-local-server", color: "bg-amber-600 hover:bg-amber-700 text-white" },
  { label: "HR Configuration", path: "/hrms/hr-configuration", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Branding", path: "/settings/branding", color: "bg-slate-700 hover:bg-slate-800 text-white" },
];

const STATUS_COLOR = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

const breakdownColors = {
  users: "blue",
  employees: "indigo",
  departments: "purple",
  stores: "emerald",
  configs: "amber",
  backups: "slate",
};
const colorClasses = {
  blue: "border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  indigo: "border-indigo-200 bg-indigo-50/80 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400",
  purple: "border-purple-200 bg-purple-50/80 dark:border-purple-900/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
  emerald: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  amber: "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  slate: "border-slate-200 bg-slate-50/80 dark:border-gray-700 dark:bg-gray-700/40 text-slate-600 dark:text-gray-400",
};

export default function SettingsDashboardTabPane({ active, companyId }) {
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

  const summary = data?.summary || {};
  const actionRequired = data?.action_required || [];
  const breakdown = data?.breakdown || {};
  const recentBackups = data?.recent_backups || [];

  return (
    <div className="space-y-6">
      {/* Quick Workflows Bar */}
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

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => navigate("/settings/user-access")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Users</span>
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.total_users)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Active: {wholeNumber(summary.active_users)}
          </div>
        </div>

        <div
          onClick={() => navigate("/hrms/employee")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Employees</span>
            <UserCog className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.total_employees)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Active: {wholeNumber(summary.active_employees)}
          </div>
        </div>

        <div
          onClick={() => navigate("/settings/configure-local-server")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Stores</span>
            <StoreIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : wholeNumber(summary.total_stores)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Active: {wholeNumber(summary.active_stores)}
          </div>
        </div>

        <div
          onClick={() => navigate("/settings/backup-center")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Last Backup</span>
            <DatabaseBackup className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-lg font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : (summary.last_backup_at ? new Date(summary.last_backup_at).toLocaleDateString("en-IN") : "Never")}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            {summary.last_backup_size || "-"}
          </div>
        </div>
      </div>

      {/* ACTION REQUIRED Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
              Action Required (Administrative Housekeeping)
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
            Click any card to open the filtered workflow
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {actionRequired.map((item) => {
            const isRed = item.severity === "critical";
            const isOrange = item.severity === "warning";
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(`${item.route}?${item.filter_param}`)}
                className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition hover:scale-[1.02] ${
                  isRed
                    ? "border-red-200 bg-red-50/80 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30"
                    : isOrange
                    ? "border-amber-200 bg-amber-50/80 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30"
                    : "border-blue-200 bg-blue-50/80 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30"
                }`}
              >
                <span className="text-xl font-extrabold text-slate-900 dark:text-gray-100">
                  {loading ? "..." : item.count}
                </span>
                <span className="mt-1 text-xs font-semibold text-slate-700 dark:text-gray-300">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Overview & Recent Backups */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">System Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(breakdown).map(([key, tile]) => (
              <div
                key={key}
                className={`flex flex-col items-start rounded-lg border p-3 ${colorClasses[breakdownColors[key] || "slate"]}`}
              >
                <span className="text-lg font-extrabold text-slate-900 dark:text-gray-100">
                  {loading ? "..." : wholeNumber(tile.count)}
                </span>
                <span className="text-xs font-semibold">{tile.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
              <History className="h-4 w-4 text-blue-600" />
              Recent Backups
            </h3>
            <button
              onClick={() => navigate("/settings/backup-center")}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Open Backup Center
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-2">File</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Size</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 text-right">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {recentBackups.length > 0 ? (
                  recentBackups.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                      <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200 truncate max-w-[200px]" title={row.file_name}>
                        {row.file_name}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-gray-400 uppercase">{row.backup_type}</td>
                      <td className="py-2.5 text-right font-mono">{row.file_size_label || "-"}</td>
                      <td className="py-2.5 text-center">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLOR[row.status] || "bg-slate-100 text-slate-600"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-500 dark:text-gray-400">
                        {row.completed_at ? new Date(row.completed_at).toLocaleDateString("en-IN") : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No backups recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
