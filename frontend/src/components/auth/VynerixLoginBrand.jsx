import { Box, Stack, Typography } from "@mui/material";
import { Cloud, ShieldCheck, Store } from "lucide-react";

const features = [
  { icon: Store, title: "Your stores, connected", body: "Manage sales, stock and purchases across your assigned stores." },
  { icon: Cloud, title: "Cloud or your own server", body: "Sign in to your company's cloud or on-premises deployment." },
  { icon: ShieldCheck, title: "Access for your team", body: "Use your assigned account, with access managed by your Tenant Administrator." },
];

export default function VynerixLoginBrand({ compact = false, inverse = false }) {
  return <Stack spacing={4}>
    <Box>
      <Typography component="h1" sx={{ fontSize: compact ? 30 : 44, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.15 }}>
        <Box component="span" sx={{ color: inverse ? "#bae6fd" : "primary.main" }}>Vyn</Box>
        <Box component="span" sx={{ color: inverse ? "#fff" : "text.primary" }}>erix</Box>
      </Typography>
      <Typography sx={{ mt: 1, fontSize: 14, color: inverse ? "#e0f2fe" : "text.secondary" }}>
        Your business, connected.
      </Typography>
    </Box>
    {!compact && <Stack spacing={3} component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
      {features.map(({ icon: Icon, title, body }) => <Stack component="li" direction="row" spacing={2} key={title}>
        <Box sx={{ color: "primary.main", mt: 0.5 }}><Icon size={22} aria-hidden="true" /></Box>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{title}</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: "text.secondary" }}>{body}</Typography>
        </Box>
      </Stack>)}
    </Stack>}
  </Stack>;
}
