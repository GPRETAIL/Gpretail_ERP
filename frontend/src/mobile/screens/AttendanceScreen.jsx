import React, { useState, useEffect, useCallback } from "react";
import { Settings2, LogIn, LogOut, CalendarOff } from "lucide-react";
import { Box, Typography } from "@mui/material";
import api from "../../api/axios";
import { SkeletonTransList } from "../components/SkeletonCards";

const STATUS_STYLES = {
  PRESENT:    { label: "Present",    dot: "#10b981", text: "#047857", bg: "#ecfdf5", border: "#d1fae5" },
  ABSENT:     { label: "Absent",     dot: "#f43f5e", text: "#be123c", bg: "#fff1f2", border: "#ffe4e6" },
  LEAVE:      { label: "On Leave",   dot: "#8b5cf6", text: "#6d28d9", bg: "#f5f3ff", border: "#ede9fe" },
  HALF_DAY:   { label: "Half Day",   dot: "#f59e0b", text: "#b45309", bg: "#fffbeb", border: "#fef3c7" },
  NOT_MARKED: { label: "Not marked", dot: "#94a3b8", text: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${suffix}`;
};

/**
 * Daily attendance roll-call: an admin/manager marks each employee's
 * check-in/check-out/leave for today (no self-service check-in yet -
 * there's no link between the logged-in user and an Employee record).
 */
export default function AttendanceScreen() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionEmployeeId, setActionEmployeeId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ shift_start: "09:30", late_cutoff: "10:00" });
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/attendance/today");
      const data = res.data?.data || {};
      setRows(data.rows || []);
      setSummary(data.summary || null);
      setSettingsForm({
        shift_start: data.settings?.shift_start || "09:30",
        late_cutoff: data.settings?.late_cutoff || "10:00",
      });
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async (employeeId, action) => {
    setActionEmployeeId(employeeId);
    try {
      await api.post(`/attendance/${action}`, { employee_id: employeeId });
      await load();
    } catch {
      alert("Could not update attendance. Please try again.");
    } finally {
      setActionEmployeeId(null);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.post("/attendance/settings", settingsForm);
      setSettingsOpen(false);
      await load();
    } catch {
      alert("Could not save attendance settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <Box>
      {/* Summary strip */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, mb: 1.5 }}>
        {[
          { key: "total", label: "Total", color: "#1e293b" },
          { key: "present", label: "Present", color: "#059669" },
          { key: "absent", label: "Absent", color: "#e11d48" },
          { key: "leave", label: "Leave", color: "#7c3aed" },
        ].map((s) => (
          <Box key={s.key} sx={{ p: 1.25, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", textAlign: "center" }}>
            <Typography component="p" sx={{ fontSize: 16, fontWeight: 900, m: 0, color: s.color }}>{summary?.[s.key] ?? 0}</Typography>
            <Typography component="p" sx={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em", mt: 0.25 }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, px: 0.5 }}>
        <Typography component="h4" sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", m: 0 }}>Today's Roll Call</Typography>
        <Box
          component="button"
          type="button"
          onClick={() => setSettingsOpen(true)}
          sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 10.5, fontWeight: 700, color: "#4f46e5", px: 1, py: 0.5, borderRadius: "8px", "&:active": { bgcolor: "#eef2ff" } }}
        >
          <Settings2 size={13} /> Shift Timing
        </Box>
      </Box>

      {loading ? (
        <SkeletonTransList count={4} />
      ) : rows.length === 0 ? (
        <Box className="vx-card" sx={{ textAlign: "center" }}>
          <Typography component="p" sx={{ fontSize: 14, color: "#94a3b8" }}>No active employees found</Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {rows.map((row) => {
            const style = STATUS_STYLES[row.status] || STATUS_STYLES.NOT_MARKED;
            const isBusy = actionEmployeeId === row.employee_id;
            return (
              <Box key={row.employee_id} sx={{ p: 1.5, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="p" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a", m: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</Typography>
                    <Typography component="p" sx={{ fontSize: 10, color: "#64748b", mt: 0.25 }}>{row.department || row.code}</Typography>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0, fontSize: 10, fontWeight: 700,
                      px: 1, py: 0.5, borderRadius: "999px", border: "1px solid",
                      bgcolor: style.bg, color: style.text, borderColor: style.border,
                    }}
                  >
                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: style.dot }} />
                    {style.label}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.25, pt: 1.25, borderTop: "1px solid #f1f5f9" }}>
                  {row.status === "PRESENT" && row.check_out ? (
                    <Typography component="p" sx={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", m: 0 }}>
                      In {fmtTime(row.check_in)} &middot; Out {fmtTime(row.check_out)}
                    </Typography>
                  ) : row.status === "PRESENT" ? (
                    <Typography component="p" sx={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", m: 0 }}>Checked in {fmtTime(row.check_in)}</Typography>
                  ) : row.status === "LEAVE" ? (
                    <Typography component="p" sx={{ fontSize: 10.5, fontWeight: 600, color: "#64748b", m: 0 }}>Marked on leave</Typography>
                  ) : (
                    <Box component="span" />
                  )}

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {row.status === "PRESENT" && !row.check_out && (
                      <Box
                        component="button"
                        type="button"
                        disabled={isBusy}
                        onClick={() => doAction(row.employee_id, "check-out")}
                        sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 10.5, fontWeight: 700, px: 1.25, py: 0.75, borderRadius: "8px", bgcolor: "#1e293b", color: "#fff", transition: "all 0.15s", "&:active": { transform: "scale(0.95)" }, "&:disabled": { opacity: 0.5 } }}
                      >
                        <LogOut size={12} /> Check Out
                      </Box>
                    )}
                    {(row.status === "NOT_MARKED" || row.status === "ABSENT" || row.status === "LEAVE") && (
                      <Box
                        component="button"
                        type="button"
                        disabled={isBusy}
                        onClick={() => doAction(row.employee_id, "check-in")}
                        sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 10.5, fontWeight: 700, px: 1.25, py: 0.75, borderRadius: "8px", bgcolor: "#059669", color: "#fff", transition: "all 0.15s", "&:active": { transform: "scale(0.95)" }, "&:disabled": { opacity: 0.5 } }}
                      >
                        <LogIn size={12} /> Check In
                      </Box>
                    )}
                    {row.status !== "LEAVE" && (
                      <Box
                        component="button"
                        type="button"
                        disabled={isBusy}
                        onClick={() => doAction(row.employee_id, "mark-leave")}
                        sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 10.5, fontWeight: 700, px: 1.25, py: 0.75, borderRadius: "8px", border: "1px solid #ddd6fe", color: "#7c3aed", transition: "all 0.15s", "&:active": { transform: "scale(0.95)" }, "&:disabled": { opacity: 0.5 } }}
                      >
                        <CalendarOff size={12} /> Leave
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {settingsOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", animation: "app-fade-in 0.15s ease-out" }}
        >
          <Box
            sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: 24, display: "flex", flexDirection: "column", maxHeight: "85vh", overflow: "hidden", animation: "app-slide-in-from-bottom 0.2s ease-out" }}
          >
            <Box sx={{ p: 2, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography component="h3" sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Shift Timing</Typography>
              <Box
                component="button"
                type="button"
                onClick={() => setSettingsOpen(false)}
                sx={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", px: 1, py: 0.5, borderRadius: "8px" }}
              >
                Close
              </Box>
            </Box>
            <Box sx={{ p: 2, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography component="p" sx={{ fontSize: 11, color: "#64748b", lineHeight: 1.625, mt: -0.5 }}>
                Employees who haven't checked in by the late cutoff show as Absent automatically.
              </Typography>
              <Box>
                <Typography component="label" sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", mb: 0.75 }}>Shift Start</Typography>
                <Box
                  component="input"
                  type="time"
                  value={settingsForm.shift_start}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, shift_start: e.target.value }))}
                  sx={{
                    width: "100%", bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", py: 1.25, px: 1.5,
                    fontSize: 14, fontWeight: 600, color: "#0f172a", outline: "none", "&:focus": { borderColor: "#4f46e5" },
                  }}
                />
              </Box>
              <Box>
                <Typography component="label" sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", mb: 0.75 }}>Late Cutoff</Typography>
                <Box
                  component="input"
                  type="time"
                  value={settingsForm.late_cutoff}
                  onChange={(e) => setSettingsForm((f) => ({ ...f, late_cutoff: e.target.value }))}
                  sx={{
                    width: "100%", bgcolor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", py: 1.25, px: 1.5,
                    fontSize: 14, fontWeight: 600, color: "#0f172a", outline: "none", "&:focus": { borderColor: "#4f46e5" },
                  }}
                />
              </Box>
              <Box
                component="button"
                type="button"
                disabled={savingSettings}
                onClick={saveSettings}
                sx={{ width: "100%", py: 1.5, borderRadius: "12px", bgcolor: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700, transition: "all 0.15s", "&:active": { transform: "scale(0.98)" }, "&:disabled": { opacity: 0.5 } }}
              >
                {savingSettings ? "Saving..." : "Save Shift Timing"}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
