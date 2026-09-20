import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import {
  PayablesOutstandingCard,
  ReceivablesOutstandingCard,
  PurchaseValueCard,
  NetPositionCard,
} from "./dashboard/finance/FinanceKpiSummary";
import FinanceActionRequiredBanner from "./dashboard/finance/FinanceActionRequiredBanner";
import FinanceBreakdown from "./dashboard/finance/FinanceBreakdown";
import FinanceTrendChart from "./dashboard/finance/FinanceTrendChart";
import FinanceTopPayables from "./dashboard/finance/FinanceTopPayables";
import FinanceRecentPayments from "./dashboard/finance/FinanceRecentPayments";

const QUICK_ACTIONS = [
  { label: "+ Supplier Payment", path: "/finance/supplier-payment", bg: "primary.main", hoverBg: "primary.dark" },
  { label: "Purchase Invoices", path: "/warehouse/purchase-invoice", bg: "#4f46e5", hoverBg: "#4338ca" },
  { label: "Direct Purchases", path: "/warehouse/direct-purchase", bg: "#9333ea", hoverBg: "#7e22ce" },
  { label: "Purchase Returns", path: "/warehouse/purchase-return", bg: "error.main", hoverBg: "error.dark" },
  { label: "Settlement", path: "/sales/settlement", bg: "success.main", hoverBg: "success.dark" },
];

export default function FinanceDashboardTabPane({ active, fromDate, toDate, companyId, privacyMode }) {
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

  const summary = data?.summary || {};
  const actionRequired = data?.action_required || [];
  const breakdown = data?.breakdown || {};
  const topPayables = data?.top_payables || [];
  const recentPayments = data?.recent_payments || [];
  const trendChart = data?.charts?.purchase_payment_trend || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-payables-outstanding",
        title: "Payables Outstanding",
        component: PayablesOutstandingCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-receivables-outstanding",
        title: "Receivables Outstanding",
        component: ReceivablesOutstandingCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-purchase-value",
        title: "Purchase Value",
        component: PurchaseValueCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-net-position",
        title: "Net Position",
        component: NetPositionCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: FinanceActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "breakdown",
        title: "Finance Breakdown",
        component: FinanceBreakdown,
        props: { breakdown, loading },
        defaultLayout: { x: 0, y: 4, w: 12, h: 3, minW: 6, minH: 2 },
      },
      {
        key: "trend-chart",
        title: "Purchases vs Payments",
        component: FinanceTrendChart,
        props: { trendChart },
        defaultLayout: { x: 0, y: 7, w: 8, h: 4, minW: 4, minH: 3 },
      },
      {
        key: "top-payables",
        title: "Top Outstanding Suppliers",
        component: FinanceTopPayables,
        props: { topPayables },
        defaultLayout: { x: 8, y: 7, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "recent-payments",
        title: "Recent Supplier Payments",
        component: FinanceRecentPayments,
        props: { recentPayments },
        defaultLayout: { x: 0, y: 11, w: 12, h: 4, minW: 6, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, breakdown, trendChart, topPayables, recentPayments, privacyMode]
  );

  if (error) {
    return (
      <Stack
        direction="row"
        sx={{
          alignItems: "center", justifyContent: "space-between",
          borderRadius: "10.5px", border: "1px solid", borderColor: "error.main",
          bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
          p: 2, fontSize: 14,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "error.main", display: "inline-flex" }}>
            <AlertTriangle size={20} />
          </Box>
          <Typography sx={{ fontSize: 14, color: "error.dark" }}>{error}</Typography>
        </Stack>
        <Button size="small" variant="contained" color="error" onClick={fetchData}>
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Quick Workflows Bar -- a toolbar, not a data widget, so it stays fixed above the grid */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", borderBottom: 1, borderColor: "divider", pb: 1.5, rowGap: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
          Quick Actions:
        </Typography>
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="contained"
            size="small"
            onClick={() => navigate(action.path)}
            sx={{ borderRadius: "5.25px", fontSize: 12, fontWeight: 500, boxShadow: 1, bgcolor: action.bg, "&:hover": { bgcolor: action.hoverBg } }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>

      <DashboardGrid tabKey="finance" widgets={widgets} />
    </Stack>
  );
}
