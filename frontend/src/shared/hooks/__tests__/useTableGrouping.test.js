import { describe, expect, it } from "vitest";
import { buildClientGroups } from "@/shared/hooks/useTableGrouping";

describe("buildClientGroups", () => {
  it("groups in first-seen order, with one (Blank) group and Yes/No for booleans", () => {
    const rows = [
      { id: 1, city: "Chennai", active: true },
      { id: 2, city: "", active: false },
      { id: 3, city: "Madurai", active: true },
      { id: 4, city: null, active: true },
      { id: 5, city: "Chennai", active: false },
    ];
    const byCity = buildClientGroups(rows, { key: "city" });
    expect(byCity.map((g) => [g.label, g.group_value, g.row_count])).toEqual([
      ["Chennai", "Chennai", 2],
      ["(Blank)", null, 2],
      ["Madurai", "Madurai", 1],
    ]);
    expect(byCity[0].rows.map((r) => r.id)).toEqual([1, 5]);
    expect(buildClientGroups(rows, { key: "active" }).map((g) => g.label)).toEqual(["Yes", "No"]);
  });

  it("uses the column's valueGetter, and returns no groups without a column", () => {
    const rows = [{ id: 1, amount: 120 }, { id: 2, amount: 80 }];
    const groups = buildClientGroups(rows, { key: "band", valueGetter: (row) => (row.amount >= 100 ? "High" : "Low") });
    expect(groups.map((g) => g.label)).toEqual(["High", "Low"]);
    expect(buildClientGroups(rows, undefined)).toEqual([]);
  });
});
