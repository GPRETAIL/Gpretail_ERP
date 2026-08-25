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
    // captured yet, nothing happened at all. Now: if the browser's native
    // prompt is already available, fire it immediately (no extra card to find
    // and click through); otherwise show the step-by-step guide directly.
    const handleCustomTrigger = async () => {
      setDismissed(false);

      if (deferredPromptRef.current) {
        try {
          const promptEvent = deferredPromptRef.current;
          promptEvent.prompt();
          const { outcome } = await promptEvent.userChoice;
          if (outcome === "accepted") setInstalledSuccessfully(true);
        } catch (err) {
          console.warn("PWA install error:", err);
        } finally {
          deferredPromptRef.current = null;
          setDeferredPrompt(null);
          setIsInstallable(false);
        }
        return;
      }

      setManualTriggerRequested(true);
      setShowIosGuide(true);
    };
    window.addEventListener("pwa-show-install-prompt", handleCustomTrigger);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("pwa-show-install-prompt", handleCustomTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // If browser doesn't have prompt ready yet, navigate or explain
      setShowIosGuide(true);
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalledSuccessfully(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (err) {
      console.warn("PWA install error:", err);
    }
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
      <div className="fixed bottom-5 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-600 p-4 text-white shadow-2xl shadow-emerald-900/40">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-white animate-bounce" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">App Installed Successfully!</h4>
            <p className="text-xs text-emerald-100">
              Launch GP Retail anytime from your home screen.
            </p>
          </div>
        </div>
      </div>
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
    <div className="fixed bottom-[72px] left-3 right-3 z-40 mx-auto max-w-[440px] animate-in fade-in slide-in-from-bottom-6 duration-300 sm:bottom-6 sm:left-auto sm:right-6">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-900/95 p-4 text-white shadow-2xl shadow-indigo-950/60 backdrop-blur-xl transition-all">
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-purple-500/20 blur-2xl" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {!showIosGuide ? (
          /* Standard Install Card */
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3.5 pr-6">
              {/* App Icon */}
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-md shadow-indigo-500/30">
                <Smartphone className="h-6 w-6 text-white" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
                </span>
              </div>

              {/* Text Info */}
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-300 uppercase">
                    Mobile App
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <Sparkles className="h-3 w-3" /> Fast & Offline
                  </span>
                </div>
                <h3 className="mt-0.5 text-sm font-bold text-white tracking-tight">
                  Install Vynerix ERP App
                </h3>
                <p className="mt-0.5 text-xs text-slate-300 leading-snug">
                  Add to your home screen for 1-tap quick billing, mobile POS, and instant camera scanning.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Install Vynerix App</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        ) : (
          /* Step-by-Step Home Screen Guide */
          <div className="flex flex-col gap-3 pr-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {isIos ? "Install on iPhone / iPad" : isMobile ? "Add to Home Screen" : "Install on This Computer"}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isIos ? "Follow 2 simple steps in Safari" : "Follow these quick steps in your browser"}
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-slate-800/60 p-3 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                  1
                </span>
                <span>
                  {isIos ? (
                    <>Tap the <strong className="text-indigo-300 font-semibold inline-flex items-center gap-1"><Share2 className="h-3.5 w-3.5 inline" /> Share</strong> button in Safari's bottom bar.</>
                  ) : isMobile ? (
                    <>Tap the browser menu <strong className="text-indigo-300 font-semibold">⋮ (three dots)</strong> in the top right corner.</>
                  ) : (
                    <>Look for the <strong className="text-indigo-300 font-semibold">install icon</strong> in the address bar, or open the browser's <strong className="text-indigo-300 font-semibold">⋮ menu</strong>.</>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                  2
                </span>
                <span>
                  {isMobile ? (
                    <>Scroll down & select <strong className="text-indigo-300 font-semibold inline-flex items-center gap-1"><PlusSquare className="h-3.5 w-3.5 inline" /> Add to Home Screen / Install App</strong>.</>
                  ) : (
                    <>Click <strong className="text-indigo-300 font-semibold inline-flex items-center gap-1"><PlusSquare className="h-3.5 w-3.5 inline" /> Install Vynerix ERP...</strong></>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                  3
                </span>
                <span>
                  Confirm <strong className="text-indigo-300 font-semibold">Add / Install</strong> to launch Vynerix ERP anytime!
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span>Got it, Thanks</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
