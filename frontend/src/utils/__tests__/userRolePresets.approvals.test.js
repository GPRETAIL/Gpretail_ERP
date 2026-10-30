import { describe, expect, it } from "vitest";
import { getUserRolePresetPermissions, USER_ROLE_PRESET_OPTIONS } from "../userRolePresets";

describe("approval authority in role presets", () => {
  it("offers Supervisor when creating a user", () => {
    expect(USER_ROLE_PRESET_OPTIONS.map((option) => option.value)).toContain("supervisor");
  });

  it("shows the Approvals page only to approver roles", () => {
    expect(getUserRolePresetPermissions("supervisor")["/sales/approvals"]).toMatchObject({ view: true, edit: true });
    expect(getUserRolePresetPermissions("supervisor")["/sales/pos-sales"]).toMatchObject({ view: true, add: true });
    expect(getUserRolePresetPermissions("manager")["/sales/approvals"]?.view).toBe(true);
    expect(getUserRolePresetPermissions("cashier")["/sales/approvals"]?.view).not.toBe(true);
  });
});
