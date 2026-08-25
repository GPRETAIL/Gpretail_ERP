import { useState, useRef, useEffect } from "react";

const THRESHOLD = 70;
const MAX_PULL = 110;

/**
 * Pull-to-refresh gesture, observed at the window level since the mobile
 * app scrolls the whole page natively (.vx-ws-main has no scroll container
 * of its own - see workspace.css). Listeners are passive-only, so this
 * purely observes touches and never hijacks a screen's own scrollable
 * areas (e.g. the cart list in CreateInvoiceScreen).
 */
export default function usePullToRefresh(onRefresh) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const updatePullDistance = (value) => {
      pullDistanceRef.current = value;
      setPullDistance(value);
    };

    const handleTouchStart = (e) => {
      if (window.scrollY > 0 || isRefreshing) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const handleTouchMove = (e) => {
      if (!pullingRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0 || window.scrollY > 0) {
        updatePullDistance(0);
        return;
      }
      updatePullDistance(Math.min(delta * 0.5, MAX_PULL));
    };

    // Side effects (starting the refresh) live here, as plain statements in
    // a real event-handler callback -- NOT inside a setState updater, which
    // React calls during its render/reconciliation pass and expects to be
    // pure. Reading the ref (rather than the state closure) also sidesteps
    // any staleness from this effect not re-running on every pullDistance
    // change.
    const handleTouchEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      const shouldRefresh = pullDistanceRef.current >= THRESHOLD;
      updatePullDistance(0);
      if (shouldRefresh) {
        setIsRefreshing(true);
        Promise.resolve(onRefreshRef.current?.()).finally(() => setIsRefreshing(false));
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isRefreshing]);

  return { pullDistance, isRefreshing, threshold: THRESHOLD };
}
