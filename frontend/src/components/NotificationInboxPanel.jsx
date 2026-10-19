import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  enableWebPush,
  disableWebPush,
  pushDeviceState,
} from "../utils/webPush";
import api from "../api/axios";
import useAsyncQuery from "../hooks/useAsyncQuery";

export default function NotificationInboxPanel({ standalone = false }) {
  const user = useSelector((state) => state.auth.user);
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [failure, setFailure] = useState("");
  const load = useCallback(
    async ({ signal }) => {
      const [messages, preferences, push, device] = await Promise.all([
        api.get("/notifications", {
          params: { page, limit: 25, category },
          signal,
        }),
        api.get("/notification-preferences", { signal }),
        api
          .get("/notifications/push/config", { signal })
          .catch(() => ({ data: { data: { enabled: false } } })),
        pushDeviceState(),
      ]);
      return {
        response: messages.data,
        preferences: preferences.data.data,
        push: push.data.data,
        device,
      };
    },
    [category, page],
  );
  const { data, loading, error, reload } = useAsyncQuery(load);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "hidden") reload({ silent: true });
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener("online", refresh);
    window.addEventListener("vx-notifications-updated", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("vx-notifications-updated", refresh);
    };
  }, [reload]);
  const rows = Array.isArray(data?.response?.data) ? data.response.data : [];
  const hasNext =
    data?.response?.pagination?.has_next ??
    data?.response?.meta?.has_more ??
    rows.length === 25;
  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      window.dispatchEvent(new Event("vx-notifications-updated"));
    } catch {
      setFailure("Could not mark the notification as read. Please retry.");
    }
  };
  const updateMarketing = async (event) => {
    try {
      await api.put("/notification-preferences", {
        marketing: event.target.checked,
        quiet_start: data?.preferences?.quiet_start ?? 21,
        quiet_end: data?.preferences?.quiet_end ?? 8,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      reload();
    } catch {
      setFailure("Could not save your notification preferences.");
    }
  };
  const changePush = async () => {
    try {
      if (data?.device?.registered) await disableWebPush();
      else await enableWebPush();
      reload();
    } catch (error) {
      setFailure(
        error.response?.data?.message ||
          error.message ||
          "Could not change push settings.",
      );
      reload({ silent: true });
    }
  };
  const saveQuietHours = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      await api.put("/notification-preferences", {
        marketing: Boolean(data?.preferences?.marketing),
        quiet_start: Number(values.get("quiet_start")),
        quiet_end: Number(values.get("quiet_end")),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      reload();
    } catch {
      setFailure("Could not save quiet hours.");
    }
  };
  return (
    <Stack spacing={2} sx={{ p: 2, minWidth: 0 }}>
      <Typography variant="h6">Notifications</Typography>
      {standalone && <Button href={user?.web_access === false ? "/app" : "/dashboard"}>Return to ERP</Button>}
      <Tabs
        value={category}
        onChange={(_, value) => {
          setCategory(value);
          setPage(1);
        }}
        variant="scrollable"
        aria-label="Notification categories"
      >
        <Tab value="all" label="All" />
        <Tab value="account" label="Account" />
        <Tab value="service" label="Service" />
        <Tab value="offer" label="Offers" />
      </Tabs>
      <FormControlLabel
        control={
          <Checkbox
            checked={Boolean(data?.preferences?.marketing)}
            onChange={updateMarketing}
            disabled={!data || loading}
          />
        }
        label="Receive subscription offers"
      />
      <Button
        onClick={changePush}
        disabled={
          !data?.device?.supported ||
          (!data?.push?.enabled && !data?.device?.registered)
        }
      >
        {data?.device?.registered
          ? "Disable push on this device"
          : "Enable notifications on this device"}
      </Button>
      {!data?.device?.supported && (
        <Typography variant="caption">
          Background push requires trusted HTTPS and a supported browser.
          iPhone/iPad users should open the installed Home Screen app.
        </Typography>
      )}
      {data && (
        <Stack
          component="form"
          onSubmit={saveQuietHours}
          direction="row"
          spacing={1}
          alignItems="center"
          key={`${data.preferences.quiet_start}-${data.preferences.quiet_end}`}
        >
          <TextField
            name="quiet_start"
            label="Quiet from (0-23)"
            type="number"
            size="small"
            defaultValue={data.preferences.quiet_start}
            slotProps={{ htmlInput: { min: 0, max: 23 } }}
          />
          <TextField
            name="quiet_end"
            label="Quiet until (0-23)"
            type="number"
            size="small"
            defaultValue={data.preferences.quiet_end}
            slotProps={{ htmlInput: { min: 0, max: 23 } }}
          />
          <Button type="submit">Save</Button>
        </Stack>
      )}
      {(error || failure) && (
        <Alert severity="warning">
          {failure ||
            "Notifications are unavailable. Connect to your ERP server and retry."}
        </Alert>
      )}
      {loading && <Typography>Loading notifications...</Typography>}
      {!loading && !error && rows.length === 0 && (
        <Typography color="text.secondary">
          No notifications in this category.
        </Typography>
      )}
      <Box sx={{ maxHeight: "55vh", overflowY: "auto" }}>
        {rows.map((row) => (
          <Box
            key={row.id}
            sx={{ borderBottom: 1, borderColor: "divider", py: 2 }}
          >
            <Typography fontWeight={row.read_at ? 400 : 700}>
              {row.title}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", my: 1 }}>
              {row.message}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
            >
              <Typography variant="caption" color="text.secondary">
                {row.category || "Operational"} ·{" "}
                {row.created_at
                  ? new Date(row.created_at).toLocaleString()
                  : ""}
              </Typography>
              {!row.read_at && (
                <Button size="small" onClick={() => markRead(row.id)}>
                  Mark read
                </Button>
              )}
              {row.platform_action === "subscription" && (
                <Button
                  size="small"
                  href={
                    user?.subscription_portal_url ||
                    "https://company.gpsoftware.in/login"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Manage subscription
                </Button>
              )}
            </Stack>
          </Box>
        ))}
      </Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
      >
        <Button
          disabled={page === 1 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </Button>
        <Typography variant="body2">Page {page}</Typography>
        <Button
          disabled={!hasNext || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </Button>
      </Stack>
      <Button
        onClick={async () => {
          try {
            await api.post("/notifications/read-all");
            window.dispatchEvent(new Event("vx-notifications-updated"));
          } catch {
            setFailure("Could not mark notifications as read.");
          }
        }}
      >
        Mark all as read
      </Button>
    </Stack>
  );
}
