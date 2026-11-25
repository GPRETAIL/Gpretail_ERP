import { useState } from "react";
import { Box, IconButton, Popover, Typography } from "@mui/material";
import { Info } from "lucide-react";
import { BILLING_SHORTCUTS } from "../utils/billingShortcuts";

/** A small "i" beside the Barcode label. It opens the list above instead of keeping it on the screen all day. */
export default function BillingShortcutsHelp() {
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <IconButton size="small" aria-label="Billing shortcuts" aria-haspopup="dialog" aria-expanded={Boolean(anchor)} title="Billing shortcuts"
        onClick={(event) => setAnchor(event.currentTarget)} sx={{ p: 0.25, ml: 0.5, color: "text.secondary" }}>
        <Info size={15} />
      </IconButton>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { role: "dialog", "aria-label": "Billing shortcuts", sx: { p: 1.5, maxWidth: 420 } } }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>Type in the barcode box</Typography>
        <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 0.75, alignItems: "baseline" }}>
          {BILLING_SHORTCUTS.map(({ keys, does }) => (
            <Box key={keys.join("|")} sx={{ display: "contents" }}>
              <Box component="dt" sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {keys.map((key) => (
                  <Box key={key} component="kbd" sx={{ px: 0.75, py: 0.1, borderRadius: "5px", border: 1, borderColor: "divider", bgcolor: "action.hover", fontFamily: "monospace", fontSize: 12.5, fontWeight: 700 }}>{key}</Box>
                ))}
              </Box>
              <Typography component="dd" sx={{ m: 0, fontSize: 13 }}>{does}</Typography>
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
