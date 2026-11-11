import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { CalendarClock, Clock } from "lucide-react";
import api from "@/shared/api/apiClient";
import { LEAVE_STATUS, REQUEST_STATUS_LABEL, errorMessage, requestSummary } from "@/features/hr/utils/hrStatus";
import MyResignationCard from "./MyResignationCard";

const input = { width: "100%", p: 1.1, borderRadius: "10px", border: "1px solid var(--hr-border-strong, #cbd5e1)", fontSize: 13, bgcolor: "var(--hr-surface, #fff)", boxSizing: "border-box" };
const label = { fontSize: 10.5, fontWeight: 800, color: "var(--hr-muted, #64748b)", textTransform: "uppercase", mb: 0.5 };
const today = () => new Date().toLocaleDateString("en-CA");

function RequestSheet({ type, shifts, onClose }) {
  const [form, setForm] = useState({ from_date: today(), to_date: today(), check_in: "", check_out: "", status: "", working_hour_id: shifts[0] ? String(shifts[0].id) : "", is_off: false, reason: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/staff-requests", type === "ATTENDANCE"
        ? { type, from_date: form.from_date, check_in: form.check_in || undefined, check_out: form.check_out || undefined, status: form.status || undefined, reason: form.reason || undefined }
        : { type, from_date: form.from_date, to_date: form.to_date, ...(form.is_off ? { is_off: true } : { working_hour_id: Number(form.working_hour_id) }), reason: form.reason || undefined });
      onClose(true);
    } catch (err) {
      setError(errorMessage(err, "Could not send the request."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)" }} onClick={() => onClose(false)}>
      <Box onClick={(e) => e.stopPropagation()} sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "var(--hr-surface, #fff)", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 900 }}>{type === "ATTENDANCE" ? "Fix attendance" : "Change shift"}</Typography>
        {type === "ATTENDANCE" ? (
          <>
            <Box><Typography sx={label}>Date</Typography><Box component="input" type="date" max={today()} value={form.from_date} onChange={set("from_date")} sx={input} /></Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box sx={{ flex: 1 }}><Typography sx={label}>Check-in</Typography><Box component="input" type="time" value={form.check_in} onChange={set("check_in")} sx={input} /></Box>
              <Box sx={{ flex: 1 }}><Typography sx={label}>Check-out</Typography><Box component="input" type="time" value={form.check_out} onChange={set("check_out")} sx={input} /></Box>
            </Box>
            <Box><Typography sx={label}>Or mark the day as</Typography>
              <Box component="select" value={form.status} onChange={set("status")} sx={input}>
                <option value="">-</option>
                {Object.entries(REQUEST_STATUS_LABEL).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </Box>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box sx={{ flex: 1 }}><Typography sx={label}>From</Typography><Box component="input" type="date" value={form.from_date} onChange={set("from_date")} sx={input} /></Box>
              <Box sx={{ flex: 1 }}><Typography sx={label}>To</Typography><Box component="input" type="date" min={form.from_date} value={form.to_date} onChange={set("to_date")} sx={input} /></Box>
            </Box>
            <Box component="label" sx={{ display: "flex", gap: 1, alignItems: "center", fontSize: 13, fontWeight: 600 }}><input type="checkbox" checked={form.is_off} onChange={set("is_off")} /> Day off instead</Box>
            {!form.is_off && (
              <Box><Typography sx={label}>Shift</Typography>
                <Box component="select" value={form.working_hour_id} onChange={set("working_hour_id")} sx={input}>
                  {shifts.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </Box>
              </Box>
            )}
          </>
        )}
        <Box><Typography sx={label}>Reason</Typography><Box component="textarea" rows={2} value={form.reason} onChange={set("reason")} sx={{ ...input, resize: "none" }} /></Box>
        {error && <Box sx={{ p: 1, borderRadius: "10px", bgcolor: "var(--hr-danger-bg, #fff1f2)", color: "var(--hr-danger, #be123c)", fontSize: 12, fontWeight: 700 }}>{error}</Box>}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box component="button" type="button" onClick={() => onClose(false)} sx={{ flex: 1, py: 1.25, borderRadius: "12px", border: "1px solid var(--hr-border-strong, #cbd5e1)", bgcolor: "var(--hr-surface, #fff)", fontWeight: 800 }}>Cancel</Box>
          <Box component="button" type="button" disabled={saving} onClick={submit} sx={{ flex: 1, py: 1.25, borderRadius: "12px", border: 0, bgcolor: "#0d9488", color: "#fff", fontWeight: 900 }}>Send</Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Mobile: ask to fix a day's attendance or change a shift, and see those requests. */
export default function MyRequestsCard() {
  const [data, setData] = useState(null);
  const [asking, setAsking] = useState(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setData((await api.get("/staff-requests/mine")).data?.data || null);
    } catch {
      setData(null);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (!data?.employee) return null;
  const button = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 1.1, borderRadius: "12px", border: "1px solid var(--hr-teal-border, #99f6e4)", bgcolor: "var(--hr-teal-bg, #f0fdfa)", color: "var(--hr-teal-text, #0f766e)", fontWeight: 800, fontSize: 12.5 };
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Box component="button" type="button" onClick={() => setAsking("ATTENDANCE")} sx={button}><Clock size={15} /> Fix attendance</Box>
        <Box component="button" type="button" onClick={() => setAsking("SHIFT")} sx={button}><CalendarClock size={15} /> Change shift</Box>
      </Box>
      {message && <Box sx={{ mt: 1, p: 1, borderRadius: "10px", bgcolor: "var(--hr-info-bg, #eef2ff)", color: "var(--hr-info-text, #3730a3)", fontSize: 12, fontWeight: 700 }}>{message}</Box>}
      {(data.requests || []).slice(0, 3).map((r) => (
        <Box key={r.id} sx={{ mt: 1, p: 1.25, borderRadius: "12px", bgcolor: "var(--hr-surface, #fff)", border: "1px solid var(--hr-border, rgba(226,232,240,0.8))", display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 12, color: "var(--hr-text, #0f172a)" }}>{r.from_date} · {requestSummary(r)}</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: "var(--hr-muted, #64748b)" }}>{LEAVE_STATUS[r.status]?.label}</Typography>
        </Box>
      ))}
      <MyResignationCard />
      {asking && <RequestSheet type={asking} shifts={data.shifts || []} onClose={(saved) => { setAsking(null); if (saved) { setMessage("Request sent for approval."); void load(); } }} />}
    </Box>
  );
}
