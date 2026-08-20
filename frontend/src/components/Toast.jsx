import { useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200",
  error: "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200",
  warning: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200",
  info: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200",
};

const iconColors = {
  success: "text-green-500 dark:text-green-400",
  error: "text-red-500 dark:text-red-400",
  warning: "text-amber-500 dark:text-amber-400",
  info: "text-blue-500 dark:text-blue-400",
};

/**
 * Toast notification component.
 *
 * Props:
 *   open      {boolean}  - whether the toast is visible
 *   type      {string}   - "success" | "error" | "warning" | "info"
 *   message   {string}   - the message to display
 *   onClose   {function} - called when toast is dismissed
 *   duration  {number}   - auto-dismiss after ms (default 3000, 0 = no auto-dismiss)
 */
const Toast = ({ open, type = "info", message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  const Icon = icons[type] || icons.info;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-[450px] ${colors[type]}`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${iconColors[type]}`} />
        <p className="text-sm flex-1">{message}</p>
        <button
          onClick={onClose}
          className="shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
