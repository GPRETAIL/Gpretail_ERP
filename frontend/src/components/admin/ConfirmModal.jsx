import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

// Reusable confirmation dialog. Open it by setting `config`:
//   { title, message, confirmLabel?, tone? ("danger" default | "primary"), requireText?, onConfirm }
// When `requireText` is set the user must type it exactly to enable Confirm (e.g. "RESTORE").
// `onConfirm` is an async fn; it owns its own error toasts — the modal closes only when it resolves.
const ConfirmModal = ({ config, onClose }) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText("");
    setBusy(false);
  }, [config]);

  if (!config) return null;

  const danger = config.tone !== "primary";
  const needsText = Boolean(config.requireText);
  const canConfirm = !needsText || text === config.requireText;

  const confirm = async () => {
    if (!canConfirm || busy) return;
    try {
      setBusy(true);
      await config.onConfirm();
      onClose();
    } catch {
      setBusy(false); // onConfirm surfaces its own error
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${danger ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{config.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{config.message}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {needsText ? (
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Type <span className="font-mono font-bold text-slate-800">{config.requireText}</span> to confirm
            </label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              autoFocus
            />
          </div>
        ) : null}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm || busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-[#3a6ea5] hover:bg-[#345f8f]"}`}
          >
            {busy ? "Working…" : config.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
