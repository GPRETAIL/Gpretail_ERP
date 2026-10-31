import { useCallback, useEffect, useState } from "react";

export default function useErpFullscreen(onError) {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [escapeLocked, setEscapeLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement) {
        navigator.keyboard?.unlock?.();
        setEscapeLocked(false);
        setLockMessage("");
      }
    };
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      navigator.keyboard?.unlock?.();
    };
  }, []);

  const enableEscapeLock = useCallback(async () => {
    if (!document.fullscreenElement) return false;
    if (!navigator.keyboard?.lock) {
      setLockMessage("This browser does not expose Escape keyboard permission. Its own fullscreen exit rules apply.");
      return false;
    }
    try {
      await navigator.keyboard.lock(["Escape"]);
      if (document.fullscreenElement) {
        setEscapeLocked(true);
        setLockMessage("");
        return true;
      }
      navigator.keyboard.unlock?.();
      return false;
    } catch {
      setEscapeLocked(false);
      setLockMessage("Allow keyboard lock in this site's browser permissions, then choose Enable hold Esc exit. Until then, a short Esc can exit fullscreen.");
      return false;
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (changing) return;
    setChanging(true);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen({ keyboardLock: "browser", navigationUI: "hide" });
        // The browser owns the long-Escape escape hatch. Lock only Escape so
        // normal POS shortcuts and operating-system shortcuts remain available.
        await enableEscapeLock();
      }
    } catch {
      onError?.();
    } finally {
      setChanging(false);
    }
  }, [changing, onError, enableEscapeLock]);

  return { isFullscreen, escapeLocked, lockMessage, enableEscapeLock, changing, toggleFullscreen };
}
