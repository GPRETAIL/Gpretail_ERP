import React from "react";
import { Box } from "@mui/material";

/**
 * Skeleton loading placeholders for mobile screens.
 * Provides pulse-animated card and line shapes.
 */

export function SkeletonKpiGrid() {
  return (
    <Box className="vx-kpis-grid">
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} className="vx-kpi-card">
          <Box className="vx-skel vx-skel-line" style={{ width: "60%" }} />
          <Box className="vx-skel vx-skel-line vx-skel-lg" style={{ width: "80%" }} />
          <Box className="vx-skel vx-skel-line" style={{ width: "40%" }} />
        </Box>
      ))}
    </Box>
  );
}

export function SkeletonChart() {
  return (
    <Box className="vx-card">
      <Box className="vx-card-header">
        <Box className="vx-skel vx-skel-line" style={{ width: 120 }} />
        <Box className="vx-skel vx-skel-line" style={{ width: 80 }} />
      </Box>
      <Box className="vx-skel vx-skel-block" style={{ height: 140 }} />
    </Box>
  );
}

export function SkeletonTransList({ count = 4 }) {
  return (
    <Box>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} className="vx-trans-card">
          <Box className="vx-trans-left" style={{ gap: 6 }}>
            <Box className="vx-skel vx-skel-line" style={{ width: 100 }} />
            <Box className="vx-skel vx-skel-line" style={{ width: 80 }} />
            <Box className="vx-skel vx-skel-line" style={{ width: 60 }} />
          </Box>
          <Box className="vx-trans-right" style={{ gap: 6 }}>
            <Box className="vx-skel vx-skel-line" style={{ width: 70 }} />
            <Box className="vx-skel vx-skel-line" style={{ width: 50 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function SkeletonModuleGrid() {
  return (
    <Box className="vx-modules-grid">
      {Array.from({ length: 9 }).map((_, i) => (
        <Box key={i} className="vx-module-tile">
          <Box className="vx-skel" style={{ width: 46, height: 46, borderRadius: 14 }} />
          <Box className="vx-skel vx-skel-line" style={{ width: 50 }} />
        </Box>
      ))}
    </Box>
  );
}
