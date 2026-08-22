import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Info,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const NewPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => {
    if (!file || !file.type.startsWith("image/")) return "";
    return URL.createObjectURL(file);
  }, [file]);

  const selectFile = (candidate) => {
    setError("");
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Please select a PDF, JPG, PNG, or WEBP file.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError("File size must be 15 MB or smaller.");
      return;
    }
    setFile(candidate);
  };

  const clearFile = () => {
    setFile(null);
    setError("");
  };

  const isImage = Boolean(file?.type?.startsWith("image/"));

  return (
    <section className="p-4 md:p-6 space-y-5 min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/warehouse")}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            aria-label="Back to Warehouse"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">New Page</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Warehouse document intake workspace for the upcoming Invoice AI workflow.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            OCR service integration pending
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Invoice Document</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Upload a supplier invoice to prepare it for PaddleOCR processing.
            </p>
          </div>

          <div className="p-5">
            {!file ? (
              <label
                htmlFor="warehouse-new-page-file"
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  selectFile(event.dataTransfer.files?.[0]);
                }}
                className={`flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
                  dragging
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-gray-300 dark:border-gray-600 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-750"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                  <UploadCloud className="w-7 h-7 text-indigo-500" />
                </div>
                <p className="mt-5 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Drop invoice here or browse files
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  PDF, JPG, PNG or WEBP · Maximum 15 MB
                </p>
                <span className="mt-5 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
                  Choose File
                </span>
                <input
                  id="warehouse-new-page-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => selectFile(event.target.files?.[0])}
                />
              </label>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                      {isImage ? <ImageIcon className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4 text-indigo-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isImage ? (
                  <div className="min-h-[300px] max-h-[520px] p-5 flex items-center justify-center bg-gray-100 dark:bg-gray-950">
                    <img src={previewUrl} alt="Selected invoice preview" className="max-h-[480px] max-w-full object-contain rounded-lg shadow-sm" />
                  </div>
                ) : (
                  <div className="min-h-[300px] flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-900/50">
                    <FileText className="w-12 h-12 text-gray-400" />
                    <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">PDF ready for processing</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">The OCR service will process each PDF page.</p>
                  </div>
                )}
              </div>
            )}

            {error ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Processing Pipeline</h2>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ["01", "Upload", "Document received"],
                ["02", "PaddleOCR", "Text and layout extraction"],
                ["03", "Invoice Parser", "Header, tax and line items"],
                ["04", "Validation", "Totals and confidence checks"],
                ["05", "Purchase Invoice", "Ready for warehouse posting"],
              ].map(([number, title, description], index, rows) => (
                <div key={number} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-[11px] font-semibold flex items-center justify-center">
                      {number}
                    </span>
                    {index < rows.length - 1 ? <span className="w-px flex-1 min-h-5 bg-gray-200 dark:bg-gray-700 mt-1" /> : null}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/20 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Designed for the standalone invoice-ai-service</p>
                <p className="mt-1.5 text-xs leading-5 text-indigo-800/80 dark:text-indigo-300/80">
                  This page is ready to connect to the FastAPI + PaddleOCR service without coupling OCR logic to the warehouse frontend.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default NewPage;
