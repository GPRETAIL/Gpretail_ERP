import { useEffect, useRef } from "react";
import { listen } from "../utils/realtimeClient";

/**
 * Calls onUpdate({ silent: true }) when the server pushes one of `events` on any of `channels`
 * (a "something changed, reload" nudge; see RealtimeService on the backend). A burst of pushes
 * reloads once. A slow poll stays on as a safety net for a missed push, and a faster poll is
 * used when there is no channel to listen to (or the push service is unreachable). Hidden tabs
 * do no work and catch up once when shown again.
 */
export default function useRealtimeRefresh({
  channels = [], events = [], enabled = true, onUpdate,
  fallbackPollMs = 180000, noChannelPollMs = 30000,
} = {}) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);
  const channelKey = channels.filter(Boolean).join("|");
  const eventKey = events.join("|");

  useEffect(() => {
    if (!enabled || typeof onUpdateRef.current !== "function") return undefined;
    let timer = null;
    let eventTimer = null;

    const refresh = () => {
      if (document.visibilityState === "visible") onUpdateRef.current?.({ silent: true });
    };
    const handleEvent = () => {
      if (document.visibilityState !== "visible" || eventTimer !== null) return;
      eventTimer = setTimeout(() => {
        eventTimer = null;
        refresh();
      }, 250);
    };

    const stops = [];
    for (const channel of channelKey ? channelKey.split("|") : []) {
      for (const event of eventKey ? eventKey.split("|") : []) {
        const stop = listen(channel, event, handleEvent);
        if (stop) stops.push(stop);
      }
    }
    const pollMs = stops.length ? fallbackPollMs : noChannelPollMs;
    const startPoll = () => {
      if (!timer && pollMs > 0) timer = setInterval(refresh, pollMs);
    };
    const stopPoll = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh(); // catch up immediately when the tab regains focus
        startPoll();
      } else {
        stopPoll();
      }
    };

    if (document.visibilityState === "visible") startPoll();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPoll();
      if (eventTimer !== null) clearTimeout(eventTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      stops.forEach((stop) => stop());
    };
  }, [enabled, channelKey, eventKey, fallbackPollMs, noChannelPollMs]);
}
