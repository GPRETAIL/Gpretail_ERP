import React from "react";
import { WifiOff, CheckCircle2, RefreshCw } from "lucide-react";

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
    <div
      role="status"
      className={`vx-offline-banner ${isOnline ? "vx-reconnected" : ""}`}
    >
      {isOnline ? (
        <div className="flex items-center justify-center gap-2 w-full text-center">
          <CheckCircle2 size={15} className="text-emerald-700 animate-bounce shrink-0" />
          <span>
            <strong>Back Online:</strong> Workspace synchronized with latest records
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 w-full text-center">
          <WifiOff size={15} className="text-amber-800 animate-pulse shrink-0" />
          <span>
            <strong>Offline Mode:</strong> Viewing cached data. Sync will resume automatically.
          </span>
        </div>
      )}
    </div>
  );
}
