import { navItems } from "./navItems";
import { DASHBOARD_PAGES } from "./dashboardModuleTabs";

export const PERMISSION_ACTIONS = ["view", "add", "edit", "delete"];
export const ASSIGNABLE_SECTION_NAMES = [
  "Dashboard",
  "Warehouse",
  "CRM",
  "Sales",
  "Finance",
  "Store",
  "Analytical",
  "Masters",
  "Settings",
];

// Wildcard grant meaning "every page" — what a store admin carries, so their access does not have to
// be re-enumerated every time a page is added to the catalogue. Must match the backend's
// PageAccessHelper.FULL_ACCESS_PATH / RouteAccessPolicy.FULL_ACCESS_PATH.
export const FULL_ACCESS_PATH = "*";

export const normalizePagePermissions = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const next = {};
  for (const [rawPath, rawValue] of Object.entries(input)) {
    const path = String(rawPath || "").trim().toLowerCase().replace(/\/+$/, "");
    // Without this the wildcard is silently dropped, and a store admin's full access renders as an
    // empty grid — which then saves back as "no access at all".
    if (path === FULL_ACCESS_PATH) {
      const actions = {};
      for (const action of PERMISSION_ACTIONS) actions[action] = rawValue?.[action] === true;
      if (PERMISSION_ACTIONS.some((action) => actions[action])) next[FULL_ACCESS_PATH] = actions;
      continue;
    }
    if (!path.startsWith("/")) continue;
    const actions = {};
    for (const action of PERMISSION_ACTIONS) {
      actions[action] = rawValue?.[action] === true;
    }
    if (PERMISSION_ACTIONS.some((action) => actions[action])) {
      next[path || "/"] = actions;
    }
  }
  return next;
};

export const createEmptyPermissionMap = () => ({});

export const getAssignableNavItems = () =>
  (navItems || [])
    .filter((item) => ASSIGNABLE_SECTION_NAMES.includes(item.name))
    .map((item) => ({
      ...item,
      // Dashboard is a direct link, not a submenu group, so nav gives it no subItems — but its tab
      // bar is really nine separate views. Expose those as its pages so access can be granted per
      // tab (Overview / Warehouse / Sales / ...) rather than all-or-nothing on the whole screen.
      // Any other section without subItems still needs one representative page, otherwise
      // entitlementsFromPermissions can never emit a grant for it (it skips zero-page sections).
      subItems: Array.isArray(item.subItems)
        ? item.subItems.filter((subItem) => subItem?.path)
        : item.name === "Dashboard"
          ? DASHBOARD_PAGES.map((page) => ({ name: page.name, path: page.path }))
          : item.path
            ? [{ name: item.name, path: item.path }]
            : [],
    }));

export const getPermissionCatalog = () =>
  getAssignableNavItems().map((section) => ({
    name: section.name,
    path: section.path,
    pages: (section.subItems || []).map((page) => ({
      name: page.name,
      path: page.path,
    })),
  }));

// Converts a Page Access permission map ({ "/path": {view,...} }) into the company entitlement shape
// ({ sections: { <slug>: "all" | ["/page", ...] } }) used by the store module ceiling. A section is
// "all" when every one of its pages is view-granted, else the list of view-granted page paths. The
// section slug is the assignable nav-item name lower-cased (Warehouse -> warehouse, CRM -> crm).
export const entitlementsFromPermissions = (permissions) => {
  const normalized = normalizePagePermissions(permissions);
  const sections = {};
  for (const section of getPermissionCatalog()) {
    const slug = section.name.toLowerCase();
    const pages = section.pages.map((page) => page.path);
    if (pages.length === 0) continue;
    const granted = pages.filter((path) => normalized[path]?.view);
    if (granted.length === 0) continue;
    sections[slug] = granted.length === pages.length ? "all" : granted;
  }
  return { sections };
};

// Inverse of entitlementsFromPermissions: seeds a Page Access permission map (view-only) from a stored
// entitlement map so the matrix can render an existing store's module access.
export const permissionsFromEntitlements = (entitlements) => {
  const sectionsRaw = entitlements && typeof entitlements === "object" ? entitlements.sections : null;
  const permissions = {};
  if (!sectionsRaw || typeof sectionsRaw !== "object") return permissions;
  for (const section of getPermissionCatalog()) {
    const slug = section.name.toLowerCase();
    const value = sectionsRaw[slug];
    if (value === undefined || value === null) continue;
    const pages = section.pages.map((page) => page.path);
    const grantedPaths = value === "all" ? pages : Array.isArray(value) ? value : [];
    for (const path of grantedPaths) {
      permissions[path] = { view: true, add: false, edit: false, delete: false };
    }
  }
  return permissions;
};

export const getMatchingPermissionForPath = (permissions, pathname) => {
  const normalizedPermissions = normalizePagePermissions(permissions);
  const path = String(pathname || "").trim().toLowerCase().replace(/\/+$/, "");
  const entries = Object.entries(normalizedPermissions)
    .filter(([basePath]) => basePath !== FULL_ACCESS_PATH && (path === basePath || path.startsWith(`${basePath}/`)))
    .sort((a, b) => b[0].length - a[0].length);
  // An explicit page grant wins; otherwise the wildcard answers for every page, so one carved-out
  // page can narrow a store admin without unpicking the rest.
  return entries[0]?.[1] || normalizedPermissions[FULL_ACCESS_PATH] || null;
};

export const canReadFromPermission = (permission) => Boolean(permission?.view || permission?.edit || permission?.delete);

export const buildVisibleSectionsFromPermissions = (permissions) => {
  const normalizedPermissions = normalizePagePermissions(permissions);
  // The wildcard has to answer here too, or a store admin signs in to an empty sidebar.
  const wildcard = normalizedPermissions[FULL_ACCESS_PATH];
  return getAssignableNavItems()
    .map((section) => {
      const subItems = (section.subItems || []).filter((page) =>
        canReadFromPermission(normalizedPermissions[page.path] || wildcard));
      if (!subItems.length) return null;
      return {
        ...section,
        subItems,
      };
    })
    .filter(Boolean);
};

export const getUserDefaultPathFromPermissions = (permissions) => {
  const visibleSections = buildVisibleSectionsFromPermissions(permissions);
  if (!visibleSections.length) return "/dashboard";
  const totalPages = visibleSections.reduce((sum, section) => sum + section.subItems.length, 0);
  if (totalPages === 1) {
    return visibleSections[0].subItems[0].path;
  }
  return visibleSections[0].path || visibleSections[0].subItems[0].path;
};

// --- store-admin full access -------------------------------------------------
// A store admin runs their whole store, so their grant is stored as the single wildcard row rather
// than every page enumerated — the catalogue below is the only place that knows what "every page"
// currently means, and it grows over time.

export const hasFullAccess = (permissions) =>
  Boolean(normalizePagePermissions(permissions)[FULL_ACCESS_PATH]?.view);

/**
 * Turns the wildcard into an explicit, editable grid — every catalogue page granted outright. Used
 * the moment an operator chooses to narrow a store admin, so they start from what the admin can do
 * today and take things away, rather than from a blank grid.
 */
export const expandFullAccess = () => {
  const permissions = {};
  for (const section of getPermissionCatalog()) {
    for (const page of section.pages) {
      if (!page.path) continue;
      permissions[page.path] = { view: true, add: true, edit: true, delete: true };
    }
  }
  return normalizePagePermissions(permissions);
};

/** Collapses back to the wildcard, so later-added pages are covered again. */
export const collapseToFullAccess = () => ({
  [FULL_ACCESS_PATH]: { view: true, add: true, edit: true, delete: true },
});
