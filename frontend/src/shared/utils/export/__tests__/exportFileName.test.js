import { expect, it } from "vitest";
import buildExportFileName from "../exportFileName";

const now = new Date(2026, 10, 25, 20, 0);

it("names the file Page_Store_Date, the same for every format", () => {
  expect(buildExportFileName({ fileName: "sales_report", storeName: "Coffee 1", now })).toBe("Sales-Report_Coffee-1_2026-11-25");
  expect(buildExportFileName({ fileName: "pos_sale_report", storeName: "Test Store", now })).toBe("Pos-Sale-Report_Test-Store_2026-11-25");
});

it("uses the period the screen already put in the name, instead of the export date", () => {
  expect(buildExportFileName({ fileName: "punch_log_2026-11-01_2026-11-25", storeName: "Coffee 1", now })).toBe("Punch-Log_Coffee-1_2026-11-01_to_2026-11-25");
  expect(buildExportFileName({ fileName: "payroll_2026-10", storeName: "Coffee 1", now })).toBe("Payroll_Coffee-1_2026-10");
  expect(buildExportFileName({ fileName: "items", storeName: "A", period: "2026-11-02", now })).toBe("Items_A_2026-11-02");
});

it("falls back to the page address when the screen gave no name, and leaves out an unknown store", () => {
  expect(buildExportFileName({ fileName: "table_data", pathname: "/warehouse/stock-item", now })).toBe("Stock-Item_2026-11-25");
  expect(buildExportFileName({ pathname: "/", now })).toBe("Export_2026-11-25");
});

it("removes characters a file name cannot hold", () => {
  expect(buildExportFileName({ fileName: "items", storeName: 'A/B: "Shop"?', now })).toBe("Items_A-B-Shop_2026-11-25");
});
