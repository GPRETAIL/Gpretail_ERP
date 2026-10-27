import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { Alert, Badge, Box, Button, Chip, Divider, IconButton, Popover, Skeleton, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { Bell, CheckCheck, RefreshCw, Settings2, X } from "lucide-react";
import api from "../api/axios";
import useAsyncQuery from "../hooks/useAsyncQuery";
import useNotificationFeed, { useNotificationRefresh } from "../hooks/useNotificationFeed";
import NotificationCard from "./NotificationCard";
import { backgroundRequestIdentity } from "../utils/backgroundRequestIdentity";

export default function HeaderNotifications({ onNavigate, onOpenInbox }) {
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const identity = backgroundRequestIdentity(user, token);
  const [anchor, setAnchor] = useState(null);
  const [filter, setFilter] = useState("all");
  const open = Boolean(anchor);
  const loadCount = useCallback(async ({ signal }) => {
    if (!identity) return 0;
    const response = await api.get("/notifications/unread-count", { signal });
    return Number(response.data?.data?.count) || 0;
  }, [identity]);
  const countQuery = useAsyncQuery(loadCount);
  useNotificationRefresh(countQuery.reload);
  const feed = useNotificationFeed({ unread: filter === "unread", limit: 12, enabled: open });
  const count = countQuery.data ?? 0;
  const close = () => setAnchor(null);
  const openInbox = (preferences = false) => { close(); onOpenInbox(preferences); };
  return <>
    <Tooltip title={countQuery.error ? "Notifications — connection unavailable" : "Notifications"}>
      <IconButton size="small" aria-label={`Notifications${count ? `, ${count} unread` : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? "header-notifications" : undefined} onClick={event => { setAnchor(event.currentTarget); feed.reload(); countQuery.reload({ silent: true }); }} sx={{ color: "text.secondary" }}>
        <Badge badgeContent={count} color="error" max={99}><Bell size={20} /></Badge>
      </IconButton>
    </Tooltip>
    <Popover open={open} anchorEl={anchor} onClose={close} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} marginThreshold={12} slotProps={{ paper: { id: "header-notifications", role: "dialog", "aria-label": "Notifications", sx: { mt: 1, width: 440, maxWidth: "calc(100vw - 24px)", maxHeight: "min(740px, calc(100dvh - 90px))", display: "flex", flexDirection: "column", borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.paper", backgroundImage: "none", boxShadow: 8 } } }}>
      <Box sx={{ p: 2, pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ flex: 1 }}><Typography component="h2" sx={{ fontWeight: 700, fontSize: 17 }}>Notifications</Typography><Typography variant="caption" color="text.secondary">Your latest account and store updates</Typography></Box>
          <Tooltip title="Notification preferences"><IconButton size="small" aria-label="Notification preferences" onClick={() => openInbox(true)}><Settings2 size={18} /></IconButton></Tooltip>
          <IconButton size="small" aria-label="Close notifications" onClick={close}><X size={18} /></IconButton>
        </Stack>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mt: 1 }}>
          <Tabs value={filter} onChange={(_, value) => setFilter(value)} aria-label="Recent notification filter" sx={{ minHeight: 38, "& .MuiTab-root": { minWidth: 65, minHeight: 38, px: 1.25, fontSize: 12 } }}><Tab label="All" value="all" /><Tab label={<Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}><span>Unread</span>{count > 0 && <Chip label={count > 99 ? "99+" : count} size="small" sx={{ height: 19, fontSize: 10 }} />}</Stack>} value="unread" /></Tabs>
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Mark all as read"><span><IconButton size="small" aria-label="Mark all as read" disabled={feed.pending !== null || count === 0 || feed.loading} onClick={() => feed.markRead()}><CheckCheck size={18} /></IconButton></span></Tooltip>
            <Tooltip title="Refresh notifications"><IconButton size="small" aria-label="Refresh notifications" disabled={feed.loading} onClick={() => { feed.reload(); countQuery.reload({ silent: true }); }}><RefreshCw size={17} /></IconButton></Tooltip>
          </Stack>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ overflowY: "auto", overscrollBehavior: "contain", p: 1.5, minHeight: 150 }} aria-busy={feed.loading}>
        {(feed.error || feed.failure || countQuery.error) && <Alert severity="warning" sx={{ mb: 1.5 }} action={<Button color="inherit" size="small" onClick={() => { feed.reload(); countQuery.reload({ silent: true }); }}>Retry</Button>}>{feed.failure || "Unable to refresh notifications. Please retry."}</Alert>}
        {feed.loading ? <Stack spacing={1}>{[0, 1, 2].map(id => <Skeleton key={id} variant="rounded" height={100} />)}</Stack> : !feed.error && feed.rows.length === 0 ? <Stack spacing={1} sx={{ alignItems: "center", py: 4, textAlign: "center" }} role="status"><Bell size={30} color="currentColor" /><Typography sx={{ fontWeight: 600 }}>{filter === "unread" ? "You're all caught up" : "No notifications yet"}</Typography><Typography variant="body2" color="text.secondary">{filter === "unread" ? "New unread updates will appear here." : "Account and store updates will appear here."}</Typography></Stack> : <Stack spacing={1}>{feed.rows.map(row => <NotificationCard key={row.id} notification={row} compact pending={feed.pending !== null} onRead={feed.markRead} subscriptionUrl={user?.subscription_portal_url} onOpen={path => { close(); onNavigate(path); }} />)}</Stack>}
      </Box>
      <Divider />
      <Box sx={{ px: 2, py: 1.25 }}><Button fullWidth onClick={() => openInbox()}>View all notifications</Button></Box>
    </Popover>
  </>;
}
