import React from "react";
import { Contrast } from "lucide-react";

const FONT_SCALES = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

/**
 * Settings > Display & Accessibility content - renders inside
 * SettingsScreen's existing SettingsDrawer, same as SecurityPinSettings.
 */
export default function DisplayAccessibilitySettings({ displayPrefs }) {
  const { fontScale, setFontScale, highContrast, setHighContrast } = displayPrefs;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold text-slate-500 block mb-1.5">Text Size</label>
        <div className="grid grid-cols-3 gap-1.5">
          {FONT_SCALES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFontScale(opt.id)}
              className={`py-2.5 rounded-xl font-bold border transition-all ${
                opt.id === "small" ? "text-[11px]" : opt.id === "large" ? "text-sm" : "text-xs"
              } ${
                fontScale === opt.id
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">
          Scales text and controls across the whole app.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setHighContrast(!highContrast)}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              highContrast ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
            }`}
          >
            <Contrast size={16} />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-black text-slate-900">High Contrast</h4>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              {highContrast ? "On - stronger text & borders" : "Darker text, stronger borders"}
            </p>
          </div>
        </div>
        <div
          className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${
            highContrast ? "bg-indigo-600 justify-end" : "bg-slate-200 justify-start"
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-white shadow" />
        </div>
      </button>
    </div>
  );
}
