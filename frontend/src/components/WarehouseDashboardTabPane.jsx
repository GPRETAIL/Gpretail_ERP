import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import {
  TotalStockUnitsCard,
  TotalStockValueCard,
  IncomingGoodsCard,
  StockOutwardCard,
} from "./dashboard/warehouse/WarehouseKpiSummary";
import WarehouseActionRequiredBanner from "./dashboard/warehouse/WarehouseActionRequiredBanner";
import WarehouseSellingModeBreakdown from "./dashboard/warehouse/WarehouseSellingModeBreakdown";
import WarehouseStockMovementChart from "./dashboard/warehouse/WarehouseStockMovementChart";
import WarehouseIncomingShipmentsTable from "./dashboard/warehouse/WarehouseIncomingShipmentsTable";
import WarehouseLowStockTable from "./dashboard/warehouse/WarehouseLowStockTable";

const QUICK_ACTIONS = [
  { label: "+ Direct Purchase", path: "/warehouse/direct-purchase", bg: "#2563eb", hoverBg: "#1d4ed8" },
  { label: "+ Inventory Entry", path: "/warehouse/inventory-entry", bg: "#4f46e5", hoverBg: "#4338ca" },
  { label: "+ Create GRN", path: "/warehouse/receive-goods", bg: "#059669", hoverBg: "#047857" },
  { label: "+ Stock Outward", path: "/warehouse/stock-outward", bg: "#9333ea", hoverBg: "#7e22ce" },
  { label: "+ Transport Entry", path: "/warehouse/transport-entry", bg: "#0284c7", hoverBg: "#0369a1" },
  { label: "+ Physical Stock", path: "/warehouse/physical-stock", bg: "#d97706", hoverBg: "#b45309" },
  { label: "+ Purchase Return", path: "/warehouse/purchase-return", bg: "#e11d48", hoverBg: "#be123c" },
  { label: "+ Generate Barcode", path: "/warehouse/barcode", bg: "#334155", hoverBg: "#1e293b" },
];

export default function WarehouseDashboardTabPane({ active, fromDate, toDate, companyId, privacyMode }) {
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

      const res = await api.get("/warehouse/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load warehouse data.");
      }
    } catch (err) {
      console.error("Warehouse Tab fetch error:", err);
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
  const inventory = data?.inventory || {};
  const incoming = data?.incoming || [];
  const alerts = data?.alerts || [];
  const performance = data?.performance || {};
  const stockMovementChart = data?.charts?.stock_movement || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-total-stock-units",
        title: "Total Stock Units",
        component: TotalStockUnitsCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-total-stock-value",
        title: "Total Stock Value",
        component: TotalStockValueCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-incoming-goods",
        title: "Incoming Goods",
        component: IncomingGoodsCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-stock-outward",
        title: "Stock Outward",
        component: StockOutwardCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: WarehouseActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "selling-mode-breakdown",
        title: "Selling Mode Breakdown",
        component: WarehouseSellingModeBreakdown,
        props: { inventory, performance, loading },
        defaultLayout: { x: 0, y: 4, w: 4, h: 6, minW: 3, minH: 4 },
      },
      {
        key: "stock-movement-chart",
        title: "Stock Movement Timeline",
        component: WarehouseStockMovementChart,
        props: { stockMovementChart },
        defaultLayout: { x: 4, y: 4, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "incoming-shipments",
        title: "Incoming Shipments",
        component: WarehouseIncomingShipmentsTable,
        props: { incoming },
        defaultLayout: { x: 4, y: 7, w: 8, h: 3, minW: 4, minH: 2 },
      },
      {
        key: "low-stock-alerts",
        title: "Low Stock & Reorder Alerts",
        component: WarehouseLowStockTable,
        props: { alerts },
        defaultLayout: { x: 0, y: 10, w: 12, h: 4, minW: 6, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, inventory, performance, stockMovementChart, incoming, alerts, privacyMode]
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
          Quick Actions:
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

      <DashboardGrid tabKey="warehouse" widgets={widgets} />
    </Box>
  );
}
