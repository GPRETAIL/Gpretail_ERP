import { useEffect, useState } from "react";
import { Box } from "@mui/material";

const dateFormat = { day: "2-digit", month: "2-digit", year: "numeric" };
const timeFormat = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true };

/**
 * The running date and time at the end of the app footer (desktop ERP style), on wide screens only (the
 * footer has no room below 1200px). It ticks on its own,
 * so the rest of the footer doesn't re-render every second.
 */
export default function FooterClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      component="time"
      dateTime={now.toISOString()}
      aria-label="Current date and time"
      sx={{
        display: { xs: "none", lg: "inline-flex" }, alignItems: "center", gap: 1,
        pl: 1.5, borderLeft: 1, borderColor: "divider",
        fontWeight: 600, color: "text.primary", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
      }}
    >
      <span>{now.toLocaleDateString("en-IN", dateFormat)}</span>
      <span>{now.toLocaleTimeString("en-IN", timeFormat)}</span>
    </Box>
  );
}
