import { Box } from "@mui/material";

const pulseSx = { borderRadius: 1, bgcolor: "action.hover", animation: "app-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" };
const CHART_BARS = [45, 70, 55, 85, 60, 75, 40, 65, 90, 50];

/**
 * The app's one loading placeholder: a pulsing shape of what is loading, instead of "..." or "Loading...".
 *
 * variant  "value" (inline, a number or short text) | "chart" | "table" | "list"
 * rows     rows for "table" / "list" (default 5)
 * height   block height for "chart" / "table" (px)
 * width    width for "value" (default 4.5em)
 * label    what is loading, read out by screen readers (default "Loading")
 */
export default function LoadingSkeleton({ variant = "value", rows = 5, height, width, sx, label = "Loading" }) {
  const status = { role: "status", "aria-label": label };

  if (variant === "value") {
    return <Box component="span" {...status} sx={{ ...pulseSx, display: "inline-block", verticalAlign: "middle", width: width ?? "4.5em", height: "0.9em", ...sx }} />;
  }

  if (variant === "chart") {
    return (
      <Box {...status} sx={{ height: height ?? 260, display: "flex", alignItems: "flex-end", gap: 1, px: 1, pb: 1, ...sx }}>
        {CHART_BARS.map((barHeight, index) => (
          <Box key={index} sx={{ ...pulseSx, flex: 1, height: `${barHeight}%`, borderRadius: "4px 4px 0 0" }} />
        ))}
      </Box>
    );
  }

  if (variant === "table") {
    return (
      <Box {...status} sx={{ height, display: "flex", flexDirection: "column", gap: 1, py: 1, ...sx }}>
        <Box sx={{ ...pulseSx, height: 20, opacity: 0.7 }} />
        {Array.from({ length: rows }).map((_, index) => (
          <Box key={index} sx={{ display: "flex", gap: 1.5 }}>
            <Box sx={{ ...pulseSx, flex: 3, height: 16 }} />
            <Box sx={{ ...pulseSx, flex: 2, height: 16 }} />
            <Box sx={{ ...pulseSx, flex: 1, height: 16 }} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box {...status} sx={{ display: "flex", flexDirection: "column", gap: 1.25, py: 1, ...sx }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ ...pulseSx, width: 28, height: 28, borderRadius: "50%" }} />
          <Box sx={{ ...pulseSx, flex: 1, height: 14 }} />
          <Box sx={{ ...pulseSx, width: 40, height: 14 }} />
        </Box>
      ))}
    </Box>
  );
}
