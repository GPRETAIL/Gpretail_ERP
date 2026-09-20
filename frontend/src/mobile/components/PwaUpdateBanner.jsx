import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Box, Typography } from "@mui/material";
import { getHasUnsavedWork } from "../utils/unsavedWork";

/**
 * In-App PWA Update Notification Banner
 *
 * Detects when a new service worker version is waiting to activate.
 * Provides a 1-tap "Update Now" button to reload the app with the latest version.
 */
export default function PwaUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Check existing registration
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // If a worker is already waiting, prompt immediately
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowUpdate(true);
      }

      // Listen for new updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowUpdate(true);
          }
        });
      });
    });

    // Reload when the new controller takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    // A new service worker taking over reloads the page (see the
    // controllerchange listener above), which would silently wipe an
    // in-progress, not-yet-saved invoice's cart - confirm first rather
    // than losing scanned items to an update the user didn't realize
    // would reset the screen.
    if (
      getHasUnsavedWork() &&
      !window.confirm(
        "You have an invoice in progress that hasn't been saved yet. Updating now will lose it. Update anyway?"
      )
    ) {
      return;
    }
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  if (!showUpdate) return null;

  return (
    <Box sx={{ position: "fixed", top: 64, left: 12, right: 12, zIndex: 50, mx: "auto", maxWidth: 440 }}>
      <Box
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, borderRadius: "16px",
          p: "14px", color: "#fff", boxShadow: "0 20px 25px -5px rgba(30,27,75,0.4)", border: "1px solid rgba(255,255,255,0.2)",
          backgroundImage: "linear-gradient(to right, #4f46e5, #4338ca, #6d28d9)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ display: "flex", height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: "12px", bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }}>
            <Sparkles size={16} />
          </Box>
          <Box>
            <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#fff", m: 0 }}>Update Available</Typography>
            <Typography component="p" sx={{ fontSize: 11, color: "#e0e7ff", m: 0 }}>New features & fixes ready</Typography>
          </Box>
        </Box>

        <Box
          component="button"
          type="button"
          onClick={handleUpdate}
          sx={{
            display: "flex", alignItems: "center", gap: 0.75, borderRadius: "12px", bgcolor: "#fff",
            px: "14px", py: 0.75, fontSize: 12, fontWeight: 700, color: "#4f46e5", boxShadow: 1,
            border: 0, transition: "all 0.15s", "&:hover": { bgcolor: "#eef2ff" }, "&:active": { transform: "scale(0.95)" },
          }}
        >
          <RefreshCw size={12} className="animate-spin" />
          <Box component="span">Update Now</Box>
        </Box>
      </Box>
    </Box>
  );
}
