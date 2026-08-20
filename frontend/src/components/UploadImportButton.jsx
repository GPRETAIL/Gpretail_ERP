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
 *   className    {string}   — extra Tailwind classes on the button
 *   onDone       {function} — called after a successful import (optional)
 */

import { useMemo, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
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

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`topbar-action-btn topbar-action-upload ${className}`}
      >
        <Upload className="w-3 h-3 mr-1" /> Upload
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Upload Excel File</h3>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={() => setOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-4">
              <button
                type="button"
                onClick={downloadSample}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium underline"
              >
                Download Sample
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Download the sample, fill it, then upload the file.
              </p>
            </div>
            <div className="px-4 py-3 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-sm hover:bg-blue-600"
              >
                Choose File
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
