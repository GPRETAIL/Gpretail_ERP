import React, { useState, useEffect, useCallback } from "react";
import { Fingerprint } from "lucide-react";
import { Box, Typography } from "@mui/material";
import PinKeypad from "./PinKeypad";
import useHaptics from "../hooks/useHaptics";

/**
 * Full-screen PIN entry shown in place of the app shell whenever the device
 * PIN lock is on and the session hasn't been unlocked yet this page load.
 * Fingerprint/Face unlock (when enabled) sits above the PIN as a faster
 * path, but the PIN keypad is always live underneath it - a sensor can
 * always fail to read, so there's never a dead end.
 */
export default function AppLockScreen({ appLock, biometrics, onForgotPin }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const { vibrate } = useHaptics();

  const tryBiometric = useCallback(async () => {
    if (!biometrics?.isEnabled || biometricBusy) return;
    setBiometricBusy(true);
    const ok = await biometrics.verify();
    setBiometricBusy(false);
    if (ok) {
      vibrate("success");
      appLock.unlockWithoutPin();
    }
    // A failed/cancelled attempt just leaves the PIN keypad available -
    // no error shown, since cancelling to type the PIN instead is a
    // completely normal choice, not a mistake.
  }, [biometrics, biometricBusy, appLock, vibrate]);

  // Best-effort auto-prompt so unlocking feels native (open the app, see
  // the fingerprint prompt immediately) - if the browser declines to run
  // it without a fresh tap, this just silently no-ops and the button
  // below still works.
  useEffect(() => {
    if (biometrics?.isEnabled) tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometrics?.isEnabled]);

  useEffect(() => {
    if (!appLock.lockoutUntil || appLock.lockoutUntil <= Date.now()) {
      setCountdown(0);
      return undefined;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((appLock.lockoutUntil - Date.now()) / 1000));
      setCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [appLock.lockoutUntil]);

  const submit = useCallback(
    async (candidate) => {
      const ok = await appLock.verifyPin(candidate);
      setPin("");
      if (ok) {
        vibrate("success");
      } else {
        vibrate("error");
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    },
    [appLock, vibrate]
  );

  const handleDigit = (d) => {
    if (countdown > 0) return;
    vibrate("tap");
    setPin((prev) => {
      const next = (prev + d).slice(0, 4);
      if (next.length === 4) setTimeout(() => submit(next), 80);
      return next;
    });
  };

  const handleBackspace = () => setPin((prev) => prev.slice(0, -1));

  return (
    <Box className="vx-splash-screen" style={{ zIndex: 10000 }}>
      <Box className="vx-splash-content" style={{ width: "100%" }}>
        <Box
          className="vx-splash-logo-card"
          style={{ width: 64, height: 64, marginBottom: 18 }}
        >
          <svg viewBox="0 0 100 100" style={{ width: 36, height: 36, fill: "#fff" }} aria-hidden>
            <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
          </svg>
        </Box>

        <Typography component="h1" className="vx-splash-brand-name" style={{ fontSize: 22 }}>
          Enter PIN
        </Typography>
        <Typography component="p" className="vx-splash-tagline">
          {countdown > 0
            ? `Too many attempts. Try again in ${countdown}s`
            : "Unlock Vynerix ERP to continue"}
        </Typography>

        <Box className={`flex items-center gap-3 my-8 ${shake ? "vx-pin-shake" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <Box
              component="span"
              key={i}
              sx={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.6)" }}
              style={{ background: i < pin.length ? "#ffffff" : "transparent" }}
            />
          ))}
        </Box>

        {biometrics?.isEnabled && (
          <Box
            component="button"
            type="button"
            onClick={tryBiometric}
            disabled={biometricBusy}
            aria-label="Unlock with fingerprint or face"
            sx={{
              mb: 3, width: 64, height: 64, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s", "&:active": { transform: "scale(0.95)" }, "&:disabled": { opacity: 0.5 },
            }}
          >
            <Fingerprint size={30} style={{ color: "#fff" }} />
          </Box>
        )}

        <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} disabled={countdown > 0} />

        <Box
          component="button"
          type="button"
          onClick={onForgotPin}
          sx={{
            mt: 4, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)",
            textDecoration: "underline", textUnderlineOffset: "2px", border: 0, bgcolor: "transparent",
          }}
        >
          Forgot PIN? Sign in again
        </Box>
      </Box>
    </Box>
  );
}
