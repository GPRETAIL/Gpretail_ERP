import { useEffect, useState } from "react";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import { PAYMENT_MODES } from "@/features/sales/dealer/utils/dealerPayments";


const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const options = (res) => (res?.data?.data || []).map((row) => ({ id: row.id, name: row.value || row.name || row.label || `#${row.id}` }));

/**
 * Dealer Invoice > Payment: Credit (no rows: the whole invoice goes on the dealer's account) or money taken now,
 * split across modes; whatever is not paid stays on credit. `payments`: [{ mode, amount, reference_no, card_type_id,
 * upi_provider_id, cheque_date }].
 */
export default function DealerPaymentBlock({ total, payments, onChange }) {
  const [cardTypes, setCardTypes] = useState([]);
  const [upiProviders, setUpiProviders] = useState([]);
  const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, Number(total || 0) - paid);
  const over = paid > Number(total || 0) + 0.005;

  useEffect(() => {
    let alive = true;
    Promise.all([api.get("/configurations/card_types").catch(() => null), api.get("/configurations/upi_provider").catch(() => null)])
      .then(([cards, upi]) => { if (alive) { setCardTypes(options(cards)); setUpiProviders(options(upi)); } });
    return () => { alive = false; };
  }, []);

  const update = (index, patch) => onChange(payments.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const add = () => onChange([...payments, { mode: payments.length ? "UPI" : "CASH", amount: balance > 0 ? balance.toFixed(2) : "", reference_no: "", card_type_id: "", upi_provider_id: "", cheque_date: "" }]);

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "5.25px", p: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>Payment</Typography>
        <Button size="small" startIcon={<Plus size={14} />} onClick={add} disabled={balance <= 0 && payments.length > 0}>Add payment</Button>
      </Stack>
      {payments.length === 0 && (
        <Typography sx={{ fontSize: 12.25, color: "text.secondary", mb: 1 }}>Credit: the whole invoice goes on the dealer's account. Add a payment if money is taken now.</Typography>
      )}
      <Stack spacing={1}>
        {payments.map((p, index) => (
          <Box key={index} sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 28px", gap: 0.75, alignItems: "center" }}>
            <TextField select size="small" label="Mode" value={p.mode} onChange={(e) => update(index, { mode: e.target.value })}>
              {PAYMENT_MODES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" label="Amount" value={p.amount} onChange={(e) => update(index, { amount: e.target.value })}
              slotProps={{ htmlInput: { min: 0, step: "0.01", "aria-label": `Payment ${index + 1} amount` } }} />
            <IconButton size="small" aria-label={`Remove payment ${index + 1}`} onClick={() => onChange(payments.filter((_p, i) => i !== index))}><Trash2 size={14} /></IconButton>
            {p.mode === "CARD" && cardTypes.length > 0 && (
              <TextField select size="small" label="Card type" value={p.card_type_id} onChange={(e) => update(index, { card_type_id: e.target.value })} sx={{ gridColumn: "1 / 3" }}>
                {cardTypes.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            )}
            {p.mode === "UPI" && upiProviders.length > 0 && (
              <TextField select size="small" label="UPI app" value={p.upi_provider_id} onChange={(e) => update(index, { upi_provider_id: e.target.value })} sx={{ gridColumn: "1 / 3" }}>
                {upiProviders.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </TextField>
            )}
            {p.mode !== "CASH" && (
              <TextField size="small" label={p.mode === "CHEQUE" ? "Cheque no." : "Reference / UTR"} value={p.reference_no} required={p.mode === "CHEQUE"}
                onChange={(e) => update(index, { reference_no: e.target.value })} sx={{ gridColumn: p.mode === "CHEQUE" ? "1 / 2" : "1 / 3" }} />
            )}
            {p.mode === "CHEQUE" && (
              <TextField size="small" type="date" label="Cheque date" value={p.cheque_date} onChange={(e) => update(index, { cheque_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: "2 / 3" }} />
            )}
          </Box>
        ))}
      </Stack>
      <Stack spacing={0.5} sx={{ mt: 1, fontSize: 12.25 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}><span>Invoice total</span><b>{money(total)}</b></Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}><span>Paid now</span><b>{money(paid)}</b></Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between", color: over ? "error.main" : balance > 0 ? "warning.main" : "success.main" }} role="status" aria-label="Payment balance">
          <span>{over ? "More than the invoice" : "On credit (balance)"}</span><b>{money(over ? paid - total : balance)}</b>
        </Stack>
      </Stack>
    </Box>
  );
}
