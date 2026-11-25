import { useEffect, useMemo, useRef, useState } from "react";
import { Box, IconButton, InputBase, Popover, Typography } from "@mui/material";
import { MagnifyingGlassIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { buildQuickNavGroups, filterQuickNavGroups } from "./quickNavGroups";

/**
 * Header button that opens a search box and every module's pages in columns, so any page is one click away without
 * opening the side menu. Ctrl+K opens it too. The list is the same one the side menu shows, so it respects access.
 */
export default function QuickNavigation({ items, onNavigate }) {
  const [anchor, setAnchor] = useState(null);
  const [query, setQuery] = useState("");
  const buttonRef = useRef(null);
  const groups = useMemo(() => buildQuickNavGroups(items), [items]);
  const shown = useMemo(() => filterQuickNavGroups(groups, query), [groups, query]);
  const open = Boolean(anchor);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "k") {
        event.preventDefault();
        setAnchor((current) => (current ? null : buttonRef.current));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => { setAnchor(null); setQuery(""); };
  const go = (path) => { close(); onNavigate?.(path); };
  const firstMatch = shown[0]?.pages[0];

  return (
    <>
      <IconButton ref={buttonRef} size="small" title="Quick navigation (Ctrl+K)" aria-label="Quick navigation" aria-haspopup="dialog" aria-expanded={open}
        onClick={(event) => setAnchor(event.currentTarget)} sx={{ color: "text.secondary" }}>
        <Squares2X2Icon style={{ width: 20, height: 20 }} />
      </IconButton>
      <Popover open={open} anchorEl={anchor} onClose={close} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { role: "dialog", "aria-label": "Quick navigation", sx: { width: "min(760px, 96vw)", maxHeight: "82vh", display: "flex", flexDirection: "column", borderRadius: 2, mt: 0.5 } } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
          <MagnifyingGlassIcon style={{ width: 18, height: 18, opacity: 0.6 }} />
          <InputBase autoFocus fullWidth value={query} placeholder="Search modules and pages..." inputProps={{ "aria-label": "Search modules and pages" }}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && firstMatch) go(firstMatch.path); }}
            sx={{ fontSize: 14 }} />
        </Box>
        <Box sx={{ overflowY: "auto", px: 2.5, py: 2, columnWidth: 210, columnGap: 3 }}>
          {shown.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No page matches "{query.trim()}".</Typography>
          ) : shown.map((group) => {
            const GroupIcon = group.icon;
            return (
              <Box key={group.name} component="section" aria-label={group.name} sx={{ breakInside: "avoid", mb: 2.5 }}>
                <Typography sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13.5, fontWeight: 800, mb: 0.75, color: "text.primary" }}>
                  {GroupIcon ? <GroupIcon style={{ width: 17, height: 17, color: "#2563eb" }} /> : null}{group.name}
                </Typography>
                {group.pages.map((page) => (
                  <Box key={page.path} component="button" type="button" onClick={() => go(page.path)}
                    sx={{ display: "block", width: "100%", textAlign: "left", border: 0, bgcolor: "transparent", cursor: "pointer", font: "inherit", fontSize: 13, color: "text.secondary", py: 0.5, px: 1, borderRadius: 1,
                      "&:hover, &:focus-visible": { bgcolor: "action.hover", color: "text.primary", outline: "none" } }}>
                    {page.name}
                  </Box>
                ))}
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}
