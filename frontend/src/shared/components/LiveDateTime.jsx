import { useEffect, useState } from "react";
import { Box, Stack } from "@mui/material";
import { billDateText } from "@/features/sales/pos/utils/billingDate";

/**
 * POS date and time. With billingDate (useBillingDate's state), the date is the one bills go on: highlighted when it
 * is not today (after cash closing, or set by hand).
 */
export default function LiveDateTime({ billingDate = null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const shifted = Boolean(billingDate?.shifted);
  return <>
    <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}><Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Date</Box>
      <Box component="span" sx={{ color: shifted ? "warning.main" : "text.primary", fontWeight: shifted ? 700 : 400 }}>{billDateText(billingDate, now)}</Box></Stack>
    <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}><Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Time</Box><Box component="span" sx={{ color: "text.primary" }}>{now.toLocaleTimeString()}</Box></Stack>
  </>;
}
