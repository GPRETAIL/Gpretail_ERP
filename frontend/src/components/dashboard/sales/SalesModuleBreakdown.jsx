import React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, ShoppingCart, RotateCcw, Repeat, CreditCard, Undo2 } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatCurrency } from "../../../utils/dashboardFormatters";

const TILES = [
  { key: "sales", label: "Sales", icon: ShoppingCart, color: "blue", route: "/sales/pos-sales" },
  { key: "returns", label: "Returns", icon: RotateCcw, color: "rose", route: "/sales/pos-sales-return" },
  { key: "exchanges", label: "Exchanges", icon: Repeat, color: "purple", route: "/sales/pos-sales-return" },
  { key: "credit", label: "Credit Sales", icon: CreditCard, color: "amber", route: "/sales/pos-sales?filter=credit" },
  { key: "refunds", label: "Refunds", icon: Undo2, color: "slate", route: "/sales/pos-sales-return" },
];

// blue/rose/amber map onto real theme tokens (primary/error/warning); purple is a decorative,
// non-semantic accent kept as a literal hex; slate is the neutral/no-color tile, using divider +
// text.secondary + a plain hover tint rather than any brand/status color.
const colorSx = (color) => {
  if (color === "purple") {
    return { borderColor: "#d8b4fe", color: "#9333ea", bgcolor: (theme) => alpha("#9333ea", theme.palette.mode === "dark" ? 0.16 : 0.08) };
  }
  if (color === "slate") {
    return { borderColor: "divider", color: "text.secondary", bgcolor: "action.hover" };
  }
  const token = { blue: "primary", rose: "error", amber: "warning" }[color];
  return {
    borderColor: `${token}.main`,
    color: `${token}.main`,
    bgcolor: (theme) => alpha(theme.palette[token].main, theme.palette.mode === "dark" ? 0.16 : 0.08),
  };
};

export default function SalesModuleBreakdown({ transactionBreakdown = {}, loading }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <LayoutGrid className="h-5 w-5" />
        </Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Sales Module Breakdown</Typography>
      </Stack>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" } }}>
        {TILES.map((tile) => {
          const stats = transactionBreakdown[tile.key] || { count: 0, amount: 0 };
          const Icon = tile.icon;
          return (
            <ButtonBase
              key={tile.key}
              onClick={() => navigate(tile.route)}
              sx={{
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                borderRadius: "7px", border: "1px solid", p: 1.5, textAlign: "left",
                transition: "transform 0.15s ease", "&:hover": { transform: "scale(1.02)" },
                ...colorSx(tile.color),
              }}
            >
              <Icon className="h-4 w-4" style={{ color: "inherit" }} />
              <Typography sx={{ mt: 1, fontSize: 15.75, fontWeight: 800, color: "text.primary" }}>
                {loading ? "..." : formatCurrency(stats.amount)}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "inherit" }}>{tile.label}</Typography>
              <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{stats.count} txns</Typography>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
