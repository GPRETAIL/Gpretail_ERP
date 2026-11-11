import { Box } from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
import { STAFF_COLOR, STAFF_TEXT } from "./staffUi";

/** "Show amounts" switch for salary figures; while on it counts down to hiding them again. */
export default function RevealToggle({ reveal, light = false }) {
  const { shown, left, toggle } = reveal;
  const color = light ? "#fff" : STAFF_COLOR.primaryDark;
  return (
    <Box component="button" type="button" role="switch" aria-checked={shown} onClick={(e) => { e.stopPropagation(); toggle(); }}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, minHeight: 36, px: 0, border: 0, bgcolor: "transparent", color, cursor: "pointer",
        fontSize: STAFF_TEXT.small, fontWeight: 700, fontFamily: "inherit" }}>
      <Box component="span" aria-hidden sx={{ position: "relative", width: 34, height: 20, borderRadius: "999px", bgcolor: shown ? (light ? "rgba(255,255,255,0.9)" : STAFF_COLOR.primary) : (light ? "rgba(255,255,255,0.35)" : STAFF_COLOR.inputLine), transition: "background-color 0.2s" }}>
        <Box component="span" sx={{ position: "absolute", top: 2, left: shown ? 16 : 2, width: 16, height: 16, borderRadius: "50%", bgcolor: shown && light ? "#0d9488" : STAFF_COLOR.knob, transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
      </Box>
      {shown ? <EyeOff size={15} /> : <Eye size={15} />}
      {shown ? `Hide amounts · ${left}s` : "Show amounts"}
    </Box>
  );
}
