import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { ChevronLeft, Smartphone, Store } from "lucide-react";
import api from "@/shared/api/apiClient";
import { saveStaffSession } from "@/shared/api/staffSession";
import PinPad from "./PinPad";
import { STAFF_COLOR, STAFF_TEXT, TOUCH, card, errorText, primaryButton, secondaryButton } from "./staffUi";

const PHONE_KEY = "vx_staff_phone";

/** Sign in with the mobile number HR has on file and the PIN HR set (or the employee's own). */
export default function StaffSignIn({ onSignedIn }) {
  const [phone, setPhone] = useState(() => localStorage.getItem(PHONE_KEY) || "");
  const [step, setStep] = useState(() => (localStorage.getItem(PHONE_KEY) ? "pin" : "phone"));
  const [pin, setPin] = useState("");
  const [stores, setStores] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const digits = phone.replace(/\D/g, "");

  const submit = async (storeId) => {
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/auth/staff-login", { phone, pin, ...(storeId ? { store_id: storeId } : {}) });
      localStorage.setItem(PHONE_KEY, phone);
      onSignedIn(saveStaffSession(res.data.data), pin);
    } catch (err) {
      if (err?.response?.data?.error_code === "CHOOSE_STORE") {
        setStores(err.response.data.data?.stores || []);
      } else {
        setError(errorText(err, "Could not sign in. Check your connection and try again."));
        setPin("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: STAFF_COLOR.page, display: "flex", flexDirection: "column", alignItems: "center", px: 2, pt: "max(32px, env(safe-area-inset-top))", pb: 3 }}>
      <Box sx={{ width: "100%", maxWidth: 400 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: "20px", bgcolor: "#0d9488", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>
            <Smartphone size={30} />
          </Box>
          <Typography component="h1" sx={{ fontSize: 24, fontWeight: 800, color: STAFF_COLOR.text }}>Vynerix Staff</Typography>
          <Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>Attendance, leave, pay and requests</Typography>
        </Box>

        {error && <Box role="alert" sx={{ ...card, mb: 2, bgcolor: STAFF_COLOR.dangerSoft, borderColor: STAFF_COLOR.dangerBorder, color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.body, fontWeight: 600 }}>{error}</Box>}

        {stores ? (
          <Box sx={card}>
            <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text, mb: 1.5 }}>You work in more than one store. Which one?</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {stores.map((s) => (
                <Box key={s.store_id} component="button" type="button" disabled={busy} onClick={() => submit(s.store_id)} sx={{ ...secondaryButton, justifyContent: "flex-start" }}>
                  <Store size={18} /> {s.name || `Store ${s.store_id}`}
                </Box>
              ))}
            </Box>
          </Box>
        ) : step === "phone" ? (
          <Box component="form" onSubmit={(e) => { e.preventDefault(); if (digits.length >= 10) setStep("pin"); }} sx={card}>
            <Typography component="label" htmlFor="staff-phone" sx={{ display: "block", fontSize: STAFF_TEXT.body, fontWeight: 700, color: STAFF_COLOR.text, mb: 1 }}>Your mobile number</Typography>
            <Box component="input" id="staff-phone" type="tel" inputMode="numeric" autoComplete="tel" autoFocus value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210"
              sx={{ width: "100%", boxSizing: "border-box", minHeight: TOUCH + 4, px: 1.75, borderRadius: "12px", border: `1px solid ${STAFF_COLOR.inputLine}`, bgcolor: STAFF_COLOR.surface, fontSize: 20, fontFamily: "inherit", color: STAFF_COLOR.text, letterSpacing: "0.04em",
                "&:focus": { outline: `2px solid ${STAFF_COLOR.primary}`, borderColor: "transparent" } }} />
            <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint, mt: 1 }}>The number HR has on your employee record.</Typography>
            <Box component="button" type="submit" disabled={digits.length < 10} sx={{ ...primaryButton, width: "100%", mt: 2 }}>Next</Box>
          </Box>
        ) : (
          <Box sx={card}>
            <Box component="button" type="button" onClick={() => { setStep("phone"); setPin(""); setError(""); }}
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, minHeight: TOUCH, border: 0, bgcolor: "transparent", color: STAFF_COLOR.primaryDark, fontSize: STAFF_TEXT.label, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", p: 0, mb: 1 }}>
              <ChevronLeft size={18} /> {phone}
            </Box>
            <PinPad value={pin} onChange={setPin} label="Enter your PIN" disabled={busy} />
            <Box component="button" type="button" disabled={busy || pin.length < 4} onClick={() => submit()} sx={{ ...primaryButton, width: "100%", mt: 2.5 }}>
              {busy ? "Signing in…" : "Sign in"}
            </Box>
            <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint, textAlign: "center", mt: 1.5 }}>Forgot your PIN? Ask HR to reset it.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
