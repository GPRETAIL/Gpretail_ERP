import { useRef, useCallback } from "react";

/**
 * Pull-to-refresh gesture for mobile screens.
 * Returns { pullHandlers, refreshing } — attach pullHandlers to the scroll container.
 */
export default function usePullToRefresh(onRefresh) {
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (!pulling.current) return;
      pulling.current = false;
      const diff = e.changedTouches[0].clientY - startY.current;
      if (diff > 80 && typeof onRefresh === "function") {
        onRefresh();
      }
    },
    [onRefresh]
  );

  return {
    pullHandlers: { onTouchStart, onTouchEnd },
  };
}
