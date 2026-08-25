import { useState, useCallback } from "react";

const FONT_SCALE_KEY = "vx_font_scale";
const HIGH_CONTRAST_KEY = "vx_high_contrast";

// Most of this app's text is set with fixed-px Tailwind classes
// (text-[11px] etc.) rather than the rem-based type scale, so changing the
// root font-size barely moves anything - a real CSS `zoom` on the whole
// workspace is the only lever that visibly and uniformly scales every
// screen. Verified live that fixed-position children (BottomNav, modals)
// stay correctly anchored under it - Chromium remaps the zoomed subtree's
// own viewport, it isn't a naive transform: scale().
const ZOOM_BY_SCALE = { small: 0.9, medium: 1, large: 1.15 };

/**
 * Mobile-only display accessibility preferences: text size and a
 * high-contrast palette. Persisted locally, applied by MobileAppV2 to the
 * .vx-workspace root(s) rather than touching the shared desktop ThemeProvider.
 */
export default function useDisplayPrefs() {
  const [fontScale, setFontScaleState] = useState(
    () => localStorage.getItem(FONT_SCALE_KEY) || "medium"
  );
  const [highContrast, setHighContrastState] = useState(
    () => localStorage.getItem(HIGH_CONTRAST_KEY) === "1"
  );

  const setFontScale = useCallback((scale) => {
    setFontScaleState(scale);
    localStorage.setItem(FONT_SCALE_KEY, scale);
  }, []);

  const setHighContrast = useCallback((value) => {
    setHighContrastState(value);
    localStorage.setItem(HIGH_CONTRAST_KEY, value ? "1" : "0");
  }, []);

  return {
    fontScale,
    setFontScale,
    highContrast,
    setHighContrast,
    zoom: ZOOM_BY_SCALE[fontScale] || 1,
  };
}
