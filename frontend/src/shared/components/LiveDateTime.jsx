import { useEffect, useState } from "react";
import { Box, Stack } from "@mui/material";

export default function LiveDateTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>
    <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}><Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Date</Box><Box component="span" sx={{ color: "text.primary" }}>{now.toLocaleDateString()}</Box></Stack>
    <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}><Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Time</Box><Box component="span" sx={{ color: "text.primary" }}>{now.toLocaleTimeString()}</Box></Stack>
  </>;
}
