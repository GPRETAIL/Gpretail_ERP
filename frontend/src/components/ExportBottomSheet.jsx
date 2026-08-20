import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { useTransferActivity } from "../context/TransferActivityContext";

const toCellText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.join(", ");
  return JSON.stringify(value);
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const trimToCellWidth = (value, width, fontSize = 8) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  const maxChars = Math.max(1, Math.floor((width - 6) / (fontSize * 0.55)));
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3)}...`;
};
const estimatePdfTextWidth = (value, fontSize = 8) =>
  String(value ?? "").length * fontSize * 0.52;

const buildSimplePdf = ({ title, subtitle = "", headingLines = [], headers, body }) => {
  const safeHeaders = (headers || []).map((h) => toCellText(h));
  const resolvedHeaders = safeHeaders.length > 0 ? safeHeaders : ["Data"];
  const resolvedBody = (body || []).map((row) =>
    resolvedHeaders.map((_, idx) => toCellText(row?.[idx] ?? ""))
  );

  const pageWidth = 842; // A4 landscape
  const pageHeight = 595;
  const margin = 24;
  const tableWidth = pageWidth - margin * 2;
  const sanitizedHeadingLines = (headingLines || [])
    .map((line) => toCellText(line).trim())
    .filter(Boolean);
  const topLines = [toCellText(title || "Export"), toCellText(subtitle || "").trim(), ...sanitizedHeadingLines]
    .filter(Boolean);
  const headingLineHeight = 14;
  const titleY = pageHeight - margin;
  const tableTop = pageHeight - margin - Math.max(24, topLines.length * headingLineHeight + 10);
  const bottomLimit = margin;
  const headerHeight = 20;
  const rowHeight = 18;
  const bodyFontSize = 8;
  const headerFontSize = 8;

  const sampleRows = resolvedBody.slice(0, 200);
  const rawWidths = resolvedHeaders.map((header, colIdx) => {
    const bodyMax = sampleRows.reduce((acc, row) => {
      return Math.max(acc, String(row[colIdx] ?? "").length);
    }, 0);
    return Math.max(6, Math.min(40, Math.max(header.length, bodyMax)));
  });

  let colWidths;
  if (resolvedHeaders.length > 12) {
    colWidths = resolvedHeaders.map(() => tableWidth / resolvedHeaders.length);
  } else {
    const totalRaw = rawWidths.reduce((sum, w) => sum + w, 0) || 1;
    colWidths = rawWidths.map((w) => (w / totalRaw) * tableWidth);
    const minWidth = 44;
    if (resolvedHeaders.length * minWidth <= tableWidth) {
      colWidths = colWidths.map((w) => Math.max(minWidth, w));
      const sumAfterMin = colWidths.reduce((sum, w) => sum + w, 0);
      if (sumAfterMin > tableWidth) {
        const shrink = sumAfterMin - tableWidth;
        const adjustable = colWidths.reduce((sum, w) => sum + (w - minWidth), 0);
        if (adjustable > 0) {
          colWidths = colWidths.map((w) => {
            const room = w - minWidth;
            const delta = (room / adjustable) * shrink;
            return w - delta;
          });
        }
      }
    }
  }

  const xCoords = [margin];
  colWidths.forEach((w) => xCoords.push(xCoords[xCoords.length - 1] + w));

  const rowsPerPage = Math.max(
    1,
    Math.floor((tableTop - bottomLimit - headerHeight) / rowHeight)
  );
  const pageRows = [];
  if (resolvedBody.length === 0) {
    pageRows.push([]);
  } else {
    for (let i = 0; i < resolvedBody.length; i += rowsPerPage) {
      pageRows.push(resolvedBody.slice(i, i + rowsPerPage));
    }
  }

  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const bodyFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const headerFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds = [];

  pageRows.forEach((rowsChunk) => {
    const renderedRows =
      rowsChunk.length > 0
        ? rowsChunk
        : [resolvedHeaders.map((_, idx) => (idx === 0 ? "No records found." : ""))];
    const tableBottom = tableTop - headerHeight - renderedRows.length * rowHeight;

    const commands = [];
    topLines.forEach((line, index) => {
      const fontSize = index === 0 ? 13 : 10;
      const y = titleY - index * headingLineHeight;
      const x = Math.max(margin, (pageWidth - estimatePdfTextWidth(line, fontSize)) / 2);
      commands.push("BT");
      commands.push(`/F2 ${fontSize} Tf`);
      commands.push(`1 0 0 1 ${x} ${y} Tm`);
      commands.push(`(${escapePdfText(line)}) Tj`);
      commands.push("ET");
    });

    commands.push(`0.95 g ${margin} ${tableTop - headerHeight} ${tableWidth} ${headerHeight} re f`);
    commands.push("0 g");

    for (let r = 0; r <= renderedRows.length + 1; r += 1) {
      const y =
        r === 0
          ? tableTop
          : r === 1
            ? tableTop - headerHeight
            : tableTop - headerHeight - (r - 1) * rowHeight;
      commands.push(`${margin} ${y} m ${margin + tableWidth} ${y} l S`);
    }

    xCoords.forEach((x) => {
      commands.push(`${x} ${tableTop} m ${x} ${tableBottom} l S`);
    });

    resolvedHeaders.forEach((header, colIdx) => {
      const text = trimToCellWidth(header, colWidths[colIdx], headerFontSize);
      const x = xCoords[colIdx] + 3;
      const y = tableTop - headerHeight + 6;
      commands.push(`BT /F2 ${headerFontSize} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`);
    });

    renderedRows.forEach((row, rowIdx) => {
      resolvedHeaders.forEach((_, colIdx) => {
        const text = trimToCellWidth(row[colIdx] ?? "", colWidths[colIdx], bodyFontSize);
        const x = xCoords[colIdx] + 3;
        const y = tableTop - headerHeight - rowIdx * rowHeight - 12;
        commands.push(`BT /F1 ${bodyFontSize} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`);
      });
    });

    const stream = `${commands.join("\n")}\n`;
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent __PAGES__ /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${bodyFontId} 0 R /F2 ${headerFontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  });

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  const pagesId = addObject(`<< /Type /Pages /Kids [${kids}] /Count ${pageIds.length} >>`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  for (let i = 0; i < objects.length; i += 1) {
    objects[i] = objects[i].replaceAll("__PAGES__", `${pagesId} 0 R`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((obj, i) => {
    offsets[i + 1] = pdf.length;
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

export default function ExportBottomSheet({
  columns = [],
  rows = [],
  selectedRowKeys = [],
  rowKey = "id",
  fileName = "table_data",
  title = "",
  titleResolver = null,
  subtitle = "",
  headingLines = [],
  sheetName = "Export",
  buttonClassName = "",
  buttonLabel = "Export",
  getValue,
  onExportRows = null,
}) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const { startActivity, updateActivity, finishActivity, TYPE, STATUS } = useTransferActivity();
  const hasSelectedRows = Array.isArray(selectedRowKeys) && selectedRowKeys.length > 0;

  const resolveRowKey = useCallback((row, index) => {
    if (typeof rowKey === "function") return rowKey(row, index);
    return row?.[rowKey] ?? index;
  }, [rowKey]);

  const filterBySelection = useCallback((sourceRows) => {
    if (!hasSelectedRows) return Array.isArray(sourceRows) ? sourceRows : [];
    const selectedKeySet = new Set(selectedRowKeys);
    return (Array.isArray(sourceRows) ? sourceRows : []).filter((row, index) =>
      selectedKeySet.has(resolveRowKey(row, index))
    );
  }, [hasSelectedRows, selectedRowKeys, resolveRowKey]);

  const buildExportMatrix = useCallback((sourceRows) => {
    const safeColumns = (columns || []).filter((c) => c && c.key);
    const headers = safeColumns.map((c) => c.label || c.key);
    const body = (sourceRows || []).map((row) =>
      safeColumns.map((column) => {
        const resolved = getValue
          ? getValue(row, column)
          : column.searchValue
            ? column.searchValue(row)
            : column.valueGetter
              ? column.valueGetter(row)
              : row?.[column.key];
        return toCellText(resolved);
      })
    );
    return { headers, body };
  }, [columns, getValue]);

  const resolveRowsForExport = useCallback(async () => {
    const localRows = Array.isArray(rows) ? rows : [];

    if (hasSelectedRows) {
      const localSelectedRows = filterBySelection(localRows);
      if (typeof onExportRows !== "function") return localSelectedRows;
      if (localSelectedRows.length === selectedRowKeys.length) return localSelectedRows;

      const resolved = await onExportRows();
      const resolvedRows = Array.isArray(resolved)
        ? resolved
        : Array.isArray(resolved?.rows)
          ? resolved.rows
          : localRows;
      const resolvedSelectedRows = filterBySelection(resolvedRows);
      return resolvedSelectedRows.length > 0 ? resolvedSelectedRows : localSelectedRows;
    }

    if (typeof onExportRows !== "function") return localRows;
    const resolved = await onExportRows();
    if (Array.isArray(resolved)) return resolved;
    if (Array.isArray(resolved?.rows)) return resolved.rows;
    return localRows;
  }, [filterBySelection, hasSelectedRows, onExportRows, rows, selectedRowKeys.length]);

  const resolveExportTitle = useCallback((sourceRows) => {
    if (typeof titleResolver === "function") {
      const resolved = toCellText(titleResolver(sourceRows)).trim();
      if (resolved) return resolved;
    }
    return toCellText(title).trim() || "Export";
  }, [title, titleResolver]);

  const buildExportAoA = useCallback((exportMatrix, resolvedTitle) => {
    const headerRows = [];
    const flattenedLines = [
      resolvedTitle,
      subtitle,
      ...(Array.isArray(headingLines) ? headingLines : []),
    ]
      .map((line) => toCellText(line).trim())
      .filter(Boolean);

    flattenedLines.forEach((line) => {
      headerRows.push([line]);
    });
    if (headerRows.length > 0) headerRows.push([]);
    return [...headerRows, exportMatrix.headers, ...exportMatrix.body];
  }, [headingLines, subtitle]);

  const buildWorksheet = useCallback((exportMatrix, resolvedTitle) => {
    const aoa = buildExportAoA(exportMatrix, resolvedTitle);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const columnCount = Math.max(exportMatrix.headers.length, 1);
    const headingLineCount = [resolvedTitle, subtitle, ...(Array.isArray(headingLines) ? headingLines : [])]
      .map((line) => toCellText(line).trim())
      .filter(Boolean)
      .length;

    if (headingLineCount > 0 && columnCount > 1) {
      ws["!merges"] = Array.from({ length: headingLineCount }, (_, index) => ({
        s: { r: index, c: 0 },
        e: { r: index, c: columnCount - 1 },
      }));
    }

    const widths = exportMatrix.headers.map((header, colIdx) => {
      const bodyMax = exportMatrix.body.reduce(
        (acc, row) => Math.max(acc, String(row?.[colIdx] ?? "").length),
        String(header ?? "").length
      );
      return { wch: Math.min(Math.max(bodyMax + 2, 12), 40) };
    });
    if (widths.length > 0) ws["!cols"] = widths;

    return { ws, aoa };
  }, [buildExportAoA, headingLines, subtitle]);

  const exportCsv = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    const activityId = startActivity({
      type: TYPE.EXPORT,
      label: `${fileName}.csv`,
      path: location.pathname,
      progressPercent: 10,
      statusMessage: "Preparing export...",
    });
    try {
      updateActivity(activityId, { progressPercent: 35, statusMessage: "Collecting rows..." });
      const sourceRows = await resolveRowsForExport();
      updateActivity(activityId, { progressPercent: 65, statusMessage: "Building CSV..." });
      const resolvedTitle = resolveExportTitle(sourceRows);
      const exportMatrix = buildExportMatrix(sourceRows);
      const { ws: csv } = buildWorksheet(exportMatrix, resolvedTitle);
      const csvText = XLSX.utils.sheet_to_csv(csv);
      updateActivity(activityId, { progressPercent: 90, statusMessage: "Downloading CSV..." });
      downloadBlob(new Blob([csvText], { type: "text/csv;charset=utf-8;" }), `${fileName}.csv`);
      finishActivity(activityId, {
        status: STATUS.SUCCESS,
        progressPercent: 100,
        statusMessage: "CSV export completed",
      });
      setOpen(false);
    } catch (err) {
      console.error("Failed to export CSV:", err);
      finishActivity(activityId, {
        status: STATUS.FAILED,
        progressPercent: 100,
        statusMessage: "CSV export failed",
      });
    } finally {
      setExporting(false);
    }
  }, [STATUS.SUCCESS, STATUS.FAILED, TYPE.EXPORT, buildExportMatrix, buildWorksheet, exporting, fileName, finishActivity, location.pathname, resolveExportTitle, resolveRowsForExport, startActivity, updateActivity]);

  const exportExcel = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    const activityId = startActivity({
      type: TYPE.EXPORT,
      label: `${fileName}.xlsx`,
      path: location.pathname,
      progressPercent: 10,
      statusMessage: "Preparing export...",
    });
    try {
      updateActivity(activityId, { progressPercent: 35, statusMessage: "Collecting rows..." });
      const sourceRows = await resolveRowsForExport();
      updateActivity(activityId, { progressPercent: 65, statusMessage: "Building Excel file..." });
      const resolvedTitle = resolveExportTitle(sourceRows);
      const exportMatrix = buildExportMatrix(sourceRows);
      const { ws } = buildWorksheet(exportMatrix, resolvedTitle);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, String(sheetName || "Export").slice(0, 31));
      updateActivity(activityId, { progressPercent: 90, statusMessage: "Downloading Excel file..." });
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      finishActivity(activityId, {
        status: STATUS.SUCCESS,
        progressPercent: 100,
        statusMessage: "Excel export completed",
      });
      setOpen(false);
    } catch (err) {
      console.error("Failed to export Excel:", err);
      finishActivity(activityId, {
        status: STATUS.FAILED,
        progressPercent: 100,
        statusMessage: "Excel export failed",
      });
    } finally {
      setExporting(false);
    }
  }, [STATUS.SUCCESS, STATUS.FAILED, TYPE.EXPORT, buildExportMatrix, buildWorksheet, exporting, fileName, finishActivity, location.pathname, resolveExportTitle, resolveRowsForExport, sheetName, startActivity, updateActivity]);

  const exportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    const activityId = startActivity({
      type: TYPE.EXPORT,
      label: `${fileName}.pdf`,
      path: location.pathname,
      progressPercent: 10,
      statusMessage: "Preparing export...",
    });
    try {
      updateActivity(activityId, { progressPercent: 35, statusMessage: "Collecting rows..." });
      const sourceRows = await resolveRowsForExport();
      updateActivity(activityId, { progressPercent: 65, statusMessage: "Building PDF..." });
      const resolvedTitle = resolveExportTitle(sourceRows);
      const exportMatrix = buildExportMatrix(sourceRows);
      const blob = buildSimplePdf({
        title: resolvedTitle,
        subtitle,
        headingLines,
        headers: exportMatrix.headers,
        body: exportMatrix.body,
      });
      updateActivity(activityId, { progressPercent: 90, statusMessage: "Downloading PDF..." });
      downloadBlob(blob, `${fileName}.pdf`);
      finishActivity(activityId, {
        status: STATUS.SUCCESS,
        progressPercent: 100,
        statusMessage: "PDF export completed",
      });
      setOpen(false);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      finishActivity(activityId, {
        status: STATUS.FAILED,
        progressPercent: 100,
        statusMessage: "PDF export failed",
      });
    } finally {
      setExporting(false);
    }
  }, [STATUS.SUCCESS, STATUS.FAILED, TYPE.EXPORT, buildExportMatrix, exporting, fileName, finishActivity, headingLines, location.pathname, resolveExportTitle, resolveRowsForExport, startActivity, subtitle, updateActivity]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative inline-flex" ref={menuRef}>
      <button
        type="button"
        disabled={exporting}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`topbar-action-btn topbar-action-export disabled:opacity-70 ${buttonClassName}`}
      >
        <Download className="w-3 h-3 mr-1" /> {exporting ? "Exporting..." : buttonLabel}
        <ChevronDown className="w-3 h-3 ml-1" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-[140] w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1"
        >
          <button
            type="button"
            disabled={exporting}
            onClick={exportPdf}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-60"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={exportExcel}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> EXCEL
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={exportCsv}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-60"
          >
            <FileText className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      )}
    </div>
  );
}
