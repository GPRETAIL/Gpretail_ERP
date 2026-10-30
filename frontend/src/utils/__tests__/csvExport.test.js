import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { tryBuildTextCsv } from "../csvExport";

const fixtures = [
  ["headings, ragged rows and padding", [["Company report"], ["Branch, North"], [], ["Code", "Name", "Amount"], ["001", "தமிழ்", "12.50"], ["002", "Other"]]],
  ["source numbers and booleans normalized by the exporter", [["Number", "Boolean"], [String(0), String(false)], [String(123.45), String(true)], [String(1e21), String(-0)]]],
  ["commas, quotes, LF, CRLF and CR", [["A,B", 'He said "hello"', "line\nnext", "line\r\nnext", "line\rnext"]]],
  ["formula-looking text stays unchanged", [["=SUM(A1:A3)", "+1", "-1", "@name", "\t=1", "00123"]]],
  ["first-cell ID", [["ID", "Name"], ["ID", "value"]]],
  ["ID after a heading", [["Report"], [], ["ID", "Name"], ["ID", "value"]]],
  ["ID after a leading blank row", [[], ["ID"]]],
  ["case and spaces", [["id", " ID", "ID ", " trailing ", "\ttext"]]],
  ["empty input", []],
  ["empty rows only", [[], []]],
  ["null and sparse cells", [Object.assign(new Array(3), { 0: null, 2: "Value" }), [], [undefined, "", null]]],
  ["leading and trailing blank rows", [[], ["Value", ""], [], ["", ""], []]],
  ["one trailing blank cell", [["Value"], [""]]],
  ["undefined trailing cells and rows", [["Value", undefined], [undefined], []]],
  ["literal BOM and Unicode", [["\uFEFFHeader", "தமிழ்", "₹12.50", "emoji 🛍️"]]],
];

describe("text CSV compatibility with installed SheetJS", () => {
  it.each(fixtures)("matches byte-for-byte for %s", (_label, rows) => {
    expect(tryBuildTextCsv(rows)).toBe(XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows)));
  });

  it("does not insert a BOM or trailing newline", () => {
    expect(tryBuildTextCsv([["Name"], ["Shop"]])).toBe("Name\nShop");
    expect(tryBuildTextCsv([["Name"], ["Shop"]]).startsWith("\uFEFF")).toBe(false);
  });

  it.each([42, 12.34567890123456, 1e21, true, false, new Date("2026-10-29T00:00:00Z"), { t: "n", v: 1, f: "1+0" }])("defers non-text cell %s to worksheet formatting", value => {
    expect(tryBuildTextCsv([["Heading"], [value]])).toBeNull();
  });

  it("does not modify the source rows", () => {
    const rows = Object.freeze([Object.freeze(["ID", 'Shop "A"']), Object.freeze(["001", "Line\nnext"])]);
    expect(tryBuildTextCsv(rows)).toBe(XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows)));
  });
});
