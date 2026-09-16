import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  HandCoins,
  Receipt,
  ShoppingBag,
  AlertOctagon,
  LayoutGrid,
  BarChart3,
  AlertTriangle,
  Building2,
} from "lucide-react";
import api from "../api/axios";

const formatCurrency = (val) => {
  const num = Number(val || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const QUICK_ACTIONS = [
  { label: "+ Supplier Payment", path: "/finance/supplier-payment", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "Purchase Invoices", path: "/warehouse/purchase-invoice", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "Direct Purchases", path: "/warehouse/direct-purchase", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Purchase Returns", path: "/warehouse/purchase-return", color: "bg-rose-600 hover:bg-rose-700 text-white" },
  { label: "Settlement", path: "/sales/settlement", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
];

const breakdownColors = {
  payables: "red",
  receivables: "blue",
  payments_made: "emerald",
  purchases: "purple",
  credit_sales: "amber",
  refunds_due: "slate",
};
const colorClasses = {
  red: "border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30 text-red-600 dark:text-red-400",
  blue: "border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  emerald: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  purple: "border-purple-200 bg-purple-50/80 dark:border-purple-900/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
  amber: "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  slate: "border-slate-200 bg-slate-50/80 dark:border-gray-700 dark:bg-gray-700/40 text-slate-600 dark:text-gray-400",
};

export default function FinanceDashboardTabPane({ active, fromDate, toDate, companyId }) {
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
      if (fromDate) params.date_from = fromDate;
      if (toDate) params.date_to = toDate;
      if (companyId) params.warehouse_id = companyId;

      const res = await api.get("/finance/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load finance data.");
      }
    } catch (err) {
      console.error("Finance Tab fetch error:", err);
      setError(err.response?.data?.message || "Error communicating with server.");
    } finally {
      setLoading(false);
    }
  }, [active, fromDate, toDate, companyId]);

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
  const topPayables = data?.top_payables || [];
  const recentPayments = data?.recent_payments || [];
  const trendChart = data?.charts?.purchase_payment_trend || [];

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
          onClick={() => navigate("/warehouse/direct-purchase?filter=unpaid")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Payables Outstanding</span>
            <HandCoins className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-red-600 dark:text-red-400">
            {loading ? "..." : formatCurrency(summary.payables_outstanding)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Owed to suppliers
          </div>
        </div>

        <div
          onClick={() => navigate("/sales/pos-sales?filter=credit")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Receivables Outstanding</span>
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-blue-600 dark:text-blue-400">
            {loading ? "..." : formatCurrency(summary.receivables_outstanding)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Owed by credit customers
          </div>
        </div>

        <div
          onClick={() => navigate("/warehouse/direct-purchase")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Purchase Value (Period)</span>
            <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : formatCurrency(summary.purchase_value_range)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Payments made: {formatCurrency(summary.payments_made_range)}
          </div>
        </div>

        <div
          onClick={() => navigate("/warehouse/purchase-return")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Net Position</span>
            <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className={`mt-2 text-2xl font-extrabold ${(summary.net_position || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {loading ? "..." : formatCurrency(summary.net_position)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Refunds due: {formatCurrency(summary.refunds_due)}
          </div>
        </div>
      </div>

      {/* ACTION REQUIRED Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
              Action Required (Payables & Receivables)
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

      {/* Finance Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Finance Breakdown</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(breakdown).map(([key, tile]) => (
            <div
              key={key}
              className={`flex flex-col items-start rounded-lg border p-3 ${colorClasses[breakdownColors[key] || "slate"]}`}
            >
              <span className="text-lg font-extrabold text-slate-900 dark:text-gray-100">
                {loading ? "..." : formatCurrency(tile.amount)}
              </span>
              <span className="text-xs font-semibold">{tile.label}</span>
              {tile.count !== undefined && <span className="text-[11px] text-slate-500 dark:text-gray-400">{tile.count} txns</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Trend Chart & Top Payables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Purchases vs Payments Timeline
            </h3>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1 text-purple-600">
                <span className="h-2 w-2 rounded-full bg-purple-500"></span> Purchases
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Payments
              </span>
            </div>
          </div>
          {trendChart.length > 0 ? (
            <div className="grid grid-cols-7 gap-2 pt-4 overflow-x-auto">
              {trendChart.map((item) => {
                const maxVal = Math.max(...trendChart.map((d) => Math.max(d.purchases || 0, d.payments || 0)), 10);
                const purchaseHeight = Math.min(100, Math.round(((item.purchases || 0) / maxVal) * 100));
                const paymentHeight = Math.min(100, Math.round(((item.payments || 0) / maxVal) * 100));
                return (
                  <div key={item.raw_date} className="flex flex-col items-center gap-1 text-center">
                    <div className="flex h-28 w-full items-end justify-center gap-1 rounded bg-slate-50 p-1 dark:bg-gray-700/40">
                      <div style={{ height: `${purchaseHeight}%` }} className="w-2.5 rounded-t bg-purple-500" title={`Purchases: ${item.purchases}`} />
                      <div style={{ height: `${paymentHeight}%` }} className="w-2.5 rounded-t bg-emerald-500" title={`Payments: ${item.payments}`} />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">{item.date}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">No activity in range</div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Top Outstanding Suppliers</h3>
          </div>
          <div className="space-y-2">
            {topPayables.length > 0 ? (
              topPayables.map((row, idx) => (
                <div key={`${row.supplier_id}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-700/50">
                  <span className="font-medium text-slate-700 dark:text-gray-300">{row.supplier_name}</span>
                  <span className="text-right">
                    <div className="font-bold text-red-600 dark:text-red-400">{formatCurrency(row.outstanding)}</div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400">{row.bills} bills</div>
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">No outstanding payables</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Supplier Payments */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
            <Receipt className="h-4 w-4 text-blue-600" />
            Recent Supplier Payments
          </h3>
          <button
            onClick={() => navigate("/finance/supplier-payment")}
            className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            View all payments
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-2">Payment No</th>
                <th className="pb-2">Supplier</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2 text-center">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {recentPayments.length > 0 ? (
                recentPayments.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                    <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">{row.payment_no}</td>
                    <td className="py-2.5 text-slate-700 dark:text-gray-300">{row.supplier_name}</td>
                    <td className="py-2.5 text-right font-mono">{formatCurrency(row.amount)}</td>
                    <td className="py-2.5 text-center">
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {row.payment_mode || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No supplier payments recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
