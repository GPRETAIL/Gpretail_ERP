/**
 * UploadImportButton — reusable CSV/XLSX bulk-import button.
 *
 * Props:
 *   endpoint     {string}   — API path, e.g. "/sizes/bulk"
 *   fieldConfig  {object}   — { aliases, required, boolFields }
 *                              aliases:    { normalizedHeader: formFieldName }
 *                              required:   [formFieldName, ...]
 *                              boolFields: [formFieldName, ...]
 *   transform    {function} — (mappedRow) => dbRow  (converts form-field names → DB shape)
 *   className    {string}   — extra classes on the button
 *   onDone       {function} — called after a successful import (optional)
 */

import { useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import api from "../api/axios";
import { useTransferActivity } from "../context/TransferActivityContext";

/** Strip spaces, underscores, dashes, parens, slashes → lowercase for fuzzy matching */
const norm = (h) => String(h).toLowerCase().replace(/[\s_\-()./]+/g, "");

export default function UploadImportButton({
  endpoint,
  fieldConfig,
  transform,
  className = "",
  onDone,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { startActivity, updateActivity, finishActivity, TYPE, STATUS } = useTransferActivity();

  const sampleHeaders = useMemo(() => {
    if (Array.isArray(fieldConfig?.sampleHeaders) && fieldConfig.sampleHeaders.length > 0) {
      return fieldConfig.sampleHeaders;
    }
    return [...new Set(Object.values(fieldConfig?.aliases || {}))];
  }, [fieldConfig]);

  const sampleFileName = fieldConfig?.sampleFileName || `${endpoint.replace(/\//g, "_")}_sample.xlsx`;

  const downloadSample = () => {
    if (!sampleHeaders.length) {
      toast.error("Sample headers are not configured for this screen.");
      return;
    }
    const ws = XLSX.utils.aoa_to_sheet([sampleHeaders]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, sampleFileName);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ""; // allow re-picking same file
    setOpen(false);
    const activityId = startActivity({
      type: TYPE.IMPORT,
      label: file.name || "Import",
      path: location.pathname,
      progressPercent: 5,
      statusMessage: "Reading file...",
    });

    try {
      const buffer = await file.arrayBuffer();
      updateActivity(activityId, { progressPercent: 20, statusMessage: "Parsing spreadsheet..." });
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (rawRows.length === 0) {
        finishActivity(activityId, {
          status: STATUS.FAILED,
          progressPercent: 100,
          statusMessage: "File is empty",
        });
        toast.error("File is empty — nothing to import");
        return;
      }

      // Build mapping:  fileColumnKey → formFieldName
      const aliasMap = { ...(fieldConfig.aliases || {}) };
      sampleHeaders.forEach((h) => {
        const key = norm(h);
        if (!aliasMap[key]) aliasMap[key] = h;
      });

      const headerMap = {};
      for (const rawKey of Object.keys(rawRows[0])) {
        const mapped = aliasMap[norm(rawKey)];
        if (mapped) headerMap[rawKey] = mapped;
      }
      updateActivity(activityId, { progressPercent: 35, statusMessage: "Validating headers..." });

      // Check every required field is covered by at least one file column
      const coveredFields = new Set(Object.values(headerMap));
      const missing = (fieldConfig.required || []).filter((f) => !coveredFields.has(f));
      if (missing.length > 0) {
        finishActivity(activityId, {
          status: STATUS.FAILED,
          progressPercent: 100,
          statusMessage: `Missing columns: ${missing.join(", ")}`,
        });
        toast.error(`Required column(s) not found in file: ${missing.join(", ")}`);
        return;
      }

      // Parse each row
      const parsedRows = rawRows.map((rawRow) => {
        const row = {};
        for (const [rawKey, fieldName] of Object.entries(headerMap)) {
          let val = rawRow[rawKey];
          if ((fieldConfig.boolFields || []).includes(fieldName)) {
            val =
              val === 1 ||
              val === "1" ||
              String(val).toLowerCase() === "true" ||
              String(val).toLowerCase() === "yes";
          }
          row[fieldName] = val;
        }
        return row;
      });

      // Drop rows where any required field is empty
      const validRows = parsedRows.filter((row) =>
        (fieldConfig.required || []).every(
          (f) => row[f] != null && String(row[f]).trim() !== ""
        )
      );

      if (validRows.length === 0) {
        finishActivity(activityId, {
          status: STATUS.FAILED,
          progressPercent: 100,
          statusMessage: "No valid rows found",
        });
        toast.error("No valid rows found — required fields are blank in every row");
        return;
      }

      const dbRows = transform ? validRows.map(transform) : validRows;
      updateActivity(activityId, { progressPercent: 55, statusMessage: "Uploading records..." });

      const res = await api.post(endpoint, dbRows, {
        onUploadProgress: (progressEvent) => {
          const total = Number(progressEvent.total || 0);
          const loaded = Number(progressEvent.loaded || 0);
          const uploadProgress = total > 0 ? loaded / total : 0;
          updateActivity(activityId, {
            progressPercent: Math.round(55 + uploadProgress * 35),
            statusMessage: "Uploading records...",
          });
        },
      });
      const count = res.data?.created ?? res.data?.data?.length ?? validRows.length;
      const skipped = rawRows.length - validRows.length;
      const successMessage = `Imported ${count} record${count !== 1 ? "s" : ""}`;

      finishActivity(activityId, {
        status: STATUS.SUCCESS,
        progressPercent: 100,
        statusMessage: skipped > 0 ? `${successMessage} (${skipped} skipped)` : successMessage,
      });

      toast.success(
        `Imported ${count} record${count !== 1 ? "s" : ""}${skipped > 0 ? ` (${skipped} skipped — missing required fields)` : ""}`
      );
      onDone?.();
    } catch (err) {
      finishActivity(activityId, {
        status: STATUS.FAILED,
        progressPercent: 100,
        statusMessage: err?.response?.data?.message || "Import failed",
      });
      toast.error(err?.response?.data?.message || "Import failed");
    }
  };

  const linkBlue = isDark ? "#60a5fa" : "#2563eb";
  const linkBlueHover = isDark ? "#93c5fd" : "#1d4ed8";

  return (
    <>
      <Box
        component="input"
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        sx={{ display: "none" }}
        onChange={handleFile}
      />
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        className={`topbar-action-btn topbar-action-upload ${className}`}
      >
        <Upload size={12} style={{ marginRight: 4 }} /> Upload
      </Box>

      {open && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 50, bgcolor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}
          onClick={() => setOpen(false)}
        >
          <Box
            sx={{ width: "100%", maxWidth: 448, bgcolor: "background.paper", borderRadius: "8px", border: "1px solid", borderColor: "divider", boxShadow: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Upload Excel File</Typography>
              <Box
                component="button"
                type="button"
                onClick={() => setOpen(false)}
                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
              >
                <X size={16} />
              </Box>
            </Box>
            <Box sx={{ px: 2, py: 2 }}>
              <Box
                component="button"
                type="button"
                onClick={downloadSample}
                sx={{ fontSize: 12.25, fontWeight: 500, textDecoration: "underline", color: linkBlue, "&:hover": { color: linkBlueHover } }}
              >
                Download Sample
              </Box>
              <Typography component="p" sx={{ fontSize: 10.5, color: "text.secondary", mt: 1 }}>
                Download the sample, fill it, then upload the file.
              </Typography>
            </Box>
            <Box sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Box
                component="button"
                type="button"
                onClick={() => setOpen(false)}
                sx={{ px: 1.5, py: 0.75, fontSize: 10.5, border: "1px solid", borderColor: "divider", borderRadius: "2px", color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }}
              >
                Cancel
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => inputRef.current?.click()}
                sx={{ px: 1.5, py: 0.75, fontSize: 10.5, bgcolor: "#3b82f6", color: "#fff", borderRadius: "2px", "&:hover": { bgcolor: "#2563eb" } }}
              >
                Choose File
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
}
