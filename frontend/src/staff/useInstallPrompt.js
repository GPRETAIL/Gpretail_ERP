import { useCallback, useEffect, useRef, useState } from "react";

const DISMISS_KEY = "vx-staff-install-dismissed-at";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

const isStandaloneNow = () => {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
};

const dismissedRecently = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

/**
 * Whether to offer "Install on your phone": not when the app is already installed, not for a week after it was
 * dismissed. Android and desktop Chrome give an install event to use; iPhone has none, so it gets the steps instead.
 */
export default function useInstallPrompt() {
  const [standalone, setStandalone] = useState(isStandaloneNow);
  const [dismissed, setDismissed] = useState(dismissedRecently);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const deferred = useRef(null);
  const isIos = /iphone|ipad|ipod/i.test(typeof navigator === "undefined" ? "" : navigator.userAgent) && !window.MSStream;

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      deferred.current = event;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      setCanPrompt(false);
      setInstalled(true);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const event = deferred.current;
    if (!event) return false;
    deferred.current = null;
    setCanPrompt(false);
    event.prompt();
    try {
      const choice = await event.userChoice;
      return choice?.outcome === "accepted";
    } catch {
      return false;
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Hidden until the page is reloaded.
    }
  }, []);

  return { visible: !standalone && !dismissed && (canPrompt || isIos), canPrompt, isIos, installed, install, dismiss };
}
