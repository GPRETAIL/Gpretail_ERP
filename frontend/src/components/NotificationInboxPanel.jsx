import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { Alert, Box, Button, Checkbox, Chip, Divider, FormControlLabel, Paper, Skeleton, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ArrowLeft, Bell, CheckCheck, RefreshCw, Settings2 } from "lucide-react";
import { enableWebPush, disableWebPush, pushDeviceState } from "../utils/webPush";
import api from "../api/axios";
import useAsyncQuery from "../hooks/useAsyncQuery";
import useNotificationFeed from "../hooks/useNotificationFeed";
import NotificationCard from "./NotificationCard";

function NotificationPreferences() {
  const [failure, setFailure] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async ({ signal }) => {
    const [preferences, push, device] = await Promise.all([
      api.get("/notification-preferences", { signal }),
      api.get("/notifications/push/config", { signal }),
      pushDeviceState(),
    ]);
    return { preferences: preferences.data.data, push: push.data.data, device };
  }, []);
  const { data, loading, error, reload } = useAsyncQuery(load);
  const save = async (operation, message) => {
    if (saving) return;
    setSaving(true); setFailure(""); setSaved("");
    try {
      await operation();
      setSaved(message);
      reload({ silent: true });
      window.dispatchEvent(new Event("vx-notifications-updated"));
    } catch (error) {
      setFailure(error.response?.data?.message || error.message || "Could not save notification preferences.");
    } finally { setSaving(false); }
  };
  const savePreferences = (values) => api.put("/notification-preferences", {
    marketing: Boolean(data?.preferences?.marketing),
    quiet_start: data?.preferences?.quiet_start ?? 21,
    quiet_end: data?.preferences?.quiet_end ?? 8,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...values,
  });
  return <Stack spacing={2.5}>
    {error && <Alert severity="warning" action={<Button color="inherit" onClick={() => reload()}>Retry</Button>}>Could not load notification preferences.</Alert>}
    {failure && <Alert severity="error">{failure}</Alert>}
    {saved && <Alert severity="success" role="status">{saved}</Alert>}
    {loading ? <Skeleton variant="rounded" height={180} /> : data && <>
      <Box><Typography component="h2" sx={{ fontWeight: 600 }}>Subscription offers</Typography><Typography variant="body2" color="text.secondary">Choose whether to receive offers. Account and service messages remain available.</Typography>
        <FormControlLabel control={<Checkbox checked={Boolean(data.preferences.marketing)} disabled={saving} onChange={event => save(() => savePreferences({ marketing: event.target.checked }), "Offer preference saved.")} />} label="Receive subscription offers" />
      </Box>
      <Divider />
      <Box><Typography component="h2" sx={{ fontWeight: 600 }}>This device</Typography><Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>Get browser notifications when you are away from the inbox.</Typography>
        <Button variant="outlined" disabled={saving || !data.device?.supported || (!data.push?.enabled && !data.device?.registered)} onClick={() => save(() => data.device?.registered ? disableWebPush() : enableWebPush(), "Device notification preference saved.")}>{data.device?.registered ? "Disable push on this device" : "Enable notifications on this device"}</Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>{!data.device?.supported ? "Background push requires trusted HTTPS and a supported browser. iPhone/iPad users should open the installed Home Screen app." : !data.push?.enabled ? "Browser push is not configured on this ERP server. Your inbox still receives updates." : "Your browser will ask for permission when you enable notifications."}</Typography>
      </Box>
      <Divider />
      <Box><Typography component="h2" sx={{ fontWeight: 600 }}>Quiet hours</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Choose when to silence background push, using your local time zone.</Typography>
        <Stack component="form" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); save(() => savePreferences({ quiet_start: Number(values.get("quiet_start")), quiet_end: Number(values.get("quiet_end")) }), "Quiet hours saved."); }} direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "stretch", sm: "center" } }} key={`${data.preferences.quiet_start}-${data.preferences.quiet_end}`}>
          <TextField name="quiet_start" label="Quiet from (0-23)" type="number" size="small" required disabled={saving} defaultValue={data.preferences.quiet_start} slotProps={{ htmlInput: { min: 0, max: 23 } }} />
          <TextField name="quiet_end" label="Quiet until (0-23)" type="number" size="small" required disabled={saving} defaultValue={data.preferences.quiet_end} slotProps={{ htmlInput: { min: 0, max: 23 } }} />
          <Button type="submit" variant="outlined" disabled={saving}>Save quiet hours</Button>
        </Stack>
      </Box>
    </>}
  </Stack>;
}

