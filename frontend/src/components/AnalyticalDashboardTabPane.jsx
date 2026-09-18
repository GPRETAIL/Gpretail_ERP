import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import {
  ProductsWithStockCard,
  BrandsTrackedCard,
  CategoriesTrackedCard,
  SuppliersWithPurchasesCard,
} from "./dashboard/analytical/AnalyticalKpiSummary";
import AnalyticalDataQualityBanner from "./dashboard/analytical/AnalyticalDataQualityBanner";
import AnalyticalInsightsPanel from "./dashboard/analytical/AnalyticalInsightsPanel";
import AnalyticalLaunchpad from "./dashboard/analytical/AnalyticalLaunchpad";

export default function AnalyticalDashboardTabPane({ active, fromDate, toDate, companyId, privacyMode }) {
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

      const res = await api.get("/analytical/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load analytical data.");
      }
    } catch (err) {
      console.error("Analytical Tab fetch error:", err);
      setError(err.response?.data?.message || "Error communicating with server.");
    } finally {
      setLoading(false);
    }
  }, [active, fromDate, toDate, companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};
  const dataQuality = data?.data_quality || [];
  const insights = data?.insights || {};
  const quickLinks = data?.quick_links || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-products-with-stock",
        title: "Products With Stock",
        component: ProductsWithStockCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-brands-tracked",
        title: "Brands Tracked",
        component: BrandsTrackedCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-categories-tracked",
        title: "Categories Tracked",
        component: CategoriesTrackedCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-suppliers-with-purchases",
        title: "Suppliers With Purchases",
        component: SuppliersWithPurchasesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "data-quality",
        title: "Analytics Data Quality",
        component: AnalyticalDataQualityBanner,
        props: { dataQuality, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "insights",
        title: "Cross-Module Insights",
        component: AnalyticalInsightsPanel,
        props: { insights, loading },
        defaultLayout: { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "launchpad",
        title: "Analytics Launchpad",
        component: AnalyticalLaunchpad,
        props: { quickLinks },
        defaultLayout: { x: 4, y: 4, w: 8, h: 4, minW: 4, minH: 3 },
      },
    ],
    [summary, loading, dataQuality, insights, quickLinks, privacyMode]
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
      <DashboardGrid tabKey="analytical" widgets={widgets} />
    </Stack>
  );
}
