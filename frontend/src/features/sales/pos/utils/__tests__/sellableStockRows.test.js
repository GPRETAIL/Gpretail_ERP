import { describe, expect, it } from "vitest";
import { sellableStockRows } from "../posSalesUtils";

describe("sellableStockRows", () => {
  const rows = [{ id: "a", qty: 3 }, { id: "b", qty: 0 }, { id: "c", qty: -1 }];

  it("hides items without stock when the store requires stock (e.g. an offline catalog after a sell-out)", () => {
    expect(sellableStockRows(rows, false).map(row => row.id)).toEqual(["a"]);
  });

  it("offers every item when the store sells without stock", () => {
    expect(sellableStockRows(rows, true)).toBe(rows);
  });
});
