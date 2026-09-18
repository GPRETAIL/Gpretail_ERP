import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import { TodaysSalesCard, NetSalesCard, ReturnsCard, CreditPendingCard } from "./dashboard/sales/SalesKpiSummary";
import { MonthlySalesCard, TotalInvoicesCard, ProductsSoldCard } from "./dashboard/sales/SalesSecondaryKpi";
import SalesActionRequiredBanner from "./dashboard/sales/SalesActionRequiredBanner";
import SalesModuleBreakdown from "./dashboard/sales/SalesModuleBreakdown";
import SalesPaymentBreakdown from "./dashboard/sales/SalesPaymentBreakdown";
import SalesTrendChart from "./dashboard/sales/SalesTrendChart";
import SalesTopProductsTable from "./dashboard/sales/SalesTopProductsTable";
import SalesLeaderboard from "./dashboard/sales/SalesLeaderboard";
import SalesRecentSalesTable from "./dashboard/sales/SalesRecentSalesTable";

// blue/rose/emerald/amber map onto real theme tokens; indigo/purple/slate are decorative, kept as
// literal hex (base + hover shade) since they don't correspond to any success/error/warning meaning.
const QUICK_ACTIONS = [
  { label: "+ New Sale", path: "/sales/pos-sales", bg: "primary.main", hoverBg: "primary.dark" },
  { label: "+ Sales Return", path: "/sales/pos-sales-return", bg: "error.main", hoverBg: "error.dark" },
  { label: "+ Dealer Invoice", path: "/sales/dealer-invoice", bg: "#4f46e5", hoverBg: "#4338ca" },
  { label: "Sales on Approval", path: "/sales/sales-on-approval", bg: "#9333ea", hoverBg: "#7e22ce" },
  { label: "Cash Opening", path: "/sales/cash-opening", bg: "success.main", hoverBg: "success.dark" },
  { label: "Cash Closing", path: "/sales/cash-closing", bg: "warning.main", hoverBg: "warning.dark" },
  { label: "Settlement", path: "/sales/settlement", bg: "#334155", hoverBg: "#1e293b" },
];

export default function SalesDashboardTabPane({ active, fromDate, toDate, companyId, privacyMode }) {
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

  const summary = data?.summary || {};
  const actionRequired = data?.action_required || [];
  const transactionBreakdown = data?.transaction_breakdown || {};
  const paymentBreakdown = data?.payment_breakdown || [];
  const topProducts = data?.top_products || [];
  const topSalesPersons = data?.top_sales_persons || [];
  const recentSales = data?.recent_sales || [];
  const performance = data?.performance || {};
  const salesTrendChart = data?.charts?.sales_trend || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-todays-sales",
        title: "Today's Sales",
        component: TodaysSalesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-net-sales",
        title: "Net Sales (Period)",
        component: NetSalesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-returns",
        title: "Returns (Period)",
        component: ReturnsCard,
        props: { summary, performance, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-credit-pending",
        title: "Credit Pending",
        component: CreditPendingCard,
        props: { summary, performance, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-monthly-sales",
        title: "Monthly Sales",
        component: MonthlySalesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-total-invoices",
        title: "Total Invoices",
        component: TotalInvoicesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 4, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-products-sold",
        title: "Products Sold",
        component: ProductsSoldCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 8, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: SalesActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 4, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "module-breakdown",
        title: "Sales Module Breakdown",
        component: SalesModuleBreakdown,
        props: { transactionBreakdown, loading },
        defaultLayout: { x: 0, y: 6, w: 12, h: 3, minW: 6, minH: 2 },
      },
      {
        key: "payment-breakdown",
        title: "Payment Mode Breakdown",
        component: SalesPaymentBreakdown,
        props: { paymentBreakdown, performance },
        defaultLayout: { x: 0, y: 9, w: 4, h: 6, minW: 3, minH: 4 },
      },
      {
        key: "trend-chart",
        title: "Sales vs Returns Timeline",
        component: SalesTrendChart,
        props: { salesTrendChart },
        defaultLayout: { x: 4, y: 9, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "top-products",
        title: "Top Selling Products",
        component: SalesTopProductsTable,
        props: { topProducts },
        defaultLayout: { x: 4, y: 12, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "leaderboard",
        title: "Sales Person Leaderboard",
        component: SalesLeaderboard,
        props: { topSalesPersons },
        defaultLayout: { x: 0, y: 15, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "recent-sales",
        title: "Recent Sales",
        component: SalesRecentSalesTable,
        props: { recentSales },
        defaultLayout: { x: 4, y: 15, w: 8, h: 4, minW: 4, minH: 3 },
      },
    ],
    [
      summary,
      performance,
      loading,
      actionRequired,
      transactionBreakdown,
      paymentBreakdown,
      salesTrendChart,
      topProducts,
      topSalesPersons,
      recentSales,
      privacyMode,
    ]
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
            <AlertTriangle className="h-5 w-5" />
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
            sx={{
              borderRadius: "5.25px", fontSize: 12, fontWeight: 500, boxShadow: 1,
              bgcolor: action.bg, "&:hover": { bgcolor: action.hoverBg },
            }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>

      <DashboardGrid tabKey="sales" widgets={widgets} />
    </Stack>
  );
}
