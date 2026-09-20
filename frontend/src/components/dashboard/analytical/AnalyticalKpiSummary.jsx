import React from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, Tag, FolderTree, Truck } from "lucide-react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { wholeNumber } from "../../../utils/dashboardFormatters";

// Four separate widgets (not one bundled row) so DashboardGrid can drag/resize each KPI card
// independently in the layout customizer, same split as the Overview tab's KPI row.
const blurSx = (privacyMode) => (privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {});

const staticCardSx = {
  height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider",
  bgcolor: "background.paper", p: 2, boxShadow: 1,
};

const cardSx = (hoverColor) => ({
  display: "block", width: "100%", textAlign: "left", cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  "&:hover": { borderColor: hoverColor, boxShadow: 2 },
  ...staticCardSx,
});

export function ProductsWithStockCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/analytical/stock-analyzer")} sx={cardSx("primary.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Products With Stock</Typography>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Boxes size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.products_with_stock)}
      </Typography>
    </ButtonBase>
  );
}

export function BrandsTrackedCard({ summary = {}, loading, privacyMode }) {
  return (
    <Box sx={staticCardSx}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Brands Tracked</Typography>
        <Box sx={{ color: "#6366f1", display: "inline-flex" }}>
          <Tag size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.brands_tracked)}
      </Typography>
    </Box>
  );
}

export function CategoriesTrackedCard({ summary = {}, loading, privacyMode }) {
  return (
    <Box sx={staticCardSx}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Categories Tracked</Typography>
        <Box sx={{ color: "#9333ea", display: "inline-flex" }}>
          <FolderTree size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.categories_tracked)}
      </Typography>
    </Box>
  );
}

export function SuppliersWithPurchasesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/analytical/purchase-analyzer")} sx={cardSx("success.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Suppliers With Purchases</Typography>
        <Box sx={{ color: "success.main", display: "inline-flex" }}>
          <Truck size={20} />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.suppliers_with_purchases)}
      </Typography>
    </ButtonBase>
  );
}
