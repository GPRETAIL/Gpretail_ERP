import React from "react";
import { Printer, X, Loader2, CheckCircle2, AlertCircle, RotateCcw, Settings } from "lucide-react";
import { Box, IconButton, Typography } from "@mui/material";
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
  <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, py: 1.25, "&:last-of-type": { borderBottom: 0 } }}>
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
        {job.status === STATUS.PRINTING && (
          <Loader2 size={14} style={{ color: "#3b82f6", marginTop: 2, flexShrink: 0, animation: "app-spin 1s linear infinite" }} />
        )}
        {job.status === STATUS.QUEUED && (
          <Printer size={14} style={{ color: "inherit", opacity: 0.5, marginTop: 2, flexShrink: 0 }} />
        )}
        {job.status === STATUS.DONE && (
          <CheckCircle2 size={14} style={{ color: "#22c55e", marginTop: 2, flexShrink: 0 }} />
        )}
        {job.status === STATUS.FAILED && (
          <AlertCircle size={14} style={{ color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
        )}
        {job.status === STATUS.CANCELLED && (
          <X size={14} style={{ color: "inherit", opacity: 0.5, marginTop: 2, flexShrink: 0 }} />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {getPrintJobLabel(job)}
          </Typography>
          <Box sx={{ fontSize: 11, color: "text.secondary", display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box component="span" sx={{ textTransform: "capitalize" }}>{job.status}</Box>
            <Box component="span">&middot;</Box>
            <Box component="span">{formatRelativeTime(job.createdAt)}</Box>
            {job.totalCopies > 1 && (
              <>
                <Box component="span">&middot;</Box>
                <Box component="span">{job.completedCopies || 0}/{job.totalCopies} copies</Box>
              </>
            )}
          </Box>
          {job.error && (
            <Typography sx={{ fontSize: 11, color: "error.main", mt: 0.25, wordBreak: "break-word" }}>{job.error}</Typography>
          )}
        </Box>
      </Box>

      {(job.status === STATUS.QUEUED || job.status === STATUS.PRINTING) && (
        <IconButton
          onClick={() => onCancel(job.id)}
          title="Cancel this print job"
          size="small"
          sx={{ color: "text.disabled", flexShrink: 0, "&:hover": { color: "error.main" } }}
        >
          <X size={14} />
        </IconButton>
      )}
      {job.status === STATUS.FAILED && (
        <Box
          component="button"
          type="button"
          onClick={() => onRetry(job.id)}
          title="Retry this print job"
          sx={{
            display: "flex", alignItems: "center", gap: 0.5, fontSize: 11, color: "primary.main",
            flexShrink: 0, border: 0, bgcolor: "transparent", cursor: "pointer", "&:hover": { textDecoration: "underline" },
          }}
        >
          <RotateCcw size={12} /> Retry
        </Box>
      )}
    </Box>

    {job.totalCopies > 1 && job.status === STATUS.PRINTING && (
      <Box sx={{ ml: 3.4375, mt: 1.5, height: 4, bgcolor: "action.hover", borderRadius: 10, overflow: "hidden" }}>
        <Box
          sx={{ height: "100%", bgcolor: "#3b82f6", borderRadius: 10, transition: "all 0.3s", width: `${((job.completedCopies || 0) / job.totalCopies) * 100}%` }}
        />
      </Box>
    )}
  </Box>
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
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(3,7,18,0.3)" }} onClick={onClose} />
      <Box sx={{ position: "absolute", right: 0, top: 0, height: "100%", width: 340, maxWidth: "90vw", bgcolor: "background.paper", boxShadow: 24, display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>Print Queue</Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: "text.disabled" }}>
            <X size={16} />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: 12 }}>
            <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: connected ? "success.main" : "text.disabled" }} />
            <Box component="span" sx={{ color: connected ? "success.dark" : "text.secondary" }}>
              {connected ? "Print Service connected" : "Print Service offline"}
            </Box>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => {
              navigateActiveTab("/settings/printing-configuration");
              onClose();
            }}
            title="Printer settings"
            sx={{
              display: "flex", alignItems: "center", gap: 0.5, fontSize: 11, color: "text.secondary",
              border: 0, bgcolor: "transparent", cursor: "pointer", "&:hover": { color: "primary.main" },
            }}
          >
            <Settings size={12} /> Settings
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto" }}>
          {jobs.length === 0 ? (
            <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 12, color: "text.disabled", px: 2, textAlign: "center" }}>
              No recent print jobs.
            </Box>
          ) : (
            [...jobs].reverse().map((job) => (
              <JobRow key={job.id} job={job} STATUS={STATUS} onCancel={onCancel} onRetry={onRetry} />
            ))
          )}
        </Box>

        {hasFinished && (
          <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
            <Box
              component="button"
              type="button"
              onClick={onClearFinished}
              sx={{ fontSize: 11, color: "primary.main", border: 0, bgcolor: "transparent", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
            >
              Clear finished
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PrintQueueTray;
