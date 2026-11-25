import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useTransferActivity } from "@/features/store/context/TransferActivityContext";
import { tryBuildTextCsv } from "@/shared/utils/csvExport";
import useExportContext from "@/shared/hooks/useExportContext";
import buildHeaderLines, { dataRangeText, generatedStamp } from "@/shared/utils/export/exportHeader";
import buildExportFileName from "@/shared/utils/export/exportFileName";
import buildExcel from "@/shared/utils/export/buildExcel";
import buildPdf from "@/shared/utils/export/buildPdf";

const rawCell = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.join(", ");
  return JSON.stringify(value);
};

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

export default function ExportBottomSheet({
  columns = [],
  rows = [],
  selectedRowKeys = [],
  rowKey = "id",
  fileName: screenFileName = "table_data",
  title = "",
  titleResolver = null,
  subtitle = "",
  headingLines = [],
  sheetName = "Export",
  exportPeriod = "",
  buttonClassName = "",
  buttonLabel = "Export",
  getValue,
  onExportRows = null,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [exporting, setExporting] = useState(false);
  const location = useLocation();
  const { storeName, userName } = useExportContext();
  const fileName = useMemo(
    () => buildExportFileName({ fileName: screenFileName, pathname: location.pathname, storeName, period: exportPeriod }),
    [screenFileName, location.pathname, storeName, exportPeriod]
  );
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

  const buildRawMatrix = useCallback((sourceRows) => {
    const safeColumns = (columns || []).filter((c) => c && c.key);
    const headers = safeColumns.map((c) => toCellText(c.label || c.key));
    const rawBody = (sourceRows || []).map((row) =>
      safeColumns.map((column) => rawCell(getValue
        ? getValue(row, column)
        : column.searchValue
          ? column.searchValue(row)
          : column.valueGetter
            ? column.valueGetter(row)
            : row?.[column.key]))
    );
    return { headers, rawBody };
  }, [columns, getValue]);

  const headerLines = useCallback((resolvedTitle, headers = [], rawBody = []) => buildHeaderLines({
    storeName, userName, title: resolvedTitle, subtitle, headingLines, period: exportPeriod, dataRange: dataRangeText(headers, rawBody), fileName: screenFileName, pathname: location.pathname,
  }), [storeName, userName, subtitle, headingLines, exportPeriod, screenFileName, location.pathname]);

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

  const buildWorksheet = useCallback((XLSX, exportMatrix, resolvedTitle) => {
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
      let csvText = tryBuildTextCsv(buildExportAoA(exportMatrix, resolvedTitle));
      if (csvText === null) {
        const XLSX = await import("xlsx");
        const { ws } = buildWorksheet(XLSX, exportMatrix, resolvedTitle);
        csvText = XLSX.utils.sheet_to_csv(ws);
      }
      updateActivity(activityId, { progressPercent: 90, statusMessage: "Downloading CSV..." });
      downloadBlob(new Blob([csvText], { type: "text/csv;charset=utf-8;" }), `${fileName}.csv`);
      finishActivity(activityId, {
        status: STATUS.SUCCESS,
        progressPercent: 100,
        statusMessage: "CSV export completed",
      });
      setAnchorEl(null);
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
  }, [STATUS.SUCCESS, STATUS.FAILED, TYPE.EXPORT, buildExportAoA, buildExportMatrix, buildWorksheet, exporting, fileName, finishActivity, location.pathname, resolveExportTitle, resolveRowsForExport, startActivity, updateActivity]);

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
      const { headers, rawBody } = buildRawMatrix(sourceRows);
      const blob = await buildExcel({ headerLines: headerLines(resolvedTitle, headers, rawBody), headers, rawBody, sheetName });
      updateActivity(activityId, { progressPercent: 90, statusMessage: "Downloading Excel file..." });
      downloadBlob(blob, `${fileName}.xlsx`);
      finishActivity(activityId, {
        status: STATUS.SUCCESS,
        progressPercent: 100,
        statusMessage: "Excel export completed",
      });
      setAnchorEl(null);
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
  }, [STATUS.SUCCESS, STATUS.FAILED, TYPE.EXPORT, buildRawMatrix, headerLines, exporting, fileName, finishActivity, location.pathname, resolveExportTitle, resolveRowsForExport, sheetName, startActivity, updateActivity]);

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
      const { headers, rawBody } = buildRawMatrix(sourceRows);
      const blob = await buildPdf({
        headerLines: headerLines(resolvedTitle, headers, rawBody),
        headers,
        rawBody,
        footerLeft: [storeName, `Generated ${generatedStamp()}`].filter(Boolean).join("  |  "),
      });
      updateActivity(activityId, { progressPercent: 90, statusMessage: "Downloading PDF..." });
      downloadBlob(blob, `${fileName}.pdf`);
      finishActivity(activityId, {
        status: STATUS.SUCCESS,
        progressPercent: 100,
        statusMessage: "PDF export completed",
      });
      setAnchorEl(null);
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
  }, [STATUS.SUCCESS, STATUS.FAILED, TYPE.EXPORT, buildRawMatrix, headerLines, exporting, fileName, finishActivity, location.pathname, resolveExportTitle, resolveRowsForExport, startActivity, storeName, updateActivity]);

  return (
    <>
      <Button
        type="button"
        disabled={exporting}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`topbar-action-btn topbar-action-export ${buttonClassName}`}
        sx={{ opacity: exporting ? 0.7 : 1 }}
      >
        <Download size={12} style={{marginRight: 4}} /> {exporting ? "Exporting..." : buttonLabel}
        <ChevronDown size={12} style={{marginLeft: 4}} />
      </Button>

      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)} slotProps={{ list: { dense: true } }}>
        <MenuItem disabled={exporting} onClick={exportPdf}>
          <ListItemIcon><FileText size={14} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { fontSize: 12 } }}>PDF</ListItemText>
        </MenuItem>
        <MenuItem disabled={exporting} onClick={exportExcel}>
          <ListItemIcon><FileSpreadsheet size={14} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { fontSize: 12 } }}>EXCEL</ListItemText>
        </MenuItem>
        <MenuItem disabled={exporting} onClick={exportCsv}>
          <ListItemIcon><FileText size={14} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { fontSize: 12 } }}>CSV</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
