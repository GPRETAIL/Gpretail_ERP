import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Camera, HandCoins, Paperclip, Receipt } from "lucide-react";
import api from "@/shared/api/apiClient";
import { CLAIM_CATEGORY, LOAN_TYPE, MONEY_STATUS, claimPayLabel, errorMessage } from "@/features/hr/utils/hrStatus";

const STATUS_COLORS = { REQUESTED: "#b45309", PENDING: "#b45309", APPROVED: "#0369a1", ACTIVE: "#4338ca", CLOSED: "#047857", PAID: "#047857", REJECTED: "#be123c", CANCELLED: "#64748b" };
const card = { p: 1.5, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)" };
const input = { width: "100%", p: 1.1, borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: 13, bgcolor: "#fff", boxSizing: "border-box" };
const label = { fontSize: 10.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.5 };
const heading = { fontSize: 11, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, px: 0.5 };
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const today = () => new Date().toLocaleDateString("en-CA");

function Sheet({ title, children, error, saving, canSave, onSave, onClose, saveLabel }) {
  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)" }} onClick={onClose}>
      <Box onClick={(e) => e.stopPropagation()} sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", p: 2, display: "flex", flexDirection: "column", gap: 1.25, maxHeight: "92vh", overflowY: "auto" }}>
        <Typography sx={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{title}</Typography>
        {children}
        {error && <Box sx={{ p: 1, borderRadius: "10px", bgcolor: "#fff1f2", color: "#be123c", fontSize: 12, fontWeight: 700 }}>{error}</Box>}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box component="button" type="button" onClick={onClose} sx={{ flex: 1, py: 1.25, borderRadius: "12px", border: "1px solid #cbd5e1", bgcolor: "#fff", fontWeight: 800 }}>Cancel</Box>
          <Box component="button" type="button" disabled={saving || !canSave} onClick={onSave} sx={{ flex: 1, py: 1.25, borderRadius: "12px", border: 0, bgcolor: "#0d9488", color: "#fff", fontWeight: 900, "&:disabled": { opacity: 0.6 } }}>{saving ? "Sending…" : saveLabel}</Box>
        </Box>
      </Box>
    </Box>
  );
}

function ClaimSheet({ onClose }) {
  const [form, setForm] = useState({ claim_date: today(), category: "TRAVEL", amount: "", description: "" });
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => value !== "" && body.append(key, value));
      if (bill) body.append("bill", bill);
      await api.post("/expense-claims", body, { headers: { "Content-Type": "multipart/form-data" } });
      onClose(true);
    } catch (err) {
      setError(errorMessage(err, "Could not send the claim."));
    } finally {
      setSaving(false);
    }
  };
  const pick = (e) => setBill(e.target.files?.[0] || null);
  return (
    <Sheet title="New expense claim" error={error} saving={saving} canSave={Number(form.amount) > 0} onSave={save} onClose={() => onClose(false)} saveLabel="Send">
      <Box sx={{ display: "flex", gap: 1 }}>
        <Box sx={{ flex: 1 }}><Typography sx={label}>Spent on</Typography><Box component="input" type="date" max={today()} value={form.claim_date} onChange={(e) => setForm({ ...form, claim_date: e.target.value })} sx={input} /></Box>
        <Box sx={{ flex: 1 }}><Typography sx={label}>Amount ₹</Typography><Box component="input" type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} sx={input} /></Box>
      </Box>
      <Box>
        <Typography sx={label}>Category</Typography>
        <Box component="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} sx={input}>
          {Object.entries(CLAIM_CATEGORY).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </Box>
      </Box>
      <Box><Typography sx={label}>What was it for?</Typography><Box component="textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} sx={{ ...input, resize: "none" }} /></Box>
      <Box>
        <Typography sx={label}>Bill</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box component="label" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 1.1, borderRadius: "10px", border: "1px dashed #94a3b8", fontSize: 12.5, fontWeight: 800, color: "#334155" }}>
            <Camera size={15} /> Take photo
            <input hidden type="file" accept="image/*" capture="environment" onChange={pick} />
          </Box>
          <Box component="label" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 1.1, borderRadius: "10px", border: "1px dashed #94a3b8", fontSize: 12.5, fontWeight: 800, color: "#334155" }}>
            <Paperclip size={15} /> Choose file
            <input hidden type="file" accept="image/*,application/pdf" onChange={pick} />
          </Box>
        </Box>
        {bill && <Typography sx={{ fontSize: 11.5, color: "#047857", fontWeight: 700, mt: 0.5 }}>Attached: {bill.name}</Typography>}
      </Box>
    </Sheet>
  );
}

