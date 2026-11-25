import { Box, Typography } from "@mui/material";
import { ArrowDown, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { STAFF_COLOR, STAFF_TEXT, TOUCH } from "./staffUi";

/** Shown while pulling down: how far, then "Release to refresh", then a spinner while it loads. */
export function PullIndicator({ pull, ready, refreshing }) {
  if (!pull && !refreshing) return null;
  const height = refreshing ? 48 : Math.min(pull, 80);
  return (
    <Box role="status" aria-live="polite" sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 20, height, display: "flex", alignItems: "flex-end", justifyContent: "center", pb: 0.75, pointerEvents: "none", transition: refreshing ? "height 0.15s" : "none" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.5, borderRadius: "999px", bgcolor: STAFF_COLOR.surface, border: `1px solid ${STAFF_COLOR.line}`, color: STAFF_COLOR.primaryDark, fontSize: STAFF_TEXT.small, fontWeight: 700, boxShadow: 1 }}>
        {refreshing ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <ArrowDown size={16} style={{ transform: ready ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />}
        {refreshing ? "Refreshing" : ready ? "Release to refresh" : "Pull to refresh"}
      </Box>
    </Box>
  );
}

/** Slim bar under the header while there is no connection. */
export function OfflineBar() {
  return (
    <Box role="status" sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 0.75, bgcolor: STAFF_COLOR.warnSoft, borderBottom: `1px solid ${STAFF_COLOR.warnBorder}`, color: STAFF_COLOR.warnText, fontSize: STAFF_TEXT.small, fontWeight: 700 }}>
      <WifiOff size={16} style={{ flexShrink: 0 }} />
      You are offline. You can see what was saved, but nothing can be sent until you are back online.
    </Box>
  );
}

/** A new version is ready: one tap loads it. */
export function UpdateBar({ onUpdate }) {
  return (
    <Box role="status" sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 0.75, bgcolor: STAFF_COLOR.primarySoft, borderBottom: `1px solid ${STAFF_COLOR.primaryBorder}`, color: STAFF_COLOR.primaryDark, fontSize: STAFF_TEXT.small, fontWeight: 700 }}>
      <RefreshCw size={16} style={{ flexShrink: 0 }} />
      <Typography component="span" sx={{ flex: 1, fontSize: "inherit", fontWeight: "inherit" }}>A new version of the app is ready.</Typography>
      <Box component="button" type="button" onClick={onUpdate} sx={{ minHeight: TOUCH - 8, px: 1.5, border: 0, borderRadius: "10px", bgcolor: STAFF_COLOR.primary, color: "#fff", fontWeight: 800, fontFamily: "inherit", fontSize: "inherit", cursor: "pointer" }}>Update now</Box>
    </Box>
  );
}
