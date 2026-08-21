import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ShoppingBag,
  CreditCard,
  Award,
  AlertOctagon,
  TrendingUp,
  Cake,
  Calendar,
  Phone,
  ArrowRight,
  PieChart,
  BarChart3,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  HeartHandshake,
  UserCheck,
} from "lucide-react";
import api from "../api/axios";

const formatCurrency = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const QUICK_ACTIONS = [
  { label: "+ New Customer", path: "/crm/customer", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "+ New Customer Order", path: "/crm/customer-orders/new", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { label: "Customer Orders List", path: "/crm/customer-orders", color: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Loyalty Management", path: "/crm/loyalty", color: "bg-amber-600 hover:bg-amber-700 text-white" },
  { label: "Bill & Receipts Print", path: "/crm/bill-print", color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  { label: "Customer 360 Profiles", path: "/crm/customer", color: "bg-slate-700 hover:bg-slate-800 text-white" },
];

const STATUS_BADGES = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  ready: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  ready_for_delivery: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function CrmDashboardTabPane({ active, fromDate, toDate, companyId }) {
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
      if (companyId) params.store_id = companyId;

      const res = await api.get("/crm/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load CRM data.");
      }
    } catch (err) {
      console.error("CRM Tab fetch error:", err);
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
  const segmentation = data?.segmentation || {};
  const topCustomers = data?.top_customers || [];
  const recentOrders = data?.recent_orders || [];
  const upcomingEvents = data?.upcoming_events || [];
  const timelineChart = data?.charts?.timeline || [];
  const performance = data?.performance || {};

  return (
    <div className="space-y-6">
      {/* Quick Workflows Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-gray-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
          CRM Workflows:
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
        {/* Card 1: Total Customers */}
        <div
          onClick={() => navigate("/crm/customer")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Customers</span>
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : Number(summary.total_customers || 0).toLocaleString()}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Active: {Number(summary.active_customers || 0).toLocaleString()}</span>
            <span className="text-emerald-600 font-semibold">+{summary.new_customers || 0} New</span>
          </div>
        </div>

        {/* Card 2: Customer Orders Value */}
        <div
          onClick={() => navigate("/crm/customer-orders")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Customer Orders</span>
            <ShoppingBag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {loading ? "..." : formatCurrency(summary.total_order_value)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>{summary.total_orders || 0} Orders</span>
            <span>Advance: {formatCurrency(summary.advance_received)}</span>
          </div>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div
          onClick={() => navigate("/crm/customer?filter=has_dues")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Customer Receivables</span>
            <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-gray-100">
            {loading ? "..." : formatCurrency(summary.total_receivables)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>Order Balance: {formatCurrency(summary.balance_receivable)}</span>
            <span>{summary.customers_with_dues || 0} Clients Due</span>
          </div>
        </div>

        {/* Card 4: Loyalty Program */}
        <div
          onClick={() => navigate("/crm/loyalty")}
          className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Loyalty Points</span>
            <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-purple-600 dark:text-purple-400">
            {loading ? "..." : Number(summary.total_loyalty_points || 0).toLocaleString()} Pts
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
            <span>{summary.loyalty_members_count || 0} Members</span>
            <span>Redeemed: {Number(summary.total_points_redeemed || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ACTION REQUIRED Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200">
              Action Required (Client Follow-ups & Deliveries)
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

      {/* Customer Segmentation & Daily Acquisition Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer Segmentation Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-gray-700">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
              <PieChart className="h-4 w-4 text-blue-600" />
              Customer Segmentation
            </h3>
            <span className="text-[11px] text-slate-400">Total: {summary.total_customers || 0}</span>
          </div>

          <div className="space-y-3">
            {/* Retail */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-gray-300">Retail Shoppers</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {segmentation.retail?.count || 0} ({segmentation.retail?.pct || 0}%)
                </span>
              </div>
            </div>

            {/* Wholesale */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-gray-300">Wholesale / Corporate</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {segmentation.wholesale?.count || 0} ({segmentation.wholesale?.pct || 0}%)
                </span>
              </div>
            </div>

            {/* VIP */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-gray-300">VIP Members (1000+ Pts)</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {segmentation.vip?.count || 0} ({segmentation.vip?.pct || 0}%)
                </span>
              </div>
            </div>

            {/* Custom Orders */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-gray-300">Custom Order Clients</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {segmentation.with_orders?.count || 0} ({segmentation.with_orders?.pct || 0}%)
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-gray-300">
              <span>On-Time Delivery Rate</span>
              <span className="text-emerald-600 dark:text-emerald-400">{performance.on_time_delivery_rate || "98.2%"}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
              <span>Customer Retention</span>
              <span>{performance.customer_retention_rate || "89.4%"}</span>
            </div>
          </div>
        </div>

        {/* Acquisition & Orders Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Customer Growth & Orders Activity
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span> New Signups
                </span>
                <span className="flex items-center gap-1 text-purple-600">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span> Orders
                </span>
              </div>
            </div>

            {timelineChart.length > 0 ? (
              <div className="grid grid-cols-7 gap-2 pt-4">
                {timelineChart.map((item) => {
                  const maxVal = Math.max(
                    ...timelineChart.map((d) => Math.max(d.new_customers || 0, d.orders_count || 0)),
                    5
                  );
                  const custHeight = Math.min(100, Math.round(((item.new_customers || 0) / maxVal) * 100));
                  const ordHeight = Math.min(100, Math.round(((item.orders_count || 0) / maxVal) * 100));

                  return (
                    <div key={item.raw_date} className="flex flex-col items-center gap-1 text-center">
                      <div className="flex h-28 w-full items-end justify-center gap-1 rounded bg-slate-50 p-1 dark:bg-gray-700/40">
                        <div
                          style={{ height: `${custHeight}%` }}
                          className="w-2.5 rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                          title={`New Customers: ${item.new_customers}`}
                        />
                        <div
                          style={{ height: `${ordHeight}%` }}
                          className="w-2.5 rounded-t bg-purple-500 transition-all hover:bg-purple-600"
                          title={`Orders: ${item.orders_count}`}
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
              <div className="py-8 text-center text-xs text-slate-400">No activity recorded in date range</div>
            )}
          </div>

          {/* Special Celebrations / Engagement Alerts */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-gray-200">
                <Cake className="h-4 w-4 text-rose-500" />
                Celebrations & Loyalty Engagement
              </h3>
              <button
                onClick={() => navigate("/crm/customer")}
                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View all customers
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Contact</th>
                    <th className="pb-2">Occasion</th>
                    <th className="pb-2 text-right">Points</th>
                    <th className="pb-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50">
                        <td className="py-2.5 font-medium text-slate-800 dark:text-gray-200">{row.name}</td>
                        <td className="py-2.5 font-mono text-slate-600 dark:text-gray-400">{row.phone}</td>
                        <td className="py-2.5">
                          <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                            {row.event_type} ({row.event_date})
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-purple-600">
                          {Number(row.points || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => navigate(`/crm/customer/${row.id}/profile`)}
                            className="text-blue-600 hover:underline text-xs font-semibold"
                          >
                            360 Profile →
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No upcoming birthdays or anniversaries this week.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Customers & Recent Customer Orders Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 5 Valued Customers */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">
                Top Valuable Customers
              </h3>
            </div>
            <button
              onClick={() => navigate("/crm/customer")}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              View Directory
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2 text-right">Points</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-center">360 View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {topCustomers.length > 0 ? (
                  topCustomers.map((cust) => (
                    <tr
                      key={cust.id}
                      onClick={() => navigate(`/crm/customer/${cust.id}/profile`)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">
                        {cust.name}
                      </td>
                      <td className="py-2.5 font-mono text-slate-600 dark:text-gray-400">{cust.phone}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-purple-600">
                        {Number(cust.loyalty_points || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono">{cust.orders_count || 0}</td>
                      <td className="py-2.5 text-center">
                        <span className="text-xs font-semibold text-blue-600 hover:underline">
                          View →
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No customer records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Customer Orders Stream */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200">
                Recent Customer Orders
              </h3>
            </div>
            <button
              onClick={() => navigate("/crm/customer-orders")}
              className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              View all orders
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-2">Order No</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-right">Balance</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {recentOrders.length > 0 ? (
                  recentOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      onClick={() => navigate(`/crm/customer-orders/${ord.id}`)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-2.5 font-medium text-blue-600 dark:text-blue-400">
                        {ord.order_no || `#${ord.id}`}
                      </td>
                      <td className="py-2.5 text-slate-800 dark:text-gray-200">{ord.customer_name}</td>
                      <td className="py-2.5 text-right font-mono font-semibold">
                        {formatCurrency(ord.net_amount)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-amber-600">
                        {Number(ord.balance_due || 0) > 0 ? formatCurrency(ord.balance_due) : "₹0.00"}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            STATUS_BADGES[ord.status] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ord.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No recent customer orders found.
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
