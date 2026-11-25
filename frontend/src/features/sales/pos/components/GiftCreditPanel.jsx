import { useEffect, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { Ticket, X } from "lucide-react";
import api from "@/shared/api/apiClient";
import { giftCreditErrorMessage, giftCreditTotal } from "@/features/sales/pos/utils/giftCredit";

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * POS payment: pay part of the bill with a gift voucher, a credit note or a coupon. The cashier types or scans the number;
 * the server says what it is worth on this bill. A voucher or credit note can pay in parts, a coupon is used whole.
 * value: list of { number, display_number, kind_label, amount, balance } (applied so far). otherPaid is the part of the bill
 * already paid by loyalty points. Offline tills cannot use them (the balance lives on the server).
 */
export default function GiftCreditPanel({ billAmount, otherPaid = 0, value, onChange }) {
  const applied = value || [];
  const appliedTotal = giftCreditTotal(applied);
  const due = Math.max(0, round2(billAmount - otherPaid - appliedTotal));
  const [number, setNumber] = useState("");
  const [found, setFound] = useState(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // A smaller bill than what was applied: start again rather than save a bill the server would refuse.
  useEffect(() => {
    if (applied.length && appliedTotal > round2(billAmount - otherPaid) + 0.005) onChange([]);
  }, [applied.length, appliedTotal, billAmount, otherPaid, onChange]);

  if (!(billAmount > 0)) return null;

  const check = async () => {
    const typed = number.trim();
    if (!typed) return;
    if (applied.some((row) => row.number === typed || row.display_number?.toLowerCase() === typed.toLowerCase())) {
      setError("This code is already on the bill.");
      return;
    }
    setBusy(true); setError(""); setFound(null);
    try {
      const res = await api.get("/gift-credits/lookup", { params: { number: typed, bill_total: billAmount, due } });
      const quote = res.data?.data || null;
      if (quote && applied.some((row) => row.number === quote.number)) {
        setError("This code is already on the bill.");
      } else {
        setFound(quote);
        setAmount(quote ? String(quote.max_use) : "");
      }
    } catch (err) {
      setError(giftCreditErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const wanted = found?.single_use ? Number(found.max_use) : round2(amount);
  const valid = Boolean(found) && wanted > 0 && wanted <= Number(found.max_use) + 0.005;

  const apply = () => {
    if (!valid) return;
    onChange([...applied, { number: found.number, display_number: found.display_number, kind_label: found.kind_label, amount: wanted, balance: found.balance }]);
    setNumber(""); setFound(null); setAmount(""); setError("");
  };

  return (
    <Box data-enter-ignore="true" sx={{ gridColumn: "1 / -1", border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.25, bgcolor: "action.hover" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Ticket size={16} />
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Gift voucher, credit note or coupon</Typography>
      </Stack>

      {applied.map((row) => (
        <Stack key={row.number} direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
          <Alert severity="success" sx={{ py: 0, flex: 1 }}>
            {row.kind_label} {row.display_number}: ₹{money(row.amount)} used{row.kind_label === "coupon" ? "" : `, ₹${money(Math.max(0, row.balance - row.amount))} left on it`}.
          </Alert>
          <Button size="small" color="inherit" startIcon={<X size={14} />} onClick={() => onChange(applied.filter((item) => item.number !== row.number))}>Remove</Button>
        </Stack>
      ))}

      {due > 0 && (
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
            <TextField size="small" label="Number" value={number} placeholder="For example CN261125-0001" sx={{ width: 240 }}
              onChange={(e) => { setNumber(e.target.value); setFound(null); setError(""); }}
              slotProps={{ htmlInput: { "aria-label": "Voucher, credit note or coupon number", maxLength: 80 } }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void (found ? apply() : check()); } }} />
            <Button size="small" variant="outlined" disabled={!number.trim() || busy} onClick={() => void check()}>Check</Button>
          </Stack>
          {found && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
              <Typography sx={{ fontSize: 12.5 }}>
                {found.kind_label} {found.display_number}: ₹{money(found.balance)} left{found.expires_on ? `, valid until ${found.expires_on}` : ""}.
              </Typography>
              {found.single_use ? (
                <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>Takes ₹{money(found.max_use)} off the bill</Typography>
              ) : (
                <TextField size="small" type="number" label="Amount to use" value={amount} onChange={(e) => setAmount(e.target.value)} sx={{ width: 160 }}
                  slotProps={{ htmlInput: { min: 0, max: found.max_use, step: "0.01", "aria-label": "Amount to use" } }}
                  helperText={`Up to ₹${money(found.max_use)}`} />
              )}
              <Button size="small" variant="contained" disabled={!valid} onClick={apply}>Apply</Button>
            </Stack>
          )}
        </Stack>
      )}
      {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
    </Box>
  );
}
