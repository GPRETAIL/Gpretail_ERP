import { useState, useEffect } from "react";

/**
 * Tracks browser online/offline state.
 * Returns { isOnline, wasOffline } — wasOffline is true briefly after reconnection.
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Clear the "was offline" flag after showing the reconnection toast
      setTimeout(() => setWasOffline(false), 3000);
    };
    const goOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
