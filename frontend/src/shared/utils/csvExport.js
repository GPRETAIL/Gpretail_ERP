// Export matrices already contain text cells. Serialize that common case without
// loading SheetJS; return null for cells needing its worksheet-specific formatting.
export function tryBuildTextCsv(rows) {
  if (!Array.isArray(rows)) return null;
  let lastRow = -1;
  let lastColumn = -1;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row == null) continue;
    if (!Array.isArray(row)) return null;
    for (let c = 0; c < row.length; c++) {
      const value = row[c];
      if (value === undefined) continue;
      if (value !== null && typeof value !== "string") return null;
      lastRow = r;
      lastColumn = Math.max(lastColumn, c);
    }
  }
  if (lastRow < 0) return "";

  const lines = [];
  for (let r = 0; r <= lastRow; r++) {
    const cells = [];
    for (let c = 0; c <= lastColumn; c++) {
      let text = rows[r]?.[c] ?? "";
      // Match sheet_to_csv's default LF delimiter and first-cell SYLK protection.
      if (/[",\n]/.test(text) || (r === 0 && c === 0 && text === "ID")) {
        text = `"${text.replaceAll('"', '""')}"`;
      }
      cells.push(text);
    }
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}
