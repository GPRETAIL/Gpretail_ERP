import React from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Offline/online status banner for mobile screens.
 */
export default function OfflineBanner({ isOnline, wasOffline }) {
  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={`vx-offline-banner ${isOnline ? "vx-reconnected" : ""}`}
    >
      {isOnline ? (
        <>
          <Wifi size={14} />
          <span>Back online — Synchronizing...</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>You're offline — Showing previously synced data</span>
        </>
      )}
    </div>
  );
}
