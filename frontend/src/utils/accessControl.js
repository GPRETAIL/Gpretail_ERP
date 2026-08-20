import {
  buildVisibleSectionsFromPermissions,
  canReadFromPermission,
  getMatchingPermissionForPath,
  getUserDefaultPathFromPermissions,
  normalizePagePermissions as normalizeStoredPagePermissions,
} from "./pagePermissionCatalog";

export const USER_ROLE = {
  OWNER: "owner",
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  USER: "user",
};

// Company-level module entitlements (set by the super admin per store, carried
// on the auth user as `entitlements`). Absent => unrestricted (owner, super
// admin, or legacy companies). Shape: { sections: { "<slug>": "all" | [paths] } }
const MODULE_SLUGS = new Set([
  "warehouse", "crm", "sales", "finance", "store", "analytical", "masters", "settings", "dashboard",
]);

const firstSegment = (pathname) => {
  const path = String(pathname || "").toLowerCase();
  return path.startsWith("/") ? path.slice(1).split("/")[0] : "";
};

const getEntitlementSections = (user) => {
  const entitlements = user?.entitlements;
  const sections = entitlements && typeof entitlements === "object" ? entitlements.sections : null;
  return sections && typeof sections === "object" && !Array.isArray(sections) ? sections : null;
};

const isSectionEntitled = (sections, slug) => {
  const value = sections[slug];
  if (value === "all") return true;
  return Array.isArray(value) && value.length > 0;
};

export const isPathEntitled = (user, pathname) => {
  const sections = getEntitlementSections(user);
  if (!sections) return true;
  const slug = firstSegment(pathname);
  if (!MODULE_SLUGS.has(slug)) return true;
  const value = sections[slug];
  if (value === "all") return true;
  if (Array.isArray(value)) {
    return value.includes(String(pathname || "").toLowerCase().replace(/\/+$/, ""));
  }
  return false;
};

const filterNavByEntitlement = (items, user) => {
  const sections = getEntitlementSections(user);
  if (!sections) return items;
  return (items || [])
    .map((item) => {
      const slug = firstSegment(item.path);
      if (MODULE_SLUGS.has(slug) && !isSectionEntitled(sections, slug)) return null;
      const originalSubItems = item.subItems || [];
      if (originalSubItems.length === 0) return item;
      const subItems = originalSubItems.filter((subItem) => isPathEntitled(user, subItem.path));
      if (subItems.length === 0) return null;
      return { ...item, subItems };
    })
    .filter(Boolean);
};

export const normalizeAccessRoles = (input) => {
  if (!Array.isArray(input)) return [];
  return [...new Set(
    input
      .map((v) => String(v || "").trim().toLowerCase())
      .filter(Boolean)
  )];
};

const getPagePermissions = (user) =>
  normalizeStoredPagePermissions(user?.effective_page_permissions || user?.page_permissions);

const hasPagePermissionMode = (user) => {
  const role = String(user?.role || "").toLowerCase();
  if (role !== USER_ROLE.USER) return false;
  return Object.keys(getPagePermissions(user)).length > 0;
};

const getVisiblePermissionSections = (user) =>
  buildVisibleSectionsFromPermissions(getPagePermissions(user));

const getCapability = (user) => {
  const role = String(user?.role || USER_ROLE.USER).toLowerCase();
  const access = new Set(normalizeAccessRoles(user?.access_roles));
  const isOwner = role === USER_ROLE.OWNER;
  const isSuperAdmin = role === USER_ROLE.SUPER_ADMIN;
  const isAdmin = role === USER_ROLE.ADMIN;
  const isManager = access.has("manager");
  const hasWarehouse = access.has("warehouse");
  const hasSales = access.has("sales");
  const hasPurchase = access.has("purchase");

  return {
    role,
    isOwner,
    isSuperAdmin,
    isAdmin,
    canAll: isSuperAdmin || isAdmin || isManager,
    canWarehouse: isSuperAdmin || isAdmin || isManager || hasWarehouse || hasPurchase,
    canSales: isSuperAdmin || isAdmin || isManager || hasSales,
    canFinance: isSuperAdmin || isAdmin || isManager || hasPurchase,
    canCRM: isSuperAdmin || isAdmin || isManager,
    canStore: isSuperAdmin || isAdmin || isManager,
    canAnalytical: isSuperAdmin || isAdmin || isManager,
    canMasters: isSuperAdmin || isAdmin || isManager,
    canSettings: isSuperAdmin || isAdmin,
  };
};

export const canAccessUserAccess = (user) => {
  if (String(user?.role || "").toLowerCase() === USER_ROLE.OWNER) return false;
  const { isSuperAdmin, isAdmin } = getCapability(user);
  return isSuperAdmin || isAdmin;
};

