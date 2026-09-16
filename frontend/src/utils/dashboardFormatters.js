// Shared formatting + color-map helpers for Dashboard tab widgets. Consolidates what was
// previously copy-pasted (with minor drift) across each XxxDashboardTabPane.jsx file.

export const formatCurrency = (val) => {
  const num = Number(val || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

export const wholeNumber = (val) => Number(val || 0).toLocaleString("en-IN");

// Action-Required / data-quality banner tiles share this severity -> Tailwind class mapping
// across every tab (red = critical, amber = warning, blue = informational).
export const SEVERITY_TILE_CLASSES = {
  critical:
    "border-red-200 bg-red-50/80 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30",
  warning:
    "border-amber-200 bg-amber-50/80 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30",
  info: "border-blue-200 bg-blue-50/80 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30",
};

export const severityTileClass = (severity) =>
  SEVERITY_TILE_CLASSES[severity] || SEVERITY_TILE_CLASSES.info;
