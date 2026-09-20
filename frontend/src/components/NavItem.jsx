/* eslint-disable no-unused-vars */
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { useTabs } from "../context/TabContext";

const itemSx = (isOpen) => ({
  display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
  p: 1, borderRadius: 2, cursor: "pointer", transition: "all 0.15s", textAlign: "left",
  bgcolor: isOpen
    ? (theme) => (theme.palette.mode === "dark" ? "rgba(49,46,129,0.4)" : "#eef2ff")
    : "transparent",
  ...(isOpen
    ? { color: (theme) => (theme.palette.mode === "dark" ? "#818cf8" : "#4f46e5") }
    : {
        color: (theme) => (theme.palette.mode === "dark" ? "#d1d5db" : "#374151"),
        "&:hover": {
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1f2937" : "#eef2ff"),
          color: (theme) => (theme.palette.mode === "dark" ? "#818cf8" : "#4f46e5"),
        },
      }),
});

const NavItem = ({
  icon: Icon,
  name,
  path,
  isExpanded,
  subItems,
  activeMenu,
  setActiveMenu,
  onNavigate,
}) => {
  const itemRef = useRef(null);
  const submenuRef = useRef(null);
  const [submenuStyle, setSubmenuStyle] = useState({});
  const { activeTabPath, navigateActiveTab } = useTabs();

  const isDirectLink = !subItems && !!path;
  const currentPath = String(activeTabPath || "").split(/[?#]/, 1)[0].toLowerCase();
  const itemPath = String(path || "").toLowerCase();
  const isCurrentPath = isDirectLink && currentPath.startsWith(itemPath);
  const isActive = activeMenu === name;
  const isOpen = isDirectLink ? isCurrentPath : isActive;

  // --- Submenu positioning (Logic remains the same) ---
  useEffect(() => {
    if (subItems && isOpen && itemRef.current) {
      const itemRect = itemRef.current.getBoundingClientRect();
      const screenHeight = window.innerHeight;
      const submenuHeight = submenuRef.current
        ? submenuRef.current.offsetHeight
        : (subItems.length + 1) * 40 + 20;

      let top = itemRect.top;
      let maxHeight = "auto";

      if (top + submenuHeight > screenHeight - 10) {
        top = Math.max(screenHeight - submenuHeight - 10, 10);
      }

      if (submenuHeight > screenHeight - 20) {
        top = 10;
        maxHeight = `${screenHeight - 20}px`;
      }

      setSubmenuStyle({
        top: `${top}px`,
        left: `${itemRect.right + 8}px`,
        maxHeight,
        overflowY: maxHeight !== "auto" ? "auto" : "visible",
      });
    }
  }, [isOpen, subItems]);
  // --------------------------------------------------------

  // --- Click handler ---
  const handleClick = () => {
    if (isDirectLink) return;
    setActiveMenu(isActive ? null : name);
  };

  // --- Close submenu when clicking outside ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        submenuRef.current &&
        !submenuRef.current.contains(event.target) &&
        itemRef.current &&
        !itemRef.current.contains(event.target)
      ) {
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setActiveMenu]);
  // --------------------------------------------------------

  return (
    <Box component="li" sx={{ position: "relative", listStyle: "none" }} ref={itemRef}>
      {/* Main menu item */}
      {isDirectLink ? (
        <ButtonBase
          type="button"
          onClick={() => {
            setActiveMenu(null);
            navigateActiveTab(path);
            onNavigate?.();
          }}
          sx={itemSx(isOpen)}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Icon size={24} />
            <Typography
              component="span"
              sx={{
                fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.3s",
                opacity: isExpanded ? 1 : 0,
                ml: isExpanded ? 1.5 : 0,
                width: isExpanded ? "auto" : 0,
                overflow: "hidden",
              }}
            >
              {name}
            </Typography>
          </Box>
        </ButtonBase>
      ) : (
        <Box onClick={handleClick} sx={itemSx(isOpen)}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Icon size={24} />
            <Typography
              component="span"
              sx={{
                fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.3s",
                opacity: isExpanded ? 1 : 0,
                ml: isExpanded ? 1.5 : 0,
                width: isExpanded ? "auto" : 0,
                overflow: "hidden",
              }}
            >
              {name}
            </Typography>
          </Box>

          {subItems && isExpanded && (
            <ChevronRightIcon
              size={16}
              style={{
                transition: "transform 0.2s",
                transform: isOpen ? "rotate(90deg)" : "none",
                color: isOpen ? "#4f46e5" : "inherit",
                opacity: isOpen ? 1 : 0.6,
              }}
            />
          )}
        </Box>
      )}

      {/* Submenu (Floating Menu when collapsed) */}
      {subItems && isOpen && (
        <Box
          component="ul"
          ref={submenuRef}
          style={submenuStyle}
          sx={{
            position: "fixed", bgcolor: "background.paper", boxShadow: 4,
            border: "1px solid", borderColor: "divider", borderRadius: 2,
            p: 1, display: "flex", flexDirection: "column", gap: 0.5, zIndex: 50, width: 208,
            listStyle: "none", m: 0,
            transition: "all 0.2s",
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? "translateX(0)" : "translateX(-8px)",
            pointerEvents: isOpen ? "auto" : "none",
          }}
        >
          {/* 🔹 Parent element (included at the top) */}
          {path && (
            <Box component="li" key={`${name}-parent`} sx={{ listStyle: "none" }}>
              <ButtonBase
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  navigateActiveTab(path);
                  onNavigate?.();
                }}
                sx={{
                  display: "block", px: 1.5, py: 0.75, fontSize: 14, fontWeight: 500,
                  color: (theme) => (theme.palette.mode === "dark" ? "#818cf8" : "#4f46e5"),
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(49,46,129,0.4)" : "#eef2ff"),
                  "&:hover": { bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(49,46,129,0.6)" : "#e0e7ff") },
                  borderRadius: 1.5, width: "100%", textAlign: "left",
                }}
              >
                {name}
              </ButtonBase>
            </Box>
          )}

          {/* 🔹 Submenu items */}
          {subItems.map((sub) => (
            <Box component="li" key={sub.name} sx={{ listStyle: "none" }}>
              <ButtonBase
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  navigateActiveTab(sub.path);
                  onNavigate?.();
                }}
                sx={{
                  display: "block", px: 1.5, py: 0.75, fontSize: 14,
                  color: (theme) => (theme.palette.mode === "dark" ? "#d1d5db" : "#374151"),
                  "&:hover": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "#374151" : "#eef2ff"),
                    color: (theme) => (theme.palette.mode === "dark" ? "#818cf8" : "#4f46e5"),
                  },
                  borderRadius: 1.5, width: "100%", textAlign: "left",
                }}
              >
                {sub.name}
              </ButtonBase>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default NavItem;
