import { useCallback, useState } from "react";

/** The billing screens that take the whole window: no side menu, no top bar, only this slim bar and the status strip below. */
export const POS_FOCUS_PATHS = ["/sales/pos-sales", "/sales/touch-sales", "/sales/pos-old"];
const PREFERENCE_KEY = "vx:pos-focus";
export const POS_FOCUS_TITLES = { "/sales/pos-sales": "POS Sale", "/sales/touch-sales": "Touch Sale", "/sales/pos-old": "POS Old" };

/** Whether the person turned the full-window billing view off. On unless they chose otherwise; kept per browser. */
export const usePosFocusPreference = () => {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(PREFERENCE_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const update = useCallback((next) => {
    setOn(next);
    try {
      localStorage.setItem(PREFERENCE_KEY, next ? "on" : "off");
    } catch {
      // The choice only lasts until the page is reloaded.
    }
  }, []);
  return [on, update];
};