export const getHomePathForUser = (user) => {
  const role = String(user?.role || "").toLowerCase();
  if (role === USER_ROLE.OWNER) return "/owner/dashboard";
  if (hasPagePermissionMode(user)) {
    const visibleSections = getVisiblePermissionSections(user);
    if (visibleSections.length > 1) return "/modules";
    return getUserDefaultPathFromPermissions(getPagePermissions(user));
  }
  return "/dashboard";
};

export const canAccessPath = (pathname, user) => {
  const path = String(pathname || "").toLowerCase();
  // Company module entitlement gates every module path, regardless of RBAC.
  if (!isPathEntitled(user, path)) return false;
  if (hasPagePermissionMode(user)) {
    if (path === "/profile") return true;
    if (path === "/modules") {
      return getVisiblePermissionSections(user).length > 0;
    }
    // Dashboard is grantable per tab (see DASHBOARD_PAGES), so a page-permission user reaches it
    // when they hold at least one of those grants. This used to be a flat deny, which made the
    // Dashboard entitlement unusable: it could be ticked in Page Access and still never open.
    // "/" stays denied — it redirects, and getHomePathForUser decides where.
    if (path === "/dashboard") {
      return Object.keys(getPagePermissions(user)).some((key) =>
        String(key).toLowerCase().startsWith("/dashboard")
      );
    }
    if (path === "/") return false;
    if (path.startsWith("/owner") || path.startsWith("/user-access")) return false;

    const visibleSections = getVisiblePermissionSections(user);
    if (visibleSections.some((section) => section.path?.toLowerCase() === path)) return true;
    return canReadFromPermission(getMatchingPermissionForPath(getPagePermissions(user), path));
  }

  const cap = getCapability(user);

  if (path === "/profile") return true;
  if (path.startsWith("/owner")) return cap.isOwner;
  if (cap.isOwner) return false;
  if (path === "/" || path === "/dashboard") return true;
  if (path === "/user-access") return canAccessUserAccess(user);
  if (path.startsWith("/user-access")) return canAccessUserAccess(user);

  if (path.startsWith("/settings/company")) return cap.isSuperAdmin;
  if (path.startsWith("/settings/branding")) return cap.isSuperAdmin;
  if (path.startsWith("/settings/configure-local-server")) return cap.isAdmin;
  if (path.startsWith("/settings")) return cap.canSettings;
  if (cap.canAll) return true;

  if (path.startsWith("/warehouse")) return cap.canWarehouse;
  if (path.startsWith("/sales")) return cap.canSales;
  if (path.startsWith("/finance")) return cap.canFinance;
  if (path.startsWith("/crm")) return cap.canCRM;
  if (path.startsWith("/store")) return cap.canStore;
  if (path.startsWith("/analytical")) return cap.canAnalytical;
  if (path.startsWith("/masters")) return cap.canMasters;

  return false;
};

export const getVisibleNavItems = (items, user) => {
  if (hasPagePermissionMode(user)) {
    const allowedByPath = new Map(
      buildVisibleSectionsFromPermissions(getPagePermissions(user)).map((section) => [section.path, section])
    );
    const permitted = (items || [])
      .map((item) => {
        const matched = allowedByPath.get(item.path);
        if (!matched) return null;
        return {
          ...item,
          subItems: matched.subItems,
        };
      })
      .filter(Boolean);
    return filterNavByEntitlement(permitted, user);
  }

  const cap = getCapability(user);

  if (cap.isOwner) {
    return items;
  }

  const allowedTopByName = new Set(
    [
      cap.canWarehouse && "Warehouse",
      cap.canCRM && "CRM",
      cap.canSales && "Sales",
      cap.canFinance && "Finance",
      cap.canStore && "Store",
      cap.canAnalytical && "Analytical",
      cap.canMasters && "Masters",
      canAccessUserAccess(user) && "User Access",
      cap.canSettings && "Settings",
    ].filter(Boolean)
  );

  const visible = (items || [])
    .filter((item) => {
      if (item.name === "Dashboard") return canAccessPath(item.path, user);
      return allowedTopByName.has(item.name);
    })
    .map((item) => {
      if (item.name !== "Settings") return item;

      const subItems = (item.subItems || []).filter((subItem) => {
        const subPath = String(subItem.path || "").toLowerCase();
        if (subPath === "/settings/company") return cap.isSuperAdmin;
        if (subPath === "/settings/branding") return cap.isSuperAdmin;
        if (subPath === "/settings/configure-local-server") return cap.isAdmin;
        return cap.canSettings;
      });

      return { ...item, subItems };
    });

  return filterNavByEntitlement(visible, user);
};
