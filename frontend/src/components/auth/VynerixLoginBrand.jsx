import { Box, Stack, Typography } from "@mui/material";
import VynerixLogo from "./VynerixLogo";

export default function VynerixLoginBrand({ onLight = false }) {
  return <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
    <VynerixLogo />
    <Box>
      <Typography component="h1" sx={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.15 }}>
        <Box component="span" sx={{ color: "#3a6ea5" }}>Vyn</Box>
        <Box component="span" sx={{ color: onLight ? "#0f172a" : "text.primary" }}>erix</Box>
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 12, color: onLight ? "#64748b" : "text.secondary" }}>
        Your business, connected.
      </Typography>
    </Box>
  </Stack>;
}
