import { Badge, Chip, IconButton } from "@mui/material";
import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import useSubscriptionStatus from "../hooks/useSubscriptionStatus";

export function HeaderApprovalButton({ count, onClick }) {
  const pending = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0;
  return <IconButton size="small" onClick={onClick} title="Approval Inbox" aria-label={pending > 0 ? `Approval Inbox: ${pending} pending` : "Approval Inbox"} sx={{ color: "text.secondary" }}>
    <Badge badgeContent={pending} color="error" overlap="circular">
      <ClipboardDocumentCheckIcon style={{ width: 20, height: 20 }} />
    </Badge>
  </IconButton>;
}

export function HeaderRenewalNotice() {
  const status = useSubscriptionStatus();
  const rawDays = status?.soonestDaysLeft;
  if (rawDays === null || rawDays === undefined || !Number.isFinite(Number(rawDays))) return null;
  const days = Number(rawDays);
  if (days > 7) return null;
  const description = days < 0 ? "Subscription expired" : days === 0 ? "Subscription expires today" : `Subscription expires in ${days} days`;
  return <Chip size="small" color={days <= 3 ? "error" : "warning"}
    label={days < 0 ? "Expired · Renew" : days === 0 ? "Expires today" : `Renew · ${days}d`}
    title={`${description}. Open the company portal to review or renew.`}
    aria-label={`${description}. Review subscription`}
    onClick={() => window.open(status?.subscription_portal_url || "https://company.gpsoftware.in/login", "_blank", "noopener,noreferrer")}
    sx={{ height: 24, fontWeight: 700, fontSize: 11, flexShrink: 0 }} />;
}
