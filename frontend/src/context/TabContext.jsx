import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { navItems } from "../utils/navItems";

const TabContext = createContext(null);

const STORAGE_KEY = "erp_open_tabs";
const ACTIVE_KEY = "erp_active_tab_id";
const MAX_TABS = 8;

// Build a flat lookup: path -> name from navItems
const buildPathNameMap = () => {
  const map = {};
  for (const module of navItems) {
    if (module.path) map[module.path] = module.name;
    if (module.subItems) {
      for (const sub of module.subItems) {
        if (sub.path) map[sub.path] = sub.name;
      }
    }
  }
  return map;
};

const PATH_NAME_MAP = buildPathNameMap();

const getLocationPath = (locationLike) => {
  const pathname = String(locationLike?.pathname || "/dashboard");
  const search = String(locationLike?.search || "");
  const hash = String(locationLike?.hash || "");
  return `${pathname}${search}${hash}`;
};

const getPathnameOnly = (pathLike) => {
  const normalized = String(pathLike || "/dashboard").trim();
  const pathname = normalized.split(/[?#]/, 1)[0];
  return pathname || "/dashboard";
};

const getNameForPath = (pathname) => {
  const normalizedPath = getPathnameOnly(pathname);
  if (PATH_NAME_MAP[normalizedPath]) return PATH_NAME_MAP[normalizedPath];

  const segments = normalizedPath.split("/").filter(Boolean);
  for (let i = segments.length; i >= 1; i--) {
    const candidate = "/" + segments.slice(0, i).join("/");
    if (PATH_NAME_MAP[candidate]) return PATH_NAME_MAP[candidate];
  }

  const last = segments[segments.length - 1] || "Dashboard";
  return last
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const DASHBOARD_TAB = { id: "dashboard", name: "Dashboard", path: "/dashboard" };

const loadTabs = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed
          .map((tab) => {
            if (!tab || typeof tab !== "object") return null;
            const pathname = String(tab.path || tab.pathname || "").trim();
            if (!pathname) return null;
            return {
              id: String(tab.id || ""),
              name: String(tab.name || getNameForPath(pathname)).trim() || getNameForPath(pathname),
              path: pathname,
            };
          })
          .filter((tab) => tab?.id && tab?.path);

        if (normalized.length > 0) {
          const hasDashboard = normalized.some((t) => t.id === "dashboard");
          if (!hasDashboard) return [DASHBOARD_TAB, ...normalized.slice(0, MAX_TABS - 1)];
          return normalized.slice(0, MAX_TABS);
        }
      }
    }
  } catch {
    // ignore
  }
  return [DASHBOARD_TAB];
};

const loadActiveTabId = () => {
  try {
    return localStorage.getItem(ACTIVE_KEY) || "dashboard";
  } catch {
    return "dashboard";
  }
};

let tabIdCounter = Date.now();

export const TabProvider = ({ children }) => {
  const [tabs, setTabs] = useState(loadTabs);
  const [activeTabId, setActiveTabId] = useState(loadActiveTabId);
  const navigate = useNavigate();
  const location = useLocation();

  // Use refs so the location effect always reads the latest values
  const activeTabIdRef = useRef(activeTabId);

  // Keep ref in sync
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // Persist tabs to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeTabId);
  }, [activeTabId]);

  // Keep the active tab synced with the real browser location.
  useEffect(() => {
    const currentPath = getLocationPath(location);
    const currentActiveId = activeTabIdRef.current;
    setTabs((prev) =>
      prev.map((tab) => (tab.id === currentActiveId ? { ...tab, path: currentPath, name: getNameForPath(currentPath) } : tab))
    );
  }, [location]);

  const addTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) return;

    const newId = `tab-${++tabIdCounter}`;
    const currentPath = getLocationPath(location);
    const newTab = {
      id: newId,
      name: getNameForPath(currentPath),
      path: currentPath,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    activeTabIdRef.current = newId;
  }, [location, tabs.length]);

  const closeTab = useCallback(
    (id) => {
      if (id === "dashboard") return;

      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        if (idx === -1) return prev;

        const next = prev.filter((t) => t.id !== id);

        if (activeTabIdRef.current === id) {
          const newActive = next[Math.min(idx, next.length - 1)] || next[0];
          if (newActive) {
            setActiveTabId(newActive.id);
            activeTabIdRef.current = newActive.id;
            navigate(newActive.path);
          }
        }
        return next;
      });
    },
    [navigate]
  );

  const switchTab = useCallback(
    (id) => {
      if (id === activeTabIdRef.current) return;

      setTabs((prev) => {
        const tab = prev.find((t) => t.id === id);
        if (!tab) return prev;

        setActiveTabId(id);
        activeTabIdRef.current = id;
        navigate(tab.path);
        return prev;
      });
    },
    [navigate]
  );

  const moveTab = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;

    setTabs((prev) => {
      const fromIndex = prev.findIndex((tab) => tab.id === fromId);
      const toIndex = prev.findIndex((tab) => tab.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const next = [...prev];
      const [movedTab] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedTab);
      return next;
    });
  }, []);

  const navigateActiveTab = useCallback((to, options) => {
    navigate(to, options);
  }, [navigate]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0] || DASHBOARD_TAB;
  const activeTabPath = activeTab?.path || "/dashboard";

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTabId,
        activeTabPath,
        addTab,
        closeTab,
        switchTab,
        moveTab,
        navigateActiveTab,
      }}
    >
      {children}
    </TabContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTabs = () => {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTabs must be used within TabProvider");
  return ctx;
};
