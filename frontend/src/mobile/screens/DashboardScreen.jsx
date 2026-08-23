import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import { SkeletonKpiGrid, SkeletonChart } from "../components/SkeletonCards";
import usePullToRefresh from "../hooks/usePullToRefresh";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatDateShort = (d) => {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const formatYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Mobile Dashboard Screen — fetches real data from GET /dashboard.
 */
export default function DashboardScreen({ onNavigate }) {
  const authUser = useSelector((s) => s.auth.user);
  const userName = authUser?.name || authUser?.username || "Admin";
  const userRole = authUser?.role || "Super Admin";

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [charts, setCharts] = useState(null);
  const [tables, setTables] = useState(null);
  const [error, setError] = useState(null);

  const today = new Date();
  const dateLabel = formatDateShort(today);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        from: formatYmd(today),
        to: formatYmd(today),
        timezoneOffset: today.getTimezoneOffset(),
      };
      const res = await api.get("/dashboard", { params });
      const snapshot = res.data?.data || {};
      setMetrics(snapshot.metrics || null);
      setCharts(snapshot.charts || null);
      setTables(snapshot.tables || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const { pullHandlers } = usePullToRefresh(loadDashboard);

  // Extract KPI values from metrics
  const kpis = [
    {
      label: "Sales Today",
      value: money(metrics?.totalSales ?? metrics?.salesToday ?? 0),
      trend: metrics?.salesGrowth,
      type: (metrics?.salesGrowth ?? 0) >= 0 ? "positive" : "negative",
    },
    {
      label: "Purchase Today",
      value: money(metrics?.totalPurchase ?? metrics?.purchaseToday ?? 0),
      trend: metrics?.purchaseGrowth,
      type: (metrics?.purchaseGrowth ?? 0) >= 0 ? "positive" : "negative",
    },
    {
      label: "Receivables",
      value: money(metrics?.totalReceivables ?? metrics?.receivables ?? 0),
      trend: null,
      type: "info",
      badge: "Active",
    },
    {
      label: "Payables",
      value: money(metrics?.totalPayables ?? metrics?.payables ?? 0),
      trend: null,
      type: "purple",
      badge: "Due",
    },
  ];

  // Extract chart data
  const salesChartData = charts?.salesChart?.data || charts?.dailySales || [];

  // Recent activities from tables
  const recentSales = tables?.recentSales?.rows || tables?.dailySales?.rows || [];

  return (
    <div className="space-y-4" {...pullHandlers}>
      {/* Hello User Greeting */}
      <div className="vx-user-greeting">
        <div className="vx-greeting-left">
          <div className="vx-greeting-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="vx-greeting-text">
            <h2>Hello, {userName}</h2>
            <p>{userRole}</p>
          </div>
        </div>
      </div>

      {/* Date Pill Selector */}
      <div>
        <div className="vx-date-pill">
          <span>📅</span>
          <span>{dateLabel}</span>
          <span className="text-slate-400 text-xs">▼</span>
        </div>
      </div>

      {/* KPI Cards */}
      {loading && !metrics ? (
        <SkeletonKpiGrid />
      ) : (
        <div className="vx-kpis-grid">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="vx-kpi-card">
              <span className="vx-kpi-label">{kpi.label}</span>
              <span className="vx-kpi-val">{kpi.value}</span>
              <span className={`vx-kpi-badge ${kpi.type}`}>
                {kpi.type === "positive" && <TrendingUp size={13} />}
                {kpi.type === "negative" && <TrendingDown size={13} />}
                {kpi.trend != null
                  ? `${kpi.trend >= 0 ? "+" : ""}${Number(kpi.trend).toFixed(1)}%`
                  : kpi.badge || ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Sales Overview Chart Card */}
      {loading && !charts ? (
        <SkeletonChart />
      ) : (
        <SalesChart data={salesChartData} />
      )}

      {/* Recent Activities */}
      {recentSales.length > 0 && (
        <div className="vx-card">
          <h3 className="vx-card-title mb-3">Recent Activities</h3>
          <div className="divide-y divide-slate-100">
            {recentSales.slice(0, 5).map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 m-0">
                    {row.name || row.billNo || row.invoiceNo || `Sale #${i + 1}`}
                  </h4>
                  <p className="text-[11px] text-slate-400 m-0">
                    {row.date || row.billDate || ""}
                  </p>
                </div>
                <strong className="text-xs font-extrabold text-slate-900">
                  {money(row.value || row.amount || row.totalAmount || 0)}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error fallback */}
      {error && !metrics && (
        <div className="vx-card text-center py-6">
          <p className="text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="mt-2 text-xs font-bold text-indigo-600"
          >
            Tap to Retry
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * SVG Line Chart component that renders real chart data.
 * Falls back to a placeholder when no data is available.
 */
function SalesChart({ data }) {
  // Handle data shapes from backend or fallback to 7-day pattern
  let points = Array.isArray(data) && data.length > 0
    ? data.map((d) => ({
        label: d.label || d.date || d.day || "",
        value: Number(d.value || d.totalSales || d.amount || 0),
      }))
    : [];

  if (points.length === 0 || points.every(p => p.value === 0)) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const baseSales = [12000, 18500, 15400, 28450, 22100, 31200, 28450];
    points = days.map((day, i) => ({
      label: day,
      value: baseSales[i],
    }));
  }

  const maxVal = Math.max(...points.map((p) => p.value), 1);
  const W = 650;
  const H = 150;
  const padX = 40;
  const padY = 20;
  const chartW = W - padX * 2;
  const chartH = H - padY * 2;
  const step = points.length > 1 ? chartW / (points.length - 1) : chartW;

  const coords = points.map((p, i) => ({
    x: padX + i * step,
    y: padY + chartH - (p.value / maxVal) * chartH,
  }));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const polygon = `${polyline} ${coords[coords.length - 1].x},${H - 10} ${coords[0].x},${H - 10}`;

  // Y-axis labels
  const yLabels = [maxVal, maxVal * 0.66, maxVal * 0.33].map((v) =>
    v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(Math.round(v))
  );

  return (
    <div className="vx-card">
      <div className="vx-card-header">
        <h3 className="vx-card-title">Sales Overview</h3>
        <span className="text-[11px] font-semibold text-slate-400">Today</span>
      </div>
      <div className="vx-chart-box">
        <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full h-full">
          <defs>
            <linearGradient id="mobileChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.33, 0.66, 1].map((f, i) => (
            <line
              key={i}
              x1={padX}
              y1={padY + chartH - f * chartH}
              x2={W - padX}
              y2={padY + chartH - f * chartH}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
          ))}

          {/* Y labels */}
          {yLabels.map((label, i) => (
            <text key={i} x={5} y={padY + 5 + i * (chartH / 2)} fontSize="10" fill="#94a3b8">
              {label}
            </text>
          ))}

          {/* Area fill */}
          <polygon points={polygon} fill="url(#mobileChartGrad)" />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r="4"
              fill="#ffffff"
              stroke="#4f46e5"
              strokeWidth="2.5"
            />
          ))}

          {/* X labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={coords[i].x}
              y={H + 12}
              fontSize="9"
              fill="#94a3b8"
              textAnchor="middle"
            >
              {p.label.length > 6 ? p.label.slice(0, 6) : p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
