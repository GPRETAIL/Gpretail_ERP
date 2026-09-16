/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../api/axios";

const DashboardLayoutContext = createContext(null);

const SAVE_DEBOUNCE_MS = 800;

export const DashboardLayoutProvider = ({ children }) => {
  const [layouts, setLayouts] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const saveTimers = useRef({});

  useEffect(() => {
    let alive = true;
    api
      .get("/dashboard/layout")
      .then((res) => {
        if (!alive) return;
        setLayouts(res.data?.data || {});
      })
      .catch(() => {
        // Non-critical: every tab falls back to its own default layout.
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const saveLayout = useCallback((tabKey, layout) => {
    setLayouts((prev) => ({ ...prev, [tabKey]: layout }));
    clearTimeout(saveTimers.current[tabKey]);
    saveTimers.current[tabKey] = setTimeout(async () => {
      try {
        await api.put(`/dashboard/layout/${tabKey}`, { layout });
      } catch {
        // Non-critical: the layout stays applied client-side for this session even if the
        // save failed; the next successful save will retry with the latest arrangement.
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const resetLayout = useCallback(async (tabKey) => {
    setLayouts((prev) => {
      const next = { ...prev };
      delete next[tabKey];
      return next;
    });
    try {
      await api.delete(`/dashboard/layout/${tabKey}`);
    } catch {
      // Non-critical: the tab already reset to its default client-side.
    }
  }, []);

  const value = { layouts, loaded, editMode, setEditMode, saveLayout, resetLayout };

  return <DashboardLayoutContext.Provider value={value}>{children}</DashboardLayoutContext.Provider>;
};

export const useDashboardLayout = () => {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) throw new Error("useDashboardLayout must be used within DashboardLayoutProvider");
  return ctx;
};
