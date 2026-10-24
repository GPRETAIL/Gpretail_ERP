import { useCallback, useEffect, useState } from "react";

export default function useErpFullscreen(onError) {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [escapeLocked, setEscapeLocked] = useState(false);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement) {
        navigator.keyboard?.unlock?.();
        setEscapeLocked(false);
      }
    };
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      navigator.keyboard?.unlock?.();
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (changing) return;
    setChanging(true);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
        // The browser owns the long-Escape escape hatch. Lock only Escape so
        // normal POS shortcuts and operating-system shortcuts remain available.
        if (navigator.keyboard?.lock) {
          try {
            await navigator.keyboard.lock(["Escape"]);
            if (document.fullscreenElement) setEscapeLocked(true);
            else navigator.keyboard.unlock?.();
          } catch {
            // Denied/unsupported keyboard lock leaves ordinary fullscreen usable.
          }
        }
      }
    } catch {
      onError?.();
    } finally {
      setChanging(false);
    }
  }, [changing, onError]);

  return { isFullscreen, escapeLocked, changing, toggleFullscreen };
}
