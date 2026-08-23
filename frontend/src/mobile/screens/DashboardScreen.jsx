import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Plus,
  ChevronRight,
  AlertTriangle,
  FileText,
  CreditCard,
  Users,
} from "lucide-react";
import api from "../../api/axios";
import { setCachedData, getCachedData } from "../offline/db";

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

export default function DashboardScreen({ onNavigate }) {
  const [dateRange, setDateRange] = useState("today"); // 'today' | 'yesterday' | 'week' | 'month'
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [, setSummaryData] = useState(null);
  const [attentionData, setAttentionData] = useState(null);

  // Compute date range dates
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (dateRange === "today") {
      from = now;
      to = now;
    } else if (dateRange === "yesterday") {
      from = new Date(now.setDate(now.getDate() - 1));
      to = from;
    } else if (dateRange === "week") {
      from = new Date(now.setDate(now.getDate() - 7));
      to = new Date();
    } else if (dateRange === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date();
    }

    return { fromDate: formatYmd(from), toDate: formatYmd(to) };
  }, [dateRange]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, summaryRes, purchasesRes, attentionRes] = await Promise.allSettled([
        api.get("/dashboard/overview", {
          params: {
            from: fromDate,
            to: toDate,
            timezoneOffset: new Date().getTimezoneOffset(),
          },
        }),
        api.get("/dashboard/summary"),
        api.get("/direct-purchases", { params: { limit: 10 } }),
        api.get("/dashboard/attention-summary"),
      ]);

      const ov = overviewRes.status === "fulfilled" ? overviewRes.value.data?.data : null;
      const sm = summaryRes.status === "fulfilled" ? summaryRes.value.data?.data : null;
      const pc = purchasesRes.status === "fulfilled" ? purchasesRes.value.data?.data : null;
      const att = attentionRes.status === "fulfilled" ? attentionRes.value.data?.data : null;

      const combined = {
        overview: ov,
        summary: sm,
        purchases: Array.isArray(pc) ? pc : pc?.data || [],
        attention: att,
      };

      setOverviewData(ov);
      setSummaryData(sm);
      setAttentionData(att);

      // Cache locally in IndexedDB for offline viewing
      setCachedData(`dashboard_${dateRange}`, combined);
    } catch {
      // Fallback to IndexedDB cached data
      const cached = await getCachedData(`dashboard_${dateRange}`);
      if (cached) {
        setOverviewData(cached.overview);
        setSummaryData(cached.summary);
        setAttentionData(cached.attention);
      }
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, dateRange]);

  useEffect(() => {
    loadDashboardData();

    const handleRestored = () => loadDashboardData();
    window.addEventListener("vx-network-restored", handleRestored);
    return () => window.removeEventListener("vx-network-restored", handleRestored);
  }, [loadDashboardData]);

  // Extract core metrics from the real /dashboard/overview response shape -
  // the same four cards the desktop Dashboard.jsx renders (Total Bills,
  // Settlement, Employees, Stock value), so mobile and desktop agree on
  // both the numbers and the labels instead of mobile inventing its own
  // "Net Sales"/"Closing Stock" names for the same underlying fields.
  const metrics = overviewData?.metrics || {};

  const hasBillsData = metrics.totalBills != null;
  const totalBillsAmount = Number(metrics.totalBills?.amount ?? 0);
  const totalBillsCount = Number(metrics.totalBills?.count ?? 0);
  const unsettledCount = Number(metrics.totalBills?.unsettledCount ?? 0);
  const billsTrend = metrics.totalBills?.trend?.changePercent ?? null;
  const billsTrendDirection = metrics.totalBills?.trend?.direction ?? null;

  const hasSettlementData = metrics.settlements != null;
  const settlementAmount = Number(metrics.settlements?.amount ?? 0);
  const settlementTrend = metrics.settlements?.trend?.changePercent ?? null;
  const settlementTrendDirection = metrics.settlements?.trend?.direction ?? null;

  const hasEmployeeData = metrics.employees != null;
  const employeesPresent = Number(metrics.employees?.present ?? 0);
  const employeesTotal = Number(metrics.employees?.total ?? 0);

  const hasStockData = metrics.stockValue != null;
  const totalStockVal = Number(metrics.stockValue?.amount ?? 0);
  const stockTrend = metrics.stockValue?.trend?.changePercent ?? null;
  const stockTrendDirection = metrics.stockValue?.trend?.direction ?? null;

  return (
    <div className="space-y-3.5 pb-8">
      {/* ─── 1. Store Header & Date Filter Strip (Zoho / Quanto style) ─── */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-2xl shadow-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-black text-slate-800 tracking-tight">Main Retail Branch</span>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-0.5 bg-slate-200/70 p-1 rounded-2xl">
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Y'day" },
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDateRange(tab.id)}
              className={`px-2 py-0.5 text-[10.5px] font-bold rounded-xl transition-all ${
                dateRange === tab.id
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. 1-Tap Quick Action Bar (Vyapar / Khatabook / GOFRUGAL) ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
        <button
          type="button"
          onClick={() => onNavigate("create_invoice")}
          className="flex flex-col items-center justify-center p-2 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all text-center"
        >
          <Plus size={16} className="mb-0.5" />
          <span className="text-[10.5px] font-bold leading-tight">New Sale</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("purchase")}
          className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-slate-200/90 text-slate-800 shadow-xs hover:bg-slate-50 active:scale-95 transition-all text-center"
        >
          <ShoppingBag size={16} className="mb-0.5 text-indigo-600" />
          <span className="text-[10.5px] font-bold leading-tight">Purchase</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("inventory")}
          className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-slate-200/90 text-slate-800 shadow-xs hover:bg-slate-50 active:scale-95 transition-all text-center"
        >
          <Package size={16} className="mb-0.5 text-purple-600" />
          <span className="text-[10.5px] font-bold leading-tight">Stock</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("reports")}
          className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-slate-200/90 text-slate-800 shadow-xs hover:bg-slate-50 active:scale-95 transition-all text-center"
        >
          <FileText size={16} className="mb-0.5 text-emerald-600" />
          <span className="text-[10.5px] font-bold leading-tight">Reports</span>
        </button>
      </div>

      {/* ─── Needs Attention (Actionable alerts) ─── */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-amber-500 animate-pulse" />
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider m-0">
              Needs Attention
            </h4>
          </div>
          <span className="text-[9.5px] font-bold text-slate-400">Action Required</span>
        </div>

        <div className="space-y-2">
          {/* Item 1: Low Stock Products */}
          <div
            onClick={() => onNavigate("inventory")}
            className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/50 border border-red-100/80 active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[11.5px] font-bold text-slate-700">
                {attentionData?.low_stock ?? 0} Products Low Stock
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </div>

          {/* Item 2: Pending Approvals */}
          <div
            onClick={() => onNavigate("approvals")}
            className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50 border border-blue-100/80 active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[11.5px] font-bold text-slate-700">
                {attentionData?.pending_approvals ?? 0} Pending Approvals
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </div>

          {/* Item 3: Purchase Bills Due */}
          <div
            onClick={() => onNavigate("purchase")}
            className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-100/80 active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11.5px] font-bold text-slate-700">
                {attentionData?.overdue_payables ?? 0} Purchase Bills Due
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* ─── 3. Primary KPI Cards — mirrors desktop Dashboard.jsx's 4 cards exactly ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>

        {/* CARD 1: Total Bills */}
        <div
          onClick={() => onNavigate("sales")}
          className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-white border border-emerald-200/80 shadow-xs active:scale-98 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Total Bills
              </span>
              <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp size={12} />
              </div>
            </div>

            <div className="text-[14px] font-black text-slate-900 tracking-tight leading-snug">
              {hasBillsData ? money(totalBillsAmount) : "—"}
            </div>
          </div>

          {/* Sub-Quantities */}
          <div className="mt-2 pt-1.5 border-t border-emerald-100/70 flex items-center justify-between text-[9.5px] text-slate-600 font-semibold">
            <span>{totalBillsCount} Bills ({unsettledCount} unsettled)</span>
            {billsTrend != null && (
              <span
                className={`font-bold ${
                  billsTrendDirection === "down" ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {billsTrendDirection === "down" ? "↓" : "↑"}
                {billsTrend}%
              </span>
            )}
          </div>
        </div>

        {/* CARD 2: Settlement */}
        <div
          onClick={() => onNavigate("sales")}
          className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 via-white to-white border border-blue-200/80 shadow-xs active:scale-98 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                Settlement
              </span>
              <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                <CreditCard size={12} />
              </div>
            </div>

            <div className="text-[14px] font-black text-slate-900 tracking-tight leading-snug">
              {hasSettlementData ? money(settlementAmount) : "—"}
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-blue-100/70 flex items-center justify-end text-[9.5px] text-slate-600 font-semibold">
            {settlementTrend != null && (
              <span
                className={`font-bold ${
                  settlementTrendDirection === "down" ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {settlementTrendDirection === "down" ? "↓" : "↑"}
                {settlementTrend}%
              </span>
            )}
          </div>
        </div>

        {/* CARD 3: Employees (Present / Total) */}
        <div
          className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-white border border-amber-200/80 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                Employees
              </span>
              <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                <Users size={12} />
              </div>
            </div>

            <div className="text-[14px] font-black text-slate-900 tracking-tight leading-snug">
              {hasEmployeeData ? `${employeesPresent}/${employeesTotal}` : "—"}
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-amber-100/70 text-[9.5px] text-slate-600 font-semibold">
            Present / total
          </div>
        </div>

        {/* CARD 4: Stock value */}
        <div
          onClick={() => onNavigate("inventory")}
          className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 via-white to-white border border-purple-200/80 shadow-xs active:scale-98 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                Stock value
              </span>
              <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                <Package size={12} />
              </div>
            </div>

            <div className="text-[14px] font-black text-slate-900 tracking-tight leading-snug">
              {hasStockData ? money(totalStockVal) : "—"}
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-purple-100/70 flex items-center justify-end text-[9.5px] text-slate-600 font-semibold">
            {stockTrend != null && (
              <span
                className={`font-bold ${
                  stockTrendDirection === "down" ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {stockTrendDirection === "down" ? "↓" : "↑"}
                {stockTrend}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
