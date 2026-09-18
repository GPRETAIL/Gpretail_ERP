import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon } from "lucide-react";
import api from "../../../api/axios";

// Types whose underlying condition represents something already gone wrong (a variance found, a
// limit already breached, a run that already failed) rather than something merely approaching a
// deadline -- shown in red instead of amber, same red/amber split every module's own Action
// Required banner already uses for its 'critical' vs 'warning' tiles.
const CRITICAL_TYPE_PATTERN = /OVERDUE|VARIANCE|EXCEEDED|FAILED/;

const timeAgo = (createdAt) => {
  if (!createdAt) return "";
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours >= 1) return `${hours}h ago`;
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  return `${mins}m ago`;
};

export default function OverviewActionRequiredCard({ items = [], loading, onItemHandled }) {
  const navigate = useNavigate();

  const handleClick = async (item) => {
    try {
      if (!item.read_at) await api.post(`/notifications/${item.id}/read`);
    } catch {
      // Navigating still matters even if the read-receipt fails to save.
    } finally {
      onItemHandled?.(item.id);
      if (item.link) navigate(item.link);
    }
  };

  return (
    <div className="h-full rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
            Action Required (All Modules)
          </h2>
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
          Click any item to open it
        </span>
      </div>

      {loading ? (
        <div className="flex h-[100px] items-center justify-center text-sm text-slate-500 dark:text-gray-400">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-[100px] items-center justify-center text-sm text-slate-500 dark:text-gray-400">
          Nothing needs attention right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const critical = CRITICAL_TYPE_PATTERN.test(item.type || "");
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item)}
                className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition hover:scale-[1.02] ${
                  critical
                    ? "border-red-200 bg-red-50/80 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30"
                    : "border-amber-200 bg-amber-50/80 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30"
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">{item.title}</span>
                  {!item.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                </span>
                <span className="line-clamp-2 text-[11px] text-slate-600 dark:text-gray-400">{item.message}</span>
                <span className="mt-auto pt-1 text-[10px] text-slate-400 dark:text-gray-500">
                  {timeAgo(item.created_at)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
