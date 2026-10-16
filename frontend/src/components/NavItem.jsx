import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { Box, ButtonBase, Portal, Typography } from "@mui/material";
import { useTabs } from "../context/TabContext";

const itemSx = (isOpen, isExpanded) => ({
  display: "flex", alignItems: "center", justifyContent: isExpanded ? "space-between" : "center", width: "100%",
  minHeight: isExpanded ? 40 : 56,
  px: isExpanded ? 1 : 0.5, py: 0.75,
  borderRadius: 2, cursor: "pointer", transition: "all 0.15s", textAlign: isExpanded ? "left" : "center",
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
  const label = !isExpanded ? ({ HRMS: "HR", "User Access": "User" }[name] || name) : name;
  const contentSx = {
    display: "flex", alignItems: "center", flexDirection: isExpanded ? "row" : "column",
    gap: isExpanded ? 0 : 0.5, minWidth: 0, width: isExpanded ? "auto" : "100%",
  };
  const labelSx = {
    fontWeight: 500, fontSize: isExpanded ? 14 : 10.5, lineHeight: 1.2,
    whiteSpace: isExpanded ? "nowrap" : "normal", overflowWrap: "anywhere",
    ml: isExpanded ? 1.5 : 0, width: isExpanded ? "auto" : "100%",
  };

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
        left: `${Math.max(8, Math.min(itemRect.right + 8, window.innerWidth - 216))}px`,
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
    <Box component="li" sx={{ position: "relative", listStyle: "none", borderBottom: isExpanded ? 0 : 1, borderColor: "divider" }} ref={itemRef}>
      {/* Main menu item */}
      {isDirectLink ? (
        <ButtonBase
          type="button"
          onClick={() => {
            setActiveMenu(null);
            navigateActiveTab(path);
            onNavigate?.();
          }}
          aria-label={name}
          sx={itemSx(isOpen, isExpanded)}
        >
          <Box sx={contentSx}>
            <Icon style={{ width: 24, height: 24 }} />
            <Typography
              component="span"
              sx={labelSx}
            >
              {label}
            </Typography>
          </Box>
        </ButtonBase>
      ) : (
        <ButtonBase type="button" aria-label={name} aria-expanded={isOpen} onClick={handleClick} sx={itemSx(isOpen, isExpanded)}>
          <Box sx={contentSx}>
            <Icon style={{ width: 24, height: 24 }} />
            <Typography
              component="span"
              sx={labelSx}
            >
              {label}
            </Typography>
          </Box>

          {subItems && isExpanded && (
            <ChevronRightIcon
              style={{
                width: 16,
                height: 16,
                transition: "transform 0.2s",
                transform: isOpen ? "rotate(90deg)" : "none",
                color: isOpen ? "#4f46e5" : "inherit",
                opacity: isOpen ? 1 : 0.6,
              }}
            />
          )}
        </ButtonBase>
      )}

      {/* Submenu (Floating Menu when collapsed) */}
      {subItems && isOpen && (
        <Portal>
        <Box
          component="ul"
          aria-label={`${name} submenu`}
          ref={submenuRef}
          style={submenuStyle}
          sx={{
            position: "fixed", bgcolor: "background.paper", boxShadow: 4,
            border: "1px solid", borderColor: "divider", borderRadius: 2,
            p: 1, display: "flex", flexDirection: "column", gap: 0.5, zIndex: (theme) => theme.zIndex.drawer + 1, width: 208, maxWidth: "calc(100vw - 16px)",
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
        </Portal>
      )}
    </Box>
  );
};

export default NavItem;
