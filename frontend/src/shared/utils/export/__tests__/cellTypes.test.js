import { expect, it } from "vitest";
import { coerceCell, inferColumnKind, numberFormatFor, parseNumber } from "../cellTypes";

it("reads formatted money and plain amounts as numbers", () => {
  expect(parseNumber("₹1,23,456.50")).toBe(123456.5);
  expect(parseNumber("-₹200")).toBe(-200);
  expect(parseNumber("(1,500.00)")).toBe(-1500);
  expect(parseNumber("12abc")).toBeNull();
});

it("a money column becomes numbers with a rupee format, a count column stays whole", () => {
  const money = inferColumnKind("Amount", ["₹1,200.00", "₹35.50", ""]);
  expect(money).toEqual({ kind: "money", decimals: 2 });
  expect(coerceCell("₹1,200.00", money)).toBe(1200);
  expect(numberFormatFor(money)).toContain("₹");
  expect(inferColumnKind("Qty", ["3", "12", "100"])).toEqual({ kind: "number", decimals: 0 });
  expect(inferColumnKind("Qty", [3, 12.5])).toEqual({ kind: "number", decimals: 1 });
});

it("keeps codes, phone numbers and leading zeros as text so nothing is changed", () => {
  expect(inferColumnKind("Phone", ["9876543210", "9123456780"]).kind).toBe("text");
  expect(inferColumnKind("Bill No", ["1001", "1002"]).kind).toBe("text");
  expect(inferColumnKind("Ref", ["001", "002"]).kind).toBe("text");
  expect(inferColumnKind("Total", ["9876543210", "9123456780"]).kind).toBe("text");
  expect(inferColumnKind("Name", ["Asha", "12"]).kind).toBe("text");
});

it("a column of dates becomes dates, in the day the screen showed", () => {
  const kind = inferColumnKind("Invoice Date", ["2026-11-02", "25/11/2026", ""]);
  expect(kind.kind).toBe("date");
  expect(coerceCell("25/11/2026", kind).toISOString().slice(0, 10)).toBe("2026-11-25");
  expect(inferColumnKind("Date", ["2026-13-45"]).kind).toBe("text");
});
