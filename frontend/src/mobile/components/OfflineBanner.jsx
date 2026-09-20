import React from "react";
import { WifiOff, CheckCircle2, RefreshCw } from "lucide-react";
import { Box } from "@mui/material";

/**
 * Mobile Offline & Network Restoration Banner
 *
 * Sits below the header to clearly indicate:
 * 1. Offline Mode (Amber bar) with cached data notice
 * 2. Back Online (Emerald bar) with synchronization confirmation
 */
export default function OfflineBanner({ isOnline, wasOffline }) {
  if (isOnline && !wasOffline) return null;

  return (
    <Box
      component="div"
      role="status"
      className={`vx-offline-banner ${isOnline ? "vx-reconnected" : ""}`}
    >
      {isOnline ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, width: "100%", textAlign: "center" }}>
          <CheckCircle2 size={15} style={{ color: "#047857", animation: "app-bounce 1s infinite", flexShrink: 0 }} />
          <Box component="span">
            <Box component="strong">Back Online:</Box> Workspace synchronized with latest records
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, width: "100%", textAlign: "center" }}>
          <WifiOff size={15} style={{ color: "#92400e", animation: "app-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite", flexShrink: 0 }} />
          <Box component="span">
            <Box component="strong">Offline Mode:</Box> Viewing cached data. Sync will resume automatically.
          </Box>
        </Box>
      )}
    </Box>
  );
}
