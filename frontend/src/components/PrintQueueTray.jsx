import React from "react";
import { Printer, X, Loader2, CheckCircle2, AlertCircle, RotateCcw, Settings } from "lucide-react";
import { useTabs } from "../context/TabContext";

const getPrintJobLabel = (job) =>
  typeof job?.label === "string" ? job.label : job?.label?.jobName || "Print job";

const formatRelativeTime = (timestamp) => {
  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours}h ago`;
};

const JobRow = ({ job, STATUS, onCancel, onRetry }) => (
  <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-2.5 last:border-b-0">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-2 min-w-0">
        {job.status === STATUS.PRINTING && (
          <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0 mt-0.5" />
        )}
        {job.status === STATUS.QUEUED && (
          <Printer className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
        )}
        {job.status === STATUS.DONE && (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
        )}
        {job.status === STATUS.FAILED && (
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
        )}
        {job.status === STATUS.CANCELLED && (
          <X className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <div className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
            {getPrintJobLabel(job)}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <span className="capitalize">{job.status}</span>
            <span>&middot;</span>
            <span>{formatRelativeTime(job.createdAt)}</span>
            {job.totalCopies > 1 && (
              <>
                <span>&middot;</span>
                <span>{job.completedCopies || 0}/{job.totalCopies} copies</span>
              </>
            )}
          </div>
          {job.error && (
            <div className="text-[11px] text-red-500 mt-0.5 break-words">{job.error}</div>
          )}
        </div>
      </div>

      {(job.status === STATUS.QUEUED || job.status === STATUS.PRINTING) && (
        <button
          type="button"
          onClick={() => onCancel(job.id)}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 shrink-0"
          title="Cancel this print job"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {job.status === STATUS.FAILED && (
        <button
          type="button"
          onClick={() => onRetry(job.id)}
          className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          title="Retry this print job"
        >
          <RotateCcw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>

    {job.totalCopies > 1 && job.status === STATUS.PRINTING && (
      <div className="ml-5.5 mt-1.5 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${((job.completedCopies || 0) / job.totalCopies) * 100}%` }}
        />
      </div>
    )}
  </div>
);

const PrintQueueTray = ({
  open,
  onClose,
  jobs,
  STATUS,
  connected,
  onCancel,
  onRetry,
  onClearFinished,
}) => {
  const { navigateActiveTab } = useTabs();

  if (!open) return null;

  const hasFinished = jobs.some(
    (j) => j.status === STATUS.DONE || j.status === STATUS.FAILED || j.status === STATUS.CANCELLED
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-gray-950/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[340px] max-w-[90vw] bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Print Queue</div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-gray-400"}`} />
            <span className={connected ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
              {connected ? "Print Service connected" : "Print Service offline"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigateActiveTab("/settings/printing-configuration");
              onClose();
            }}
            className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            title="Printer settings"
          >
            <Settings className="w-3 h-3" /> Settings
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {jobs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-gray-500 px-4 text-center">
              No recent print jobs.
            </div>
          ) : (
            [...jobs].reverse().map((job) => (
              <JobRow key={job.id} job={job} STATUS={STATUS} onCancel={onCancel} onRetry={onRetry} />
            ))
          )}
        </div>

        {hasFinished && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClearFinished}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear finished
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintQueueTray;
