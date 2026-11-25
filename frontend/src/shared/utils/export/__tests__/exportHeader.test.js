import { expect, it } from "vitest";
import buildHeaderLines, { dataRangeText, displayDate, periodText } from "../exportHeader";

const now = new Date(2026, 10, 25, 22, 1);
const texts = (lines) => lines.map((line) => line.text);

it("puts the store, the report, the period and who generated it at the top", () => {
  const lines = buildHeaderLines({ storeName: "Coffee 1", userName: "Test Store Admin", title: "Coffee 1", subtitle: "POS SALE Report", period: { from: "2026-11-01", to: "2026-11-25" }, fileName: "pos_sale_report", now });
  expect(texts(lines)).toEqual(["Coffee 1", "POS SALE Report", "Period: 01-Nov-2026 to 25-Nov-2026", "Generated on 25-Nov-2026 10:01 pm by Test Store Admin"]);
  expect(lines.map((line) => line.style)).toEqual(["store", "title", "text", "muted"]);
});

it("a screen that names no report gets its page name, never Export", () => {
  const lines = buildHeaderLines({ storeName: "Coffee 1", title: "Export", fileName: "brands", now });
  expect(texts(lines).slice(0, 2)).toEqual(["Coffee 1", "Brands"]);
  expect(texts(buildHeaderLines({ storeName: "Coffee 1", fileName: "table_data", pathname: "/crm/customer-orders", now }))[1]).toBe("customer orders".replace(/\b\w/g, (c) => c.toUpperCase()));
});

it("takes the period from the dates in the screen's file name when it gives none", () => {
  const lines = buildHeaderLines({ storeName: "A", fileName: "punch_log_2026-11-01_2026-11-25", now });
  expect(texts(lines)).toContain("Period: 01-Nov-2026 to 25-Nov-2026");
  expect(periodText({ fileName: "payroll_2026-10" })).toBe("Oct 2026");
  expect(texts(buildHeaderLines({ storeName: "A", fileName: "brands", now })).some((line) => line.startsWith("Period"))).toBe(false);
});

it("keeps extra detail lines from the screen without repeating the store or the report", () => {
  const lines = buildHeaderLines({ storeName: "Coffee 1", title: "Coffee 1", subtitle: "Daily Report", headingLines: ["Coffee 1", "Daily Report", "Counter: 2"], now });
  expect(texts(lines).filter((text) => text === "Coffee 1")).toHaveLength(1);
  expect(texts(lines)).toContain("Counter: 2");
});

it("uses the screen's own title when there is no store name yet", () => {
  expect(texts(buildHeaderLines({ title: "Store export", now }))[0]).toBe("Store export");
  expect(displayDate("25/11/2026")).toBe("25-Nov-2026");
});

it("with no period from the screen, shows the first and last date in the rows", () => {
  const headers = ["Bill No", "Date", "Amount"];
  const rows = [["A1", "11/25/2026, 10:09:44 PM", "10"], ["A2", "11/12/2026, 9:00:00 AM", "20"]];
  expect(dataRangeText(headers, rows)).toBe("Data from 12-Nov-2026 to 25-Nov-2026");
  expect(dataRangeText(headers, [["A1", "2026-11-25", "1"]])).toBe("Data for 25-Nov-2026");
  expect(dataRangeText(["Name"], [["Asha"]])).toBe("");
  const lines = buildHeaderLines({ storeName: "A", fileName: "pos_sale_report", dataRange: dataRangeText(headers, rows), now });
  expect(texts(lines)).toContain("Data from 12-Nov-2026 to 25-Nov-2026");
  expect(texts(buildHeaderLines({ storeName: "A", fileName: "x", period: "01-Nov-2026 to 02-Nov-2026", dataRange: "Data from 1 to 2", now }))).not.toContain("Data from 1 to 2");
});
