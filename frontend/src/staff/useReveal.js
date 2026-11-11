import { useCallback, useEffect, useState } from "react";

export const REVEAL_SECONDS = 15;
export const MASKED_AMOUNT = "₹ ••••••";

/**
 * Salary figures stay hidden until the employee taps "Show amounts", then hide again after
 * `seconds` (or as soon as the app goes to the background), so a phone left on the counter or
 * handed to a colleague doesn't show their pay.
 */
export default function useReveal(seconds = REVEAL_SECONDS) {
  const [left, setLeft] = useState(0);
  const shown = left > 0;

  useEffect(() => {
    if (!shown) return undefined;
    const timer = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [shown]);

  useEffect(() => {
    const hideWhenAway = () => { if (document.hidden) setLeft(0); };
    document.addEventListener("visibilitychange", hideWhenAway);
    return () => document.removeEventListener("visibilitychange", hideWhenAway);
  }, []);

  const toggle = useCallback(() => setLeft((n) => (n > 0 ? 0 : seconds)), [seconds]);
  return { shown, left, toggle };
}
