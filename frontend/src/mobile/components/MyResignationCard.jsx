import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { LogOut } from "lucide-react";
import api from "@/shared/api/apiClient";
import { EXIT_STATUS, errorMessage } from "@/features/hr/utils/hrStatus";

const input = { width: "100%", p: 1.1, borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: 13, bgcolor: "#fff", boxSizing: "border-box" };
const label = { fontSize: 10.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", mb: 0.5 };
const today = () => new Date().toLocaleDateString("en-CA");
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + Number(n || 0)); return d.toLocaleDateString("en-CA"); };

/** Mobile: resign (and follow or withdraw the resignation) from the Attendance screen. */
export default function MyResignationCard() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setData((await api.get("/separations/mine")).data?.data || null);
    } catch {
      setData(null);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (!data?.employee) return null;
  const open = (data.separations || []).find((s) => ["REQUESTED", "ACCEPTED", "RELIEVED"].includes(s.status));
  const act = async (url, body, done) => {
    setError("");
    try {
      await api.post(url, body);
      setForm(null);
      setMessage(done);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not send."));
    }
  };
  return (
    <Box sx={{ mt: 1.5 }}>
      {message && <Box sx={{ mb: 1, p: 1, borderRadius: "10px", bgcolor: "#eef2ff", color: "#3730a3", fontSize: 12, fontWeight: 700 }}>{message}</Box>}
      {open ? (
        <Box sx={{ p: 1.25, borderRadius: "12px", bgcolor: "#fff", border: "1px solid #fecdd3" }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>Resignation · {EXIT_STATUS[open.status]?.label}</Typography>
          <Typography sx={{ fontSize: 11.5, color: "#64748b" }}>
            {open.last_working_day ? `Last working day ${open.last_working_day}` : `Asked to leave on ${open.requested_last_day || "-"}`}{open.decision_note ? ` · ${open.decision_note}` : ""}
          </Typography>
          {open.status === "REQUESTED" && (
            <Box component="button" type="button" onClick={() => act(`/separations/${open.id}/withdraw`, {}, "Resignation withdrawn.")}
              sx={{ mt: 0.5, p: 0, fontSize: 11.5, fontWeight: 800, color: "#64748b", border: 0, bgcolor: "transparent" }}>Withdraw</Box>
          )}
        </Box>
      ) : (
        <Box component="button" type="button" onClick={() => setForm({ requested_last_day: addDays(data.notice_days), reason: "" })}
          sx={{ display: "flex", alignItems: "center", gap: 0.75, p: 0, border: 0, bgcolor: "transparent", color: "#be123c", fontSize: 12, fontWeight: 800 }}>
          <LogOut size={14} /> Resign
        </Box>
      )}
      {form && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)" }} onClick={() => setForm(null)}>
          <Box onClick={(e) => e.stopPropagation()} sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 900 }}>Resign</Typography>
            <Typography sx={{ fontSize: 12, color: "#475569" }}>Your notice period is {data.notice_days} day(s). Leaving earlier may be deducted from your settlement unless your manager waives it.</Typography>
            <Box><Typography sx={label}>I would like to leave on</Typography><Box component="input" type="date" min={today()} value={form.requested_last_day} onChange={(e) => setForm({ ...form, requested_last_day: e.target.value })} sx={input} /></Box>
            <Box><Typography sx={label}>Reason</Typography><Box component="textarea" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} sx={{ ...input, resize: "none" }} /></Box>
            {error && <Box sx={{ p: 1, borderRadius: "10px", bgcolor: "#fff1f2", color: "#be123c", fontSize: 12, fontWeight: 700 }}>{error}</Box>}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box component="button" type="button" onClick={() => setForm(null)} sx={{ flex: 1, py: 1.25, borderRadius: "12px", border: "1px solid #cbd5e1", bgcolor: "#fff", fontWeight: 800 }}>Cancel</Box>
              <Box component="button" type="button" onClick={() => act("/separations/resign", { requested_last_day: form.requested_last_day, reason: form.reason || undefined }, "Resignation sent to your manager.")}
                sx={{ flex: 1, py: 1.25, borderRadius: "12px", border: 0, bgcolor: "#be123c", color: "#fff", fontWeight: 900 }}>Send resignation</Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
