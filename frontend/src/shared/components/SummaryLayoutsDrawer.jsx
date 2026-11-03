import { Box, Button, IconButton, Radio, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Layers } from "lucide-react";
import { muiFieldSx } from "@/shared/theme/formControlSizes";

const dateFieldSx = [muiFieldSx, { "& .MuiInputBase-input": { fontFamily: "monospace" } }];
const fieldLabelSx = { mb: 0.5, display: "block", fontWeight: 600, color: "text.secondary" };

/** A labelled field in the panel (From/To, Day, Bill number, Company scope…). */
export function SummaryField({ label, children }) {
  return (
    <Box>
      <Typography component="label" sx={fieldLabelSx}>{label}</Typography>
      {children}
    </Box>
  );
}

export function SummaryDateField({ label, value, onChange }) {
  return (
    <SummaryField label={label}>
      <TextField type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} size="small" fullWidth sx={dateFieldSx}
        slotProps={{ htmlInput: { "aria-label": label } }} />
    </SummaryField>
  );
}

/**
 * The "Summary layouts" panel from the right: pick one breakdown, set the period, Apply. Shared by the report pages;
 * each page says which breakdowns it offers and runs the summary itself (on the server).
 * `dated` shows From/To; `topContent` / `bottomContent` hold page-specific fields (company scope, day, bill no).
 */
export default function SummaryLayoutsDrawer({
  open, onClose, description = "Pick one breakdown and the period, then Apply.", options = [], mode, onModeChange,
  dated = true, from, to, onRangeChange, topContent = null, bottomContent = null, loading = false, onApply, name = "summary_mode",
}) {
  return (
    <>
      <Box
        role="presentation"
        onClick={onClose}
        sx={{
          position: "fixed", inset: 0, zIndex: 40, bgcolor: "rgba(0,0,0,0.3)", transition: "opacity 0.2s",
          opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden", pointerEvents: open ? "auto" : "none",
        }}
      />
      <Box
        component="aside"
        aria-label="Summary layouts"
        aria-hidden={!open}
        sx={{
          position: "fixed", right: 0, top: 0, zIndex: 50, display: "flex", height: "100%", width: "100%", maxWidth: 448,
          flexDirection: "column", borderLeft: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 12,
          transition: "transform 0.2s", transform: open ? "translateX(0)" : "translateX(100%)", visibility: open ? "visible" : "hidden",
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                Summary layouts
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>{description}</Typography>
            </Box>
            <IconButton type="button" aria-label="Close" size="small" onClick={onClose}
              sx={{ fontSize: 17.5, lineHeight: 1, color: "text.disabled", "&:hover": { color: "text.secondary" } }}>
              ×
            </IconButton>
          </Stack>
        </Box>

        <Stack sx={{ flex: 1, gap: 2, overflowY: "auto", px: 2, py: 1.5, fontSize: 10.5 }}>
          {topContent}
          <Box>
            <Typography sx={{ mb: 1, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Breakdown type</Typography>
            <Stack sx={{ maxHeight: "52vh", gap: 0.75, overflowY: "auto", pr: 0.5 }}>
              {options.map((opt) => (
                <Stack
                  component="label"
                  direction="row"
                  key={opt.value}
                  sx={{
                    cursor: "pointer", alignItems: "center", gap: 1, borderRadius: "3.5px", border: 1, px: 1, py: 0.75,
                    borderColor: mode === opt.value ? "primary.light" : "transparent",
                    bgcolor: mode === opt.value ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.08) : "transparent",
                    "&:hover": mode !== opt.value ? { bgcolor: "action.hover" } : undefined,
                  }}
                >
                  <Radio name={name} size="small" sx={{ flexShrink: 0, p: 0 }} checked={mode === opt.value} onChange={() => onModeChange(opt.value)} />
                  <Box component="span" sx={{ fontWeight: 500, fontSize: 11, lineHeight: 1.2, color: "text.primary" }}>{opt.label}</Box>
                </Stack>
              ))}
            </Stack>
          </Box>
          {dated ? (
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { sm: "1fr 1fr" } }}>
              <SummaryDateField label="From" value={from} onChange={(value) => onRangeChange({ from: value })} />
              <SummaryDateField label="To" value={to} onChange={(value) => onRangeChange({ to: value })} />
            </Box>
          ) : null}
          {bottomContent}
        </Stack>

        <Box sx={{ borderTop: 1, borderColor: "divider", p: 2 }}>
          <Button type="button" disabled={loading || !mode} onClick={onApply} variant="contained" fullWidth sx={{ py: 1, fontSize: 10.5, fontWeight: 700 }}>
            {loading ? "Loading…" : "Apply breakdown"}
          </Button>
        </Box>
      </Box>
    </>
  );
}

/** "Summary layouts" button, plus "Standard view" while a summary is showing. */
export function SummaryLayoutsButtons({ onOpen, applied, onReset }) {
  return (
    <>
      <Button type="button" onClick={onOpen} variant="outlined" size="small" startIcon={<Layers size={14} />} sx={{ fontSize: 10.5, fontWeight: 600 }}>
        Summary layouts
      </Button>
      {applied ? (
        <Button
          type="button"
          onClick={onReset}
          size="small"
          sx={{
            fontSize: 10.5, fontWeight: 600, border: 1, borderColor: (theme) => alpha(theme.palette.warning.main, 0.4), color: "warning.dark",
            bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.08),
            "&:hover": { bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.24 : 0.16) },
          }}
        >
          Standard view
        </Button>
      ) : null}
    </>
  );
}
