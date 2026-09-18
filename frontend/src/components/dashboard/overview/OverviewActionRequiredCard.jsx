import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertOctagon } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import api from "../../../api/axios";
import { severityTileSx } from "../../../utils/dashboardFormatters";

// Types whose underlying condition represents something already gone wrong (a variance found, a
// limit already breached, a run that already failed) rather than something merely approaching a
// deadline -- shown in red instead of amber, same red/amber split every module's own Action
// Required banner already uses for its 'critical' vs 'warning' tiles.
const CRITICAL_TYPE_PATTERN = /OVERDUE|VARIANCE|EXCEEDED|FAILED/;

const timeAgo = (createdAt) => {
  if (!createdAt) return "";
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours >= 1) return `${hours}h ago`;
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  return `${mins}m ago`;
};

export default function OverviewActionRequiredCard({ items = [], loading, onItemHandled }) {
  const navigate = useNavigate();

  const handleClick = async (item) => {
    try {
      if (!item.read_at) await api.post(`/notifications/${item.id}/read`);
    } catch {
      // Navigating still matters even if the read-receipt fails to save.
    } finally {
      onItemHandled?.(item.id);
      if (item.link) navigate(item.link);
    }
  };

  return (
    <Box
      sx={{
        height: "100%", borderRadius: "10.5px", border: "1px solid",
        borderColor: "warning.main",
        bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
        p: 2,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "warning.main", display: "inline-flex" }}>
            <AlertOctagon className="h-5 w-5" />
          </Box>
          <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Action Required (All Modules)
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
          Click any item to open it
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", height: 100, alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>Loading...</Typography>
        </Box>
      ) : items.length === 0 ? (
        <Box sx={{ display: "flex", height: 100, alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>Nothing needs attention right now.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
          {items.map((item) => {
            const critical = CRITICAL_TYPE_PATTERN.test(item.type || "");
            return (
              <ButtonBase
                key={item.id}
                onClick={() => handleClick(item)}
                sx={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.25,
                  borderRadius: "8.75px", border: "1px solid", p: 1.5, textAlign: "left",
                  transition: "transform 0.15s ease", "&:hover": { transform: "scale(1.02)" },
                  ...severityTileSx(critical ? "critical" : "warning"),
                }}
              >
                <Stack direction="row" sx={{ width: "100%", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.primary" }}>{item.title}</Typography>
                  {!item.read_at && (
                    <Box sx={{ width: 8, height: 8, flexShrink: 0, borderRadius: "50%", bgcolor: "error.main" }} />
                  )}
                </Stack>
                <Typography
                  sx={{
                    fontSize: 11, color: "text.secondary", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}
                >
                  {item.message}
                </Typography>
                <Typography sx={{ mt: "auto", pt: 0.5, fontSize: 10, color: "text.disabled" }}>
                  {timeAgo(item.created_at)}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
