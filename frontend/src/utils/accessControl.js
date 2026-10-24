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
  "warehouse", "crm", "sales", "finance", "store", "analytical", "masters", "hrms", "settings", "dashboard",
]);

const firstSegment = (pathname) => {
  const path = String(pathname || "").toLowerCase();
  return path.startsWith("/") ? path.slice(1).split("/")[0] : "";
};

export const isTenantAdmin = (user) =>
  user?.role === USER_ROLE.ADMIN && user?.is_tenant_admin === true;

// The API's capability is authoritative; older sessions use only their assigned store IDs.
export const canSwitchStores = (user) => {
  if (typeof user?.can_switch_stores === "boolean") return user.can_switch_stores;
  if (String(user?.role || "").toLowerCase() === USER_ROLE.SUPER_ADMIN || isTenantAdmin(user)) return true;
  const ids = Array.isArray(user?.store_ids) ? user.store_ids : user?.company_ids;
  return Array.isArray(ids) && new Set(ids.map(String).filter((id) => /^[1-9]\d*$/.test(id))).size > 1;
};

const canManageThemes = user => isTenantAdmin(user) || user?.role === USER_ROLE.SUPER_ADMIN || (user?.role === USER_ROLE.ADMIN && user?.theme_override_allowed === true);

// Account administration remains reachable when no store or business plan is active.
const isTenantManagementPath = (user, path) => isTenantAdmin(user) &&
  ["/settings", "/settings/company", "/settings/themes", "/settings/branding"].includes(path);

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
  if (canManageThemes(user) && ["/settings", "/settings/themes", "/settings/branding"].includes(String(pathname || "").toLowerCase().replace(/\/+$/, ""))) return true;
  if (isTenantManagementPath(user, String(pathname || "").toLowerCase().replace(/\/+$/, ""))) return true;
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
      const originalSubItems = item.subItems || [];
      if (originalSubItems.length === 0) {
        return MODULE_SLUGS.has(slug) && !isSectionEntitled(sections, slug) ? null : item;
      }
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

const getPagePermissions = (user) => {
  const permissions = normalizeStoredPagePermissions(user?.effective_page_permissions ?? user?.page_permissions);
  return Object.fromEntries(Object.entries(permissions).filter(([path]) =>
    isPathEntitled(user, path) && (!user?.module_permissions || user.module_permissions[firstSegment(path)]?.view === true)
  ));
};

const hasPagePermissionMode = (user) => {
  const role = String(user?.role || "").toLowerCase();
  if (role === USER_ROLE.SUPER_ADMIN || role === USER_ROLE.OWNER || isTenantAdmin(user)) return false;
  const explicit = user?.effective_page_permissions ?? user?.page_permissions;
  return explicit != null || (role === USER_ROLE.USER && Object.keys(getPagePermissions(user)).length > 0);
};

const getVisiblePermissionSections = (user) =>
  buildVisibleSectionsFromPermissions(getPagePermissions(user));

const getCapability = (user) => {
  const role = String(user?.role || USER_ROLE.USER).toLowerCase();
  const access = new Set(normalizeAccessRoles(user?.access_roles));
  const isOwner = role === USER_ROLE.OWNER;
  const isSuperAdmin = role === USER_ROLE.SUPER_ADMIN;
  const isAdmin = role === USER_ROLE.ADMIN;
  const isManager = role === "manager" || access.has("manager");
  const hasWarehouse = access.has("warehouse");
  const hasSales = access.has("sales");
  const hasPurchase = access.has("purchase");

  return {
    role,
    isOwner,
    isSuperAdmin,
    isAdmin,
    canManageCompany: isSuperAdmin || isTenantAdmin(user),
    canAll: isSuperAdmin || isAdmin || isManager,
    canWarehouse: isSuperAdmin || isAdmin || isManager || hasWarehouse || hasPurchase,
    canSales: isSuperAdmin || isAdmin || isManager || hasSales,
    canFinance: isSuperAdmin || isAdmin || isManager || hasPurchase,
    canCRM: isSuperAdmin || isAdmin || isManager,
    canStore: isSuperAdmin || isAdmin || isManager,
    canAnalytical: isSuperAdmin || isAdmin || isManager,
    canMasters: isSuperAdmin || isAdmin || isManager,
    canHrms: isSuperAdmin || isAdmin || isManager,
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
    if (!visibleSections.length) return "/profile";
    if (visibleSections.length > 1) return "/modules";
    return getUserDefaultPathFromPermissions(getPagePermissions(user));
  }
  if (user?.module_permissions) {
    const homes = { dashboard: "/dashboard", masters: "/masters/product", sales: "/sales/pos-sales", warehouse: "/warehouse/invoice", crm: "/crm/customer", finance: "/finance/supplier-payment", store: "/store/dashboard", analytical: "/analytical/dashboard", hrms: "/hrms/attendance", settings: "/settings/application-settings" };
    return Object.entries(homes).find(([module, path]) => user.module_permissions[module]?.view && canAccessPath(path, user))?.[1] || "/profile";
  }
  return "/dashboard";
};

