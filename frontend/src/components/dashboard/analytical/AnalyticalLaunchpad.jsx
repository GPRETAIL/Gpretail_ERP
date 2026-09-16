import React from "react";
import { useNavigate } from "react-router-dom";
import { Compass, ArrowRight } from "lucide-react";

export default function AnalyticalLaunchpad({ quickLinks = [] }) {
  const navigate = useNavigate();

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <Compass className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Analytics Launchpad</h3>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {quickLinks.map((link) => (
          <button
            key={link.path}
            type="button"
            onClick={() => navigate(link.path)}
            className="group flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-700/50 dark:hover:bg-blue-950/30"
          >
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-gray-200">{link.label}</div>
              <div className="text-[11px] text-slate-500 dark:text-gray-400">{link.description}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
          </button>
        ))}
      </div>
    </div>
  );
}
