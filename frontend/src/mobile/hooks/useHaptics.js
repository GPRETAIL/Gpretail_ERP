const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

const PATTERNS = {
  tap: 15,
  success: [40, 60, 40],
  error: [80, 40, 80],
  scan: 100,
};

// Pure and stateless - defined once at module scope rather than inside the
// hook, so every useHaptics() call returns the same function reference
// (safe to drop straight into a useCallback/useEffect dependency array
// without it forcing a re-memo on every render).
const vibrate = (pattern = "tap") => {
  if (!canVibrate) return;
  const value = typeof pattern === "string" ? PATTERNS[pattern] || PATTERNS.tap : pattern;
  navigator.vibrate(value);
};

/**
 * Wraps navigator.vibrate behind named patterns so call sites read as
 * intent ("success", "error") rather than raw millisecond numbers, and so
 * there's one place to adjust feel later. No-ops silently on devices/
 * browsers without vibration support (desktop, iOS Safari).
 */
export default function useHaptics() {
  return { vibrate };
}
