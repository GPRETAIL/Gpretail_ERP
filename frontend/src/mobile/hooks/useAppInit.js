import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import api from "../../api/axios";

/**
 * Drives the splash screen lifecycle with real initialization milestones.
 * Returns { ready, progress, error } where progress is 0→100.
 */
export default function useAppInit() {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const authUser = useSelector((s) => s.auth.user);
  const [progress, setProgress] = useState(10);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let cancelled = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      try {
        // Milestone 1: App startup
        if (!cancelled) setProgress(25);
        await sleep(350);

        // Milestone 2: Auth verification & preloading
        if (!cancelled) setProgress(50);
        const token = localStorage.getItem("token");
        if (token && isAuthenticated) {
          try {
            await api.get("/auth/me");
          } catch {
            // Silently continue
          }
        }
        await sleep(400);

        // Milestone 3: Preload unread count & cache check
        if (!cancelled) setProgress(75);
        if (token && isAuthenticated) {
          try {
            const res = await api.get("/notifications/unread-count");
            window.__vx_unread_count = res.data?.data?.count ?? res.data?.count ?? 0;
          } catch {
            window.__vx_unread_count = 0;
          }
        }
        await sleep(450);

        // Milestone 4: Finalizing
        if (!cancelled) setProgress(100);
        await sleep(400);

        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Initialization notice");
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authUser]);

  return { ready, progress, error };
}
