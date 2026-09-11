import React from "react";

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
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-slate-600 dark:text-gray-300">
            This page couldn't load a required update. Please refresh the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#3a6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345f8f]"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ChunkErrorBoundary;
