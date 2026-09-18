import React from "react";
import { LayoutGrid } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { wholeNumber } from "../../../utils/dashboardFormatters";

const BREAKDOWN_COLORS = {
  products: "blue",
  brands: "indigo",
  categories: "purple",
  suppliers: "emerald",
  taxes: "amber",
  agents: "slate",
};

// blue/emerald/amber map onto real theme tokens; indigo/purple are decorative, non-semantic
// accents kept as literal hex; slate is the neutral/no-color tile (no tint).
const LITERAL_COLORS = { indigo: "#6366f1", purple: "#9333ea" };
const colorSx = (color) => {
  if (LITERAL_COLORS[color]) {
    const hex = LITERAL_COLORS[color];
    return { borderColor: hex, color: hex, bgcolor: (theme) => alpha(hex, theme.palette.mode === "dark" ? 0.16 : 0.08) };
  }
  if (color === "slate") {
    return { borderColor: "divider", color: "text.secondary", bgcolor: "action.hover" };
  }
  const token = { blue: "primary", emerald: "success", amber: "warning" }[color];
  return {
    borderColor: `${token}.main`,
    color: `${token}.main`,
    bgcolor: (theme) => alpha(theme.palette[token].main, theme.palette.mode === "dark" ? 0.16 : 0.08),
  };
};

export default function MastersBreakdown({ breakdown = {}, loading }) {
  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <LayoutGrid className="h-5 w-5" />
        </Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Master Data Overview</Typography>
      </Stack>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" } }}>
        {Object.entries(breakdown).map(([key, tile]) => (
          <Box
            key={key}
            sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", borderRadius: "7px", border: "1px solid", p: 1.5, ...colorSx(BREAKDOWN_COLORS[key] || "slate") }}
          >
            <Typography sx={{ fontSize: 15.75, fontWeight: 800, color: "text.primary" }}>
              {loading ? "..." : wholeNumber(tile.count)}
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "inherit" }}>{tile.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
