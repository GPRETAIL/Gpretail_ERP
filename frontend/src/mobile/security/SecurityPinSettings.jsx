import React, { useState } from "react";
import { Lock, ShieldCheck, Fingerprint } from "lucide-react";
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
      <div className="space-y-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              appLock.isPinSet ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
            }`}
          >
            <Lock size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">
              App Lock is {appLock.isPinSet ? "ON" : "OFF"}
            </h4>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              {appLock.isPinSet
                ? "A 4-digit PIN is required to open the app."
                : "Set a PIN to protect this device's app from casual access."}
            </p>
          </div>
        </div>

        {!appLock.isPinSet ? (
          <button
            type="button"
            onClick={() => setStep(STEP.NEW_PIN)}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <ShieldCheck size={14} /> Set PIN
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setStep(STEP.CURRENT_FOR_CHANGE)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold active:scale-95 transition-all"
            >
              Change PIN
            </button>
            <button
              type="button"
              onClick={() => setStep(STEP.CURRENT_FOR_REMOVE)}
              className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold active:scale-95 transition-all"
            >
              Turn Off PIN Lock
            </button>
          </div>
        )}

        {appLock.isPinSet && biometrics?.isSupported && (
          <div className="pt-1">
            <button
              type="button"
              onClick={handleToggleBiometric}
              disabled={biometricBusy}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    biometrics.isEnabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Fingerprint size={16} />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black text-slate-900">Fingerprint / Face Unlock</h4>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    {biometricBusy
                      ? "Follow the prompt..."
                      : biometrics.isEnabled
                        ? "On - shown above the PIN pad"
                        : "Off - unlock faster than typing your PIN"}
                  </p>
                </div>
              </div>
              <div
                className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${
                  biometrics.isEnabled ? "bg-indigo-600 justify-end" : "bg-slate-200 justify-start"
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow" />
              </div>
            </button>
            {biometricError && (
              <p className="text-[10.5px] text-rose-600 font-semibold mt-1.5">{biometricError}</p>
            )}
          </div>
        )}

        {appLock.isPinSet && (
          <div className="pt-1">
            <label className="text-xs font-bold text-slate-500 block mb-1.5">
              Auto-Lock After Background
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { minutes: 0, label: "Instant" },
                { minutes: 1, label: "1 min" },
                { minutes: 5, label: "5 min" },
                { minutes: 15, label: "15 min" },
              ].map((opt) => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => appLock.setAutoLockMinutes(opt.minutes)}
                  className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                    appLock.autoLockMinutes === opt.minutes
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Re-ask for the PIN after the app has been in the background this long.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-2">
      <p className="text-xs font-bold text-slate-700 mb-1">{TITLES[step]}</p>
      {error && <p className="text-[11px] text-rose-600 font-semibold mb-2">{error}</p>}
      <div className="flex items-center gap-3 my-5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-3.5 h-3.5 rounded-full border"
            style={{
              background: i < pinDraft.length ? "#4f46e5" : "transparent",
              borderColor: i < pinDraft.length ? "#4f46e5" : "#cbd5e1",
            }}
          />
        ))}
      </div>
      <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} disabled={busy} dark={false} />
      <button type="button" onClick={reset} className="mt-5 text-xs font-semibold text-slate-400">
        Cancel
      </button>
    </div>
  );
}
