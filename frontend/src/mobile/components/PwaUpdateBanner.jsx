import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
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
    <div className="fixed top-16 left-3 right-3 z-50 mx-auto max-w-[440px] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-3.5 text-white shadow-xl shadow-indigo-950/40 border border-white/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white m-0">Update Available</h4>
            <p className="text-[11px] text-indigo-100 m-0">New features & fixes ready</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpdate}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-indigo-600 shadow hover:bg-indigo-50 active:scale-95 transition-all"
        >
          <RefreshCw size={12} className="animate-spin" />
          <span>Update Now</span>
        </button>
      </div>
    </div>
  );
}
