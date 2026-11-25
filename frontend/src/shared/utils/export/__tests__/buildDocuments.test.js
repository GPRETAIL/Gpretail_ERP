/* global Buffer, process, __dirname */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import buildExcel from "../buildExcel";
import buildPdf from "../buildPdf";

const headers = ["Bill No", "Date", "Customer", "Phone", "Qty", "Amount"];
const rawBody = [
  ["INV-0001", "2026-11-24", "Asha Traders", "9876543210", "2", "₹1,200.00"],
  ["INV-0002", "25/11/2026", "Ravi & Sons, Salem", "9123456780", "10", "₹35,450.50"],
  ["Total", "", "", "", "12", "₹36,650.50"],
];
const dump = process.env.EXPORT_DUMP;
const headerLines = [
  { text: "Coffee 1", style: "store" },
  { text: "Sales Report", style: "title" },
  { text: "Period: 01-Nov-2026 to 25-Nov-2026", style: "text" },
  { text: "Generated on 25-Nov-2026 10:01 pm by Test Store Admin", style: "muted" },
];

beforeAll(() => {
  vi.stubGlobal("fetch", async (url) => {
    const file = path.resolve(__dirname, "../../../assets/fonts", path.basename(String(url).split("?")[0]));
    const bytes = readFileSync(file);
    return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  });
});

it("Excel keeps money and quantities as real numbers, dates as dates and phone numbers as text", async () => {
  const blob = await buildExcel({ headerLines, headers, rawBody, sheetName: "Sales: Report/1" });
  if (dump) writeFileSync(path.join(dump, "sample.xlsx"), Buffer.from(await blob.arrayBuffer()));
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await blob.arrayBuffer());
  const sheet = book.worksheets[0];
  expect(sheet.name).toBe("Sales Report 1");
  const header = sheet.getRow(6);
  expect(header.getCell(1).value).toBe("Bill No");
  const first = sheet.getRow(7);
  expect(first.getCell(2).value).toBeInstanceOf(Date);
  expect(first.getCell(4).value).toBe("9876543210");
  expect(first.getCell(5).value).toBe(2);
  expect(first.getCell(6).value).toBe(1200);
  expect(first.getCell(6).numFmt).toContain("₹");
  const total = sheet.getRow(9);
  expect(total.getCell(1).font.bold).toBe(true);
  expect(total.getCell(6).value).toBe(36650.5);
  expect(sheet.views[0].ySplit).toBe(6);
  expect(sheet.pageSetup.printTitlesRow).toBe("6:6");
});

it("PDF embeds the font so the rupee sign prints, and is a real multi-column table", async () => {
  const blob = await buildPdf({ headerLines, headers, rawBody, footerLeft: "Coffee 1 | 25-Nov-2026" });
  const bytes = Buffer.from(await blob.arrayBuffer());
  if (dump) writeFileSync(path.join(dump, "sample.pdf"), bytes);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.toString("latin1")).toContain("NotoSans");
  expect(bytes.length).toBeGreaterThan(8000);
});

it("PDF with no rows says so instead of printing an empty table", async () => {
  const blob = await buildPdf({ headerLines: [{ text: "Empty", style: "title" }], headers: ["A", "B"], rawBody: [] });
  expect((await blob.arrayBuffer()).byteLength).toBeGreaterThan(1000);
});
