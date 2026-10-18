import { EMPTY_ARRAY, EMPTY_OBJECT } from "../utils/emptyValues.js";
import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import useModuleDashboardSummary from "../hooks/useModuleDashboardSummary";
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
  const { data, loading, error, reload: fetchData } = useModuleDashboardSummary("/store/dashboard", {
    active, errorMessage: "Failed to load store data.", params: { ...(fromDate ? { date_from: fromDate } : {}), ...(toDate ? { date_to: toDate } : {}) },
  });

  const summary = data?.summary || EMPTY_OBJECT;
  const actionRequired = data?.action_required || EMPTY_ARRAY;
  const comparison = data?.comparison || EMPTY_ARRAY;
  const salesChart = data?.charts?.sales_by_store || EMPTY_ARRAY;

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
