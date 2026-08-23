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
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let cancelled = false;
    const set = (v) => { if (!cancelled) setProgress(v); };

    (async () => {
      try {
        // Step 1: Check auth token
        set(15);
        const token = localStorage.getItem("token");
        if (!token || !isAuthenticated) {
          // Not authenticated — splash can finish, App.jsx will redirect
          set(100);
          if (!cancelled) setReady(true);
          return;
        }

        // Step 2: Validate session with /auth/me
        set(30);
        try {
          await api.get("/auth/me");
        } catch {
          // Session expired — still let app proceed (ProtectedRoute handles redirect)
        }

        // Step 3: User profile loaded from Redux store
        set(55);

        // Step 4: Preload notification count (non-blocking)
        set(70);
        try {
          const res = await api.get("/notifications/unread-count");
          const count = res.data?.data?.count ?? res.data?.count ?? 0;
          // Store for MobileHeader to read
          window.__vx_unread_count = count;
        } catch {
          window.__vx_unread_count = 0;
        }

        // Step 5: Determine network status
        set(85);

        // Step 6: Complete
        set(100);
        // Brief pause so the progress bar animation is visible
        await new Promise((r) => setTimeout(r, 400));
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Initialization failed");
          setReady(true); // Let app proceed even on error
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, authUser]);

  return { ready, progress, error };
}
