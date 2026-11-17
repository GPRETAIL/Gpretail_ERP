import { expect, it } from "vitest";
import { billDateText, dayLabel } from "@/features/sales/pos/utils/billingDate";

const NOW = new Date(2026, 10, 17, 21, 30);

it("shows the device's today while bills go on today", () => {
  expect(billDateText(null, NOW)).toBe(NOW.toLocaleDateString());
  expect(billDateText({ shifted: false, date: "2026-11-17" }, NOW)).toBe(NOW.toLocaleDateString());
});

it("shows the business date once the counter bills on the next day", () => {
  expect(billDateText({ shifted: true, date: "2026-11-18" }, NOW)).toBe(new Date(2026, 10, 18).toLocaleDateString());
  expect(dayLabel("2026-11-18")).toMatch(/18 Nov/);
});
