// Shared formatting + color-map helpers for Dashboard tab widgets. Consolidates what was
// previously copy-pasted (with minor drift) across each XxxDashboardTabPane.jsx file.
import { alpha } from "@mui/material/styles";

export const formatCurrency = (val) => {
  const num = Number(val || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

export const wholeNumber = (val) => Number(val || 0).toLocaleString("en-IN");

// Action-Required / data-quality banner tiles share this severity -> sx mapping across every tab
// (red = critical, amber = warning, blue = informational). alpha-tinted background + a themed
// border, matching each module's own ActionRequiredBanner outer card treatment.
const SEVERITY_TILE_TOKEN = {
  critical: "error",
  warning: "warning",
  info: "info",
};

export const severityTileSx = (severity) => {
  const token = SEVERITY_TILE_TOKEN[severity] || SEVERITY_TILE_TOKEN.info;
  return {
    borderColor: `${token}.main`,
    bgcolor: (theme) => alpha(theme.palette[token].main, theme.palette.mode === "dark" ? 0.16 : 0.08),
    "&:hover": {
      bgcolor: (theme) => alpha(theme.palette[token].main, theme.palette.mode === "dark" ? 0.24 : 0.14),
    },
  };
};
