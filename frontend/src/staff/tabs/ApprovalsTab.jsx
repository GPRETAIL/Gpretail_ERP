import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Check, Paperclip, X } from "lucide-react";
import api from "@/shared/api/apiClient";
import { STAFF_COLOR, STAFF_TEXT, card, errorText, primaryButton, rupee, secondaryButton } from "../staffUi";

const FILTERS = [["all", "All"], ["leave", "Leave"], ["attendance", "Attendance"], ["shift", "Shift"], ["overtime", "Overtime"], ["claim", "Expenses"], ["loan", "Advances"], ["resignation", "Resignations"]];

/** Each type is approved through its own HR endpoint, exactly as on the web. */
function decide(item, approve, note) {
  const body = note ? { note } : {};
  switch (item.type) {
    case "leave":
      return api.post(`/leave-applications/${item.id}/${approve ? "approve" : "reject"}`, body);
    case "attendance":
    case "shift":
      return api.post(`/staff-requests/${item.id}/${approve ? "approve" : "reject"}`, body);
    case "overtime":
      return api.post("/overtime/decide", { ids: [item.id], action: approve ? "approve" : "reject" });
    case "loan":
      return api.post(`/staff-loans/${item.id}/decide`, { action: approve ? "approve" : "reject", ...body });
    case "claim":
      return api.post(`/expense-claims/${item.id}/decide`, { action: approve ? "approve" : "reject", ...body });
    case "resignation":
      return approve ? api.post(`/separations/${item.id}/accept`, { last_working_day: item.last_day }) : api.post(`/separations/${item.id}/reject`, body);
    default:
      return Promise.reject(new Error("Unknown request"));
  }
}

function Item({ item, onDone }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const act = async (approve) => {
    setBusy(true);
    setError("");
    try {
      const res = await decide(item, approve, note.trim());
      onDone(res.data?.message || (approve ? "Approved" : "Rejected"));
    } catch (err) {
      setError(errorText(err, "Could not save. Try again."));
      setBusy(false);
    }
  };
  const openBill = async () => {
    try {
      const res = await api.get(`/expense-claims/${item.id}/bill`);
      if (res.data?.data?.url) window.open(res.data.data.url, "_blank", "noopener");
    } catch (err) {
      setError(errorText(err, "Could not open the bill."));
    }
  };
  return (
    <Box sx={card}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
        <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>{item.employee_name}</Typography>
        {item.amount != null && <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>{rupee(item.amount)}</Typography>}
      </Box>
      <Typography sx={{ fontSize: STAFF_TEXT.label, fontWeight: 700, color: STAFF_COLOR.primaryDark, mt: 0.25 }}>{item.title}</Typography>
      {item.detail && <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, mt: 0.25 }}>{item.detail}</Typography>}
      {item.type === "resignation" && <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint, mt: 0.5 }}>Accepting keeps the last day they asked for. HR can change it on the web.</Typography>}
      {item.type === "claim" && <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint, mt: 0.5 }}>Approved claims are paid with the next salary.</Typography>}
      {item.has_bill && (
        <Box component="button" type="button" onClick={openBill} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 0.75, border: 0, p: 0, bgcolor: "transparent", color: STAFF_COLOR.primaryDark, fontSize: STAFF_TEXT.label, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", minHeight: 32 }}>
          <Paperclip size={15} /> View bill
        </Box>
      )}
      {item.type !== "overtime" && (
        <Box component="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder="Note (optional)" aria-label={`Note for ${item.employee_name}`}
          sx={{ width: "100%", boxSizing: "border-box", mt: 1.25, minHeight: 40, px: 1.25, borderRadius: "10px", border: "1px solid #d1d5db", fontSize: STAFF_TEXT.label, fontFamily: "inherit", color: STAFF_COLOR.text }} />
      )}
      {error && <Typography role="alert" sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.danger, fontWeight: 600, mt: 1 }}>{error}</Typography>}
      <Box sx={{ display: "flex", gap: 1, mt: 1.25 }}>
        <Box component="button" type="button" disabled={busy} onClick={() => act(true)} sx={{ ...primaryButton, flex: 1, bgcolor: "#059669" }}><Check size={18} /> {item.type === "resignation" ? "Accept" : "Approve"}</Box>
        <Box component="button" type="button" disabled={busy} onClick={() => act(false)} sx={{ ...secondaryButton, flex: 1, color: STAFF_COLOR.danger, borderColor: "#fecdd3" }}><X size={18} /> Reject</Box>
      </Box>
    </Box>
  );
}

/** Approvals: one list of everything waiting for me, across leave, requests, overtime, money and resignations. */
export default function ApprovalsTab({ onChanged }) {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setItems((await api.get("/staff-app/inbox")).data?.data || []);
    } catch (err) {
      setMessage(errorText(err, "Could not load approvals."));
      setItems([]);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const counts = (items || []).reduce((acc, i) => ({ ...acc, [i.type]: (acc[i.type] || 0) + 1 }), {});
  const shown = (items || []).filter((i) => filter === "all" || i.type === filter);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", pb: 0.5, mx: -2, px: 2, scrollbarWidth: "none" }}>
        {FILTERS.filter(([key]) => key === "all" || counts[key]).map(([key, label]) => (
          <Box key={key} component="button" type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}
            sx={{ flex: "0 0 auto", minHeight: 36, px: 1.5, borderRadius: "999px", border: `1px solid ${filter === key ? STAFF_COLOR.primary : STAFF_COLOR.line}`, bgcolor: filter === key ? STAFF_COLOR.primary : "#fff",
              color: filter === key ? "#fff" : STAFF_COLOR.text, fontSize: STAFF_TEXT.label, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
            {label}{key === "all" ? ` · ${(items || []).length}` : ` · ${counts[key]}`}
          </Box>
        ))}
      </Box>
      {message && <Box role="status" sx={{ ...card, bgcolor: STAFF_COLOR.primarySoft, borderColor: "#99f6e4", color: STAFF_COLOR.primaryDark, fontSize: STAFF_TEXT.label, fontWeight: 700 }}>{message}</Box>}
      {items === null && <Box sx={card}><Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.faint }}>Loading…</Typography></Box>}
      {items && shown.length === 0 && <Box sx={card}><Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>Nothing is waiting for your approval.</Typography></Box>}
      {shown.map((item) => (
        <Item key={`${item.type}-${item.id}`} item={item} onDone={(text) => { setMessage(`${item.employee_name}: ${text}`); void load(); onChanged?.(); }} />
      ))}
    </Box>
  );
}
