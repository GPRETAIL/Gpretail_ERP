import React from "react";
import { Contrast } from "lucide-react";
import { Box, Typography } from "@mui/material";

const FONT_SCALES = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

/**
 * Settings > Display & Accessibility content - renders inside
 * SettingsScreen's existing SettingsDrawer, same as SecurityPinSettings.
 */
export default function DisplayAccessibilitySettings({ displayPrefs }) {
  const { fontScale, setFontScale, highContrast, setHighContrast } = displayPrefs;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography component="label" sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", mb: 0.75 }}>
          Text Size
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75 }}>
          {FONT_SCALES.map((opt) => (
            <Box
              component="button"
              key={opt.id}
              type="button"
              onClick={() => setFontScale(opt.id)}
              sx={{
                py: 1.25, borderRadius: "12px", fontWeight: 700, transition: "all 0.15s",
                fontSize: opt.id === "small" ? 11 : opt.id === "large" ? 14 : 12,
                bgcolor: fontScale === opt.id ? "#4f46e5" : "#f8fafc",
                border: "1px solid",
                borderColor: fontScale === opt.id ? "#4f46e5" : "#e2e8f0",
                color: fontScale === opt.id ? "#fff" : "#334155",
              }}
            >
              {opt.label}
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: 10, color: "#94a3b8", mt: 0.75 }}>
          Scales text and controls across the whole app.
        </Typography>
      </Box>

      <Box
        component="button"
        type="button"
        onClick={() => setHighContrast(!highContrast)}
        sx={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          p: 1.5, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: "12px", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
              bgcolor: highContrast ? "#ecfdf5" : "#f1f5f9",
              color: highContrast ? "#059669" : "#94a3b8",
            }}
          >
            <Contrast size={16} />
          </Box>
          <Box sx={{ textAlign: "left" }}>
            <Typography component="h4" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a", m: 0 }}>
              High Contrast
            </Typography>
            <Typography component="p" sx={{ fontSize: 10.5, color: "#64748b", mt: 0.25, m: 0 }}>
              {highContrast ? "On - stronger text & borders" : "Darker text, stronger borders"}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            width: 40, height: 24, borderRadius: "999px", display: "flex", alignItems: "center",
            px: 0.25, transition: "background-color 0.15s", flexShrink: 0,
            bgcolor: highContrast ? "#4f46e5" : "#e2e8f0",
            justifyContent: highContrast ? "flex-end" : "flex-start",
          }}
        >
          <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: "#fff", boxShadow: 1 }} />
        </Box>
      </Box>
    </Box>
  );
}
