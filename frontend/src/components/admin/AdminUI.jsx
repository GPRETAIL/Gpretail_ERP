import React from "react";
import { Box, Card, Typography } from "@mui/material";
import { TONES } from "./adminTheme";

// Reusable MUI presentational pieces shared across the owner/admin portal pages.
// The brand theme + tone map live in ./adminTheme; this file exports only components.
// StatusChip now lives in ../../theme/StatusChip (shared with the Finance module) -- re-exported
// here so existing admin-portal imports of it from this file keep working.
export { StatusChip } from "../../theme/StatusChip";

// Metric tile used across the portal (Companies / Stores / Active / etc.).
export const StatCard = ({ label, value, sub, icon, tone = "primary" }) => {
  const t = TONES[tone] || TONES.primary;
  return (
    <Card sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{label}</Typography>
          <Typography sx={{ mt: 0.75, fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
          {sub ? <Typography sx={{ mt: 0.5, fontSize: 12, color: "text.disabled" }}>{sub}</Typography> : null}
        </Box>
        {icon ? <Box sx={{ display: "flex", p: 1.25, borderRadius: 2, bgcolor: t.bg, color: t.fg }}>{icon}</Box> : null}
      </Box>
    </Card>
  );
};
