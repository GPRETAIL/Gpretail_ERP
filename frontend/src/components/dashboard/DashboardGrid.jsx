import React, { useCallback, useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { GripVertical, X, Plus } from "lucide-react";
import { Box, Chip, IconButton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useDashboardLayout } from "../../context/DashboardLayoutContext";

const ResponsiveGridLayout = WidthProvider(Responsive);

const BREAKPOINTS = { lg: 1024, md: 768, sm: 480, xs: 0 };
const COLS = { lg: 12, md: 12, sm: 6, xs: 1 };

/**
 * Renders a tab's widgets as a draggable/resizable grid, backed by DashboardLayoutContext.
 * Falls back to each widget's own defaultLayout when the user has never customized this tab --
 * so an uncustomized Dashboard looks exactly like it did before this feature existed.
 *
 * widgets: [{ key, title, component: Component, props, defaultLayout: {x,y,w,h,minW,minH} }]
 *
 * Every tile clips and inner-scrolls its own content instead of growing past its grid row --
 * react-grid-layout positions siblings absolutely by their fixed layout height, so a tile that's
 * allowed to render taller than its own box doesn't push the row below it down, it just visually
 * overlaps it. (This used to be togglable via a "fitContent" prop that opted Overview out of
 * clipping "so the page scrolls instead" -- removed after that caused exactly this overlap on any
 * tile whose content (a long Action Required list, a wide table) exceeded its row height.)
 *
 * A content-driven auto-height mode (ResizeObserver measuring each tile's real scrollHeight and
 * feeding that back into its own layout h) was tried here and reverted -- react-grid-layout
 * animates a tile's height/transform on layout change, and the observer kept catching those
 * mid-transition sizes, ratcheting every tile in a row up to the same inflated height instead of
 * settling. Every Overview widget's own root now uses height:"100%" instead (see e.g.
 * DashboardTables.jsx's tableCardSx) so its card fills the tile it's given rather than sizing to
 * its own sparse/empty content and leaving dead space below -- consistent with every other tab's
 * widgets, which already sized themselves this way.
 */
export default function DashboardGrid({ tabKey, widgets }) {
  const { layouts, editMode, saveLayout } = useDashboardLayout();
  const savedLayout = layouts?.[tabKey];

  // Every widget's layout entry, including hidden ones -- react-grid-layout only ever sees the
  // visible subset below, but this full list is what gets persisted so a hidden widget's saved
  // position/size survives until it's restored.
  const layout = useMemo(() => {
    const byKey = new Map((Array.isArray(savedLayout) ? savedLayout : []).map((item) => [item.i, item]));
    return widgets.map((w) => ({
      ...w.defaultLayout,
      ...byKey.get(w.key),
      i: w.key,
      minW: w.defaultLayout.minW,
      minH: w.defaultLayout.minH,
    }));
  }, [savedLayout, widgets]);

  const hiddenKeys = useMemo(() => new Set(layout.filter((item) => item.hidden).map((item) => item.i)), [layout]);
  const visibleWidgets = useMemo(() => widgets.filter((w) => !hiddenKeys.has(w.key)), [widgets, hiddenKeys]);
  const hiddenWidgets = useMemo(() => widgets.filter((w) => hiddenKeys.has(w.key)), [widgets, hiddenKeys]);
  const visibleLayout = useMemo(() => layout.filter((item) => !item.hidden), [layout]);

  const handleLayoutChange = useCallback(
    (nextLayout) => {
      if (!editMode) return;
      // nextLayout only reports the currently-rendered (visible) items -- merge their fresh
      // x/y/w/h back into the full layout rather than replacing it outright, or dragging any
      // one visible widget would silently wipe every hidden widget's hidden flag and saved spot.
      const byKey = new Map(nextLayout.map(({ i, x, y, w, h }) => [i, { x, y, w, h }]));
      const merged = layout.map((item) => ({ ...item, ...(byKey.get(item.i) || {}) }));
      saveLayout(tabKey, merged);
    },
    [editMode, saveLayout, tabKey, layout]
  );

  const hideWidget = useCallback(
    (key) => {
      saveLayout(tabKey, layout.map((item) => (item.i === key ? { ...item, hidden: true } : item)));
    },
    [layout, saveLayout, tabKey]
  );

  const showWidget = useCallback(
    (key) => {
      saveLayout(tabKey, layout.map((item) => (item.i === key ? { ...item, hidden: false } : item)));
    },
    [layout, saveLayout, tabKey]
  );

  return (
    <div>
      <ResponsiveGridLayout
        className="dashboard-grid"
        layouts={{ lg: visibleLayout }}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={72}
        margin={[16, 16]}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".dashboard-tile-handle"
        onLayoutChange={handleLayoutChange}
      >
        {visibleWidgets.map((w) => (
          <Box
            key={w.key}
            sx={{
              borderRadius: "10.5px", border: "1px solid", bgcolor: "background.paper",
              overflow: "hidden",
              ...(editMode
                ? { borderColor: "primary.main", boxShadow: 2 }
                : { borderColor: "divider" }),
            }}
          >
            {editMode && (
              <Box
                className="dashboard-tile-handle"
                sx={{
                  display: "flex", alignItems: "center", gap: 0.75, cursor: "grab",
                  borderBottom: 1, borderColor: "primary.main",
                  bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.1),
                  px: 1, py: 0.5, "&:active": { cursor: "grabbing" },
                }}
              >
                <Box sx={{ color: "primary.main", display: "inline-flex" }}>
                  <GripVertical size={14} />
                </Box>
                <Typography
                  sx={{ flex: 1, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "primary.dark" }}
                >
                  {w.title}
                </Typography>
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => hideWidget(w.key)}
                  aria-label={`Remove ${w.title} from dashboard`}
                  title="Remove from dashboard"
                  sx={{ p: 0.25, color: "primary.main" }}
                >
                  <X size={14} />
                </IconButton>
              </Box>
            )}
            <Box sx={{ height: "100%", overflow: "auto", p: 0.25 }}>
              <w.component {...(w.props || {})} />
            </Box>
          </Box>
        ))}
      </ResponsiveGridLayout>

      {editMode && hiddenWidgets.length > 0 && (
        <Box sx={{ mt: 2, borderRadius: "10.5px", border: "1px dashed", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
          <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>
            Removed from this dashboard ({hiddenWidgets.length})
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {hiddenWidgets.map((w) => (
              <Chip
                key={w.key}
                icon={<Plus size={12} />}
                label={w.title}
                onClick={() => showWidget(w.key)}
                variant="outlined"
                size="small"
                aria-label={`Add ${w.title} back to dashboard`}
                title="Add back to dashboard"
                sx={{ "&:hover": { borderColor: "primary.main", color: "primary.main" } }}
              />
            ))}
          </Box>
        </Box>
      )}
    </div>
  );
}
