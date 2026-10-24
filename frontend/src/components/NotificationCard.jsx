import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { Bell, CreditCard, Megaphone, ShieldCheck } from "lucide-react";

const categories = {
  subscription: { label: "Account", Icon: ShieldCheck, color: "primary" },
  billing: { label: "Billing", Icon: CreditCard, color: "warning" },
  offer: { label: "Offer", Icon: Megaphone, color: "secondary" },
};

export default function NotificationCard({ notification: row, compact = false, pending = false, onRead, onOpen, subscriptionUrl }) {
  const { label, Icon, color } = categories[row.category] || { label: "Service", Icon: Bell, color: "primary" };
  const date = row.created_at ? new Date(row.created_at) : null;
  const validDate = date && !Number.isNaN(date.getTime());
  const internalLink = typeof row.link === "string" && row.link.startsWith("/") && !row.link.startsWith("//") && !/[\\\s]/.test(row.link) ? row.link : null;
  const portalUrl = /^https:\/\//i.test(subscriptionUrl || "") ? subscriptionUrl : "https://company.gpsoftware.in/login";
  return (
    <Box component="article" aria-label={row.title} sx={{ p: compact ? 1.75 : 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: row.read_at ? "background.paper" : "action.hover", overflowWrap: "anywhere" }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
        <Box sx={{ width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "background.paper", color: `${color}.main`, border: 1, borderColor: "divider" }}><Icon size={17} aria-hidden="true" /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography component="h3" sx={{ fontSize: compact ? 13 : 14, fontWeight: row.read_at ? 500 : 700 }}>{row.title}</Typography>
            {!row.read_at && <Box component="span" aria-label="Unread" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: compact ? 12 : 13, whiteSpace: "pre-wrap", ...(compact ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}) }}>{row.message}</Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", mt: 1 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            {validDate && <Typography component="time" dateTime={date.toISOString()} variant="caption" color="text.secondary">{date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Typography>}
            {row.priority === "high" && <Chip label="Important" color="warning" size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
            {!row.read_at && <Button size="small" disabled={pending} onClick={() => onRead(row.id)} sx={{ fontSize: 12 }}>Mark read</Button>}
            {row.platform_action === "subscription" ? <Button size="small" href={portalUrl} target="_blank" rel="noopener noreferrer">Manage subscription</Button> : internalLink && <Button size="small" href={onOpen ? undefined : internalLink} onClick={onOpen ? () => onOpen(internalLink) : undefined}>View details</Button>}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
