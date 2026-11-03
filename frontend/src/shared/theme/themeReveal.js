import { flushSync } from "react-dom";

const DURATION_MS = 420;
const EASING = "cubic-bezier(0.55, 0, 0.45, 1)";

/**
 * Switches light/dark with a circular reveal: the new theme grows out of the clicked toggle as a circle until it
 * covers the page, both ways. Uses the View Transitions API; browsers without it, or users who ask for reduced
 * motion, just switch instantly.
 */
export function switchThemeWithReveal(event, nextTheme, setTheme) {
  const apply = () => setTheme(nextTheme);
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (typeof document.startViewTransition !== "function" || reduceMotion) {
    apply();
    return;
  }

  const rect = event?.currentTarget?.getBoundingClientRect?.();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
  const y = rect ? rect.top + rect.height / 2 : 20;
  // Far enough to reach the furthest corner of the screen.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const root = document.documentElement;
  root.classList.add("theme-reveal");
  const transition = document.startViewTransition(() => flushSync(apply));
  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: DURATION_MS, easing: EASING, pseudoElement: "::view-transition-new(root)" }
    );
  }).catch(() => {});
  transition.finished.finally(() => root.classList.remove("theme-reveal"));
}
