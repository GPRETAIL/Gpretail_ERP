/* eslint-disable no-unused-vars */
import { ChevronLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Box, IconButton, Typography } from "@mui/material";
import NavItem from "./NavItem";
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
            <svg
              viewBox="0 0 110 84"
              style={{ width: "100%", height: "100%", overflow: "visible", filter: "drop-shadow(0 2px 8px rgba(2,132,199,0.35))" }}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Vynerix Logo"
            >
              <defs>
                {/* V Left Wing: High-voltage Cyan to Sky to Royal */}
                <linearGradient id="vn-svg-v-left" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F0FF" />
                  <stop offset="35%" stopColor="#0284C7" />
                  <stop offset="80%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>

                {/* V Leaf Crest: Electric Cyan to Vivid Emerald Lime */}
                <linearGradient id="vn-svg-leaf" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284C7" />
                  <stop offset="30%" stopColor="#06B6D4" />
                  <stop offset="70%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#84CC16" />
                </linearGradient>

                {/* V Inner Fold: Deep Cobalt Shadow */}
                <linearGradient id="vn-svg-v-fold" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1E40AF" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
                </linearGradient>

                {/* N Left Pillar: Radiant Sky to Sapphire */}
                <linearGradient id="vn-svg-n-left" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="60%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#1E40AF" />
                </linearGradient>

                {/* N Diagonal Ribbon: Deep Royal to Electric Blue */}
                <linearGradient id="vn-svg-n-diag" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="40%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>

                {/* N Right Pillar: Beveled Light Cyan to Royal Blue */}
                <linearGradient id="vn-svg-n-right" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#93C5FD" />
                  <stop offset="25%" stopColor="#38BDF8" />
                  <stop offset="70%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#1E40AF" />
                </linearGradient>

                {/* 3D Overlap Shadow Filter */}
                <filter id="vn-diag-shadow" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow dx="-2" dy="2.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* 1. V LEFT WING (Aerodynamic flared crescent) */}
              <path
                d="M 6 18 C 11 14 21 16 26 18 C 23 34 27 54 36 68 C 33 70 29 70 26 68 C 14 52 8 34 6 18 Z"
                fill="url(#vn-svg-v-left)"
              />
              <path
                d="M 6 18 C 14 16 22 24 28 42 C 34 56 38 67 37 69 C 34 70 30 70 28 68 C 18 52 11 34 6 18 Z"
                fill="url(#vn-svg-v-left)"
                opacity="0.95"
              />

              {/* 2. V RIGHT RIBBON & INNER LOOP */}
              <path
                d="M 28 68 C 36 68 44 54 48 42 C 43 48 37 60 30 68 Z"
                fill="url(#vn-svg-v-fold)"
              />
              <path
                d="M 32 68 C 39 60 45 46 49 34 C 44 42 39 56 32 68 Z"
                fill="url(#vn-svg-v-left)"
              />

              {/* 3. V EMERALD-LIME LEAF CREST */}
              <path
                d="M 47 36 C 49 24 55 12 67 9 C 70 9 72 11 69 15 C 61 21 54 29 49 36 Z"
                fill="url(#vn-svg-leaf)"
              />

              {/* 4. N LEFT PILLAR */}
              <rect
                x="54"
                y="36"
                width="11"
                height="32"
                rx="2.5"
                fill="url(#vn-svg-n-left)"
              />

              {/* 5. N 3D DIAGONAL RIBBON */}
              <path
                d="M 58 26 C 64 28 70 39 80 54 L 84 68 C 82 69 78 69 76 68 L 66 52 C 60 42 56 35 58 26 Z"
                fill="url(#vn-svg-n-diag)"
                filter="url(#vn-diag-shadow)"
              />
              {/* Specular shine */}
              <path
                d="M 60 28 C 65 31 71 43 79 56 L 82 62 C 80 63 78 63 77 62 L 68 48 C 63 38 59 33 60 28 Z"
                fill="#93C5FD"
                opacity="0.5"
              />

              {/* 6. N RIGHT PILLAR (Clean upright with angled beveled top) */}
              <path
                d="M 84 26 L 95 18 L 95 68 L 84 68 Z"
                fill="url(#vn-svg-n-right)"
              />
            </svg>
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
              <XMarkIcon size={20} />
            ) : (
              <ChevronLeftIcon size={20} />
            )}
          </IconButton>
        )}
      </Box>

      {/* NAVIGATION */}
      <Box component="nav" sx={{ flex: 1, overflowY: "auto", overflowX: "visible", p: { xs: 1.5, md: 2 } }}>
        <Box component="ul" sx={{ display: "flex", flexDirection: "column", gap: 0.5, listStyle: "none", p: 0, m: 0 }}>
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
