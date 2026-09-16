import React, { useCallback, useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { GripVertical } from "lucide-react";
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
 */
export default function DashboardGrid({ tabKey, widgets }) {
  const { layouts, editMode, saveLayout } = useDashboardLayout();
  const savedLayout = layouts?.[tabKey];

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

  const handleLayoutChange = useCallback(
    (nextLayout) => {
      if (!editMode) return;
      saveLayout(
        tabKey,
        nextLayout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))
      );
    },
    [editMode, saveLayout, tabKey]
  );

  return (
    <ResponsiveGridLayout
      className="dashboard-grid"
      layouts={{ lg: layout }}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      rowHeight={72}
      margin={[16, 16]}
      isDraggable={editMode}
      isResizable={editMode}
      draggableHandle=".dashboard-tile-handle"
      onLayoutChange={handleLayoutChange}
    >
      {widgets.map((w) => (
        <div
          key={w.key}
          className={`overflow-hidden rounded-xl border bg-white dark:bg-gray-800 ${
            editMode
              ? "border-blue-300 dark:border-blue-700 shadow-md"
              : "border-slate-200 dark:border-gray-800"
          }`}
        >
          {editMode && (
            <div className="dashboard-tile-handle flex cursor-grab items-center gap-1.5 border-b border-blue-100 bg-blue-50/60 px-2 py-1 active:cursor-grabbing dark:border-blue-900/40 dark:bg-blue-950/30">
              <GripVertical className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                {w.title}
              </span>
            </div>
          )}
          <div className="h-full overflow-auto p-0.5">
            <w.component {...(w.props || {})} />
          </div>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
