import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, Tag, Truck, FolderTree } from "lucide-react";
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

export function TotalProductsCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/masters/product")} sx={cardSx("primary.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Products</Typography>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <Package className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.total_products)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>Active: {wholeNumber(summary.active_products)}</Typography>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>Inactive: {wholeNumber(summary.inactive_products)}</Typography>
      </Stack>
    </ButtonBase>
  );
}

export function BrandsCategoriesCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/masters/brand")} sx={cardSx("#a5b4fc")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Brands & Categories</Typography>
        <Box sx={{ color: "#6366f1", display: "inline-flex" }}>
          <Tag className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "#6366f1", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.total_brands)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>Brands</Typography>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>{wholeNumber(summary.total_categories)} Categories</Typography>
      </Stack>
    </ButtonBase>
  );
}

export function SuppliersCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/masters/supplier")} sx={cardSx("success.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Suppliers</Typography>
        <Box sx={{ color: "success.main", display: "inline-flex" }}>
          <Truck className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "text.primary", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.total_suppliers)}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        Active: {wholeNumber(summary.active_suppliers)}
      </Typography>
    </ButtonBase>
  );
}

export function DataQualityGapsCard({ summary = {}, loading, privacyMode }) {
  const navigate = useNavigate();
  return (
    <ButtonBase onClick={() => navigate("/masters/product?filter=missing_hsn")} sx={cardSx("warning.main")}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", color: "text.secondary" }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Data Quality Gaps</Typography>
        <Box sx={{ color: "warning.main", display: "inline-flex" }}>
          <FolderTree className="h-5 w-5" />
        </Box>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 21, fontWeight: 800, color: "warning.main", ...blurSx(privacyMode) }}>
        {loading ? "..." : wholeNumber(summary.missing_hsn_count)}
      </Typography>
      <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "text.secondary", ...blurSx(privacyMode) }}>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>Missing HSN</Typography>
        <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>{wholeNumber(summary.missing_barcode_count)} Missing Barcode</Typography>
      </Stack>
    </ButtonBase>
  );
}
