import React, { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
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
export default function SecurityPinSettings({ appLock }) {
  const [step, setStep] = useState(STEP.IDLE);
  const [pinDraft, setPinDraft] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
