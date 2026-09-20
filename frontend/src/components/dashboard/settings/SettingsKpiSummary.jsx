import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCog, Store as StoreIcon, DatabaseBackup } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { wholeNumber } from "../../../utils/dashboardFormatters";

// Four separate widgets (not one bundled row) so DashboardGrid can drag/resize each KPI card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurSx = (privacyMode) => (privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {});

const cardSx = (hoverColor) => ({
  display: "block", width: "100%", height: "100%", textAlign: "left", cursor: "pointer",
  borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper",
  p: 2, boxShadow: 1, transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  "&:hover": { borderColor: hoverColor, boxShadow: 2 },
});

export function UsersCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/settings/user-access")} sx={cardSx("primary.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Users</Typography>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Users size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.total_users)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        Active: {wholeNumber(summary.active_users)}
      </Typography>
    </ButtonBase>
  );
}

export function SettingsEmployeesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/hrms/employee")} sx={cardSx("#a5b4fc")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Employees</Typography>
        <Box sx={{ color: "#6366f1", display: "inline-flex" }}>
          <UserCog size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.total_employees)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        Active: {wholeNumber(summary.active_employees)}
      </Typography>
    </ButtonBase>
  );
}

export function SettingsStoresCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/settings/configure-local-server")} sx={cardSx("success.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Stores</Typography>
        <Box sx={{ color: "success.main", display: "inline-flex" }}>
          <StoreIcon size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.total_stores)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        Active: {wholeNumber(summary.active_stores)}
      </Typography>
    </ButtonBase>
  );
}

export function LastBackupCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/settings/backup")} sx={cardSx("warning.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Backup</Typography>
        <Box sx={{ color: "warning.main", display: "inline-flex" }}>
          <DatabaseBackup size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 15.75, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : summary.last_backup_at ? new Date(summary.last_backup_at).toLocaleDateString("en-IN") : "Never"}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        {summary.last_backup_size || "-"}
      </Typography>
    </ButtonBase>
  );
}
