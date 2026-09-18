import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCog, Store as StoreIcon, DatabaseBackup } from "lucide-react";
import { wholeNumber } from "../../../utils/dashboardFormatters";

// Four separate widgets (not one bundled row) so DashboardGrid can drag/resize each KPI card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurClass = (privacyMode) => (privacyMode ? "blur-sm select-none" : "");

export function UsersCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/settings/user-access")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Users</span>
        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : wholeNumber(summary.total_users)}
      </div>
      <div className={`mt-1 text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>Active: {wholeNumber(summary.active_users)}</div>
    </div>
  );
}

export function SettingsEmployeesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/hrms/employee")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Employees</span>
        <UserCog className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : wholeNumber(summary.total_employees)}
      </div>
      <div className={`mt-1 text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>
        Active: {wholeNumber(summary.active_employees)}
      </div>
    </div>
  );
}

export function SettingsStoresCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/settings/configure-local-server")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Stores</span>
        <StoreIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className={`mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : wholeNumber(summary.total_stores)}
      </div>
      <div className={`mt-1 text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>Active: {wholeNumber(summary.active_stores)}</div>
    </div>
  );
}

export function LastBackupCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate("/settings/backup")}
      className="group h-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
        <span className="text-xs font-bold uppercase tracking-wider">Last Backup</span>
        <DatabaseBackup className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className={`mt-2 text-lg font-extrabold text-slate-900 dark:text-gray-100 ${blurClass(privacyMode)}`}>
        {loading ? "..." : summary.last_backup_at ? new Date(summary.last_backup_at).toLocaleDateString("en-IN") : "Never"}
      </div>
      <div className={`mt-1 text-xs text-slate-500 dark:text-gray-400 ${blurClass(privacyMode)}`}>{summary.last_backup_size || "-"}</div>
    </div>
  );
}
