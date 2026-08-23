import { useState, useEffect } from "react";

/**
 * Tracks browser online/offline status with network restoration triggers.
 * 
 * Features:
 * - isOnline: boolean
 * - wasOffline: boolean (active for 4s following reconnection)
 * - Broadcasts 'vx-network-restored' event when returning online so screens auto-refresh data.
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);

      // Notify active screens to re-fetch live backend data
      window.dispatchEvent(new CustomEvent("vx-network-restored"));

      // Keep reconnection notification active for 4 seconds
      const timer = setTimeout(() => {
        setWasOffline(false);
      }, 4000);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
