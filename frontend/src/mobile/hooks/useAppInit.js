import { useState, useEffect } from "react";

/**
 * AuthInitializer owns session verification; mounted screens own their data.
 * The splash animation must not start duplicate background requests.
 * Returns { ready, progress, error } where progress is 0→100.
 */
export default function useAppInit() {
  const [progress, setProgress] = useState(10);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timers = [[0, 30], [350, 60], [700, 85], [1050, 100]]
      .map(([delay, value]) => setTimeout(() => setProgress(value), delay));
    timers.push(setTimeout(() => setReady(true), 1350));
    return () => timers.forEach(clearTimeout);
  }, []); // Run once on app startup

  return { ready, progress, error: null };
}
