import { flushSync } from "react-dom";

// The page's own background (the app shell carries it; body is transparent here).
const pageBackground = () => {
  for (const el of [document.querySelector(".erp-app-shell"), document.body]) {
    const color = el ? getComputedStyle(el).backgroundColor : "";
    if (color && color !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(color)) return color;
  }
  return "transparent";
};

/**
 * Switches light/dark with a pinch: the current page shrinks in and fades, and the new theme grows back out to
 * full size (keyframes in themeStyles.css). Uses the View Transitions API; browsers without it, or users who ask
 * for reduced motion, just switch instantly.
 */
export function switchThemeWithReveal(nextTheme, setTheme) {
  const apply = () => setTheme(nextTheme);
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (typeof document.startViewTransition !== "function" || reduceMotion) {
    apply();
    return;
  }
  const root = document.documentElement;
  root.classList.add("theme-pinch");
  document.startViewTransition(() => {
    flushSync(apply);
    // Behind the shrinking page: the new theme's own background, not a white gap.
    root.style.setProperty("--theme-pinch-bg", pageBackground());
  }).finished.finally(() => {
    root.classList.remove("theme-pinch");
    root.style.removeProperty("--theme-pinch-bg");
  });
}
