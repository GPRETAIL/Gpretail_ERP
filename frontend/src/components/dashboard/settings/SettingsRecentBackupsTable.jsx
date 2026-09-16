import React from "react";
import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";

const STATUS_COLOR = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

export default function SettingsRecentBackupsTable({ recentBackups = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
          <History className="h-4 w-4 text-blue-600" />
          Recent Backups
        </h3>
        <button
          onClick={() => navigate("/settings/backup")}
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
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        STATUS_COLOR[row.status] || "bg-slate-100 text-slate-600"
                      }`}
                    >
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
  );
}
