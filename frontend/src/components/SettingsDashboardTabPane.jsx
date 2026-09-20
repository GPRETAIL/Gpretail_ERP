import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../api/axios";
import DashboardGrid from "./dashboard/DashboardGrid";
import {
  UsersCard,
  SettingsEmployeesCard,
  SettingsStoresCard,
  LastBackupCard,
} from "./dashboard/settings/SettingsKpiSummary";
import SettingsActionRequiredBanner from "./dashboard/settings/SettingsActionRequiredBanner";
import SettingsBreakdown from "./dashboard/settings/SettingsBreakdown";
import SettingsRecentBackupsTable from "./dashboard/settings/SettingsRecentBackupsTable";

const QUICK_ACTIONS = [
  { label: "User Access", path: "/settings/user-access", bg: "primary.main", hoverBg: "primary.dark" },
  { label: "Backup Center", path: "/settings/backup", bg: "success.main", hoverBg: "success.dark" },
  { label: "Company Settings", path: "/settings/company", bg: "#4f46e5", hoverBg: "#4338ca" },
  { label: "Configure Local Server", path: "/settings/configure-local-server", bg: "warning.main", hoverBg: "warning.dark" },
  { label: "HR Configuration", path: "/hrms/hr-configuration", bg: "#9333ea", hoverBg: "#7e22ce" },
  { label: "Themes", path: "/settings/themes", bg: "#334155", hoverBg: "#1e293b" },
];

export default function SettingsDashboardTabPane({ active, companyId, privacyMode }) {
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

      const res = await api.get("/settings/dashboard", { params });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError("Failed to load settings data.");
      }
    } catch (err) {
      console.error("Settings Tab fetch error:", err);
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
  const recentBackups = data?.recent_backups || [];

  const widgets = useMemo(
    () => [
      {
        key: "kpi-users",
        title: "Users",
        component: UsersCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-employees",
        title: "Employees",
        component: SettingsEmployeesCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-stores",
        title: "Stores",
        component: SettingsStoresCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "kpi-last-backup",
        title: "Last Backup",
        component: LastBackupCard,
        props: { summary, loading, privacyMode },
        defaultLayout: { x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      },
      {
        key: "action-required",
        title: "Action Required",
        component: SettingsActionRequiredBanner,
        props: { actionRequired, loading },
        defaultLayout: { x: 0, y: 2, w: 12, h: 2, minW: 6, minH: 2 },
      },
      {
        key: "breakdown",
        title: "System Overview",
        component: SettingsBreakdown,
        props: { breakdown, loading },
        defaultLayout: { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        key: "recent-backups",
        title: "Recent Backups",
        component: SettingsRecentBackupsTable,
        props: { recentBackups },
        defaultLayout: { x: 4, y: 4, w: 8, h: 4, minW: 4, minH: 3 },
      },
    ],
    [summary, loading, actionRequired, breakdown, recentBackups, privacyMode]
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

      <DashboardGrid tabKey="settings" widgets={widgets} />
    </Stack>
  );
}
