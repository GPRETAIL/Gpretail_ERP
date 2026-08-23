import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";

/**
 * Drives the splash screen lifecycle with real initialization milestones.
 * Returns { ready, progress, error } where progress is 0→100.
 */
export default function useAppInit() {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const [progress, setProgress] = useState(10);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unmounted = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      try {
        // Milestone 1: App startup
        if (!unmounted) setProgress(30);
        await sleep(350);

        // Milestone 2: Auth verification & preloading
        if (!unmounted) setProgress(60);
        const token = localStorage.getItem("token");
        if (token) {
          try {
            await Promise.race([api.get("/auth/me"), sleep(800)]);
          } catch {
            // Silently continue
          }
        }
        await sleep(350);

        // Milestone 3: Preload unread notifications
        if (!unmounted) setProgress(85);
        if (token) {
          try {
            const res = await Promise.race([
              api.get("/notifications/unread-count"),
              sleep(600),
            ]);
            if (res?.data) {
              window.__vx_unread_count = res.data?.data?.count ?? res.data?.count ?? 0;
            }
          } catch {
            window.__vx_unread_count = 0;
          }
        }
        await sleep(350);

        // Milestone 4: Finalizing
        if (!unmounted) setProgress(100);
        await sleep(300);

        if (!unmounted) setReady(true);
      } catch (err) {
        if (!unmounted) {
          setError(err?.message || "Notice");
          setReady(true);
        }
      }
    })();

    return () => {
      unmounted = true;
    };
  }, []); // Run once on app startup

  return { ready, progress, error };
}
