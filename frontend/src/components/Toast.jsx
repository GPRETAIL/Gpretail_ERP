import { useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { Box, IconButton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const tokens = {
  success: "success",
  error: "error",
  warning: "warning",
  info: "info",
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
  const token = tokens[type] || tokens.info;

  return (
    <Box sx={{ position: "fixed", top: 16, right: 16, zIndex: (theme) => theme.zIndex.snackbar }}>
      <Box
        sx={{
          display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5, borderRadius: 2,
          border: 1, boxShadow: 6, minWidth: 300, maxWidth: 450,
          borderColor: `${token}.main`,
          bgcolor: (theme) => alpha(theme.palette[token].main, theme.palette.mode === "dark" ? 0.3 : 0.08),
          color: (theme) => (theme.palette.mode === "dark" ? theme.palette[token].light : theme.palette[token].dark),
        }}
      >
        <Box sx={{ color: `${token}.main`, display: "inline-flex", flexShrink: 0 }}>
          <Icon size={20} />
        </Box>
        <Typography sx={{ fontSize: 14, flex: 1, color: "inherit" }}>{message}</Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ flexShrink: 0, color: "inherit", "&:hover": { bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.1 : 0.05) } }}
        >
          <X size={16} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Toast;
