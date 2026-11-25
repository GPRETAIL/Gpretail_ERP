import { useCallback, useEffect, useState } from "react";
import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { ChevronLeft, MessageSquarePlus } from "lucide-react";
import api from "@/shared/api/apiClient";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import { STAFF_COLOR, STAFF_TEXT, card, errorText, primaryButton, secondaryButton } from "../staffUi";

const STATUS = { OPEN: ["Open", "#d97706"], IN_PROGRESS: ["HR is on it", "#0369a1"], CLOSED: ["Closed", "#6b7280"] };
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

function StatusPill({ status }) {
  const [label, color] = STATUS[status] || [status, "#6b7280"];
  return <Box component="span" sx={{ px: 1.25, py: 0.25, borderRadius: "999px", bgcolor: color, color: "#fff", fontSize: STAFF_TEXT.small, fontWeight: 800, whiteSpace: "nowrap" }}>{label}</Box>;
}

function Thread({ id, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get(`/staff-company/tickets/${id}`).then((res) => { if (active) setTicket(res.data?.data); }).catch(() => { if (active) setError("Could not load this question."); });
    return () => { active = false; };
  }, [id]);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/staff-company/tickets/${id}/reply`, { body: reply });
      setTicket(res.data?.data);
      setReply("");
    } catch (err) {
      setError(errorText(err, "Could not send. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box component="button" type="button" onClick={onBack} sx={{ ...secondaryButton, alignSelf: "flex-start", minHeight: 40 }}><ChevronLeft size={18} /> All questions</Box>
      {!ticket && !error && <LoadingSkeleton variant="list" rows={3} label="Loading question" />}
      {error && !ticket && <Typography role="alert" sx={{ color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.label }}>{error}</Typography>}
      {ticket && (
        <>
          <Box sx={card}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "flex-start" }}>
              <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>{ticket.subject}</Typography>
              <StatusPill status={ticket.status} />
            </Box>
            <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint }}>{ticket.category_label} · {when(ticket.created_at)}</Typography>
            <Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.text, whiteSpace: "pre-wrap", mt: 1 }}>{ticket.message}</Typography>
          </Box>
          {ticket.replies.map((item) => (
            <Box key={item.id} sx={{ ...card, ml: item.from === "HR" ? 0 : 3, mr: item.from === "HR" ? 3 : 0, bgcolor: item.from === "HR" ? STAFF_COLOR.primarySoft : STAFF_COLOR.surface, borderColor: item.from === "HR" ? STAFF_COLOR.primaryBorder : STAFF_COLOR.line }}>
              <Typography sx={{ fontSize: STAFF_TEXT.small, fontWeight: 800, color: STAFF_COLOR.muted }}>{item.from === "HR" ? "HR" : "You"} · {when(item.at)}</Typography>
              <Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.text, whiteSpace: "pre-wrap" }}>{item.body}</Typography>
            </Box>
          ))}
          <TextField multiline minRows={2} label={ticket.status === "CLOSED" ? "Reply to open it again" : "Your reply"} value={reply} onChange={(e) => setReply(e.target.value)} slotProps={{ htmlInput: { maxLength: 3000 } }} />
          {error && <Typography role="alert" sx={{ color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.label, fontWeight: 600 }}>{error}</Typography>}
          <Box component="button" type="button" onClick={() => void send()} disabled={busy || !reply.trim()} sx={primaryButton}>{busy ? "Sending" : "Send"}</Box>
        </>
      )}
    </Box>
  );
}

/** Ask HR a question, see their answers, reply, and reopen a closed question. */
export default function HelpdeskSection() {
  const [rows, setRows] = useState(null);
  const [categories, setCategories] = useState({});
  const [view, setView] = useState("list"); // list, new or a ticket id
  const [form, setForm] = useState({ category: "OTHER", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/staff-company/tickets");
      setRows(res.data?.data || []);
      setCategories(res.data?.categories || {});
    } catch {
      setError("Could not load your questions. Pull down to try again.");
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/staff-company/tickets", form);
      setForm({ category: "OTHER", subject: "", message: "" });
      await load();
      setView(res.data?.data?.id || "list");
    } catch (err) {
      setError(errorText(err, "Could not send your question. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (typeof view === "number") return <Thread id={view} onBack={() => { setView("list"); void load(); }} />;
  if (view === "new") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box component="button" type="button" onClick={() => { setView("list"); setError(""); }} sx={{ ...secondaryButton, alignSelf: "flex-start", minHeight: 40 }}><ChevronLeft size={18} /> Back</Box>
        <TextField select label="What is it about" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          {Object.entries(categories).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
        </TextField>
        <TextField label="Title" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} slotProps={{ htmlInput: { maxLength: 150 } }} />
        <TextField multiline minRows={4} label="Your question or problem" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} slotProps={{ htmlInput: { maxLength: 3000 } }} />
        {error && <Typography role="alert" sx={{ color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.label, fontWeight: 600 }}>{error}</Typography>}
        <Box component="button" type="button" onClick={() => void create()} disabled={busy} sx={primaryButton}>{busy ? "Sending" : "Send to HR"}</Box>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box component="button" type="button" onClick={() => setView("new")} sx={primaryButton}><MessageSquarePlus size={18} /> Ask HR a question</Box>
      {error && <Typography role="alert" sx={{ color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.label, textAlign: "center" }}>{error}</Typography>}
      {!rows && !error && <LoadingSkeleton variant="list" rows={3} label="Loading questions" />}
      {rows?.length === 0 && <Box sx={card}><Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>You have not asked HR anything yet.</Typography></Box>}
      {(rows || []).map((row) => (
        <Box key={row.id} component="button" type="button" onClick={() => setView(row.id)} sx={{ ...card, textAlign: "left", fontFamily: "inherit", cursor: "pointer", display: "flex", gap: 1, alignItems: "center" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 700, color: STAFF_COLOR.text }} noWrap>{row.subject}</Typography>
            <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint }}>{row.category_label} · {when(row.last_reply_at || row.created_at)}</Typography>
          </Box>
          <StatusPill status={row.status} />
        </Box>
      ))}
    </Box>
  );
}
