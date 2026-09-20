import React from "react";
import { Box, Typography } from "@mui/material";
import "../../mobile/workspace.css";

/**
 * Branded Vynerix ERP splash / loading screen.
 * Matches user's exact reference design with royal blue background,
 * glowing layered logo, clean bold typography, and smooth progress indicator.
 */
export default function Splash({ progress = 0 }) {
  return (
    <Box className="vx-splash-screen">
      {/* Centered Brand Content */}
      <Box className="vx-splash-content">
        {/* Layered Glowing V Logo Box */}
        <Box className="vx-splash-logo-card">
          <svg
            viewBox="0 0 100 100"
            style={{ width: 56, height: 56, fill: "#fff", filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.07)) drop-shadow(0 2px 2px rgba(0,0,0,0.06))" }}
            aria-hidden
          >
            <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
          </svg>
        </Box>

        {/* Title */}
        <Typography component="h1" className="vx-splash-brand-name">Vynerix</Typography>

        {/* Tagline */}
        <Typography component="p" className="vx-splash-tagline">Smart. Secure. Simplified.</Typography>

        {/* Loading Progress Bar Container */}
        <Box className="vx-splash-progress-track">
          <Box
            className="vx-splash-progress-fill"
            style={{ width: `${Math.max(8, Math.min(progress, 100))}%` }}
          />
        </Box>
      </Box>
    </Box>
  );
}
