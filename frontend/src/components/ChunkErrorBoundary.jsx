import React from "react";
import { Box, Button, Typography } from "@mui/material";

// Every route under MainLayout is React.lazy()-loaded (see routes/protectedLayoutRoutes.jsx), so a
// fresh deploy that replaces every chunk's content-hashed filename breaks any tab that was already
// open: clicking into a route updates the URL (routing itself is fine) but the dynamic import 404s,
// and with nothing catching that render error the page just silently stays on whatever was on
// screen before. A one-shot reload picks up the new build's chunk manifest and fixes it outright;
// the sessionStorage guard stops a genuinely broken chunk (not just a stale one) from reload-looping.
const RELOAD_GUARD_KEY = "vx_chunk_reload_attempted";

const isChunkLoadError = (error) => {
  const message = String(error?.message || "");
  return (
    error?.name === "ChunkLoadError" ||
    /dynamically imported module/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message)
  );
};

class ChunkErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (!isChunkLoadError(error)) return;

    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
      if (!alreadyTried) sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
    } catch {
      /* sessionStorage unavailable -- fall through to the fallback UI below */
    }

    if (!alreadyTried) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <Box sx={{ display: "flex", minHeight: "50vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            This page couldn't load a required update. Please refresh the page.
          </Typography>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            variant="contained"
            sx={{ bgcolor: "#3a6ea5", fontWeight: 600, textTransform: "none", "&:hover": { bgcolor: "#345f8f" }, borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ChunkErrorBoundary;
