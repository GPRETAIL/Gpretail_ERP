import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72;
const MAX_PULL = 110;

/**
 * Pull down from the top of the page to refresh (the gesture every phone app has). Only starts when the page is
 * scrolled to the top, with one finger, and not inside a sheet. Returns how far it is pulled and whether it is refreshing.
 */
export default function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pullRef = useRef(0);
  const busy = useRef(false);
  const refresh = useRef(onRefresh);
  useEffect(() => {
    refresh.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onStart = (event) => {
      const inSheet = event.target?.closest?.('[role="dialog"]');
      startY.current = !busy.current && !inSheet && window.scrollY <= 0 && event.touches.length === 1 ? event.touches[0].clientY : null;
    };
    const onMove = (event) => {
      if (startY.current === null) return;
      const distance = event.touches[0].clientY - startY.current;
      if (distance <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        if (window.scrollY > 0) startY.current = null;
        return;
      }
      pullRef.current = Math.min(distance * 0.5, MAX_PULL);
      setPull(pullRef.current);
    };
    const onEnd = async () => {
      const reached = pullRef.current >= THRESHOLD;
      startY.current = null;
      pullRef.current = 0;
      setPull(0);
      if (!reached || busy.current) return;
      busy.current = true;
      setRefreshing(true);
      try {
        await refresh.current?.();
      } finally {
        busy.current = false;
        setRefreshing(false);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);

  return { pull, refreshing, ready: pull >= THRESHOLD };
}
