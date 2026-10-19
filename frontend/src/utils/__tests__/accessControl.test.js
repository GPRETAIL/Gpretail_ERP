import { describe, expect, it } from "vitest";
import { canAccessPath, getHomePathForUser, getVisibleNavItems } from "../accessControl";

it("uses tenant-assigned module grants for staff navigation without opening administration", () => {
  const user = { role: "user", module_permissions: { masters: { view: true }, sales: { view: false } } };
  expect(canAccessPath("/masters/product", user)).toBe(true);
  expect(canAccessPath("/sales/pos-sales", user)).toBe(false);
  expect(canAccessPath("/dashboard", user)).toBe(false);
  expect(canAccessPath("/settings/company", user)).toBe(false);
  expect(getHomePathForUser(user)).toBe("/masters/product");
});

describe("accessControl -- /settings/themes gate", () => {
  const tenant = { role: "admin", is_tenant_admin: true, store_ids: [], entitlements: { sections: {} } };

  it("allows registered tenant administration without unlocking licensed business modules", () => {
    for (const path of ["/settings", "/settings/company", "/settings/themes", "/settings/branding"]) {
      expect(canAccessPath(path, tenant)).toBe(true);
    }
    expect(canAccessPath("/owner/dashboard", tenant)).toBe(false);
    expect(canAccessPath("/masters/product", tenant)).toBe(false);
    expect(canAccessPath("/settings/backup", tenant)).toBe(false);
    expect(canAccessPath("/settings/themes", { ...tenant, role: "user" })).toBe(false);
  });
  it("canAccessPath allows only super_admin", () => {
    expect(canAccessPath("/settings/themes", { role: "super_admin" })).toBe(true);
    expect(canAccessPath("/settings/themes", { role: "admin" })).toBe(false);
    expect(canAccessPath("/settings/themes", { role: "user" })).toBe(false);
  });

  // Renamed from Branding -- /settings/branding now just redirects to /settings/themes
  // (RedirectPreservingQuery in protectedLayoutRoutes.jsx), so it must gate identically or an old
  // bookmarked link 302s straight into a second ProtectedRoute bounce on the destination path.
  it("canAccessPath gates the old /settings/branding path the same as its /settings/themes replacement", () => {
    expect(canAccessPath("/settings/branding", { role: "super_admin" })).toBe(true);
    expect(canAccessPath("/settings/branding", { role: "admin" })).toBe(false);
  });

  const navItems = [
    {
      name: "Settings",
      path: "/settings",
      subItems: [
        { name: "Company", path: "/settings/company" },
        { name: "Themes", path: "/settings/themes" },
      ],
    },
  ];

  it("keeps Company and Themes visible for a tenant with zero stores or a restricted plan", () => {
    const visible = getVisibleNavItems(navItems, tenant);
    expect(visible[0]?.subItems.map(item => item.name)).toEqual(["Company", "Themes"]);
    expect(canAccessPath("/settings/themes", { ...tenant, store_ids: [10], store_id: 10 })).toBe(true);
  });

  it("getVisibleNavItems includes the Themes subItem for a super_admin", () => {
    const visible = getVisibleNavItems(navItems, { role: "super_admin" });
    const settings = visible.find((item) => item.name === "Settings");

    expect(settings).toBeDefined();
    expect(settings.subItems.map((s) => s.name)).toContain("Themes");
  });

  it("getVisibleNavItems omits the Themes subItem for an admin (settings section stays visible)", () => {
    const visible = getVisibleNavItems(navItems, { role: "admin" });
    const settings = visible.find((item) => item.name === "Settings");

    expect(settings).toBeDefined();
    expect(settings.subItems.map((s) => s.name)).not.toContain("Themes");
  });

  it("getVisibleNavItems omits the whole Settings section for a plain user (no settings access at all)", () => {
    const visible = getVisibleNavItems(navItems, { role: "user" });

    expect(visible.find((item) => item.name === "Settings")).toBeUndefined();
  });
});

// Regression: this path used to check cap.isAdmin only, which excludes super_admin (a strictly
// higher role) -- clicking any dashboard widget linking here (Store's "low stock" banner, the
// print-status footer's sync-status button) bounced a super_admin straight back to /dashboard via
// ProtectedRoute's canAccessPath-denied redirect, even though every sibling settings path
// correctly allows super_admin.
describe("accessControl -- /settings/configure-local-server gate", () => {
  it("canAccessPath allows both super_admin and admin, same as the general canSettings gate", () => {
    expect(canAccessPath("/settings/configure-local-server", { role: "super_admin" })).toBe(true);
    expect(canAccessPath("/settings/configure-local-server", { role: "admin" })).toBe(true);
    expect(canAccessPath("/settings/configure-local-server", { role: "user" })).toBe(false);
  });

  const navItems = [
    {
      name: "Settings",
      path: "/settings",
      subItems: [{ name: "Configure Local Server", path: "/settings/configure-local-server" }],
    },
  ];

  it("getVisibleNavItems includes it for a super_admin", () => {
    const visible = getVisibleNavItems(navItems, { role: "super_admin" });
    const settings = visible.find((item) => item.name === "Settings");

    expect(settings?.subItems.map((s) => s.name)).toContain("Configure Local Server");
  });
});
