import { describe, expect, it } from "vitest";
import { canAccessPath, getVisibleNavItems } from "../accessControl";

describe("accessControl -- /settings/branding gate", () => {
  it("canAccessPath allows only super_admin", () => {
    expect(canAccessPath("/settings/branding", { role: "super_admin" })).toBe(true);
    expect(canAccessPath("/settings/branding", { role: "admin" })).toBe(false);
    expect(canAccessPath("/settings/branding", { role: "user" })).toBe(false);
  });

  const navItems = [
    {
      name: "Settings",
      path: "/settings",
      subItems: [
        { name: "Company", path: "/settings/company" },
        { name: "Branding", path: "/settings/branding" },
      ],
    },
  ];

  it("getVisibleNavItems includes the Branding subItem for a super_admin", () => {
    const visible = getVisibleNavItems(navItems, { role: "super_admin" });
    const settings = visible.find((item) => item.name === "Settings");

    expect(settings).toBeDefined();
    expect(settings.subItems.map((s) => s.name)).toContain("Branding");
  });

  it("getVisibleNavItems omits the Branding subItem for an admin (settings section stays visible)", () => {
    const visible = getVisibleNavItems(navItems, { role: "admin" });
    const settings = visible.find((item) => item.name === "Settings");

    expect(settings).toBeDefined();
    expect(settings.subItems.map((s) => s.name)).not.toContain("Branding");
  });

  it("getVisibleNavItems omits the whole Settings section for a plain user (no settings access at all)", () => {
    const visible = getVisibleNavItems(navItems, { role: "user" });

    expect(visible.find((item) => item.name === "Settings")).toBeUndefined();
  });
});
