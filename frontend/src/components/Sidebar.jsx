/* eslint-disable no-unused-vars */
import { ChevronLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Box, IconButton, Typography } from "@mui/material";
import NavItem from "./NavItem";
import VynerixLogo from "./auth/VynerixLogo";
import { navItems, ownerNavItems } from "../utils/navItems";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getVisibleNavItems } from "../utils/accessControl";

const Sidebar = ({ isExpanded, toggleSidebar, isMobile = false, onNavigate }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const user = useSelector((state) => state.auth.user);
  const sourceNavItems = String(user?.role || "").toLowerCase() === "owner" ? ownerNavItems : navItems;
  const visibleNavItems = useMemo(() => getVisibleNavItems(sourceNavItems, user), [sourceNavItems, user]);

  const handleSetActiveMenu = (menu) => {
    setActiveMenu(menu);
  };

  return (
    <Box
      className="erp-glass-chrome"
      sx={{
        height: "100%", bgcolor: "background.paper", boxShadow: 8,
        borderRight: 1, borderColor: "divider", display: "flex", flexDirection: "column",
        transition: "all 0.3s ease-in-out", position: "relative", overflow: "visible",
        width: isExpanded ? 240 : 80,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex", alignItems: "center", height: 64, borderBottom: 1, borderColor: "divider",
          flexShrink: 0,
          transition: "all 0.3s",
          justifyContent: isExpanded ? "space-between" : "center",
          px: isExpanded ? 1.75 : 0,
        }}
      >
        {/* BRAND LOGO & WORDMARK (Bold aerodynamic Vynerix lockup) */}
        <Box
          onClick={toggleSidebar}
          sx={{
            display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer", userSelect: "none", minWidth: 0,
            "&:hover .vn-logo-icon": { transform: "scale(1.05)" },
            "&:active .vn-logo-icon": { transform: "scale(0.95)" },
          }}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleSidebar();
            }
          }}
        >
          {/* VYNERIX BESPOKE VECTOR 'VN' BRANDMARK */}
          <Box
            className="vn-logo-icon"
            sx={{
              width: 52, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.2s",
            }}
          >
            <VynerixLogo sx={{ width: "100%", height: "100%" }} />
          </Box>

          {/* VYNERIX WORDMARK (Clean & Prominent) */}
          <Box
            sx={{
              display: "flex", alignItems: "center", minWidth: 0, transition: "all 0.3s",
              opacity: isExpanded ? 1 : 0,
              maxWidth: isExpanded ? 320 : 0,
              transform: isExpanded ? "translateX(0)" : "translateX(-8px)",
              overflow: "hidden",
              pointerEvents: isExpanded ? "auto" : "none",
            }}
          >
            <Typography
              component="span"
              sx={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.025em", userSelect: "none", whiteSpace: "nowrap", lineHeight: 1 }}
            >
              <Box
                component="span"
                sx={{
                  backgroundImage: "linear-gradient(to right, #2563eb, #0ea5e9, #22d3ee)",
                  backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
                }}
              >
                Vyn
              </Box>
              <Box component="span" sx={{ color: "text.primary" }}>
                erix
              </Box>
            </Typography>
          </Box>
        </Box>

        {/* TOGGLE / CLOSE BUTTON (Visible when expanded) */}
        {isExpanded && (
          <IconButton
            onClick={toggleSidebar}
            aria-label={isMobile ? "Close Sidebar" : "Collapse Sidebar"}
            title={isMobile ? "Close" : "Collapse sidebar"}
            size="small"
            sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
          >
            {isMobile ? (
              <XMarkIcon style={{ width: 20, height: 20 }} />
            ) : (
              <ChevronLeftIcon style={{ width: 20, height: 20 }} />
            )}
          </IconButton>
        )}
      </Box>

      {/* NAVIGATION */}
      <Box component="nav" aria-label="Main modules" sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", p: isExpanded ? { xs: 1.5, md: 2 } : 0.75 }}>
        <Box component="ul" sx={{ display: "flex", flexDirection: "column", gap: isExpanded ? 0.5 : 0.25, listStyle: "none", p: 0, m: 0 }}>
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.name}
              {...item}
              isExpanded={isExpanded}
              activeMenu={activeMenu}
              setActiveMenu={handleSetActiveMenu}
              setHoveredMenu={setHoveredMenu}
              onNavigate={onNavigate}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;
