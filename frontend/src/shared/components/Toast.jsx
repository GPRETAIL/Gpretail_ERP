import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

// Compatibility adapter for state-driven notices. Render through the app's one
// ToastContainer so Warehouse and Master notifications share styling and placement.
const Toast = ({ open, type = "info", message, onClose, duration = 3000 }) => {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !message) return;
    let active = true;
    const notify = ["success", "error", "warning", "info"].includes(type) ? toast[type] : toast.info;
    const id = notify(message, {
      autoClose: duration > 0 ? duration : false,
      onClose: () => { if (active) closeRef.current?.(); },
    });
    return () => {
      active = false;
      toast.dismiss(id);
    };
  }, [open, type, message, duration]);

  return null;
};

export default Toast;
