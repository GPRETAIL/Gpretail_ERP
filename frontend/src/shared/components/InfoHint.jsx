import { useState } from "react";
import { Box, IconButton, Popover, Typography } from "@mui/material";
import { Info } from "lucide-react";

/**
 * The small "i" used app wide for instructions and explanations, so they open on a click instead of taking room on the
 * page all day. Put it beside the heading or label it explains. Warnings, errors and status messages stay on the page.
 * `title` is the bold first line of the popover (defaults to the label); `children` is the text or any markup.
 */
export default function InfoHint({ label = "More information", title, children, maxWidth = 400, size = 15, sx }) {
  const [anchor, setAnchor] = useState(null);
  const heading = title === undefined ? label : title;
  return (
    <>
      <IconButton size="small" aria-label={label} aria-haspopup="dialog" aria-expanded={Boolean(anchor)} title={label}
        onClick={(event) => { event.stopPropagation(); setAnchor(event.currentTarget); }}
        sx={{ p: 0.25, ml: 0.5, color: "text.secondary", verticalAlign: "middle", flexShrink: 0, ...sx }}>
        <Info size={size} />
      </IconButton>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { role: "dialog", "aria-label": label, sx: { p: 1.5, maxWidth, borderRadius: 2 } } }}>
        {heading ? <Typography sx={{ fontWeight: 800, fontSize: 13.5, mb: 0.75 }}>{heading}</Typography> : null}
        <Box sx={{ fontSize: 13, lineHeight: 1.55, color: "text.primary", "& p": { m: 0, mb: 0.75 }, "& p:last-child": { mb: 0 } }}>{children}</Box>
      </Popover>
    </>
  );
}
