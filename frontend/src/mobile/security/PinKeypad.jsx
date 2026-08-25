import React from "react";
import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/**
 * Shared numeric keypad for PIN entry - used by both the full-screen lock
 * (dark, on the brand gradient) and the Settings PIN setup flow (light, on
 * a white drawer).
 */
export default function PinKeypad({ onDigit, onBackspace, disabled, dark = true }) {
  const keyClass = dark
    ? "bg-white/10 text-white active:bg-white/20"
    : "bg-slate-100 text-slate-900 active:bg-slate-200";
  const backClass = dark
    ? "text-white/90 active:bg-white/10"
    : "text-slate-600 active:bg-slate-100";

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mx-auto">
      {KEYS.map((k, i) => {
        if (k === "") return <div key={`gap-${i}`} />;
        if (k === "back") {
          return (
            <button
              key="back"
              type="button"
              disabled={disabled}
              onClick={onBackspace}
              aria-label="Backspace"
              className={`h-[58px] rounded-2xl flex items-center justify-center transition-all disabled:opacity-40 ${backClass}`}
            >
              <Delete size={20} />
            </button>
          );
        }
        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(k)}
            className={`h-[58px] rounded-2xl text-2xl font-bold transition-all disabled:opacity-40 ${keyClass}`}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
