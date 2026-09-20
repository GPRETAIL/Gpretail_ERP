import React from "react";
import { Delete } from "lucide-react";
import { Box } from "@mui/material";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/**
 * Shared numeric keypad for PIN entry - used by both the full-screen lock
 * (dark, on the brand gradient) and the Settings PIN setup flow (light, on
 * a white drawer).
 */
export default function PinKeypad({ onDigit, onBackspace, disabled, dark = true }) {
  const keySx = dark
    ? { bgcolor: "rgba(255,255,255,0.1)", color: "#fff", "&:active": { bgcolor: "rgba(255,255,255,0.2)" } }
    : { bgcolor: "#f1f5f9", color: "#0f172a", "&:active": { bgcolor: "#e2e8f0" } };
  const backSx = dark
    ? { color: "rgba(255,255,255,0.9)", "&:active": { bgcolor: "rgba(255,255,255,0.1)" } }
    : { color: "#475569", "&:active": { bgcolor: "#f1f5f9" } };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, width: "100%", maxWidth: 260, mx: "auto" }}>
      {KEYS.map((k, i) => {
        if (k === "") return <Box key={`gap-${i}`} />;
        if (k === "back") {
          return (
            <Box
              component="button"
              key="back"
              type="button"
              disabled={disabled}
              onClick={onBackspace}
              aria-label="Backspace"
              sx={{
                height: "58px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", border: 0, bgcolor: "transparent",
                "&:disabled": { opacity: 0.4 },
                ...backSx,
              }}
            >
              <Delete size={20} />
            </Box>
          );
        }
        return (
          <Box
            component="button"
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(k)}
            sx={{
              height: "58px", borderRadius: "16px", fontSize: 24, fontWeight: 700, transition: "all 0.15s",
              border: 0, "&:disabled": { opacity: 0.4 },
              ...keySx,
            }}
          >
            {k}
          </Box>
        );
      })}
    </Box>
  );
}
