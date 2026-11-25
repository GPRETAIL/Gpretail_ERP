import { coerceCell, inferColumnKind, numberFormatFor } from "./cellTypes";

const HEADER_FILL = "FFE8EEF7";
const BORDER = { style: "thin", color: { argb: "FFCBD5E1" } };
const TOTAL_ROW = /^\s*(grand\s+)?total\b/i;

const safeSheetName = (name) => String(name || "Export").replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Export";

const displayLength = (value, kind) => {
  if (value === null || value === undefined) return 0;
  if (value instanceof Date) return 11;
  if (typeof value === "number") return kind.kind === "text" ? String(value).length : value.toLocaleString("en-IN", { minimumFractionDigits: kind.decimals || 0, maximumFractionDigits: kind.decimals || 0 }).length + (kind.kind === "money" ? 2 : 0);
  return String(value).length;
};

/**
 * Builds the Excel workbook for an export: title lines, a styled header row that stays in view and filters, real numbers,
 * money and dates in their own formats, widths that fit the data, bold total rows, and a print setup (landscape, fit to
 * page width, header repeated on every page, page numbers). `rawBody` holds the cell values as the table has them
 * (numbers stay numbers); text-looking columns such as phone numbers and codes stay text.
 */
export default async function buildExcel({ headerLines = [], headers, rawBody, sheetName = "Export" }) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Vynerix";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(safeSheetName(sheetName), { views: [] });

  const columnCount = Math.max(headers.length, 1);
  const FONTS = {
    store: { bold: true, size: 14, color: { argb: "FF0F172A" } },
    title: { bold: true, size: 12, color: { argb: "FF1E293B" } },
    text: { size: 10, color: { argb: "FF334155" } },
    muted: { size: 9, color: { argb: "FF64748B" } },
  };
  headerLines.forEach((line) => {
    const row = sheet.addRow([line.text]);
    if (columnCount > 1) sheet.mergeCells(row.number, 1, row.number, columnCount);
    row.getCell(1).font = FONTS[line.style] || FONTS.text;
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
  });
  if (headerLines.length) sheet.addRow([]);

  const kinds = headers.map((header, col) => inferColumnKind(header, rawBody.map((row) => row?.[col])));

  const headerRow = sheet.addRow(headers.map((header) => String(header ?? "")));
  headerRow.height = 22;
  headerRow.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
    const numeric = kinds[col - 1].kind === "number" || kinds[col - 1].kind === "money";
    cell.alignment = { vertical: "middle", horizontal: numeric ? "right" : "left", wrapText: true };
  });

  const widths = headers.map((header) => Math.min(60, Math.max(10, String(header ?? "").length + 4)));
  rawBody.forEach((source) => {
    const values = headers.map((_, col) => coerceCell(source?.[col], kinds[col]));
    const row = sheet.addRow(values);
    const isTotal = TOTAL_ROW.test(String(source?.[0] ?? "")) || TOTAL_ROW.test(String(source?.[1] ?? ""));
    values.forEach((value, index) => {
      const cell = row.getCell(index + 1);
      const kind = kinds[index];
      const format = value !== null && typeof value !== "string" ? numberFormatFor(kind) : undefined;
      if (format) cell.numFmt = format;
      cell.alignment = { vertical: "top", horizontal: typeof value === "number" ? "right" : value instanceof Date ? "center" : "left", wrapText: typeof value === "string" };
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
      if (isTotal) {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      }
      widths[index] = Math.min(60, Math.max(widths[index], displayLength(value, kind) + 3));
    });
  });

  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });

  const headerNumber = headerRow.number;
  sheet.views = [{ state: "frozen", ySplit: headerNumber, xSplit: 0, activeCell: `A${headerNumber + 1}` }];
  sheet.autoFilter = { from: { row: headerNumber, column: 1 }, to: { row: headerNumber, column: columnCount } };
  sheet.pageSetup = { orientation: columnCount > 6 ? "landscape" : "portrait", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${headerNumber}:${headerNumber}`, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 } };
  sheet.headerFooter = { oddFooter: "&L&8Vynerix&C&8Page &P of &N&R&8&D" };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
