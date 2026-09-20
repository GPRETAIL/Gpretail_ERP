import React from "react";
import { Box } from "@mui/material";

/**
 * Full-screen cover shown the instant the app is backgrounded (document
 * hidden), so sensitive ERP data doesn't linger in the OS app-switcher /
 * recents thumbnail. Independent of the PIN lock -- this is a privacy
 * measure for every user, not just ones who've set a PIN. Sits above
 * everything else (including AppLockScreen) so it always wins.
 */
export default function PrivacyScreen({ visible }) {
  if (!visible) return null;

  return (
    <Box
      sx={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
      style={{
        zIndex: 10001,
        background: "linear-gradient(165deg, #3d4ef8 0%, #2938e8 55%, #1c29be 100%)",
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: 56, height: 56, fill: "rgba(255,255,255,0.9)" }} aria-hidden>
        <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
      </svg>
    </Box>
  );
}
