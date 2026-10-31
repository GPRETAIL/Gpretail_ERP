import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";

/**
 * Placeholder for nav items whose feature isn't built yet. The catch-all route renders this so an
 * unbuilt (or mistyped) path shows a friendly panel instead of silently bouncing to the dashboard
 * with no feedback (which read as "the page is broken").
 */
export default function ComingSoon() {
  const location = useLocation();
  return (
    <Box component="section" sx={{ display: "flex", minHeight: "60vh", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3, textAlign: "center" }}>
      <Typography sx={{ mb: 2, fontSize: "3.75rem", lineHeight: 1 }}>🚧</Typography>
      <Typography variant="h5" component="h1" sx={{ mb: 1, fontWeight: 600, color: "text.primary" }}>
        Coming soon
      </Typography>
      <Typography variant="body2" sx={{ mb: 0.5, maxWidth: "28rem", color: "text.secondary" }}>
        This feature isn’t available yet — we’re still building it.
      </Typography>
      <Typography variant="caption" sx={{ mb: 3, fontFamily: "monospace", color: "text.disabled" }}>
        {location.pathname}
      </Typography>
      <Button
        component={Link}
        to="/dashboard"
        variant="contained"
        sx={{ textTransform: "none", fontWeight: 500 }}
      >
        Back to Dashboard
      </Button>
    </Box>
  );
}
