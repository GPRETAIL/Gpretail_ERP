import React from "react";
import { Chip } from "@mui/material";
import { TONES } from "./themeRegistry";

// Status pill with a small, consistent tone vocabulary. Shared across any MUI-based page
// (owner/admin portal, Finance) that needs a tone-driven status/type badge.
export const StatusChip = ({ label, tone = "slate", ...rest }) => {
  const t = TONES[tone] || TONES.slate;
  return (
    <Chip
      label={label}
      size="small"
      sx={{ bgcolor: t.bg, color: t.fg, fontWeight: 700, fontSize: 12, height: 22, ".MuiChip-label": { px: 1.25 } }}
      {...rest}
    />
  );
};