function AdvanceSheet({ onClose }) {
  const [form, setForm] = useState({ type: "ADVANCE", amount: "", instalments: "3", reason: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const instalments = form.type === "ADVANCE" ? 1 : Math.max(1, Number(form.instalments) || 1);
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/staff-loans", { type: form.type, amount: Number(form.amount), instalments, reason: form.reason || undefined });
      onClose(true);
    } catch (err) {
      setError(errorMessage(err, "Could not send the request."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet title="Ask for an advance or loan" error={error} saving={saving} canSave={Number(form.amount) > 0} onSave={save} onClose={() => onClose(false)} saveLabel="Send">
      <Box sx={{ display: "flex", gap: 1 }}>
        {Object.entries(LOAN_TYPE).map(([value, text]) => (
          <Box key={value} component="button" type="button" onClick={() => setForm({ ...form, type: value })}
            sx={{ flex: 1, py: 1, borderRadius: "10px", fontSize: 12.5, fontWeight: 800, border: form.type === value ? "2px solid #0d9488" : "1px solid #cbd5e1", bgcolor: form.type === value ? "#f0fdfa" : "#fff", color: "#0f172a" }}>{text}</Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Box sx={{ flex: 1 }}><Typography sx={label}>Amount ₹</Typography><Box component="input" type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} sx={input} /></Box>
        {form.type === "LOAN" && <Box sx={{ flex: 1 }}><Typography sx={label}>Months to repay</Typography><Box component="input" type="number" min={1} max={60} value={form.instalments} onChange={(e) => setForm({ ...form, instalments: e.target.value })} sx={input} /></Box>}
      </Box>
      {Number(form.amount) > 0 && <Typography sx={{ fontSize: 12, color: "#475569" }}>{money(Math.ceil((Number(form.amount) / instalments) * 100) / 100)} from {instalments === 1 ? "your next salary" : `each of ${instalments} salaries`}. No interest.</Typography>}
      <Box><Typography sx={label}>Reason</Typography><Box component="textarea" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} sx={{ ...input, resize: "none" }} /></Box>
    </Sheet>
  );
}

const Status = ({ status }) => <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: STATUS_COLORS[status] }}>{MONEY_STATUS[status]?.label || status}</Typography>;

/** Mobile Claims: claim money back (bill photo from the camera), ask for an advance, follow both. */
export default function ClaimsScreen() {
  const [mine, setMine] = useState(null);
  const [sheet, setSheet] = useState(null); // claim | advance
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setMine((await api.get("/staff-money/mine")).data?.data || {});
    } catch (err) {
      setMessage(errorMessage(err, "Could not load your claims."));
      setMine({});
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const withdraw = async (url) => {
    try {
      await api.post(url);
      setMessage("Withdrawn.");
      await load();
    } catch (err) {
      setMessage(errorMessage(err, "Could not withdraw."));
    }
  };
  const owed = (mine?.loans || []).filter((l) => l.status === "ACTIVE").reduce((sum, l) => sum + Number(l.balance || 0), 0);
  const button = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 1.3, borderRadius: "14px", border: 0, color: "#fff", fontSize: 13.5, fontWeight: 900 };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {message && <Box sx={{ p: 1.25, borderRadius: "12px", bgcolor: "#eef2ff", color: "#3730a3", fontSize: 12, fontWeight: 700 }}>{message}</Box>}
      {mine && !mine.employee ? (
        <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "#64748b" }}>Your login is not linked to an employee yet. Ask HR to link it on your employee record.</Typography></Box>
      ) : (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box component="button" type="button" onClick={() => setSheet("claim")} sx={{ ...button, bgcolor: "#0d9488" }}><Receipt size={16} /> New claim</Box>
          <Box component="button" type="button" onClick={() => setSheet("advance")} sx={{ ...button, bgcolor: "#4338ca" }}><HandCoins size={16} /> Ask for advance</Box>
        </Box>
      )}
      {owed > 0 && <Box sx={{ ...card, bgcolor: "#fffbeb", borderColor: "#fde68a" }}><Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#92400e" }}>{money(owed)} still to be recovered from your salary</Typography></Box>}

      {mine?.employee && (
        <>
          <Box>
            <Typography sx={heading}>My claims</Typography>
            {(mine.claims || []).length === 0 && <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "#94a3b8" }}>No claims yet.</Typography></Box>}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {(mine.claims || []).map((row) => (
                <Box key={row.id} sx={{ ...card, display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>{money(row.amount)} · {CLAIM_CATEGORY[row.category] || row.category}</Typography>
                    <Typography sx={{ fontSize: 11, color: "#64748b" }}>{row.claim_date}{row.description ? ` · ${row.description}` : ""}{claimPayLabel(row) ? ` · ${claimPayLabel(row)}` : ""}{row.decision_note ? ` · ${row.decision_note}` : ""}</Typography>
                  </Box>
                  <Status status={row.status} />
                  {row.status === "PENDING" && <Box component="button" type="button" onClick={() => withdraw(`/expense-claims/${row.id}/cancel`)} sx={{ fontSize: 11, fontWeight: 800, color: "#64748b", border: 0, bgcolor: "transparent" }}>Withdraw</Box>}
                </Box>
              ))}
            </Box>
          </Box>
          <Box>
            <Typography sx={heading}>Advances and loans</Typography>
            {(mine.loans || []).length === 0 && <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "#94a3b8" }}>None.</Typography></Box>}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {(mine.loans || []).map((row) => (
                <Box key={row.id} sx={{ ...card, display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>{LOAN_TYPE[row.type]} · {money(row.amount)}</Typography>
                    <Typography sx={{ fontSize: 11, color: "#64748b" }}>
                      {row.instalments} × {money(row.instalment_amount)} from {row.first_month}{["ACTIVE", "CLOSED"].includes(row.status) ? ` · balance ${money(row.balance)}` : ""}
                    </Typography>
                  </Box>
                  <Status status={row.status} />
                  {["REQUESTED", "APPROVED"].includes(row.status) && <Box component="button" type="button" onClick={() => withdraw(`/staff-loans/${row.id}/cancel`)} sx={{ fontSize: 11, fontWeight: 800, color: "#64748b", border: 0, bgcolor: "transparent" }}>Withdraw</Box>}
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}
      {sheet === "claim" && <ClaimSheet onClose={(saved) => { setSheet(null); if (saved) { setMessage("Claim sent for approval."); void load(); } }} />}
      {sheet === "advance" && <AdvanceSheet onClose={(saved) => { setSheet(null); if (saved) { setMessage("Request sent for approval."); void load(); } }} />}
    </Box>
  );
}
