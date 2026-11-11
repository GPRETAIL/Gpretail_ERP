import { useCallback, useEffect, useState } from "react";

const KEY = "vx_staff_theme";
const darkQuery = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null);

function readPreference() {
  try {
    const saved = localStorage.getItem(KEY);
    return ["light", "dark", "system"].includes(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

/** The staff app's theme: the phone's setting by default, or Light / Dark chosen on Me (kept on this phone). */
export default function useStaffTheme() {
  const [preference, setPreferenceState] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(() => Boolean(darkQuery()?.matches));

  useEffect(() => {
    const query = darkQuery();
    if (!query) return undefined;
    const change = (e) => setSystemDark(e.matches);
    query.addEventListener?.("change", change);
    return () => query.removeEventListener?.("change", change);
  }, []);

  const setPreference = useCallback((value) => {
    setPreferenceState(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
  }, []);

  const mode = preference === "system" ? (systemDark ? "dark" : "light") : preference;
  return { preference, setPreference, mode };
}
