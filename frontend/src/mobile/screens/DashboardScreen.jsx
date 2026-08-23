import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Plus,
  ChevronRight,
  AlertTriangle,
  FileText,
  RotateCcw,
  Wallet,
  Sparkles,
} from "lucide-react";
import api from "../../api/axios";
import { setCachedData, getCachedData } from "../offline/db";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Matches the color keys DashboardController::overview() assigns per payment
// method (cash/card/upi/credit/return/discount), same palette the desktop
// Settlement Details table already uses.
const SETTLEMENT_DOT_CLASS = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

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
  const [supplierDues, setSupplierDues] = useState(null);

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
      const [overviewRes, summaryRes, purchasesRes, attentionRes, duesRes] = await Promise.allSettled([
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
        api.get("/supplier-payments/pending", { params: { limit: 1 } }),
      ]);

      const ov = overviewRes.status === "fulfilled" ? overviewRes.value.data?.data : null;
      const sm = summaryRes.status === "fulfilled" ? summaryRes.value.data?.data : null;
      const pc = purchasesRes.status === "fulfilled" ? purchasesRes.value.data?.data : null;
      const att = attentionRes.status === "fulfilled" ? attentionRes.value.data?.data : null;
      const dues = duesRes.status === "fulfilled"
        ? { totalPayable: duesRes.value.data?.totalPayable, count: duesRes.value.data?.total }
        : null;

      const combined = {
        overview: ov,
        summary: sm,
        purchases: Array.isArray(pc) ? pc : pc?.data || [],
        attention: att,
        dues,
      };

      setOverviewData(ov);
      setSummaryData(sm);
      setAttentionData(att);
      setSupplierDues(dues);

      // Cache locally in IndexedDB for offline viewing
      setCachedData(`dashboard_${dateRange}`, combined);
    } catch {
      // Fallback to IndexedDB cached data
      const cached = await getCachedData(`dashboard_${dateRange}`);
      if (cached) {
        setOverviewData(cached.overview);
        setSummaryData(cached.summary);
        setAttentionData(cached.attention);
        setSupplierDues(cached.dues);
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

  // Extract core metrics from the real /dashboard/overview response shape.
  const metrics = overviewData?.metrics || {};
  const tables = overviewData?.tables || {};

  const hasBillsData = metrics.totalBills != null;
  const totalBillsAmount = Number(metrics.totalBills?.amount ?? 0);
  const totalBillsCount = Number(metrics.totalBills?.count ?? 0);
  const unsettledCount = Number(metrics.totalBills?.unsettledCount ?? 0);
  const billsTrend = metrics.totalBills?.trend?.changePercent ?? null;
  const billsTrendDirection = metrics.totalBills?.trend?.direction ?? null;

  const hasStockData = metrics.stockValue != null;
  const totalStockVal = Number(metrics.stockValue?.amount ?? 0);
  const stockTrend = metrics.stockValue?.trend?.changePercent ?? null;
  const stockTrendDirection = metrics.stockValue?.trend?.direction ?? null;

  const hasReturnsData = metrics.returns != null;
  const returnsAmount = Number(metrics.returns?.amount ?? 0);
  const returnsCount = Number(metrics.returns?.count ?? 0);
  const returnsTrend = metrics.returns?.trend?.changePercent ?? null;
  const returnsTrendDirection = metrics.returns?.trend?.direction ?? null;

  const hasDuesData = supplierDues != null;
  const duesAmount = Number(supplierDues?.totalPayable ?? 0);
  const duesCount = Number(supplierDues?.count ?? 0);

  const fastMovingRows = tables.fastMovingSection?.rows || [];
  const settlementRows = tables.settlementDetails?.rows || [];
  const settlementGrandTotal = tables.settlementDetails?.grandTotal ?? null;

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

        {/* CARD 2: Returns */}
        <div
          onClick={() => onNavigate("sales")}
          className="p-3 rounded-2xl bg-gradient-to-br from-rose-500/10 via-white to-white border border-rose-200/80 shadow-xs active:scale-98 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">
                Returns
              </span>
              <div className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
                <RotateCcw size={12} />
              </div>
            </div>

            <div className="text-[14px] font-black text-slate-900 tracking-tight leading-snug">
              {hasReturnsData ? money(returnsAmount) : "—"}
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-rose-100/70 flex items-center justify-between text-[9.5px] text-slate-600 font-semibold">
            <span>{returnsCount} Returns</span>
            {returnsTrend != null && (
              <span
                className={`font-bold ${
                  returnsTrendDirection === "down" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {returnsTrendDirection === "down" ? "↓" : "↑"}
                {returnsTrend}%
              </span>
            )}
          </div>
        </div>

        {/* CARD 3: Stock value */}
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

      {/* ─── Supplier Pending Dues (real data: GET /supplier-payments/pending) ─── */}
      <div
        onClick={() => onNavigate("purchase")}
        className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs active:scale-98 transition-all cursor-pointer flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Wallet size={16} />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider m-0">
              Supplier Dues
            </h4>
            <p className="text-[9.5px] text-slate-500 font-semibold m-0 mt-0.5">
              {hasDuesData ? `${duesCount} bill${duesCount === 1 ? "" : "s"} pending` : "—"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[13px] font-black text-amber-700">
            {hasDuesData ? money(duesAmount) : "—"}
          </span>
        </div>
      </div>

      {/* ─── Fast Moving Products (real data: tables.fastMovingSection) ─── */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Sparkles size={15} className="text-amber-500" />
          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider m-0">
            Fast Moving Products
          </h4>
        </div>

        {fastMovingRows.length > 0 ? (
          <div className="space-y-1.5">
            {fastMovingRows.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-bold text-slate-900 truncate m-0 leading-tight">
                      {item.name}
                    </p>
                    <p className="text-[9.5px] font-semibold text-slate-500 m-0 mt-0.5">
                      Sold: <strong className="text-emerald-600">{Number(item.saleQty).toLocaleString("en-IN")} Pcs</strong>
                    </p>
                  </div>
                </div>
                <div className="text-right pl-2 shrink-0">
                  <p className="text-[11.5px] font-black text-slate-900 m-0">{money(item.value)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10.5px] text-center text-slate-400 py-3">No product sales in this range</p>
        )}
      </div>

      {/* ─── Settlement Details by Mode (real data: tables.settlementDetails) ─── */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Wallet size={15} className="text-indigo-600" />
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider m-0">
              Settlement Details
            </h4>
          </div>
          <span className="text-[9.5px] font-bold text-slate-400">By Mode</span>
        </div>

        {settlementRows.length > 0 ? (
          <div className="space-y-1.5">
            {settlementRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${SETTLEMENT_DOT_CLASS[row.color] || "bg-slate-400"}`} />
                  <span className="text-[11px] font-bold text-slate-700">{row.label}</span>
                </div>
                <span className={`text-[11.5px] font-black ${row.total < 0 ? "text-rose-600" : "text-slate-900"}`}>
                  {row.total < 0 ? "-" : ""}{money(Math.abs(row.total))}
                </span>
              </div>
            ))}
            {settlementGrandTotal != null && (
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
                <span className="text-[11px] font-black text-slate-900 uppercase">Total</span>
                <span className="text-[12.5px] font-black text-indigo-600">{money(settlementGrandTotal)}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10.5px] text-center text-slate-400 py-3">No settlements in this range</p>
        )}
      </div>
    </div>
  );
}
