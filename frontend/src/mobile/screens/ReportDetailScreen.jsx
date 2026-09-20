import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TrendingUp, FileText, Wallet, AlertTriangle } from "lucide-react";
import { Box, Typography } from "@mui/material";
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
  emerald: { bg: "#ecfdf5", text: "#047857", icon: "#d1fae5" },
  purple: { bg: "#faf5ff", text: "#7e22ce", icon: "#f3e8ff" },
  cyan: { bg: "#ecfeff", text: "#0e7490", icon: "#cffafe" },
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75, pb: 4 }}>
      {/* Date Filter Pills - hidden for Receivables, which is an all-time balance, not range-based */}
      {reportType !== "receivables" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, bgcolor: "rgba(226,232,240,0.7)", p: 0.5, borderRadius: "16px", width: "fit-content" }}>
          {[
            { id: "today", label: "Today" },
            { id: "week", label: "Week" },
            { id: "month", label: "Month" },
            { id: "year", label: "Year" },
          ].map((tab) => (
            <Box
              component="button"
              key={tab.id}
              type="button"
              onClick={() => setDateRange(tab.id)}
              sx={{
                px: 1.25, py: 0.5, fontSize: 10.5, fontWeight: 700, borderRadius: "12px", transition: "all 0.15s",
                bgcolor: dateRange === tab.id ? "#fff" : "transparent",
                color: dateRange === tab.id ? "#4f46e5" : "#475569",
                boxShadow: dateRange === tab.id ? 1 : "none",
              }}
            >
              {tab.label}
            </Box>
          ))}
        </Box>
      )}

      {/* Headline Card */}
      <Box sx={{ p: 2.5, borderRadius: "16px", bgcolor: colors.bg, border: "1px solid rgba(226,232,240,0.6)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: colors.icon, color: colors.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={18} />
          </Box>
          <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>
            {config.label}
          </Typography>
        </Box>

        <Typography sx={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.375 }}>
          {loading ? "…" : hasData ? money(amount) : "—"}
        </Typography>

        {trend != null && (
          <Box sx={{ mt: 0.75 }}>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, color: trendDirection === "down" ? "#e11d48" : "#059669" }}>
              {trendDirection === "down" ? "↓" : "↑"}
              {trend}% vs previous period
            </Typography>
          </Box>
        )}

        <Typography component="p" sx={{ fontSize: 10.5, color: "#64748b", fontWeight: 500, mt: 1.5, lineHeight: 1.625 }}>
          {config.description}
        </Typography>
      </Box>

      {reportType === "profit_loss" && itemsMissingCost > 0 && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, p: 1.5, borderRadius: "12px", bgcolor: "#fffbeb", border: "1px solid rgba(253,230,138,0.7)" }}>
          <AlertTriangle size={15} style={{ color: "#d97706", flexShrink: 0, marginTop: 2 }} />
          <Typography component="p" sx={{ fontSize: 10.5, color: "#92400e", fontWeight: 600, lineHeight: 1.625, m: 0 }}>
            {itemsMissingCost} sold item{itemsMissingCost === 1 ? "" : "s"} in this range had no recorded
            cost price and could not be included - actual profit may be higher than shown.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
