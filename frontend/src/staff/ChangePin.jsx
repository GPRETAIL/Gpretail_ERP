import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { KeyRound } from "lucide-react";
import api from "@/shared/api/apiClient";
import PinPad from "./PinPad";
import { STAFF_COLOR, STAFF_TEXT, card, errorText, primaryButton, secondaryButton } from "./staffUi";

/**
 * Choose your own PIN. Forced after HR sets one (`currentPin` is the PIN just used to sign in), and
 * available from Me at any time (then the current PIN is asked first).
 */
export default function ChangePin({ currentPin = "", forced = false, onDone, onCancel }) {
  const [step, setStep] = useState(currentPin ? "new" : "current");
  const [current, setCurrent] = useState(currentPin);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (confirm !== next) {
      setError("The two PINs are different. Try again.");
      setNext("");
      setConfirm("");
      setStep("new");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/staff-pin", { current_pin: current, new_pin: next });
      onDone();
    } catch (err) {
      const fields = err?.response?.data?.errors || {};
      setError(errorText(err, "Could not change the PIN."));
      setNext("");
      setConfirm("");
      if (fields.current_pin) {
        setCurrent("");
        setStep("current");
      } else setStep("new");
    } finally {
      setBusy(false);
    }
  };

  const pad = {
    current: { value: current, set: setCurrent, label: "Your current PIN", go: () => setStep("new") },
    new: { value: next, set: setNext, label: "Choose a new 6-digit PIN", go: () => setStep("confirm") },
    confirm: { value: confirm, set: setConfirm, label: "Type the new PIN again", go: save },
  }[step];

  return (
    <Box sx={{ minHeight: forced ? "100dvh" : undefined, bgcolor: forced ? STAFF_COLOR.page : undefined, px: forced ? 2 : 0, pt: forced ? "max(32px, env(safe-area-inset-top))" : 0, pb: 3, display: "flex", justifyContent: "center" }}>
      <Box sx={{ width: "100%", maxWidth: 400 }}>
        {forced && (
          <Box sx={{ textAlign: "center", mb: 2.5 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "18px", bgcolor: "#0d9488", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", mb: 1 }}><KeyRound size={26} /></Box>
            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 800, color: STAFF_COLOR.text }}>Set your own PIN</Typography>
            <Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>HR gave you a starting PIN. Pick one only you know.</Typography>
          </Box>
        )}
        {error && <Box role="alert" sx={{ ...card, mb: 2, bgcolor: STAFF_COLOR.dangerSoft, borderColor: STAFF_COLOR.dangerBorder, color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.body, fontWeight: 600 }}>{error}</Box>}
        <Box sx={card}>
          <PinPad key={step} value={pad.value} onChange={pad.set} label={pad.label} disabled={busy} />
          <Box component="button" type="button" disabled={busy || pad.value.length < (step === "current" ? 4 : 6)} onClick={pad.go} sx={{ ...primaryButton, width: "100%", mt: 2.5 }}>
            {step === "confirm" ? (busy ? "Saving…" : "Save PIN") : "Next"}
          </Box>
          <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint, textAlign: "center", mt: 1.5 }}>Avoid 123456, 000000 and the like.</Typography>
          {onCancel && <Box component="button" type="button" onClick={onCancel} sx={{ ...secondaryButton, width: "100%", mt: 1 }}>{forced ? "Sign out" : "Cancel"}</Box>}
        </Box>
      </Box>
    </Box>
  );
}
