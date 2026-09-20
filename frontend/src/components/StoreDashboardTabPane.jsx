import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import {
  StoresCard,
  ConsolidatedSalesCard,
  ConsolidatedStockValueCard,
  ActiveStaffCard,
} from "./dashboard/store/StoreKpiSummary";
import StoreActionRequiredBanner from "./dashboard/store/StoreActionRequiredBanner";
import StoreSalesChart from "./dashboard/store/StoreSalesChart";
import StoreComparisonTable from "./dashboard/store/StoreComparisonTable";

export default function StoreDashboardTabPane({ active, fromDate, toDate, privacyMode }) {
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

      const res = await api.get("/store/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load store data.");
      }
    } catch (err) {
      console.error("Store Tab fetch error:", err);
      setError(err.response?.data?.message || "Error communicating with server.");
    } finally {
      setLoading(false);
    }
  }, [active, fromDate, toDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};
  const actionRequired = data?.action_required || [];
  const comparison = data?.comparison || [];
  const salesChart = data?.charts?.sales_by_store || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-stores",
        title: "Stores",
        component: StoresCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-consolidated-sales",
        title: "Consolidated Sales",
        component: ConsolidatedSalesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-consolidated-stock-value",
        title: "Consolidated Stock Value",
        component: ConsolidatedStockValueCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-active-staff",
        title: "Active Staff",
        component: ActiveStaffCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: StoreActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "sales-chart",
        title: "Sales by Store",
        component: StoreSalesChart,
        props: { salesChart },
        defaultLayout: { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "comparison-table",
        title: "Store Comparison",
        component: StoreComparisonTable,
        props: { comparison },
        defaultLayout: { x: 4, y: 4, w: 8, h: 4, minW: 4, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, salesChart, comparison, privacyMode]
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
      <DashboardGrid tabKey="store" widgets={widgets} />
    </Stack>
  );
}