export default function NotificationInboxPanel({ standalone = false }) {
  const user = useSelector(state => state.auth.user);
  const [section, setSection] = useState(() => standalone && new URLSearchParams(window.location.search).get("tab") === "preferences" ? "preferences" : "inbox");
  const [category, setCategory] = useState("all");
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  const feed = useNotificationFeed({ category, unread, page, enabled: section === "inbox" });
  const total = feed.data?.pagination?.total;
  return <Box sx={{ minHeight: standalone ? "100dvh" : undefined, bgcolor: standalone ? "background.default" : undefined, p: { xs: 1.5, sm: 3 } }}>
    <Stack spacing={2.5} sx={{ maxWidth: 1000, mx: "auto", minWidth: 0 }}>
      {standalone && <Button startIcon={<ArrowLeft size={16} />} href={user?.web_access === false ? "/app" : "/dashboard"} sx={{ alignSelf: "flex-start" }}>Return to ERP</Button>}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}><Box sx={{ p: 1.25, bgcolor: "action.hover", color: "primary.main", borderRadius: 2, display: "flex" }}><Bell size={24} /></Box><Box><Typography component="h1" sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 700 }}>Notifications</Typography><Typography variant="body2" color="text.secondary">Account messages, service alerts and store updates in one place.</Typography></Box></Stack>
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", bgcolor: "background.paper", backgroundImage: "none" }}>
        <Tabs value={section} onChange={(_, value) => setSection(value)} aria-label="Notification sections" sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}><Tab value="inbox" icon={<Bell size={16} />} iconPosition="start" label="Inbox" id="notification-inbox-tab" aria-controls="notification-inbox-panel" /><Tab value="preferences" icon={<Settings2 size={16} />} iconPosition="start" label="Preferences" id="notification-preferences-tab" aria-controls="notification-preferences-panel" /></Tabs>
        <Box role="tabpanel" id={`notification-${section}-panel`} aria-labelledby={`notification-${section}-tab`} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {section === "preferences" ? <NotificationPreferences /> : <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}>
              <Tabs value={category} onChange={(_, value) => { setCategory(value); setPage(1); }} variant="scrollable" scrollButtons="auto" aria-label="Notification categories" sx={{ minHeight: 40, "& .MuiTab-root": { minWidth: 65, minHeight: 40, px: 1.5, fontSize: 13 } }}><Tab value="all" label="All" /><Tab value="account" label="Account" /><Tab value="service" label="Service" /><Tab value="offer" label="Offers" /></Tabs>
              <ToggleButtonGroup exclusive size="small" value={unread ? "unread" : "all"} onChange={(_, value) => { if (value) { setUnread(value === "unread"); setPage(1); } }} aria-label="Notification read status"><ToggleButton value="all">All messages</ToggleButton><ToggleButton value="unread">Unread</ToggleButton></ToggleButtonGroup>
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{Number.isFinite(total) ? `${total} ${unread ? "unread " : ""}message${total === 1 ? "" : "s"}` : "Your messages"}</Typography>
              <Button size="small" startIcon={<CheckCheck size={16} />} disabled={feed.loading || feed.pending !== null || !feed.rows.some(row => !row.read_at)} onClick={() => feed.markRead()}>Mark all as read</Button>
              <Button size="small" startIcon={<RefreshCw size={15} />} disabled={feed.loading} onClick={() => feed.reload()}>Refresh</Button>
            </Stack>
            {(feed.error || feed.failure) && <Alert severity="warning" action={<Button color="inherit" onClick={() => feed.reload()}>Retry</Button>}>{feed.failure || "Notifications are unavailable. Connect to your ERP server and retry."}</Alert>}
            <Stack spacing={1.25} aria-busy={feed.loading}>
              {feed.loading ? [0, 1, 2].map(id => <Skeleton key={id} variant="rounded" height={115} />) : !feed.error && feed.rows.length === 0 ? <Stack spacing={1} sx={{ alignItems: "center", py: 5, textAlign: "center" }} role="status"><Bell size={32} /><Typography sx={{ fontWeight: 600 }}>{unread ? "You're all caught up" : "No notifications in this category"}</Typography><Typography variant="body2" color="text.secondary">{unread ? "You have no unread messages here." : "New updates will appear here when available."}</Typography>{category === "offer" && <Button onClick={() => setSection("preferences")}>Review offer preferences</Button>}</Stack> : feed.rows.map(row => <NotificationCard key={row.id} notification={row} pending={feed.pending !== null} onRead={feed.markRead} subscriptionUrl={user?.subscription_portal_url} />)}
            </Stack>
            <Divider />
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}><Button disabled={page === 1 || feed.loading} onClick={() => setPage(value => value - 1)}>Previous</Button><Chip variant="outlined" size="small" label={`Page ${page}`} /><Button disabled={!feed.hasNext || feed.loading || Boolean(feed.error)} onClick={() => setPage(value => value + 1)}>Next</Button></Stack>
          </Stack>}
        </Box>
      </Paper>
    </Stack>
  </Box>;
}
