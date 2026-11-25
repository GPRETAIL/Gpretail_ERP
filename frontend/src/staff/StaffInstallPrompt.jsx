import { Box, Typography } from "@mui/material";
import { Share, SquarePlus, Smartphone, X } from "lucide-react";
import { STAFF_COLOR, STAFF_TEXT, TOUCH, card, primaryButton } from "./staffUi";
import useInstallPrompt from "./useInstallPrompt";

/** A card on Home: put the app on the phone's home screen. Android gets one button; iPhone gets the two steps. */
export default function StaffInstallPrompt() {
  const { visible, canPrompt, isIos, install, dismiss } = useInstallPrompt();
  if (!visible) return null;
  return (
    <Box role="region" aria-label="Install the app" sx={{ ...card, borderColor: STAFF_COLOR.primaryBorder, bgcolor: STAFF_COLOR.primarySoft, position: "relative" }}>
      <Box component="button" type="button" onClick={dismiss} aria-label="Not now"
        sx={{ position: "absolute", top: 4, right: 4, width: TOUCH - 4, height: TOUCH - 4, border: 0, bgcolor: "transparent", color: STAFF_COLOR.muted, cursor: "pointer" }}>
        <X size={18} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75, pr: 4 }}>
        <Smartphone size={20} color="var(--hr-teal-text)" />
        <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 800, color: STAFF_COLOR.text }}>Keep HRMS on your phone</Typography>
      </Box>
      <Typography sx={{ fontSize: STAFF_TEXT.label, color: STAFF_COLOR.muted, mb: 1.25 }}>
        Open it like any app from your home screen, with no browser bar. Check in, apply for leave and see your payslips faster.
      </Typography>
      {canPrompt && <Box component="button" type="button" onClick={() => void install()} sx={{ ...primaryButton, width: "100%" }}>Install the app</Box>}
      {!canPrompt && isIos && (
        <Box component="ol" sx={{ m: 0, pl: 2.5, fontSize: STAFF_TEXT.label, color: STAFF_COLOR.text, display: "flex", flexDirection: "column", gap: 0.75 }}>
          <li>Tap <Share size={15} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> <b>Share</b> at the bottom of Safari.</li>
          <li>Choose <SquarePlus size={15} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> <b>Add to Home Screen</b>, then <b>Add</b>.</li>
        </Box>
      )}
    </Box>
  );
}
