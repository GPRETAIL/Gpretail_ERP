import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Box, Typography } from "@mui/material";
import { Check, Plus, X } from "lucide-react";
import api from "@/shared/api/apiClient";
import { CLAIM_CATEGORY, EXIT_TYPE, LEAVE_STATUS, LOAN_TYPE, days, errorMessage, requestSummary } from "@/features/hr/utils/hrStatus";

const APPROVER_ROLES = ["admin", "super_admin", "manager", "supervisor", "accountant"];
const STATUS_COLORS = { PENDING: "#b45309", APPROVED: "#047857", REJECTED: "#be123c", CANCELLED: "#64748b" };
const card = { p: 1.5, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)" };
const input = { width: "100%", p: 1.1, borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: 13, bgcolor: "#fff", boxSizing: "border-box" };
const label = { fontSize: 10.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.5 };

function ApplySheet({ balances, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ leave_type_id: String(balances[0]?.leave_type_id || ""), from_date: today, to_date: today, half_day: false, reason: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const type = balances.find((b) => String(b.leave_type_id) === form.leave_type_id);
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/leave-applications", { leave_type_id: Number(form.leave_type_id), from_date: form.from_date, to_date: form.half_day ? form.from_date : form.to_date, half_day: form.half_day, reason: form.reason || undefined });
      onClose(true);
    } catch (err) {
      setError(errorMessage(err, "Could not apply for leave."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)" }} onClick={() => onClose(false)}>
      <Box onClick={(e) => e.stopPropagation()} sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>Apply for leave</Typography>
        <Box>
          <Typography sx={label}>Leave type</Typography>
          <Box component="select" value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })} sx={input}>
            {balances.map((b) => <option key={b.leave_type_id} value={String(b.leave_type_id)}>{b.name}{b.is_paid ? ` · ${days(b.available)} left` : ""}</option>)}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box sx={{ flex: 1 }}><Typography sx={label}>From</Typography><Box component="input" type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value, to_date: e.target.value > form.to_date ? e.target.value : form.to_date })} sx={input} /></Box>
          <Box sx={{ flex: 1 }}><Typography sx={label}>To</Typography><Box component="input" type="date" disabled={form.half_day} value={form.half_day ? form.from_date : form.to_date} min={form.from_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} sx={input} /></Box>
        </Box>
        {type?.allow_half_day !== false && (
          <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={form.half_day} onChange={(e) => setForm({ ...form, half_day: e.target.checked })} /> Half day
          </Box>
        )}
        <Box><Typography sx={label}>Reason</Typography><Box component="textarea" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} sx={{ ...input, resize: "none" }} /></Box>
        {error && <Box sx={{ p: 1, borderRadius: "10px", bgcolor: "#fff1f2", color: "#be123c", fontSize: 12, fontWeight: 700 }}>{error}</Box>}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box component="button" type="button" onClick={() => onClose(false)} sx={{ flex: 1, py: 1.25, borderRadius: "12px", border: "1px solid #cbd5e1", bgcolor: "#fff", fontWeight: 800 }}>Cancel</Box>
          <Box component="button" type="button" disabled={saving || !form.leave_type_id} onClick={submit} sx={{ flex: 1, py: 1.25, borderRadius: "12px", border: 0, bgcolor: "#0d9488", color: "#fff", fontWeight: 900, "&:disabled": { opacity: 0.6 } }}>{saving ? "Applying…" : "Apply"}</Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Mobile Leave: my balances and applications, apply, and (for managers) leave waiting for approval. */
