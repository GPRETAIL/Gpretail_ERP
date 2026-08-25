import React, { useState, useEffect, useCallback } from "react";
import PinKeypad from "./PinKeypad";
import useHaptics from "../hooks/useHaptics";

/**
 * Full-screen PIN entry shown in place of the app shell whenever the device
 * PIN lock is on and the session hasn't been unlocked yet this page load.
 */
export default function AppLockScreen({ appLock, onForgotPin }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { vibrate } = useHaptics();

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
    <div className="vx-splash-screen" style={{ zIndex: 10000 }}>
      <div className="vx-splash-content" style={{ width: "100%" }}>
        <div
          className="vx-splash-logo-card"
          style={{ width: 64, height: 64, marginBottom: 18 }}
        >
          <svg viewBox="0 0 100 100" className="w-9 h-9 fill-white" aria-hidden>
            <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
          </svg>
        </div>

        <h1 className="vx-splash-brand-name" style={{ fontSize: 22 }}>
          Enter PIN
        </h1>
        <p className="vx-splash-tagline">
          {countdown > 0
            ? `Too many attempts. Try again in ${countdown}s`
            : "Unlock Vynerix ERP to continue"}
        </p>

        <div className={`flex items-center gap-3 my-8 ${shake ? "vx-pin-shake" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-3.5 h-3.5 rounded-full border border-white/60"
              style={{ background: i < pin.length ? "#ffffff" : "transparent" }}
            />
          ))}
        </div>

        <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} disabled={countdown > 0} />

        <button
          type="button"
          onClick={onForgotPin}
          className="mt-8 text-xs font-semibold text-white/70 underline underline-offset-2"
        >
          Forgot PIN? Sign in again
        </button>
      </div>
    </div>
  );
}
