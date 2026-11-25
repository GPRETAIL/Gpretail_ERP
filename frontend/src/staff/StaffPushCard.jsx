import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { BellRing } from "lucide-react";
import { disableWebPush, enableWebPush, pushDeviceState } from "@/features/notifications/utils/webPush";
import { STAFF_COLOR, STAFF_TEXT, card, primaryButton, secondaryButton } from "./staffUi";

export const STAFF_PUSH_KEY = "vx-staff-push-device";
const OPTIONS = { deviceKey: STAFF_PUSH_KEY };

/** Me: get a notification on this phone when leave, a claim or an approval is decided. Hidden where the phone cannot do it. */
export default function StaffPushCard() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => pushDeviceState(OPTIONS).then(setState).catch(() => setState({ supported: false })), []);
  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  if (!state?.supported) return null;

  const toggle = async () => {
    setBusy(true);
    setError("");
    try {
      if (state.registered) await disableWebPush(OPTIONS);
      else await enableWebPush(OPTIONS);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not change notifications on this phone.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={card}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <BellRing size={20} color="var(--hr-teal-text)" />
        <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>Notifications on this phone</Typography>
      </Box>
      <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, mb: 1.25 }}>
        {state.registered ? "This phone gets a notification when something about you is decided or needs you. The message says only that there is an update." : "Get a notification when your leave, claim or approval is decided, even when the app is closed."}
      </Typography>
      {error && <Box role="alert" sx={{ color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.label, fontWeight: 600, mb: 1 }}>{error}</Box>}
      <Box component="button" type="button" onClick={() => void toggle()} disabled={busy} sx={{ ...(state.registered ? secondaryButton : primaryButton), width: "100%" }}>
        {busy ? "Please wait" : state.registered ? "Turn off on this phone" : "Turn on notifications"}
      </Box>
    </Box>
  );
}