export default function LeaveScreen() {
  const role = useSelector((state) => state.auth.user?.role);
  const approver = APPROVER_ROLES.includes(role);
  const [mine, setMine] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [requests, setRequests] = useState([]);
  const [money, setMoney] = useState([]);
  const [exits, setExits] = useState([]);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const optional = (url, params) => (approver ? api.get(url, { params }).catch(() => null) : Promise.resolve(null));
      const [m, i, r, c, l, x] = await Promise.all([
        api.get("/leave/mine"),
        approver ? api.get("/leave-applications", { params: { status: "PENDING", inbox: 1 } }) : Promise.resolve(null),
        approver ? api.get("/staff-requests", { params: { status: "PENDING" } }) : Promise.resolve(null),
        optional("/expense-claims", { status: "PENDING", inbox: 1 }),
        optional("/staff-loans", { status: "REQUESTED", inbox: 1 }),
        optional("/separations", { status: "REQUESTED", inbox: 1 }),
      ]);
      setMine(m.data?.data || {});
      setInbox(i?.data?.data || []);
      setRequests(r?.data?.data || []);
      setExits(x?.data?.data || []);
      // Claims (paid with the next salary when approved here) and advance / loan requests.
      setMoney([...(c?.data?.data || []).map((x) => ({ ...x, kind: "claim" })), ...(l?.data?.data || []).map((x) => ({ ...x, kind: "loan" }))]);
    } catch (err) {
      setMessage(errorMessage(err, "Could not load leave."));
      setMine({});
    }
  }, [approver]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const act = async (id, action, base = "/leave-applications", body = undefined) => {
    setMessage("");
    try {
      const res = await api.post(`${base}/${id}/${action}`, body);
      setMessage(res.data?.message || "Done");
      await load();
    } catch (err) {
      setMessage(errorMessage(err, "Could not update the leave."));
    }
  };

  const balances = mine?.balances || [];
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {message && <Box sx={{ p: 1.25, borderRadius: "12px", bgcolor: "#eef2ff", color: "#3730a3", fontSize: 12, fontWeight: 700 }}>{message}</Box>}
      {mine && !mine.employee ? (
        <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "#64748b" }}>Your login is not linked to an employee yet. Ask HR to link it on your employee record.</Typography></Box>
      ) : (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
            {balances.filter((b) => b.is_paid).map((b) => (
              <Box key={b.leave_type_id} sx={{ ...card, textAlign: "center" }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, color: "#0f766e" }}>{days(b.available)}</Typography>
                <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>{b.code} left of {days(b.allocated)}</Typography>
              </Box>
            ))}
          </Box>
          <Box component="button" type="button" disabled={!balances.length} onClick={() => setApplying(true)}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 1.3, borderRadius: "14px", border: 0, bgcolor: "#0d9488", color: "#fff", fontSize: 14, fontWeight: 900, "&:disabled": { opacity: 0.5 } }}>
            <Plus size={16} /> Apply for leave
          </Box>
        </>
      )}

      {approver && (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, px: 0.5 }}>Waiting for your approval ({inbox.length})</Typography>
          {inbox.length === 0 && <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "#94a3b8" }}>Nothing to approve.</Typography></Box>}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {inbox.map((row) => (
              <Box key={row.id} sx={card}>
                <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{row.employee_name}</Typography>
                <Typography sx={{ fontSize: 11.5, color: "#475569" }}>{row.leave_type_name} · {row.from_date}{row.to_date !== row.from_date ? ` to ${row.to_date}` : ""} · {days(row.days)} day(s){row.half_day ? " (half)" : ""}</Typography>
                {row.reason && <Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 0.25 }}>"{row.reason}"</Typography>}
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Box component="button" type="button" onClick={() => act(row.id, "approve")} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, py: 0.9, borderRadius: "10px", border: 0, bgcolor: "#059669", color: "#fff", fontWeight: 800, fontSize: 12 }}><Check size={14} /> Approve</Box>
                  <Box component="button" type="button" onClick={() => act(row.id, "reject")} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, py: 0.9, borderRadius: "10px", border: "1px solid #fecdd3", bgcolor: "#fff", color: "#be123c", fontWeight: 800, fontSize: 12 }}><X size={14} /> Reject</Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {approver && requests.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, px: 0.5 }}>Attendance and shift requests ({requests.length})</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {requests.map((row) => (
              <Box key={row.id} sx={card}>
                <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{row.employee_name}</Typography>
                <Typography sx={{ fontSize: 11.5, color: "#475569" }}>{row.type === "ATTENDANCE" ? "Fix attendance" : "Change shift"} · {row.from_date} · {requestSummary(row)}</Typography>
                {row.reason && <Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 0.25 }}>"{row.reason}"</Typography>}
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Box component="button" type="button" onClick={() => act(row.id, "approve", "/staff-requests")} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, py: 0.9, borderRadius: "10px", border: 0, bgcolor: "#059669", color: "#fff", fontWeight: 800, fontSize: 12 }}><Check size={14} /> Approve</Box>
                  <Box component="button" type="button" onClick={() => act(row.id, "reject", "/staff-requests")} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, py: 0.9, borderRadius: "10px", border: "1px solid #fecdd3", bgcolor: "#fff", color: "#be123c", fontWeight: 800, fontSize: 12 }}><X size={14} /> Reject</Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {approver && exits.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, px: 0.5 }}>Resignations ({exits.length})</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {exits.map((row) => (
              <Box key={row.id} sx={card}>
                <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{row.employee_name}</Typography>
                <Typography sx={{ fontSize: 11.5, color: "#475569" }}>{EXIT_TYPE[row.type]} on {row.applied_on} · asks to leave {row.requested_last_day || "-"} · notice {row.notice_days} day(s)</Typography>
                {row.reason && <Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 0.25 }}>"{row.reason}"</Typography>}
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Box component="button" type="button" onClick={() => act(row.id, "accept", "/separations", { last_working_day: row.requested_last_day || row.applied_on })} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, py: 0.9, borderRadius: "10px", border: 0, bgcolor: "#059669", color: "#fff", fontWeight: 800, fontSize: 12 }}><Check size={14} /> Accept</Box>
                  <Box component="button" type="button" onClick={() => act(row.id, "reject", "/separations")} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, py: 0.9, borderRadius: "10px", border: "1px solid #fecdd3", bgcolor: "#fff", color: "#be123c", fontWeight: 800, fontSize: 12 }}><X size={14} /> Reject</Box>
                </Box>
                <Typography sx={{ fontSize: 10.5, color: "#94a3b8", mt: 0.5 }}>Accepting keeps the day they asked for; change it from Exits on the web.</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {approver && money.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, px: 0.5 }}>Claims and advances ({money.length})</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {money.map((row) => {
              const base = row.kind === "claim" ? "/expense-claims" : "/staff-loans";
              return (
                <Box key={`${row.kind}-${row.id}`} sx={card}>
                  <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{row.employee_name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: "#475569" }}>
                    {row.kind === "claim" ? `Claim · ${CLAIM_CATEGORY[row.category] || row.category} · ${row.claim_date}` : `${LOAN_TYPE[row.type]}${row.instalments > 1 ? ` · ${row.instalments} months` : ""}`} · ₹{Number(row.amount).toLocaleString("en-IN")}
                  </Typography>
                  {(row.description || row.reason) && <Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 0.25 }}>"{row.description || row.reason}"</Typography>}
                  {row.kind === "claim" && <Typography sx={{ fontSize: 10.5, color: "#94a3b8", mt: 0.25 }}>Approved claims are paid with the next salary.</Typography>}
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Box component="button" type="button" onClick={() => act(row.id, "decide", base, { action: "approve" })} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, py: 0.9, borderRadius: "10px", border: 0, bgcolor: "#059669", color: "#fff", fontWeight: 800, fontSize: 12 }}><Check size={14} /> Approve</Box>
                    <Box component="button" type="button" onClick={() => act(row.id, "decide", base, { action: "reject" })} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, py: 0.9, borderRadius: "10px", border: "1px solid #fecdd3", bgcolor: "#fff", color: "#be123c", fontWeight: 800, fontSize: 12 }}><X size={14} /> Reject</Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {mine?.employee && (
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, px: 0.5 }}>My applications</Typography>
          {(mine.applications || []).length === 0 && <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "#94a3b8" }}>No leave applied this year.</Typography></Box>}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {(mine.applications || []).map((row) => (
              <Box key={row.id} sx={{ ...card, display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>{row.leave_type_name} · {days(row.days)} day(s)</Typography>
                  <Typography sx={{ fontSize: 11, color: "#64748b" }}>{row.from_date}{row.to_date !== row.from_date ? ` to ${row.to_date}` : ""}{row.decision_note ? ` · ${row.decision_note}` : ""}</Typography>
                </Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: STATUS_COLORS[row.status] }}>{LEAVE_STATUS[row.status]?.label}</Typography>
                {row.status === "PENDING" && <Box component="button" type="button" onClick={() => act(row.id, "cancel")} sx={{ fontSize: 11, fontWeight: 800, color: "#64748b", border: 0, bgcolor: "transparent" }}>Withdraw</Box>}
              </Box>
            ))}
          </Box>
        </Box>
      )}
      {applying && <ApplySheet balances={balances} onClose={(saved) => { setApplying(false); if (saved) { setMessage("Leave applied; waiting for approval."); void load(); } }} />}
    </Box>
  );
}
