import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import {
  TotalCustomersCard,
  CustomerOrdersCard,
  CustomerReceivablesCard,
  LoyaltyPointsCard,
} from "./dashboard/crm/CrmKpiSummary";
import CrmActionRequiredBanner from "./dashboard/crm/CrmActionRequiredBanner";
import CrmSegmentationBreakdown from "./dashboard/crm/CrmSegmentationBreakdown";
import CrmGrowthChart from "./dashboard/crm/CrmGrowthChart";
import CrmCelebrationsTable from "./dashboard/crm/CrmCelebrationsTable";
import CrmTopCustomersTable from "./dashboard/crm/CrmTopCustomersTable";
import CrmRecentOrdersTable from "./dashboard/crm/CrmRecentOrdersTable";

const QUICK_ACTIONS = [
  { label: "+ New Customer", path: "/crm/customer", bg: "#2563eb", hoverBg: "#1d4ed8" },
  { label: "+ New Customer Order", path: "/crm/customer-orders/new", bg: "#4f46e5", hoverBg: "#4338ca" },
  { label: "Customer Orders List", path: "/crm/customer-orders", bg: "#9333ea", hoverBg: "#7e22ce" },
  { label: "Loyalty Management", path: "/crm/loyalty-management", bg: "#d97706", hoverBg: "#b45309" },
  { label: "Bill & Receipts Print", path: "/crm/bill-print", bg: "#059669", hoverBg: "#047857" },
  { label: "Customer 360 Profiles", path: "/crm/customer", bg: "#334155", hoverBg: "#1e293b" },
];

export default function CrmDashboardTabPane({ active, fromDate, toDate, companyId, privacyMode }) {
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

  const summary = data?.summary || {};
  const actionRequired = data?.action_required || [];
  const segmentation = data?.segmentation || {};
  const topCustomers = data?.top_customers || [];
  const recentOrders = data?.recent_orders || [];
  const upcomingEvents = data?.upcoming_events || [];
  const timelineChart = data?.charts?.timeline || [];
  const performance = data?.performance || {};

  const widgets = useMemo(
    () => [
      {
        key: "kpi-total-customers",
        title: "Total Customers",
        component: TotalCustomersCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-customer-orders",
        title: "Customer Orders",
        component: CustomerOrdersCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-customer-receivables",
        title: "Customer Receivables",
        component: CustomerReceivablesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-loyalty-points",
        title: "Loyalty Points",
        component: LoyaltyPointsCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: CrmActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "segmentation",
        title: "Customer Segmentation",
        component: CrmSegmentationBreakdown,
        props: { summary, segmentation, performance },
        defaultLayout: { x: 0, y: 4, w: 4, h: 6, minW: 3, minH: 4 },
      },
      {
        key: "growth-chart",
        title: "Customer Growth & Orders",
        component: CrmGrowthChart,
        props: { timelineChart },
        defaultLayout: { x: 4, y: 4, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "celebrations",
        title: "Celebrations & Engagement",
        component: CrmCelebrationsTable,
        props: { upcomingEvents },
        defaultLayout: { x: 4, y: 7, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "top-customers",
        title: "Top Valuable Customers",
        component: CrmTopCustomersTable,
        props: { topCustomers },
        defaultLayout: { x: 0, y: 10, w: 6, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "recent-orders",
        title: "Recent Customer Orders",
        component: CrmRecentOrdersTable,
        props: { recentOrders },
        defaultLayout: { x: 6, y: 10, w: 6, h: 4, minW: 3, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, segmentation, performance, timelineChart, upcomingEvents, topCustomers, recentOrders, privacyMode]
  );

  if (error) {
    return (
      <Stack
        direction="row"
        sx={{
          alignItems: "center", justifyContent: "space-between", borderRadius: "10.5px", border: "1px solid",
          borderColor: "error.main", bgcolor: (theme) => alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
          p: 2, fontSize: 13, color: "error.main",
        }}
      >
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Box sx={{ color: "error.main", display: "inline-flex" }}>
            <AlertTriangle size={20} />
          </Box>
          <Typography sx={{ fontSize: 13, color: "error.main" }}>{error}</Typography>
        </Stack>
        <Button
          onClick={fetchData}
          variant="contained"
          color="error"
          size="small"
          sx={{ borderRadius: 1, fontSize: 12, fontWeight: 600 }}
        >
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Quick Workflows Bar -- a toolbar, not a data widget, so it stays fixed above the grid */}
      <Stack
        direction="row"
        sx={{ flexWrap: "wrap", alignItems: "center", gap: 1, borderBottom: "1px solid", borderColor: "divider", pb: 1.5 }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
          CRM Workflows:
        </Typography>
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            onClick={() => navigate(action.path)}
            variant="contained"
            size="small"
            sx={{
              borderRadius: "5.25px", px: 1.25, py: 0.5, fontSize: 12, fontWeight: 500, boxShadow: 1,
              bgcolor: action.bg, color: "#fff", "&:hover": { bgcolor: action.hoverBg, boxShadow: 1 },
            }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>

      <DashboardGrid tabKey="crm" widgets={widgets} />
    </Box>
  );
}
