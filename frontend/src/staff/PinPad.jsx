import { Box, Typography } from "@mui/material";
import { Delete } from "lucide-react";
import { STAFF_COLOR, STAFF_TEXT, TOUCH } from "./staffUi";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/** A phone-style keypad for a 4 to 6 digit PIN. The dots show how many digits are typed, never the digits. */
export default function PinPad({ value, onChange, label, max = 6, disabled = false }) {
  const press = (key) => {
    if (disabled) return;
    if (key === "back") onChange(value.slice(0, -1));
    else if (key && value.length < max) onChange(value + key);
  };
  return (
    <Box>
      {label && <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 700, color: STAFF_COLOR.text, textAlign: "center", mb: 1.5 }}>{label}</Typography>}
      <Box role="status" aria-label={`${value.length} digits entered`} sx={{ display: "flex", justifyContent: "center", gap: 1.5, mb: 2.5 }}>
        {Array.from({ length: Math.max(4, value.length) }, (_, i) => (
          <Box key={i} sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: i < value.length ? STAFF_COLOR.primary : "transparent", border: `2px solid ${i < value.length ? STAFF_COLOR.primary : STAFF_COLOR.faint}` }} />
        ))}
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.25, maxWidth: 300, mx: "auto" }}>
        {KEYS.map((key, i) => key === "" ? <Box key={i} /> : (
          <Box key={i} component="button" type="button" disabled={disabled} onClick={() => press(key)} aria-label={key === "back" ? "Delete last digit" : key}
            sx={{ minHeight: TOUCH + 12, borderRadius: "16px", border: `1px solid ${STAFF_COLOR.line}`, bgcolor: key === "back" ? "transparent" : STAFF_COLOR.surface, color: STAFF_COLOR.text,
              fontSize: 24, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              "&:active": { bgcolor: STAFF_COLOR.primarySoft }, "&:disabled": { opacity: 0.5 } }}>
            {key === "back" ? <Delete size={22} /> : key}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
