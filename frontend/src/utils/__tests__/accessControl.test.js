import { describe, expect, it } from "vitest";
import { canAccessPath, getVisibleNavItems } from "../accessControl";

describe("accessControl -- /settings/themes gate", () => {
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
