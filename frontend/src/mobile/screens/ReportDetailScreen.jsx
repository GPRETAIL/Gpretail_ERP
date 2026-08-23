import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TrendingUp, FileText, Wallet, AlertTriangle } from "lucide-react";
import api from "../../api/axios";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// One real metric per report type, all read from the same /dashboard/overview
// response the Dashboard screen already uses - no separate report-specific
// endpoints exist (or are needed) for a single-figure mobile summary.
const REPORT_CONFIG = {
  profit_loss: {
    title: "Profit & Loss",
    icon: TrendingUp,
    color: "emerald",
    metricKey: "profitLoss",
    label: "Gross Profit",
    description: "Sale price minus cost price across items sold in this range.",
  },
  gst: {
    title: "GST Report",
    icon: FileText,
    color: "purple",
    metricKey: "gst",
    label: "Tax Collected",
    description: "Total GST (CGST + SGST combined) collected on sales in this range.",
  },
  receivables: {
    title: "Receivables Report",
    icon: Wallet,
    color: "cyan",
    metricKey: "receivables",
    label: "Customer Credit Balance",
    description: "Total amount currently owed to the store by customers (all-time, not range-based).",
  },
};

const COLOR_CLASSES = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "bg-emerald-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "bg-purple-100" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", icon: "bg-cyan-100" },
};

export default function ReportDetailScreen({ reportType }) {
  const config = REPORT_CONFIG[reportType] || REPORT_CONFIG.profit_loss;
  const Icon = config.icon;
  const colors = COLOR_CLASSES[config.color];

  const [dateRange, setDateRange] = useState("month");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (dateRange === "today") {
      from = now;
      to = now;
    } else if (dateRange === "week") {
      from = new Date(now.setDate(now.getDate() - 7));
      to = new Date();
    } else if (dateRange === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date();
    } else if (dateRange === "year") {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date();
    }

    return { fromDate: formatYmd(from), toDate: formatYmd(to) };
  }, [dateRange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/dashboard/overview", {
        params: { from: fromDate, to: toDate, timezoneOffset: new Date().getTimezoneOffset() },
      });
      setMetrics(res.data?.data?.metrics || null);
    } catch {
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metric = metrics?.[config.metricKey];
  const hasData = metric != null;
  const amount = Number(metric?.amount ?? 0);
  const trend = metric?.trend?.changePercent ?? null;
  const trendDirection = metric?.trend?.direction ?? null;
  const itemsMissingCost = metric?.itemsMissingCost ?? 0;

  return (
    <div className="space-y-3.5 pb-8">
      {/* Date Filter Pills - hidden for Receivables, which is an all-time balance, not range-based */}
      {reportType !== "receivables" && (
        <div className="flex items-center gap-0.5 bg-slate-200/70 p-1 rounded-2xl w-fit">
          {[
            { id: "today", label: "Today" },
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
            { id: "year", label: "Year" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDateRange(tab.id)}
              className={`px-2.5 py-1 text-[10.5px] font-bold rounded-xl transition-all ${
                dateRange === tab.id
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Headline Card */}
      <div className={`p-5 rounded-2xl ${colors.bg} border border-slate-200/60`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-9 h-9 rounded-xl ${colors.icon} ${colors.text} flex items-center justify-center`}>
            <Icon size={18} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            {config.label}
          </span>
        </div>

        <div className="text-[26px] font-black text-slate-900 tracking-tight leading-snug">
          {loading ? "…" : hasData ? money(amount) : "—"}
        </div>

        {trend != null && (
          <div className="mt-1.5">
            <span
              className={`text-[11px] font-bold ${
                trendDirection === "down" ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {trendDirection === "down" ? "↓" : "↑"}
              {trend}% vs previous period
            </span>
          </div>
        )}

        <p className="text-[10.5px] text-slate-500 font-medium mt-3 leading-relaxed">
          {config.description}
        </p>
      </div>

      {reportType === "profit_loss" && itemsMissingCost > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200/70">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10.5px] text-amber-800 font-semibold leading-relaxed m-0">
            {itemsMissingCost} sold item{itemsMissingCost === 1 ? "" : "s"} in this range had no recorded
            cost price and could not be included - actual profit may be higher than shown.
          </p>
        </div>
      )}
    </div>
  );
}