export const canAccessPath = (pathname, user) => {
  const path = String(pathname || "").toLowerCase();
  if (["/settings", "/settings/themes", "/settings/branding"].includes(path) && canManageThemes(user)) return true;
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

  if (path === "/profile" || path === "/remote-support" || path === "/settings/remote-support") return true;
  if (path.startsWith("/owner")) return cap.isOwner;
  if (cap.isOwner) return false;
  if (path === "/" || path === "/dashboard") return !user?.module_permissions || user.module_permissions.dashboard?.view === true;
  if (path === "/user-access") return canAccessUserAccess(user);
  if (path.startsWith("/user-access")) return canAccessUserAccess(user);
  const module = firstSegment(path);
  if (user?.module_permissions && module === "settings" && !user.module_permissions.settings?.view && !isTenantManagementPath(user, path)) return false;
  if (user?.module_permissions && MODULE_SLUGS.has(module) && module !== "settings") {
    return user.module_permissions[module]?.view === true;
  }

  if (path.startsWith("/settings/company")) return cap.canManageCompany;
  // /settings/branding redirects to /settings/themes (RedirectPreservingQuery in
  // protectedLayoutRoutes.jsx) -- both must gate identically, or an old bookmarked link 302s into
  // a second bounce once ProtectedRoute re-checks the destination path.
  if (path.startsWith("/settings/branding") || path.startsWith("/settings/themes")) return canManageThemes(user);
  if (path.startsWith("/settings/configure-local-server")) return cap.canSettings;
  if (path.startsWith("/settings")) return cap.canSettings;
  if (cap.canAll) return true;

  if (path.startsWith("/warehouse")) return cap.canWarehouse;
  if (path.startsWith("/sales")) return cap.canSales;
  if (path.startsWith("/finance")) return cap.canFinance;
  if (path.startsWith("/crm")) return cap.canCRM;
  if (path.startsWith("/store")) return cap.canStore;
  if (path.startsWith("/analytical")) return cap.canAnalytical;
  if (path.startsWith("/masters")) return cap.canMasters;
  if (path.startsWith("/hrms")) return cap.canHrms;

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
    if (canManageThemes(user)) {
      const settings = (items || []).find(item => item.path === "/settings");
      const themes = settings?.subItems?.find(item => item.path === "/settings/themes");
      if (settings && themes) {
        const existing = permitted.find(item => item.path === settings.path);
        if (existing && !existing.subItems.some(item => item.path === themes.path)) existing.subItems.push(themes);
        else if (!existing) permitted.push({ ...settings, subItems: [themes] });
      }
    }
    return filterNavByEntitlement(permitted, user);
  }

  const cap = getCapability(user);

  if (cap.isOwner) {
    return items;
  }
  if (user?.module_permissions) {
    return filterNavByEntitlement((items || []).map(item => {
      if (!item.subItems?.length) return canAccessPath(item.path, user) ? item : null;
      const subItems = item.subItems.filter(subItem => canAccessPath(subItem.path, user));
      return subItems.length ? { ...item, subItems } : null;
    }).filter(Boolean), user);
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
      cap.canHrms && "HRMS",
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
        if (subPath === "/settings/company") return cap.canManageCompany;
        if (subPath === "/settings/themes") return canManageThemes(user);
        return cap.canSettings;
      });

      return { ...item, subItems };
    });

  return filterNavByEntitlement(visible, user);
};
