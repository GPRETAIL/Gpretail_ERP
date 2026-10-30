import { expect, it } from "vitest";
import { canAccessPath } from "../accessControl";

const account = { role: "manager", entitlements: { sections: { masters: ["/masters/brand", "/masters/supplier"] } },
  page_permissions: { "/masters/brand": { view: true, add: true }, "/masters/supplier": { view: true, add: true } } };

it.each(["brand", "supplier"])("keeps the %s creation route within its licensed parent page", entity => {
  expect(canAccessPath(`/masters/${entity}/new`, account)).toBe(true);
});

it("does not grant sibling pages with a similar prefix", () => {
  expect(canAccessPath("/masters/brand-other/new", account)).toBe(false);
  expect(canAccessPath("/masters/product/new", account)).toBe(false);
});

it("still requires the user's page permission as well as the plan entitlement", () => {
  expect(canAccessPath("/masters/brand/new", { ...account, page_permissions: {} })).toBe(false);
});
