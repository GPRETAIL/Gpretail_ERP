import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { formatClock } from "@/shared/utils/formatClock";

/**
 * The running time and date at the end of the app footer, stacked like a desktop ERP: the time in bold with
 * a small AM/PM, the date under it. Wide screens only (the footer has no room below 1200px). It ticks on its
 * own, so the rest of the footer doesn't re-render every second.
 */
export default function FooterClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { time, meridiem, date } = formatClock(now);

  return (
    <Box
      component="time"
      dateTime={now.toISOString()}
      aria-label="Current date and time"
      sx={{
        display: { xs: "none", lg: "flex" }, flexDirection: "column", alignItems: "flex-end", justifyContent: "center",
        pl: 1.5, borderLeft: 1, borderColor: "divider",
        lineHeight: 1.15, fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
      }}
    >
      <Box component="span" sx={{ fontSize: 12.5 }}>
        {time}
        <Box component="span" sx={{ ml: 0.4, fontSize: 9 }}>{meridiem}</Box>
      </Box>
      <Box component="span" sx={{ fontSize: 11.5 }}>{date}</Box>
    </Box>
  );
}
