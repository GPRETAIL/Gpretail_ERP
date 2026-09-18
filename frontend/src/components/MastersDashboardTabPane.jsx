import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import {
  TotalProductsCard,
  BrandsCategoriesCard,
  SuppliersCard,
  DataQualityGapsCard,
} from "./dashboard/masters/MastersKpiSummary";
import MastersActionRequiredBanner from "./dashboard/masters/MastersActionRequiredBanner";
import MastersBreakdown from "./dashboard/masters/MastersBreakdown";
import MastersCategoryChart from "./dashboard/masters/MastersCategoryChart";
import MastersRecentProductsTable from "./dashboard/masters/MastersRecentProductsTable";

const QUICK_ACTIONS = [
  { label: "+ New Product", path: "/masters/product/new", bg: "primary.main", hoverBg: "primary.dark" },
  { label: "+ New Brand", path: "/masters/brand/new", bg: "#4f46e5", hoverBg: "#4338ca" },
  { label: "+ New Supplier", path: "/masters/supplier/new", bg: "#9333ea", hoverBg: "#7e22ce" },
  { label: "Products List", path: "/masters/product", bg: "#334155", hoverBg: "#1e293b" },
  { label: "Suppliers List", path: "/masters/supplier", bg: "success.main", hoverBg: "success.dark" },
  { label: "Item Barcode", path: "/warehouse/barcode", bg: "warning.main", hoverBg: "warning.dark" },
];

export default function MastersDashboardTabPane({ active, companyId, privacyMode }) {
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
      if (companyId) params.warehouse_id = companyId;

      const res = await api.get("/masters/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load masters data.");
      }
    } catch (err) {
      console.error("Masters Tab fetch error:", err);
      setError(err.response?.data?.message || "Error communicating with server.");
    } finally {
      setLoading(false);
    }
  }, [active, companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};
  const actionRequired = data?.action_required || [];
  const breakdown = data?.breakdown || {};
  const categoryChart = data?.charts?.products_by_category || [];
  const recentProducts = data?.recent_products || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-total-products",
        title: "Total Products",
        component: TotalProductsCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-brands-categories",
        title: "Brands & Categories",
        component: BrandsCategoriesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-suppliers",
        title: "Suppliers",
        component: SuppliersCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-data-quality-gaps",
        title: "Data Quality Gaps",
        component: DataQualityGapsCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: MastersActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "breakdown",
        title: "Master Data Overview",
        component: MastersBreakdown,
        props: { breakdown, loading },
        defaultLayout: { x: 0, y: 4, w: 12, h: 3, minW: 6, minH: 2 },
      },
      {
        key: "category-chart",
        title: "Products by Category",
        component: MastersCategoryChart,
        props: { categoryChart },
        defaultLayout: { x: 0, y: 7, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "recent-products",
        title: "Recently Added Products",
        component: MastersRecentProductsTable,
        props: { recentProducts },
        defaultLayout: { x: 4, y: 7, w: 8, h: 4, minW: 4, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, breakdown, categoryChart, recentProducts, privacyMode]
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
            sx={{ borderRadius: "5.25px", fontSize: 12, fontWeight: 500, boxShadow: 1, bgcolor: action.bg, "&:hover": { bgcolor: action.hoverBg } }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>

      <DashboardGrid tabKey="masters" widgets={widgets} />
    </Stack>
  );
}
