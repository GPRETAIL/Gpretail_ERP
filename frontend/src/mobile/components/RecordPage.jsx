import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { rupees } from "@/mobile/utils/recordDocuments";

/**
 * Building blocks of the mobile record pages (sale invoice, purchase bill, supplier, customer, return): a full-screen
 * page under the app header with a summary card, sections, product rows, totals and a bar of actions above the bottom
 * navigation. They use the workspace's colours so dark mode follows.
 */
const card = { bgcolor: "var(--vx-card-bg, #fff)", border: "1px solid var(--vx-border, #e2e8f0)", borderRadius: "16px", p: 1.5 };
const muted = { color: "var(--vx-muted, #64748b)" };

/** The top card: what this is, its number, the amount and its status. */
export function RecordHero({ label, title, subtitle, amount, amountLabel, status }) {
  return (
    <Box sx={{ p: 2, borderRadius: "20px", color: "#fff", background: "var(--vx-primary-gradient, linear-gradient(135deg, #4f46e5 0%, #3730a3 100%))" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.8 }}>{label}</Typography>
          <Typography sx={{ fontSize: 17, fontWeight: 900, overflowWrap: "anywhere" }}>{title}</Typography>
          {subtitle ? <Typography sx={{ fontSize: 12, opacity: 0.85 }}>{subtitle}</Typography> : null}
        </Box>
        {status ? <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: "999px", bgcolor: "rgba(255,255,255,0.2)", fontSize: 10.5, fontWeight: 800, textTransform: "capitalize", flexShrink: 0 }}>{status}</Box> : null}
      </Box>
      {amount !== undefined ? (
        <Box sx={{ mt: 1.25 }}>
          <Typography sx={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{rupees(amount)}</Typography>
          {amountLabel ? <Typography sx={{ fontSize: 11, opacity: 0.85 }}>{amountLabel}</Typography> : null}
        </Box>
      ) : null}
    </Box>
  );
}

export function Section({ title, children, action }) {
  return (
    <Box component="section" aria-label={title} sx={card}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
        <Typography component="h3" sx={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", ...muted }}>{title}</Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

/** Label and value pairs; rows with nothing to show are left out. */
export function InfoRows({ rows }) {
  return (
    <Box>
      {rows.filter(([, value]) => value !== undefined && value !== null && value !== "").map(([label, value]) => (
        <Box key={label} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.6, fontSize: 13 }}>
          <Box component="span" sx={muted}>{label}</Box>
          <Box component="span" sx={{ fontWeight: 600, textAlign: "right", overflowWrap: "anywhere", color: "var(--vx-text, #0f172a)" }}>{value}</Box>
        </Box>
      ))}
    </Box>
  );
}

/** One row per product: name, quantity at rate, amount, then the discount and tax it carries. rateLabel: "cost" on a purchase. */
export function LineItems({ items, rateLabel = "", empty = "No products on this bill." }) {
  if (!items.length) return <Typography sx={{ fontSize: 13, ...muted }}>{empty}</Typography>;
  return (
    <Box component="ul" aria-label="Products" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {items.map((item, index) => (
        <Box component="li" key={`${item.name}-${index}`} sx={{ py: 1, borderTop: index ? "1px solid var(--vx-border, #e2e8f0)" : 0 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, overflowWrap: "anywhere", color: "var(--vx-text, #0f172a)" }}>{item.name}</Typography>
              {item.detail ? <Typography sx={{ fontSize: 11.5, ...muted }}>{item.detail}</Typography> : null}
              <Typography sx={{ fontSize: 12, ...muted }}>{Number(item.qty)} × {rupees(item.rate)}{rateLabel ? ` ${rateLabel}` : ""}</Typography>
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 800, flexShrink: 0, color: "var(--vx-text, #0f172a)" }}>{rupees(item.amount)}</Typography>
          </Box>
          {(item.discount > 0 || item.tax > 0) ? (
            <Typography sx={{ fontSize: 11.5, mt: 0.25, ...muted }}>
              {[item.discount > 0 ? `Discount ${rupees(item.discount)}` : "", item.tax > 0 ? `Tax ${item.taxRate ? `${item.taxRate}% ` : ""}${rupees(item.tax)}` : ""].filter(Boolean).join(" · ")}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

/** rows: { label, value, strong, always }. A row at zero is left out unless it is always shown. */
export function Totals({ rows }) {
  return (
    <Box>
      {rows.filter((row) => row.always || Number(row.value) !== 0).map((row) => (
        <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, fontSize: row.strong ? 15 : 13, fontWeight: row.strong ? 900 : 500, color: row.tone || "var(--vx-text, #0f172a)" }}>
          <span>{row.label}</span><span>{rupees(row.value)}</span>
        </Box>
      ))}
    </Box>
  );
}

/** Loading, an error with Retry, or "not found" in place of the page. Returns null when there is a record to show. */
export function RecordState({ loading, error, notFound, onRetry }) {
  if (loading) return <Box role="status" aria-label="Loading" sx={{ ...card, color: "var(--vx-muted, #64748b)", fontSize: 13 }}>Loading...</Box>;
  if (error) {
    return (
      <Box sx={{ ...card, display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography role="alert" sx={{ fontSize: 13, color: "#be123c" }}>{error.response?.data?.message || "Could not load this. Check your connection and try again."}</Typography>
        <Button size="small" onClick={onRetry}>Retry</Button>
      </Box>
    );
  }
  if (notFound) return <Box sx={{ ...card, fontSize: 13, ...muted }}>This record was not found.</Box>;
  return null;
}

/** Room under the page so the last section is not hidden behind the action bar. */
export const ActionBarSpace = () => <Box aria-hidden="true" sx={{ height: 76 }} />;

/** Actions pinned above the bottom navigation. */
export function ActionBar({ children }) {
  return (
    <Box sx={{ position: "fixed", left: 0, right: 0, bottom: "calc(64px + env(safe-area-inset-bottom))", maxWidth: 480, mx: "auto", zIndex: 45, px: 1.5, py: 1, display: "flex", gap: 1,
      bgcolor: "var(--vx-card-bg, #fff)", borderTop: "1px solid var(--vx-border, #e2e8f0)", boxShadow: "0 -6px 18px rgba(15,23,42,0.08)" }}>
      {children}
    </Box>
  );
}

const TONES = { share: { bg: "#16a34a", fg: "#fff" }, primary: { bg: "#4f46e5", fg: "#fff" }, neutral: { bg: "var(--vx-bg, #f1f5f9)", fg: "var(--vx-text, #0f172a)" } };

export function ActionButton({ icon: Icon, label, onClick, href, tone = "neutral", busy = false, disabled = false }) {
  const colors = TONES[tone] || TONES.neutral;
  return (
    <Box component={href ? "a" : "button"} type={href ? undefined : "button"} href={href} onClick={onClick} disabled={href ? undefined : disabled || busy} aria-label={label}
      sx={{ flex: 1, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 0.75, border: tone === "neutral" ? "1px solid var(--vx-border, #e2e8f0)" : 0,
        borderRadius: "12px", bgcolor: colors.bg, color: colors.fg, fontSize: 13, fontWeight: 800, textDecoration: "none", cursor: "pointer", "&:disabled": { opacity: 0.6 } }}>
      {busy ? <CircularProgress size={16} color="inherit" /> : Icon ? <Icon size={16} /> : null} {label}
    </Box>
  );
}
