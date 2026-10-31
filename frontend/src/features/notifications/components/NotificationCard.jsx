import { Box, Button, Chip, IconButton, Link, Stack, Tooltip, Typography } from "@mui/material";
import { Bell, Check, CreditCard, Megaphone, ShieldCheck } from "lucide-react";

const categories = {
  subscription: { label: "Account", Icon: ShieldCheck, color: "primary" },
  billing: { label: "Billing", Icon: CreditCard, color: "warning" },
  offer: { label: "Offer", Icon: Megaphone, color: "secondary" },
};

const relativeTime = (date) => {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 7 * 24 * 60) return `${Math.round(minutes / (24 * 60))}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function NotificationCard({ notification: row, compact = false, pending = false, onRead, onOpen, subscriptionUrl }) {
  const { label, Icon, color } = categories[row.category] || { label: "Service", Icon: Bell, color: "primary" };
  const date = row.created_at ? new Date(row.created_at) : null;
  const validDate = date && !Number.isNaN(date.getTime());
  const internalLink = typeof row.link === "string" && row.link.startsWith("/") && !row.link.startsWith("//") && !/[\\\s]/.test(row.link) ? row.link : null;
  const portalUrl = /^https:\/\//i.test(subscriptionUrl || "") ? subscriptionUrl : "https://company.gpsoftware.in/login";
  const important = row.priority === "high";

  // Compact = the header popover: a dense list row (two-line clamp, inline text actions,
  // relative time) so 5-6 updates fit without scrolling. The inbox page keeps the full card.
  if (compact) {
    const linkSx = { fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
    return (
      <Box
        component="article"
        aria-label={row.title}
        sx={{
          position: "relative", px: 1.5, py: 1.25, borderBottom: 1, borderColor: "divider",
          bgcolor: row.read_at ? "transparent" : "action.hover", overflowWrap: "anywhere",
          "&:last-of-type": { borderBottom: 0 },
          ...(row.read_at ? null : { "&::before": { content: '""', position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, bgcolor: important ? "warning.main" : "primary.main" } }),
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
          <Box sx={{ width: 28, height: 28, mt: 0.25, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: `${color}.main`, color: `${color}.contrastText`, opacity: row.read_at ? 0.55 : 1 }}>
            <Icon size={15} aria-hidden="true" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
              <Typography component="h3" noWrap title={row.title} sx={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.35, fontWeight: row.read_at ? 500 : 700 }}>{row.title}</Typography>
              {validDate && (
                <Typography component="time" dateTime={date.toISOString()} title={date.toLocaleString()} sx={{ fontSize: 11, color: "text.secondary", flexShrink: 0 }}>
                  {relativeTime(date)}
                </Typography>
              )}
            </Stack>
            <Typography color="text.secondary" title={row.message} sx={{ mt: 0.25, fontSize: 12, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {row.message}
            </Typography>
            <Stack direction="row" spacing={1.25} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.5 }}>
              <Typography component="span" sx={{ fontSize: 11, color: "text.secondary" }}>{label}</Typography>
              {important && <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, color: "warning.dark" }}>Important</Typography>}
              <Box sx={{ flex: 1 }} />
              {row.platform_action === "subscription" ? (
                <Link href={portalUrl} target="_blank" rel="noopener noreferrer" underline="hover" sx={linkSx}>Manage subscription</Link>
              ) : internalLink && (
                <Link component="button" type="button" underline="hover" onClick={() => (onOpen ? onOpen(internalLink) : window.location.assign(internalLink))} sx={linkSx}>View details</Link>
              )}
            </Stack>
          </Box>
          {!row.read_at && (
            <Tooltip title="Mark read">
              <span>
                <IconButton size="small" aria-label="Mark read" disabled={pending} onClick={() => onRead(row.id)} sx={{ mt: -0.25, p: 0.5 }}>
                  <Check size={14} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box component="article" aria-label={row.title} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: row.read_at ? "background.paper" : "action.hover", overflowWrap: "anywhere" }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
        <Box sx={{ width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "background.paper", color: `${color}.main`, border: 1, borderColor: "divider" }}><Icon size={17} aria-hidden="true" /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography component="h3" sx={{ fontSize: 14, fontWeight: row.read_at ? 500 : 700 }}>{row.title}</Typography>
            {!row.read_at && <Box component="span" aria-label="Unread" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 13, whiteSpace: "pre-wrap" }}>{row.message}</Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", mt: 1 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            {validDate && <Typography component="time" dateTime={date.toISOString()} variant="caption" color="text.secondary">{date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Typography>}
            {important && <Chip label="Important" color="warning" size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}
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
