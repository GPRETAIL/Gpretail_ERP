import React, { useState } from "react";
import { Lock, ShieldCheck, Fingerprint } from "lucide-react";
import { Box, Typography } from "@mui/material";
import PinKeypad from "./PinKeypad";

const STEP = {
  IDLE: "idle",
  NEW_PIN: "new_pin",
  CONFIRM_PIN: "confirm_pin",
  CURRENT_FOR_CHANGE: "current_for_change",
  CURRENT_FOR_REMOVE: "current_for_remove",
};

const TITLES = {
  [STEP.NEW_PIN]: "Choose a 4-digit PIN",
  [STEP.CONFIRM_PIN]: "Confirm your PIN",
  [STEP.CURRENT_FOR_CHANGE]: "Enter your current PIN",
  [STEP.CURRENT_FOR_REMOVE]: "Enter your current PIN to turn off",
};

/**
 * Settings > App Lock content - view lock status, set/change/remove the
 * device PIN. Renders inside SettingsScreen's existing SettingsDrawer.
 */
export default function SecurityPinSettings({ appLock, biometrics }) {
  const [step, setStep] = useState(STEP.IDLE);
  const [pinDraft, setPinDraft] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState("");

  const handleToggleBiometric = async () => {
    setBiometricError("");
    if (biometrics.isEnabled) {
      biometrics.disable();
      return;
    }
    setBiometricBusy(true);
    try {
      await biometrics.register();
    } catch {
      setBiometricError("Couldn't set up fingerprint/face unlock on this device.");
    } finally {
      setBiometricBusy(false);
    }
  };

  const reset = () => {
    setStep(STEP.IDLE);
    setPinDraft("");
    setFirstPin("");
    setError("");
    setBusy(false);
  };

  const handleComplete = async (value) => {
    if (step === STEP.NEW_PIN) {
      setFirstPin(value);
      setPinDraft("");
      setStep(STEP.CONFIRM_PIN);
      return;
    }

    if (step === STEP.CONFIRM_PIN) {
      if (value !== firstPin) {
        setError("PINs didn't match. Try again.");
        setPinDraft("");
        setFirstPin("");
        setStep(STEP.NEW_PIN);
        return;
      }
      setBusy(true);
      await appLock.setupPin(value);
      reset();
      return;
    }

    if (step === STEP.CURRENT_FOR_CHANGE) {
      setBusy(true);
      const ok = await appLock.verifyPin(value);
      setBusy(false);
      if (!ok) {
        setError("Incorrect PIN.");
        setPinDraft("");
        return;
      }
      setError("");
      setPinDraft("");
      setStep(STEP.NEW_PIN);
      return;
    }

    if (step === STEP.CURRENT_FOR_REMOVE) {
      setBusy(true);
      const ok = await appLock.removePin(value);
      if (!ok) {
        setBusy(false);
        setError("Incorrect PIN.");
        setPinDraft("");
        return;
      }
      // Biometric is a fast-path on top of the PIN, never a standalone
      // lock method - it can't outlive the PIN it's layered on.
      biometrics?.disable();
      reset();
    }
  };

  const handleDigit = (d) => {
    setError("");
    setPinDraft((prev) => {
      const next = (prev + d).slice(0, 4);
      if (next.length === 4) setTimeout(() => handleComplete(next), 80);
      return next;
    });
  };

  const handleBackspace = () => setPinDraft((prev) => prev.slice(0, -1));

  if (step === STEP.IDLE) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)", display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              bgcolor: appLock.isPinSet ? "#ecfdf5" : "#f1f5f9",
              color: appLock.isPinSet ? "#059669" : "#94a3b8",
            }}
          >
            <Lock size={16} />
          </Box>
          <Box>
            <Typography component="h4" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a", m: 0 }}>
              App Lock is {appLock.isPinSet ? "ON" : "OFF"}
            </Typography>
            <Typography component="p" sx={{ fontSize: 10.5, color: "#64748b", mt: 0.25, m: 0 }}>
              {appLock.isPinSet
                ? "A 4-digit PIN is required to open the app."
                : "Set a PIN to protect this device's app from casual access."}
            </Typography>
          </Box>
        </Box>

        {!appLock.isPinSet ? (
          <Box
            component="button"
            type="button"
            onClick={() => setStep(STEP.NEW_PIN)}
            sx={{
              width: "100%", py: 1.25, borderRadius: "12px", bgcolor: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, transition: "all 0.15s",
              "&:active": { transform: "scale(0.95)" },
            }}
          >
            <ShieldCheck size={14} /> Set PIN
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box
              component="button"
              type="button"
              onClick={() => setStep(STEP.CURRENT_FOR_CHANGE)}
              sx={{ width: "100%", py: 1.25, borderRadius: "12px", bgcolor: "#f1f5f9", color: "#334155", fontSize: 12, fontWeight: 700, transition: "all 0.15s", "&:active": { transform: "scale(0.95)" } }}
            >
              Change PIN
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => setStep(STEP.CURRENT_FOR_REMOVE)}
              sx={{ width: "100%", py: 1.25, borderRadius: "12px", border: "1px solid #fecdd3", color: "#e11d48", fontSize: 12, fontWeight: 700, transition: "all 0.15s", "&:active": { transform: "scale(0.95)" } }}
            >
              Turn Off PIN Lock
            </Box>
          </Box>
        )}

        {appLock.isPinSet && biometrics?.isSupported && (
          <Box sx={{ pt: 0.5 }}>
            <Box
              component="button"
              type="button"
              onClick={handleToggleBiometric}
              disabled={biometricBusy}
              sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)", "&:disabled": { opacity: 0.6 } }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36, height: 36, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    bgcolor: biometrics.isEnabled ? "#ecfdf5" : "#f1f5f9",
                    color: biometrics.isEnabled ? "#059669" : "#94a3b8",
                  }}
                >
                  <Fingerprint size={16} />
                </Box>
                <Box sx={{ textAlign: "left" }}>
                  <Typography component="h4" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a", m: 0 }}>Fingerprint / Face Unlock</Typography>
                  <Typography component="p" sx={{ fontSize: 10.5, color: "#64748b", mt: 0.25, m: 0 }}>
                    {biometricBusy
                      ? "Follow the prompt..."
                      : biometrics.isEnabled
                        ? "On - shown above the PIN pad"
                        : "Off - unlock faster than typing your PIN"}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  width: 40, height: 24, borderRadius: "999px", display: "flex", alignItems: "center", px: 0.25, transition: "background-color 0.15s", flexShrink: 0,
                  bgcolor: biometrics.isEnabled ? "#4f46e5" : "#e2e8f0",
                  justifyContent: biometrics.isEnabled ? "flex-end" : "flex-start",
                }}
              >
                <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: "#fff", boxShadow: 1 }} />
              </Box>
            </Box>
            {biometricError && (
              <Typography component="p" sx={{ fontSize: 10.5, color: "#e11d48", fontWeight: 600, mt: 0.75 }}>{biometricError}</Typography>
            )}
          </Box>
        )}

        {appLock.isPinSet && (
          <Box sx={{ pt: 0.5 }}>
            <Typography component="label" sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", mb: 0.75 }}>
              Auto-Lock After Background
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.75 }}>
              {[
                { minutes: 0, label: "Instant" },
                { minutes: 1, label: "1 min" },
                { minutes: 5, label: "5 min" },
                { minutes: 15, label: "15 min" },
              ].map((opt) => (
                <Box
                  component="button"
                  key={opt.minutes}
                  type="button"
                  onClick={() => appLock.setAutoLockMinutes(opt.minutes)}
                  sx={{
                    py: 1, borderRadius: "12px", fontSize: 11, fontWeight: 700, border: "1px solid", transition: "all 0.15s",
                    bgcolor: appLock.autoLockMinutes === opt.minutes ? "#4f46e5" : "#f8fafc",
                    borderColor: appLock.autoLockMinutes === opt.minutes ? "#4f46e5" : "#e2e8f0",
                    color: appLock.autoLockMinutes === opt.minutes ? "#fff" : "#334155",
                  }}
                >
                  {opt.label}
                </Box>
              ))}
            </Box>
            <Typography component="p" sx={{ fontSize: 10, color: "#94a3b8", mt: 0.75 }}>
              Re-ask for the PIN after the app has been in the background this long.
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 1 }}>
      <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, color: "#334155", mb: 0.5 }}>{TITLES[step]}</Typography>
      {error && <Typography component="p" sx={{ fontSize: 11, color: "#e11d48", fontWeight: 600, mb: 1 }}>{error}</Typography>}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, my: 2.5 }}>
        {[0, 1, 2, 3].map((i) => (
          <Box
            component="span"
            key={i}
            sx={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid" }}
            style={{
              background: i < pinDraft.length ? "#4f46e5" : "transparent",
              borderColor: i < pinDraft.length ? "#4f46e5" : "#cbd5e1",
            }}
          />
        ))}
      </Box>
      <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} disabled={busy} dark={false} />
      <Box component="button" type="button" onClick={reset} sx={{ mt: 2.5, fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
        Cancel
      </Box>
    </Box>
  );
}
