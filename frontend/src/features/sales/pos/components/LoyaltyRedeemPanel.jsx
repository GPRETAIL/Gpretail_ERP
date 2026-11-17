import { useEffect, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { Gift, KeyRound, Send, X } from "lucide-react";
import api from "@/shared/api/apiClient";
import { loyaltyErrorMessage, loyaltyRedeemAmount } from "@/features/sales/pos/utils/loyaltyRedeem";

const CHANNEL_LABELS = { sms: "SMS", whatsapp: "WhatsApp", email: "email" };

/**
 * POS payment: redeem the customer's loyalty points as part of the payment. Shows the balance and the most this bill
 * can take; the customer approves with an OTP (SMS / WhatsApp / email, Settings > Messaging). Without one, the points
 * are applied and checkout asks for a supervisor's approval. value: { points, amount, otpToken } or null.
 */
export default function LoyaltyRedeemPanel({ customerId, billAmount, value, onChange }) {
  const [quote, setQuote] = useState(null);
  const [points, setPoints] = useState("");
  const [otp, setOtp] = useState(null); // { otp_id, sent_to, channel }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    if (!customerId || !(billAmount > 0)) return () => { alive = false; };
    api.get("/loyalty-redeem/quote", { params: { customer_id: customerId, amount: billAmount } })
      .then((res) => alive && setQuote(res.data?.data || null))
      .catch(() => alive && setQuote(null));
    return () => { alive = false; };
  }, [customerId, billAmount]);

  if (!customerId || !quote?.enabled || quote.balance <= 0) return null;

  const wanted = Math.max(0, Math.floor(Number(points) || 0));
  const amount = loyaltyRedeemAmount(wanted, quote.point_value);
  const valid = wanted >= quote.min_points && wanted <= quote.max_points;
  const apply = (extra = {}) => { onChange({ points: wanted, amount, ...extra }); setOtp(null); setCode(""); setError(""); };

  const sendOtp = async (channel) => {
    setBusy(true); setError("");
    try {
      const res = await api.post("/loyalty-redeem/otp", { customer_id: customerId, points: wanted, amount: billAmount, channel });
      setOtp(res.data?.data || null);
    } catch (err) {
      setError(loyaltyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true); setError("");
    try {
      const res = await api.post(`/loyalty-redeem/otp/${otp.otp_id}/verify`, { code: code.trim() });
      apply({ otpToken: res.data?.data?.token });
    } catch (err) {
      setError(loyaltyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box data-enter-ignore="true" sx={{ gridColumn: "1 / -1", border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.25, bgcolor: "action.hover" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <Gift size={16} />
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Loyalty points{quote.tier?.name ? ` · ${quote.tier.name}` : ""}</Typography>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          Balance {quote.balance} pts (₹{loyaltyRedeemAmount(quote.balance, quote.point_value).toFixed(2)}) · up to {quote.max_points} pts on this bill
        </Typography>
      </Stack>

      {value?.points > 0 ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Alert severity="success" sx={{ py: 0, flex: 1 }}>
            {value.points} pts = ₹{Number(value.amount).toFixed(2)} applied{value.otpToken ? " (customer OTP verified)" : quote.verify ? " (a supervisor approves at Save)" : ""}.
          </Alert>
          <Button size="small" color="inherit" startIcon={<X size={14} />} onClick={() => onChange(null)}>Remove</Button>
        </Stack>
      ) : quote.max_points <= 0 ? (
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          {quote.balance < quote.min_points ? `At least ${quote.min_points} points are needed to redeem.` : "This bill is too small to redeem points on."}
        </Typography>
      ) : (
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
            <TextField size="small" type="number" label="Points to redeem" value={points} onChange={(e) => { setPoints(e.target.value); setOtp(null); }}
              slotProps={{ htmlInput: { min: quote.min_points, max: quote.max_points, step: 1 } }} sx={{ width: 170 }}
              helperText={wanted ? `= ₹${amount.toFixed(2)}` : `Min ${quote.min_points}, max ${quote.max_points}`} />
            <Button size="small" variant="text" onClick={() => setPoints(String(quote.max_points))}>Use max</Button>
            {!quote.verify && <Button size="small" variant="contained" disabled={!valid} onClick={() => apply()}>Apply</Button>}
            {quote.verify && quote.channels.map((c) => (
              <Button key={c.channel} size="small" variant="outlined" startIcon={<Send size={14} />} disabled={!valid || busy} onClick={() => void sendOtp(c.channel)}>
                OTP by {CHANNEL_LABELS[c.channel]}
              </Button>
            ))}
            {quote.verify && (
              <Button size="small" color="inherit" disabled={!valid} onClick={() => apply()}>
                {quote.channels.length ? "Supervisor instead" : "Apply (supervisor approves)"}
              </Button>
            )}
          </Stack>
          {otp && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography sx={{ fontSize: 12.5 }}>OTP sent by {CHANNEL_LABELS[otp.channel]} to {otp.sent_to}.</Typography>
              <TextField size="small" label="OTP" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                slotProps={{ htmlInput: { inputMode: "numeric", "aria-label": "Customer OTP" } }} sx={{ width: 120 }}
                onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) { e.preventDefault(); void verify(); } }} />
              <Button size="small" variant="contained" startIcon={<KeyRound size={14} />} disabled={code.length !== 6 || busy} onClick={() => void verify()}>Verify</Button>
            </Stack>
          )}
        </Stack>
      )}
      {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
    </Box>
  );
}
