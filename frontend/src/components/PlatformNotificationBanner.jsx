import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Box, Button, IconButton, Paper, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import api from "../api/axios";
import useAsyncQuery from "../hooks/useAsyncQuery";

export default function PlatformNotificationBanner({ onView } = {}) {
  const user = useSelector(state => state.auth.user);
  const identity = user?.id ? `${user.platform_company_code || "local"}:${user.id}` : null;
  const [closing, setClosing] = useState(null);
  const [failure, setFailure] = useState("");
  const load = useCallback(async ({ signal }) => {
    if (!identity) return [];
    const response = await api.get("/notifications/banners", { signal });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  }, [identity]);
  const { data, reload } = useAsyncQuery(load, { enabled: Boolean(user?.id) });
  useEffect(() => {
    if (!user?.id) return undefined;
    const refresh = () => { if (document.visibilityState !== "hidden") reload({ silent: true }); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("online", refresh);
    window.addEventListener("vx-notifications-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); window.removeEventListener("online", refresh); window.removeEventListener("vx-notifications-updated", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [user?.id, reload]);
  const dismiss = async notification => {
    if (closing !== null) return;
    setClosing(notification.id); setFailure("");
    try {
      await api.post(`/notifications/${notification.id}/read`);
      window.dispatchEvent(new Event("vx-notifications-updated"));
    } catch { setFailure("Could not close this notification. Please retry."); }
    finally { setClosing(null); }
  };
  const notification = data?.[0];
  if (!notification) return null;
  return <Box sx={{ position: "fixed", top: { xs: 72, sm: 80 }, right: { xs: 12, sm: 20 }, width: { xs: "calc(100% - 24px)", sm: 340 }, maxWidth: 360, zIndex: theme => theme.zIndex.snackbar - 1 }}>
    <Paper role="status" aria-live="polite" variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "background.paper", backgroundImage: "none", boxShadow: 3, borderLeft: 4, borderLeftColor: notification.priority === "high" ? "warning.main" : "primary.main" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <NotificationsOutlinedIcon color="primary" fontSize="small" sx={{ mt: 0.5 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">Vynerix Admin</Typography>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{notification.title}</Typography>
        </Box>
        <IconButton size="small" aria-label={`Close notification: ${notification.title}`} disabled={closing !== null} onClick={() => dismiss(notification)}><CloseIcon fontSize="small" /></IconButton>
      </Stack>
      <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{notification.message}</Typography>
      {failure && <Typography role="alert" color="error" variant="caption">{failure}</Typography>}
      <Button size="small" href={onView ? undefined : "/notifications"} onClick={onView} sx={{ mt: 0.5 }}>View inbox</Button>
    </Paper>
  </Box>;
}
