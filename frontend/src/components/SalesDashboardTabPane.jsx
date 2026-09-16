import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Wallet,
  RotateCcw,
  CreditCard,
  AlertOctagon,
  PieChart,
  BarChart3,
  Trophy,
  AlertTriangle,
  Receipt,
  CalendarDays,
  Package,
  Repeat,
  Undo2,
  LayoutGrid,
} from "lucide-react";
import api from "../api/axios";

const formatCurrency = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const QUICK_ACTIONS = [
  { label: "+ New Sale", path: "/sales/pos-sales", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "+ Sales Return", path: "/sales/pos-sales-return", color: "bg-rose-600 hover:bg-rose-700 text-white" },
  { label: "+ Dealer Invoice", path: "/sales/dealer-invoice", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "Sales on Approval", path: "/sales/sales-on-approval", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Cash Opening", path: "/sales/cash-opening", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { label: "Cash Closing", path: "/sales/cash-closing", color: "bg-amber-600 hover:bg-amber-700 text-white" },
  { label: "Settlement", path: "/sales/settlement", color: "bg-slate-700 hover:bg-slate-800 text-white" },
];

const PAYMENT_MODE_COLOR = {
  CASH: "bg-emerald-500",
  CARD: "bg-blue-500",
  UPI: "bg-purple-500",
  CREDIT: "bg-amber-500",
};

export default function SalesDashboardTabPane({ active, fromDate, toDate, companyId }) {
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

      const res = await api.get("/sales/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load sales data.");
      }
    } catch (err) {
      console.error("Sales Tab fetch error:", err);
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
  const transactionBreakdown = data?.transaction_breakdown || {};
  const paymentBreakdown = data?.payment_breakdown || [];
  const topProducts = data?.top_products || [];
  const topSalesPersons = data?.top_sales_persons || [];
  const recentSales = data?.recent_sales || [];
  const performance = data?.performance || {};
  const salesTrendChart = data?.charts?.sales_trend || [];

  const maxPaymentAmount = Math.max(...paymentBreakdown.map((p) => p.amount || 0), 1);

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
        {/* Card 1: Today's Sales */}
        <div
          onClick={() => navigate("/sales/pos-sales")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Sales</span>
            <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : formatCurrency(summary.today_sales_amount)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Bills: {Number(summary.today_bills_count || 0).toLocaleString()}</span>
            <span>Qty: {Number(summary.today_qty_sold || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 2: Period Net Sales */}
        <div
          onClick={() => navigate("/sales/reports")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Net Sales (Period)</span>
            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {loading ? "..." : formatCurrency(summary.net_sales_amount)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Gross: {formatCurrency(summary.range_sales_amount)}</span>
            <span>Bills: {summary.range_bills_count || 0}</span>
          </div>
        </div>

        {/* Card 3: Returns */}
        <div
          onClick={() => navigate("/sales/pos-sales-return")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-rose-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Returns (Period)</span>
            <RotateCcw className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : formatCurrency(summary.returns_amount)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>{summary.returns_count || 0} Returns</span>
            <span>Rate: {performance.return_rate || "0%"}</span>
          </div>
        </div>

        {/* Card 4: Credit Pending */}
        <div
          onClick={() => navigate("/sales/pos-sales?filter=credit")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Credit Pending</span>
            <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {loading ? "..." : formatCurrency(summary.credit_pending_amount)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Ratio: {performance.credit_sales_ratio || "0%"}</span>
            <span>Open Registers: {summary.open_registers_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Secondary KPI Row: Monthly Sales, Invoices, Products Sold */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => navigate("/sales/reports")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Monthly Sales</span>
            <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : formatCurrency(summary.month_sales_amount)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            {summary.month_bills_count || 0} bills this calendar month
          </div>
        </div>

        <div
          onClick={() => navigate("/sales/pos-sales")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Invoices (Period)</span>
            <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : Number(summary.range_bills_count || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            {Number(summary.today_bills_count || 0).toLocaleString()} today
          </div>
        </div>

        <div
          onClick={() => navigate("/sales/reports")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Products Sold (Period)</span>
            <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : Number(summary.distinct_products_sold || 0).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            {Number(summary.range_qty_sold || 0).toLocaleString()} units sold
          </div>
        </div>
      </div>

      {/* ACTION REQUIRED Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
              Action Required (Attention Needed)
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

      {/* Sales Module Breakdown: Sales / Returns / Exchanges / Credit / Refunds */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Sales Module Breakdown</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { key: "sales", label: "Sales", icon: ShoppingCart, color: "blue", route: "/sales/pos-sales" },
            { key: "returns", label: "Returns", icon: RotateCcw, color: "rose", route: "/sales/pos-sales-return" },
            { key: "exchanges", label: "Exchanges", icon: Repeat, color: "purple", route: "/sales/pos-sales-return" },
            { key: "credit", label: "Credit Sales", icon: CreditCard, color: "amber", route: "/sales/pos-sales?filter=credit" },
            { key: "refunds", label: "Refunds", icon: Undo2, color: "slate", route: "/sales/pos-sales-return" },
          ].map((tile) => {
            const stats = transactionBreakdown[tile.key] || { count: 0, amount: 0 };
            const Icon = tile.icon;
            const colorClasses = {
              blue: "border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
              rose: "border-rose-200 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
              purple: "border-purple-200 bg-purple-50/80 dark:border-purple-900/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
              amber: "border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
              slate: "border-slate-200 bg-slate-50/80 dark:border-gray-700 dark:bg-gray-700/40 text-slate-600 dark:text-gray-400",
            };
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => navigate(tile.route)}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition hover:scale-[1.02] ${colorClasses[tile.color]}`}
              >
                <Icon className="h-4 w-4" />
                <span className="mt-2 text-lg font-extrabold text-slate-900 dark:text-gray-100">
                  {loading ? "..." : formatCurrency(stats.amount)}
                </span>
                <span className="text-xs font-semibold">{tile.label}</span>
                <span className="text-[11px] text-slate-500 dark:text-gray-400">{stats.count} txns</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Breakdown & Sales Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Payment Mode Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-gray-700">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
              <PieChart className="h-4 w-4 text-blue-600" />
              Payment Mode Breakdown
            </h3>
          </div>

          <div className="space-y-3">
            {paymentBreakdown.length > 0 ? (
              paymentBreakdown.map((row) => (
                <div key={row.mode} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-gray-300">
                      <span className={`h-2.5 w-2.5 rounded-full ${PAYMENT_MODE_COLOR[row.mode] || "bg-slate-400"}`} />
                      {row.mode}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-gray-100">{formatCurrency(row.amount)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-gray-600">
                    <div
                      className={`h-full rounded-full ${PAYMENT_MODE_COLOR[row.mode] || "bg-slate-400"}`}
                      style={{ width: `${Math.min(100, Math.round(((row.amount || 0) / maxPaymentAmount) * 100))}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">{row.bills} bills</div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">No sales in range</div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-gray-300">
              <span>Avg Basket Value</span>
              <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(performance.avg_basket_value)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
              <span>Discount Rate</span>
              <span>{performance.discount_rate || "0%"}</span>
            </div>
          </div>
        </div>

        {/* Middle & Right: Sales Trend Chart & Top Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales vs Returns Daily Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Sales vs Returns Timeline
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Sales
                </span>
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span> Returns
                </span>
              </div>
            </div>

            {salesTrendChart.length > 0 ? (
              <div className="grid grid-cols-7 gap-2 pt-4 overflow-x-auto">
                {salesTrendChart.map((item) => {
                  const maxVal = Math.max(
                    ...salesTrendChart.map((d) => Math.max(d.sales || 0, d.returns || 0)),
                    10
                  );
                  const salesHeight = Math.min(100, Math.round(((item.sales || 0) / maxVal) * 100));
                  const returnsHeight = Math.min(100, Math.round(((item.returns || 0) / maxVal) * 100));

                  return (
                    <div key={item.raw_date} className="flex flex-col items-center gap-1 text-center">
                      <div className="flex h-28 w-full items-end justify-center gap-1 rounded bg-slate-50 p-1 dark:bg-gray-700/40">
                        <div
                          style={{ height: `${salesHeight}%` }}
                          className="w-2.5 rounded-t bg-emerald-500 transition-all hover:bg-emerald-600"
                          title={`Sales: ${item.sales}`}
                        />
                        <div
                          style={{ height: `${returnsHeight}%` }}
                          className="w-2.5 rounded-t bg-rose-500 transition-all hover:bg-rose-600"
                          title={`Returns: ${item.returns}`}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No sales movements in range</div>
            )}
          </div>

          {/* Top Selling Products */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
                <Trophy className="h-4 w-4 text-blue-600" />
                Top Selling Products
              </h3>
              <button
                onClick={() => navigate("/sales/reports")}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View sales reports
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2">Product</th>
                    <th className="pb-2 text-right">Qty Sold</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {topProducts.length > 0 ? (
                    topProducts.map((row) => (
                      <tr key={row.product_id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                        <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200">{row.product_name}</td>
                        <td className="py-2.5 text-right font-mono font-semibold">
                          {Number(row.qty || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        No product-level sales recorded in range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Top Sales Persons & Recent Sales */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Sales Persons */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">Sales Person Leaderboard</h3>
          </div>
          <div className="space-y-2">
            {topSalesPersons.length > 0 ? (
              topSalesPersons.map((row, idx) => (
                <div
                  key={row.sales_man_name}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-700/50"
                >
                  <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-gray-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {idx + 1}
                    </span>
                    {row.sales_man_name}
                  </span>
                  <span className="text-right">
                    <div className="font-bold text-slate-900 dark:text-gray-100">{formatCurrency(row.amount)}</div>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400">{row.bills} bills</div>
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">No sales-person data in range</div>
            )}
          </div>
        </div>

        {/* Recent Sales Stream */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
              <Receipt className="h-4 w-4 text-blue-600" />
              Recent Sales
            </h3>
            <button
              onClick={() => navigate("/sales/pos-sales")}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              View all sales
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-2">Invoice No</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-center">Payment</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {recentSales.length > 0 ? (
                  recentSales.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate("/sales/pos-sales")}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">{row.invoice_no}</td>
                      <td className="py-2.5 text-slate-700 dark:text-gray-300">{row.customer_name}</td>
                      <td className="py-2.5 text-right font-mono">{formatCurrency(row.grand_total)}</td>
                      <td className="py-2.5 text-center">
                        <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {row.payment_mode || "Cash"}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {row.status || "Completed"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No sales recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
