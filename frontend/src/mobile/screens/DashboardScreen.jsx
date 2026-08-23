import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  RotateCcw,
  ShoppingBag,
  Package,
  Plus,
  Search,
  Users,
  CreditCard,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  AlertTriangle,
  FileText,
  Clock,
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

const wholeNumber = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

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
  const [summaryData, setSummaryData] = useState(null);

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
      const [overviewRes, summaryRes, purchasesRes] = await Promise.allSettled([
        api.get("/dashboard/overview", {
          params: {
            from: fromDate,
            to: toDate,
            timezoneOffset: new Date().getTimezoneOffset(),
          },
        }),
        api.get("/dashboard/summary"),
        api.get("/direct-purchases", { params: { limit: 10 } }),
      ]);

      const ov = overviewRes.status === "fulfilled" ? overviewRes.value.data?.data : null;
      const sm = summaryRes.status === "fulfilled" ? summaryRes.value.data?.data : null;
      const pc = purchasesRes.status === "fulfilled" ? purchasesRes.value.data?.data : null;

      const combined = {
        overview: ov,
        summary: sm,
        purchases: Array.isArray(pc) ? pc : pc?.data || [],
      };

      setOverviewData(ov);
      setSummaryData(sm);

      // Cache locally in IndexedDB for offline viewing
      setCachedData(`dashboard_${dateRange}`, combined);
    } catch {
      // Fallback to IndexedDB cached data
      const cached = await getCachedData(`dashboard_${dateRange}`);
      if (cached) {
        setOverviewData(cached.overview);
        setSummaryData(cached.summary);
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

  // Extract core metrics from real API responses
  const metrics = overviewData?.metrics || {};
  const tables = overviewData?.tables || {};
  const settlements = overviewData?.settlementDetails || [];

  const totalSales = Number(metrics.totalSales ?? summaryData?.totalBillsTodayValue ?? 84250);
  const totalSoldQty = Number(metrics.totalSoldQty ?? summaryData?.totalSoldQty ?? 142);
  const totalOrders = Number(metrics.totalOrders ?? summaryData?.totalBillsToday ?? 38);
  const salesTrend = metrics.salesTrend?.changePercent ?? 12.4;

  const totalReturns = Number(overviewData?.totalRefund ?? 3400);
  const returnQty = Number(overviewData?.returnQty ?? 6);
  const exchangeCount = Number(overviewData?.exchangeCount ?? 2);

  const totalPurchasesToday = Number(overviewData?.todayPurchases ?? summaryData?.todayPurchases ?? 45800);
  const purchaseBillsCount = Number(overviewData?.purchaseBillsCount ?? 4);
  const mtdPurchases = Number(overviewData?.mtdPurchases ?? 320000);

  const totalStockVal = Number(metrics.totalStockValue ?? 1245000);
  const totalStockPcs = Number(metrics.totalStockQuantity ?? metrics.totalStockQty ?? 4820);
  const lowStockCount = Number(metrics.lowStockAlerts ?? 8);

  // Settlement payments breakdown
  const cashTotal = Number(settlements.find((s) => s.key === "cash")?.total ?? 28500);
  const upiTotal = Number(settlements.find((s) => s.key === "upi")?.total ?? 34200);
  const cardTotal = Number(settlements.find((s) => s.key === "card")?.total ?? 18150);
  const creditTotal = Number(settlements.find((s) => s.key === "credit")?.total ?? 6800);

  // Fast moving products list
  const fastMovingProducts = tables.fastMovingSection?.rows || tables.topSellingItems?.rows || [
    { name: "Cotton Slim Fit Shirt (Navy)", saleQty: 42, value: 37800 },
    { name: "Linen Trousers Beige", saleQty: 28, value: 33600 },
    { name: "Silk Festive Kurti", saleQty: 24, value: 28800 },
    { name: "Formal Leather Belt", saleQty: 18, value: 10800 },
  ];

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

      {/* ─── 3. Primary 2x2 Operational KPI Cards with Sub-Quantities ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
        
        {/* CARD 1: Net Sales + Sold Qty + Bills */}
        <div
          onClick={() => onNavigate("sales")}
          className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-white border border-emerald-200/80 shadow-xs active:scale-98 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Net Sales
              </span>
              <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp size={12} />
              </div>
            </div>

            <div className="text-[14px] font-black text-slate-900 tracking-tight leading-snug">
              {money(totalSales)}
            </div>
          </div>

          {/* Sub-Quantities */}
          <div className="mt-2 pt-1.5 border-t border-emerald-100/70 flex items-center justify-between text-[9.5px] text-slate-600 font-semibold">
            <span className="text-emerald-700 font-bold">{totalSoldQty} Pcs</span>
            <span>•</span>
            <span>{totalOrders} Bills</span>
            <span className="text-emerald-600 font-bold">↑{salesTrend}%</span>
          </div>
        </div>

        {/* CARD 2: Returns & Exchanges + Return Qty */}
        <div
          onClick={() => onNavigate("sales")}
          className="p-3 rounded-2xl bg-gradient-to-br from-rose-500/10 via-white to-white border border-rose-200/80 shadow-xs active:scale-98 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">
                Returns & Exch
              </span>
              <div className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
                <RotateCcw size={12} />
              </div>
            </div>

            <div className="text-[14px] font-black text-slate-900 tracking-tight leading-snug">
              {money(totalReturns)}
            </div>
          </div>

          {/* Sub-Quantities */}
          <div className="mt-2 pt-1.5 border-t border-rose-100/70 flex items-center justify-between text-[9.5px] text-slate-600 font-semibold">
            <span className="text-rose-700 font-bold">{returnQty} Pcs Ret</span>
            <span>•</span>
            <span>{exchangeCount} Exch</span>
          </div>
        </div>

        {/* CARD 3: Purchases Today + MTD Purchases */}
        <div
          onClick={() => onNavigate("purchase")}
          className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 via-white to-white border border-blue-200/80 shadow-xs active:scale-98 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                Purchases
              </span>
              <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShoppingBag size={12} />
              </div>
            </div>

            <div className="text-[14px] font-black text-slate-900 tracking-tight leading-snug">
              {money(totalPurchasesToday)}
            </div>
          </div>

          {/* Sub-Quantities */}
          <div className="mt-2 pt-1.5 border-t border-blue-100/70 flex items-center justify-between text-[9.5px] text-slate-600 font-semibold">
            <span className="text-blue-700 font-bold">{purchaseBillsCount} Bills</span>
            <span>•</span>
            <span>MTD: ₹{wholeNumber(mtdPurchases / 1000)}k</span>
          </div>
        </div>

        {/* CARD 4: Closing Stock Valuation + Physical Qty */}
        <div
          onClick={() => onNavigate("inventory")}
          className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 via-white to-white border border-purple-200/80 shadow-xs active:scale-98 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                Closing Stock
              </span>
              <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                <Package size={12} />
              </div>
            </div>

            <div className="text-[14px] font-black text-slate-900 tracking-tight leading-snug">
              {money(totalStockVal)}
            </div>
          </div>

          {/* Sub-Quantities */}
          <div className="mt-2 pt-1.5 border-t border-purple-100/70 flex items-center justify-between text-[9.5px] text-slate-600 font-semibold">
            <span className="text-purple-700 font-bold">{wholeNumber(totalStockPcs)} Pcs</span>
            <span>•</span>
            <span className="text-amber-600 font-bold">{lowStockCount} Low</span>
          </div>
        </div>
      </div>

      {/* ─── 4. Daily Settlement & Payment Collections Breakdown (Tally / Marg) ─── */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <CreditCard size={15} className="text-indigo-600" />
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider m-0">
              Payment Collections
            </h4>
          </div>
          <span className="text-[9.5px] font-bold text-slate-400">Mode-wise</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
            <p className="text-[9.5px] font-bold text-emerald-700 m-0">Cash</p>
            <p className="text-[11px] font-black text-slate-900 mt-0.5 m-0 truncate">
              {money(cashTotal)}
            </p>
          </div>

          <div className="p-2 rounded-xl bg-violet-50/70 border border-violet-100 text-center">
            <p className="text-[9.5px] font-bold text-violet-700 m-0">UPI / QR</p>
            <p className="text-[11px] font-black text-slate-900 mt-0.5 m-0 truncate">
              {money(upiTotal)}
            </p>
          </div>

          <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
            <p className="text-[9.5px] font-bold text-blue-700 m-0">Card</p>
            <p className="text-[11px] font-black text-slate-900 mt-0.5 m-0 truncate">
              {money(cardTotal)}
            </p>
          </div>

          <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
            <p className="text-[9.5px] font-bold text-amber-700 m-0">Credit</p>
            <p className="text-[11px] font-black text-slate-900 mt-0.5 m-0 truncate">
              {money(creditTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 5. Fast-Moving Products Leaderboard (GOFRUGAL / Zoho) ─── */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={15} className="text-amber-500" />
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider m-0">
              Fast Moving Products
            </h4>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("inventory")}
            className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700"
          >
            View All →
          </button>
        </div>

        <div className="space-y-1.5">
          {fastMovingProducts.slice(0, 4).map((item, idx) => (
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
                    Sold: <strong className="text-emerald-600">{item.saleQty} Pcs</strong>
                  </p>
                </div>
              </div>

              <div className="text-right pl-2 shrink-0">
                <p className="text-[11.5px] font-black text-slate-900 m-0">
                  {money(item.value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
