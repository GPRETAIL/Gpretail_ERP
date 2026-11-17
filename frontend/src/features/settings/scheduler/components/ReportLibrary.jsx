import { useMemo, useState } from "react";
import { Box, Button, Chip, Collapse, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { CalendarClock, ChevronDown, ChevronRight, Search } from "lucide-react";
import { libraryGroups } from "../utils/scheduler";

/**
 * Settings > Scheduler: every report that can be emailed, grouped by module like the Sales Reports page. Open a
 * module, pick a report, and its schedule form opens ready to fill in.
 */
export default function ReportLibrary({ options, schedules, onSchedule }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState({});
  const groups = useMemo(() => libraryGroups(options.reports, options.modules, schedules, query), [options.reports, options.modules, schedules, query]);
  const searching = query.trim() !== "";

  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Report library</Typography>
      <TextField size="small" placeholder="Find a report..." value={query} onChange={(e) => setQuery(e.target.value)}
        slotProps={{ htmlInput: { "aria-label": "Find a report" }, input: { startAdornment: <InputAdornment position="start"><Search size={14} /></InputAdornment> } }} />
      {groups.map(({ module, reports }) => {
        const expanded = searching || Boolean(open[module]);
        const scheduled = reports.reduce((sum, r) => sum + r.scheduled, 0);
        return (
          <Box key={module} sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
            <Box component="button" type="button" aria-expanded={expanded} onClick={() => setOpen((o) => ({ ...o, [module]: !o[module] }))}
              sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 1, border: 0, bgcolor: expanded ? "action.hover" : "background.paper",
                cursor: "pointer", font: "inherit", color: "text.primary", textAlign: "left" }}>
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Typography sx={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{module} ({reports.length})</Typography>
              {scheduled ? <Chip size="small" color="primary" variant="outlined" label={`${scheduled} scheduled`} sx={{ height: 20, fontSize: 11 }} /> : null}
            </Box>
            <Collapse in={expanded} unmountOnExit>
              <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
                {reports.map((report) => (
                  <Stack key={report.key} direction="row" spacing={1} sx={{ alignItems: "center", px: 1.5, py: 0.75 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13 }}>{report.label}</Typography>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                        {report.dated ? "For a period" : "As on the day it is sent"}{report.scheduled ? ` · ${report.scheduled} scheduled` : ""}
                      </Typography>
                    </Box>
                    <Button size="small" startIcon={<CalendarClock size={14} />} onClick={() => onSchedule(report)} aria-label={`Schedule ${report.label}`}>Schedule</Button>
                  </Stack>
                ))}
              </Stack>
            </Collapse>
          </Box>
        );
      })}
      {!groups.length ? <Typography variant="body2" color="text.secondary">No report matches.</Typography> : null}
    </Paper>
  );
}
