import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Smartphone,
  X,
  Share2,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Box, Button, IconButton, Typography } from "@mui/material";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);
  const [manualTriggerRequested, setManualTriggerRequested] = useState(false);

  // Mirrors deferredPrompt so the mount-effect's event listener (a closure fixed
  // at mount time) can still act on whatever the *latest* value is -- Chrome can
  // fire beforeinstallprompt well after mount, long after the effect below ran.
  const deferredPromptRef = useRef(null);
  useEffect(() => {
    deferredPromptRef.current = deferredPrompt;
  }, [deferredPrompt]);

  useEffect(() => {
    // 1. Check if already installed / running in standalone window
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();
    window.matchMedia("(display-mode: standalone)").addEventListener("change", checkStandalone);

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIos(isIosDevice);

    // 3. Check dismissal memory (re-show after 2 days if dismissed)
    const lastDismissedTime = localStorage.getItem("gpretail_pwa_dismissed_at");
    if (lastDismissedTime) {
      const daysSinceDismissed =
        (Date.now() - parseInt(lastDismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 2) {
        setDismissed(true);
      }
    }

    // 4. Capture native beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Track appinstalled event
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setInstalledSuccessfully(true);
      setTimeout(() => {
        setIsStandalone(true);
      }, 3000);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // 6. Support manual trigger from settings or topbar. Previously this only
    // ever revealed the guide on iOS, and even then only after going through
    // our own marketing card first -- on desktop, with no beforeinstallprompt
    // captured yet, nothing happened at all. Now: always show the step-by-step
    // guide right away, and if the browser's native prompt is already
    // available, fire it in the background at the same time -- if the user
    // accepts it, the "installed" toast takes over; if they dismiss it or it
    // never fires, the guide is still there walking them through it manually.
    const handleCustomTrigger = () => {
      setDismissed(false);
      setManualTriggerRequested(true);
      setShowIosGuide(true);

      if (deferredPromptRef.current) {
        const promptEvent = deferredPromptRef.current;
        deferredPromptRef.current = null;
        setDeferredPrompt(null);
        setIsInstallable(false);
        promptEvent
          .prompt()
          ?.catch?.((err) => console.warn("PWA install error:", err));
        promptEvent.userChoice
          .then(({ outcome }) => {
            if (outcome === "accepted") setInstalledSuccessfully(true);
          })
          .catch((err) => console.warn("PWA install error:", err));
      }
    };
    window.addEventListener("pwa-show-install-prompt", handleCustomTrigger);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("pwa-show-install-prompt", handleCustomTrigger);
    };
  }, []);

  // Same "both at once" pattern as the navbar's manual trigger: show the
  // guide immediately, and if the browser's native install prompt is ready,
  // fire it in the background at the same time so accepting it drops the
  // app into the Start Menu / taskbar without the user having to also hunt
  // through the guide -- the guide stays as a fallback if they decline it.
  const handleInstallClick = () => {
    setShowIosGuide(true);

    if (isIos || !deferredPrompt) return;

    const promptEvent = deferredPrompt;
    deferredPromptRef.current = null;
    setDeferredPrompt(null);
    setIsInstallable(false);
    promptEvent.prompt();
    promptEvent.userChoice
      .then(({ outcome }) => {
        if (outcome === "accepted") setInstalledSuccessfully(true);
      })
      .catch((err) => console.warn("PWA install error:", err));
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIosGuide(false);
    localStorage.setItem("gpretail_pwa_dismissed_at", Date.now().toString());
  };

  // Don't render if already in standalone app mode
  if (isStandalone) {
    return null;
  }

  // Show installed success toast
  if (installedSuccessfully) {
    return (
      <Box sx={{ position: "fixed", bottom: 20, left: 16, right: 16, zIndex: 50, mx: "auto", maxWidth: 448 }}>
        <Box
          sx={{
            display: "flex", alignItems: "center", gap: 1.5, borderRadius: "16px", p: 2,
            bgcolor: "#059669", color: "#fff", boxShadow: "0 25px 50px -12px rgba(6,78,59,0.4)",
          }}
        >
          <CheckCircle2 size={24} style={{ color: "#fff", flexShrink: 0, animation: "app-bounce 1s infinite" }} />
          <Box sx={{ flex: 1 }}>
            <Typography component="h4" sx={{ fontWeight: 700, fontSize: 14 }}>App Installed Successfully!</Typography>
            <Typography sx={{ fontSize: 12, color: "#d1fae5" }}>
              Launch Vynerix ERP anytime from your home screen.
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // Check if mobile device
  const isMobile =
    isIos ||
    /android|iphone|ipad|ipod|mobile/i.test(
      (typeof navigator !== "undefined" ? navigator.userAgent : "").toLowerCase()
    );

  // Hide if dismissed and not showing guide
  if (dismissed && !showIosGuide) {
    return null;
  }

  // Show banner on mobile browsers, when beforeinstallprompt is ready, on iOS, or
  // whenever the user explicitly asked via "Install Mobile App" -- desktop Chrome/Edge
  // with no native prompt captured yet still needs to show *something* on request.
  const shouldShow = isMobile || isInstallable || isIos || manualTriggerRequested;
  if (!shouldShow && !showIosGuide) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed", bottom: { xs: 72, sm: 24 }, left: { xs: 12, sm: "auto" }, right: { xs: 12, sm: 24 },
        zIndex: 40, mx: "auto", maxWidth: 440,
      }}
    >
      <Box
        sx={{
          position: "relative", overflow: "hidden", borderRadius: "16px", border: "1px solid",
          borderColor: "rgba(99,102,241,0.3)", bgcolor: "rgba(15,23,42,0.95)", color: "#fff", p: 2,
          boxShadow: "0 25px 50px -12px rgba(30,27,75,0.6)", backdropFilter: "blur(24px)",
        }}
      >
        {/* Decorative background glow */}
        <Box sx={{ pointerEvents: "none", position: "absolute", top: -48, right: -48, height: 128, width: 128, borderRadius: "50%", bgcolor: "rgba(99,102,241,0.2)", filter: "blur(40px)" }} />
        <Box sx={{ pointerEvents: "none", position: "absolute", bottom: -48, left: -48, height: 128, width: 128, borderRadius: "50%", bgcolor: "rgba(168,85,247,0.2)", filter: "blur(40px)" }} />

        {/* Close Button */}
        <IconButton
          onClick={handleDismiss}
          aria-label="Dismiss"
          size="small"
          sx={{
            position: "absolute", top: 12, right: 12, color: "#94a3b8",
            "&:hover": { bgcolor: "#1e293b", color: "#fff" },
          }}
        >
          <X size={16} />
        </IconButton>

        {!showIosGuide ? (
          /* Standard Install Card */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.75, pr: 3 }}>
              {/* App Icon */}
              <Box
                sx={{
                  position: "relative", display: "flex", height: 48, width: 48, flexShrink: 0,
                  alignItems: "center", justifyContent: "center", borderRadius: "12px",
                  backgroundImage: "linear-gradient(to top right, #4f46e5, #6366f1, #a855f7)",
                  boxShadow: "0 4px 6px -1px rgba(99,102,241,0.3)",
                }}
              >
                <Smartphone size={24} style={{ color: "#fff" }} />
                <Box component="span" sx={{ position: "absolute", top: -4, right: -4, display: "flex", height: 14, width: 14 }}>
                  <Box component="span" sx={{ position: "absolute", display: "inline-flex", height: "100%", width: "100%", borderRadius: "50%", bgcolor: "#34d399", opacity: 0.75, animation: "app-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
                  <Box component="span" sx={{ position: "relative", display: "inline-flex", height: 14, width: 14, borderRadius: "50%", bgcolor: "#10b981" }} />
                </Box>
              </Box>

              {/* Text Info */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Typography component="span" sx={{ borderRadius: "4px", bgcolor: "rgba(99,102,241,0.2)", px: 0.75, py: 0.25, fontSize: 10, fontWeight: 600, letterSpacing: "0.025em", color: "#a5b4fc", textTransform: "uppercase" }}>
                    Mobile App
                  </Typography>
                  <Typography component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 11, fontWeight: 500, color: "#34d399" }}>
                    <Sparkles size={12} /> Fast & Offline
                  </Typography>
                </Box>
                <Typography component="h3" sx={{ mt: 0.25, fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.025em" }}>
                  Install Vynerix ERP App
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: 12, color: "#cbd5e1", lineHeight: 1.375 }}>
                  Add to your home screen for 1-tap quick billing, mobile POS, and instant camera scanning.
                </Typography>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 0.5 }}>
              <Button
                onClick={handleInstallClick}
                startIcon={<Download size={16} />}
                sx={{
                  flex: 1, borderRadius: "12px", px: 2, py: 1.25, fontSize: 12, fontWeight: 700,
                  color: "#fff", textTransform: "none",
                  backgroundImage: "linear-gradient(to right, #6366f1, #9333ea)",
                  boxShadow: "0 10px 15px -3px rgba(99,102,241,0.3)",
                  "&:hover": { backgroundImage: "linear-gradient(to right, #4f46e5, #7e22ce)" },
                  "&:active": { transform: "scale(0.98)" },
                }}
              >
                Install Vynerix App
              </Button>

              <Button
                onClick={handleDismiss}
                sx={{
                  borderRadius: "12px", border: "1px solid", borderColor: "#334155", bgcolor: "rgba(30,41,59,0.8)",
                  px: 1.75, py: 1.25, fontSize: 12, fontWeight: 600, color: "#cbd5e1", textTransform: "none",
                  "&:hover": { bgcolor: "#334155", color: "#fff" },
                }}
              >
                Later
              </Button>
            </Box>
          </Box>
        ) : (
          /* Step-by-Step Home Screen Guide */
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pr: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex", height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: "8px", bgcolor: "rgba(99,102,241,0.2)", color: "#818cf8" }}>
                <Smartphone size={16} />
              </Box>
              <Box>
                <Typography component="h4" sx={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  {isIos ? "Install on iPhone / iPad" : isMobile ? "Add to Home Screen" : "Install on This Computer"}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>
                  {isIos ? "Follow 2 simple steps in Safari" : "Follow these quick steps in your browser"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: "12px", bgcolor: "rgba(30,41,59,0.6)", p: 1.5, fontSize: 12, color: "#e2e8f0" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box component="span" sx={{ display: "flex", height: 20, width: 20, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "#6366f1", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  1
                </Box>
                <Box component="span">
                  {isIos ? (
                    <>Tap the <Box component="strong" sx={{ color: "#a5b4fc", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 0.5 }}><Share2 size={14} style={{ display: "inline" }} /> Share</Box> button in Safari's bottom bar.</>
                  ) : isMobile ? (
                    <>Tap the browser menu <Box component="strong" sx={{ color: "#a5b4fc", fontWeight: 600 }}>⋮ (three dots)</Box> in the top right corner.</>
                  ) : (
                    <>Look for the <Box component="strong" sx={{ color: "#a5b4fc", fontWeight: 600 }}>install icon</Box> in the address bar, or open the browser's <Box component="strong" sx={{ color: "#a5b4fc", fontWeight: 600 }}>⋮ menu</Box>.</>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box component="span" sx={{ display: "flex", height: 20, width: 20, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "#6366f1", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  2
                </Box>
                <Box component="span">
                  {isMobile ? (
                    <>Scroll down & select <Box component="strong" sx={{ color: "#a5b4fc", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 0.5 }}><PlusSquare size={14} style={{ display: "inline" }} /> Add to Home Screen / Install App</Box>.</>
                  ) : (
                    <>Click <Box component="strong" sx={{ color: "#a5b4fc", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 0.5 }}><PlusSquare size={14} style={{ display: "inline" }} /> Install Vynerix ERP...</Box></>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box component="span" sx={{ display: "flex", height: 20, width: 20, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "#6366f1", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                  3
                </Box>
                <Box component="span">
                  Confirm <Box component="strong" sx={{ color: "#a5b4fc", fontWeight: 600 }}>Add / Install</Box> to launch Vynerix ERP anytime!
                </Box>
              </Box>
            </Box>

            <Button
              onClick={handleDismiss}
              endIcon={<ArrowRight size={14} />}
              sx={{
                mt: 0.5, width: "100%", borderRadius: "12px", bgcolor: "#1e293b", py: 1, fontSize: 12,
                fontWeight: 600, color: "#cbd5e1", textTransform: "none",
                "&:hover": { bgcolor: "#334155", color: "#fff" },
              }}
            >
              Got it, Thanks
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
