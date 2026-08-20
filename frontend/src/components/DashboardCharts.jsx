import React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../features/theme-context";

const chartCardClass = "rounded-md border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 min-h-[320px]";

const formatAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

const DISPLAY_SCALES = [
  { threshold: 10000000, divisor: 10000000, label: "Crores" },
  { threshold: 100000, divisor: 100000, label: "Lakhs" },
  { threshold: 1000, divisor: 1000, label: "Thousands" },
  { threshold: 100, divisor: 100, label: "Hundreds" },
];

const getDisplayScale = (maxValue) => {
  const absMax = Math.max(0, Math.abs(Number(maxValue) || 0));
  return DISPLAY_SCALES.find((scale) => absMax >= scale.threshold) || { divisor: 1, label: "" };
};

const buildAxisLabel = (prefix, scale) => (scale.label ? `${prefix} (${scale.label})` : prefix);

const scaleSeriesValue = (value, scale) => round2(toNum(value, 0) / scale.divisor);

const formatScaledValue = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const formatRawAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatRawUnits = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readSalesAmount = (point) =>
  toNum(point?.salesAmount, toNum(point?.salesLakhs, 0) * 100000);

const readUnits = (point) =>
  toNum(point?.units, toNum(point?.unitsCrores, 0) * 10000000);

const buildDailyTrendPoints = (points = []) => {
  const maxSales = Math.max(0, ...points.map((point) => readSalesAmount(point)));
  const maxUnits = Math.max(0, ...points.map((point) => readUnits(point)));
  const salesScale = getDisplayScale(maxSales);
  const unitsScale = getDisplayScale(maxUnits);

  return {
    salesScale,
    unitsScale,
    rows: points.map((point) => {
      const salesAmount = readSalesAmount(point);
      const units = readUnits(point);
      return {
        ...point,
        salesAmount,
        units,
        salesScaled: scaleSeriesValue(salesAmount, salesScale),
        unitsScaled: scaleSeriesValue(units, unitsScale),
      };
    }),
  };
};

const HourlySalesChart = ({ chart, loading }) => {
  const points = chart?.points || [];
  const { theme } = useTheme() || {};
  const isDark = theme === "dark";
  const gridStroke = isDark ? "#374151" : "#e2e8f0";
  const tickColor = isDark ? "#9ca3af" : "#475569";
  const tooltipStyle = isDark
    ? { backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f3f4f6" }
    : undefined;

  return (
    <div className={chartCardClass}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">{chart?.title || "Sales Graph (Hourly)"}</h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
          {chart?.subtitle || "Today's sales performance by hour"}
        </p>
      </div>
      {loading ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-gray-400">Loading chart...</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="hourlyBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} interval={1} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: tickColor }} allowDecimals={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: tickColor }}
              tickFormatter={formatAmount}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                if (name === "salesAmount") return [formatAmount(value), "Sales amount"];
                return [value, "Bills"];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="bills" name="Bills" fill="url(#hourlyBarGradient)" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="salesAmount"
              name="Sales amount"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

const DailyTrendChart = ({ chart, loading }) => {
  const points = chart?.points || [];
  const { rows, salesScale, unitsScale } = buildDailyTrendPoints(points);
  const salesAxisLabel = buildAxisLabel("Sales", salesScale);
  const unitsAxisLabel = buildAxisLabel("Units", unitsScale);
  const salesSeriesLabel = buildAxisLabel("Sales", salesScale);
  const unitsSeriesLabel = buildAxisLabel("Units", unitsScale);
  const { theme } = useTheme() || {};
  const isDark = theme === "dark";
  const gridStroke = isDark ? "#374151" : "#e2e8f0";
  const tickColor = isDark ? "#9ca3af" : "#475569";
  const tooltipStyle = isDark
    ? { backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f3f4f6" }
    : undefined;

  return (
    <div className={chartCardClass}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-gray-100">{chart?.title || "Business Trend (Daily)"}</h2>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
          {chart?.subtitle || "Sales value and units over the last 10 days"}
        </p>
      </div>
      {loading ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-gray-400">Loading chart...</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: tickColor }}
              tickFormatter={formatScaledValue}
              label={{ value: salesAxisLabel, angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: tickColor }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: tickColor }}
              tickFormatter={formatScaledValue}
              label={{ value: unitsAxisLabel, angle: 90, position: "insideRight", offset: 10, fontSize: 11, fill: tickColor }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name, entry) => {
                const payload = entry?.payload || {};
                if (name === salesSeriesLabel || name === "Sales trend") {
                  return [formatRawAmount(payload.salesAmount), name];
                }
                if (name === unitsSeriesLabel) {
                  return [formatRawUnits(payload.units), name];
                }
                return [formatScaledValue(value), name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="salesScaled" name={salesSeriesLabel} fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="unitsScaled" name={unitsSeriesLabel} fill="#fb923c" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="salesScaled"
              name="Sales trend"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

const DashboardCharts = ({ charts, loading }) => (
  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
    <HourlySalesChart chart={charts?.hourlySales} loading={loading} />
    <DailyTrendChart chart={charts?.dailyTrend} loading={loading} />
  </div>
);

export default DashboardCharts;
