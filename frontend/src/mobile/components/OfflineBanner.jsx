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
          <CheckCircle2 size={15} className="text-emerald-700 animate-bounce shrink-0" />
          <Box component="span">
            <Box component="strong">Back Online:</Box> Workspace synchronized with latest records
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, width: "100%", textAlign: "center" }}>
          <WifiOff size={15} className="text-amber-800 animate-pulse shrink-0" />
          <Box component="span">
            <Box component="strong">Offline Mode:</Box> Viewing cached data. Sync will resume automatically.
          </Box>
        </Box>
      )}
    </Box>
  );
}
