import { Trash2 } from "lucide-react";

/**
 * ConfirmDialog — a lightweight confirmation modal matching the app's Tailwind style.
 *
 * Props:
 *   open       {boolean}   — whether the dialog is visible
 *   title      {string}    — dialog heading
 *   message    {string}    — body text
 *   confirmLabel {string}  — label for the confirm button (default "Delete")
 *   onConfirm  {function}  — called when user clicks the confirm button
 *   onCancel   {function}  — called when user clicks Cancel or the backdrop
 *   danger     {boolean}   — use red confirm button (default true)
 */
const ConfirmDialog = ({
  open,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this record? This action cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  danger = true,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          {danger && <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />}
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-b-lg">
          <button
            onClick={onCancel}
            className="glass-btn glass-btn-secondary px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`glass-btn px-3 py-1.5 text-xs ${
              danger ? "glass-btn-danger" : "glass-btn-primary"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
