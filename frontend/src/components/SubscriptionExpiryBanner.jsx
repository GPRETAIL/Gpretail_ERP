import { useState } from "react";
import { useSelector } from "react-redux";
import { Alert, Button, IconButton, Stack } from "@mui/material";
import { X } from "lucide-react";
import useSubscriptionStatus from "../hooks/useSubscriptionStatus";

const DISMISS_KEY = "vx:renewal-banner-dismissed";
const COMPANY_PORTAL_LOGIN_URL = "https://company.gpsoftware.in/login";
const formatDate = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

// Persistent banner under the tab bar. Expired stores cannot be dismissed (writes are blocked
// server-side); an upcoming renewal can be hidden for the rest of the day.
export default function SubscriptionExpiryBanner() {
  const status = useSubscriptionStatus();
  const role = useSelector((state) => state.auth.user?.role);
  const [dismissedOn, setDismissedOn] = useState(readDismissed);
  const today = new Date().toDateString();
  if (!status || !Array.isArray(status.stores)) return null;

  const canRenew = ["admin", "super_admin"].includes(role);
  const portalUrl = status.subscription_portal_url || COMPANY_PORTAL_LOGIN_URL;
  const expired = status.stores.filter((store) => store.expired);
  const dueSoon = status.stores.filter((store) => !store.expired && store.days_left !== null && store.days_left >= 0 && store.days_left <= 7);
  const names = (stores) => stores.map((store) => store.name).join(", ");
  const renew = canRenew ? (
    <Button color="inherit" size="small" variant="outlined" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
      onClick={() => window.open(portalUrl, "_blank", "noopener,noreferrer")}>
      Renew now
    </Button>
  ) : null;

  if (expired.length > 0) {
    const since = formatDate(expired.map((store) => store.expiry_date).filter(Boolean).sort()[0]);
    return (
      <Alert severity="error" variant="filled" role="alert" action={renew} sx={{ borderRadius: 0, py: 0.25, alignItems: "center" }}>
        <strong>Subscription expired{since ? ` on ${since}` : ""}</strong> — {names(expired)}.{" "}
        Billing, purchases and stock changes are blocked for {expired.length === 1 ? "this store" : "these stores"} until renewed.{" "}
        {canRenew ? "Renew in the company portal to restore access immediately." : "Contact your company administrator to renew."}
      </Alert>
    );
  }

  if (dueSoon.length > 0 && dismissedOn !== today) {
    const soonest = Math.min(...dueSoon.map((store) => store.days_left));
    const dismiss = () => {
      try {
        localStorage.setItem(DISMISS_KEY, today);
      } catch {
        // Hidden for this session only when storage is unavailable.
      }
      setDismissedOn(today);
    };
    return (
      <Alert
        severity="warning"
        role="status"
        // Alert drops its own close button when an action is set, so both live in the action slot.
        action={(
          <Stack direction="row" spacing={0.5} alignItems="center">
            {renew}
            <IconButton size="small" color="inherit" aria-label="Hide renewal reminder for today" onClick={dismiss}>
              <X size={16} />
            </IconButton>
          </Stack>
        )}
        sx={{ borderRadius: 0, py: 0.25, alignItems: "center" }}
      >
        <strong>{soonest === 0 ? "Subscription expires today" : `Subscription expires in ${soonest} day${soonest === 1 ? "" : "s"}`}</strong>
        {" "}— {names(dueSoon)}. Renew before it lapses to avoid interrupting billing and stock entry.
      </Alert>
    );
  }
  return null;
}
