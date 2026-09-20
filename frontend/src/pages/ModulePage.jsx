import React from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Card, Typography } from "@mui/material";
import { navItems } from "../utils/navItems";
import { getVisibleNavItems } from "../utils/accessControl";

const ModulePage = () => {
  const { moduleName } = useParams();
  const user = useSelector((state) => state.auth.user);
  const normalizedModuleName = String(moduleName || "").toLowerCase();
  const visibleNavItems = getVisibleNavItems(navItems, user);
  const topLevelModuleOrder = [
    "Warehouse",
    "CRM",
    "Sales",
    "Finance",
    "Store",
    "Analytical",
    "Masters",
    "HRMS",
    "User Access",
    "Settings",
  ];
  const orderedLower = topLevelModuleOrder.map((name) => name.toLowerCase());
  const foundItems = topLevelModuleOrder
    .map((name) =>
      visibleNavItems.find((item) => item.name.toLowerCase() === name.toLowerCase())
    )
    .filter(Boolean);
  const remainingItems = visibleNavItems.filter(
    (item) => item.name && !orderedLower.includes(item.name.toLowerCase())
  );
  const moduleHubItems = [...foundItems, ...remainingItems];

  // Global modules hub page (all sidebar top-level menus as cards)
  if (normalizedModuleName === "modules") {
    return (
      <Box component="section" sx={{ p: 3, bgcolor: "background.default", color: "text.primary", minHeight: "100%" }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 3, color: "text.primary" }}>
          All Modules
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2.5, alignItems: "start" }}>
          {moduleHubItems.map((module) => (
            <Card
              key={module.name}
              component={Link}
              to={module.path || `/${module.name.toLowerCase()}`}
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 2,
                textDecoration: "none",
                minHeight: 72,
                transition: "all 0.2s",
                "&:hover": { boxShadow: 3, bgcolor: "action.hover" },
              }}
            >
              {module.icon && (
                <module.icon style={{ width: 24, height: 24, color: "#6366f1", transition: "all 0.15s", flexShrink: 0 }} />
              )}
              <Typography sx={{ fontWeight: 500, color: "text.primary" }}>
                {module.name}
              </Typography>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  // Find the corresponding module (case-insensitive)
  const moduleData = visibleNavItems.find(
    (item) => item.name.toLowerCase() === normalizedModuleName
  );

  if (!moduleData) {
    return (
      <Box component="section" sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
          Module Not Found
        </Typography>
        <Typography variant="body2">Please check the module name in your URL.</Typography>
      </Box>
    );
  }

  const isWarehouse = normalizedModuleName === "warehouse";
  const isSales = normalizedModuleName === "sales";

  return (
    <Box component="section" sx={{ p: 3, bgcolor: "background.default", color: "text.primary", minHeight: "100%" }}>
      {/* Module Header Card: clickable to all-modules hub */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2.5, mb: 3, alignItems: "start" }}>
        <Card
          component={Link}
          to="/modules"
          variant="outlined"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 2,
            textDecoration: "none",
            minHeight: 72,
            transition: "all 0.2s",
            "&:hover": { boxShadow: 3, bgcolor: "action.hover" },
          }}
        >
          {moduleData.icon && (
            <moduleData.icon style={{ width: 24, height: 24, color: "#6366f1", transition: "all 0.15s", flexShrink: 0 }} />
          )}
          <Typography sx={{ fontWeight: 500, color: "text.primary" }}>
            {moduleData.name}
          </Typography>
        </Card>

        {isWarehouse && (
          <Card
            component={Link}
            to="/warehouse/new-page"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 2,
              textDecoration: "none",
              minHeight: 72,
              bgcolor: "#4f46e5",
              boxShadow: 3,
              transition: "all 0.2s",
              "&:hover": { bgcolor: "#4338ca", boxShadow: 4 },
            }}
          >
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 600 }}>
              +
            </Box>
            <Box>
              <Typography component="span" sx={{ display: "block", fontWeight: 600, color: "#fff" }}>New Page</Typography>
              <Typography component="span" sx={{ display: "block", fontSize: 12, color: "#e0e7ff", mt: 0.25 }}>Invoice AI intake</Typography>
            </Box>
          </Card>
        )}

        {isSales && (
          <Card
            component={Link}
            to="/sales/receipt-formats"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 2,
              textDecoration: "none",
              minHeight: 72,
              backgroundImage: "linear-gradient(to right, #4f46e5, #2563eb)",
              boxShadow: 3,
              transition: "all 0.2s",
              "&:hover": { backgroundImage: "linear-gradient(to right, #4338ca, #1d4ed8)", boxShadow: 4 },
            }}
          >
            <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </Box>
            <Box>
              <Typography component="span" sx={{ display: "block", fontWeight: 600, color: "#fff" }}>Receipt A4 Formats</Typography>
              <Typography component="span" sx={{ display: "block", fontSize: 12, color: "#e0e7ff", mt: 0.25 }}>Portrait, Landscape &amp; Templates</Typography>
            </Box>
          </Card>
        )}
      </Box>

      {/* Submenu Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(5, 1fr)" }, gap: 1.5, alignItems: "start" }}>
        {(moduleData.subItems || []).map((sub) => (
          <Card
            key={sub.name}
            component={Link}
            to={sub.path}
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              textDecoration: "none",
              minHeight: 48,
              transition: "all 0.2s",
              "&:hover": { boxShadow: 2, bgcolor: "action.hover" },
            }}
          >
            {/* Icon */}
            {sub.icon && (
              <sub.icon style={{ width: 16, height: 16, color: "#6366f1", transition: "all 0.15s", flexShrink: 0 }} />
            )}

            {/* Name */}
            <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
              {sub.name}
            </Typography>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default ModulePage;
