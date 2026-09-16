import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon } from "lucide-react";
import { severityTileClass } from "../../../utils/dashboardFormatters";

export default function SettingsActionRequiredBanner({ actionRequired = [], loading }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
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
        {actionRequired.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(`${item.route}?${item.filter_param}`)}
            className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition hover:scale-[1.02] ${severityTileClass(
              item.severity
            )}`}
          >
            <span className="text-xl font-extrabold text-slate-900 dark:text-gray-100">
              {loading ? "..." : item.count}
            </span>
            <span className="mt-1 text-xs font-semibold text-slate-700 dark:text-gray-300">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
