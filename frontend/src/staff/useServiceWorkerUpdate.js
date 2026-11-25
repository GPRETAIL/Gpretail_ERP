import { useCallback, useEffect, useState } from "react";

/** A new version of the app is downloaded and waiting. `apply` switches to it and reloads. */
export default function useServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    let registration = null;
    const watch = (worker) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
      });
    };
    const onUpdateFound = () => watch(registration?.installing);
    navigator.serviceWorker.getRegistration().then((found) => {
      registration = found || null;
      if (!registration) return;
      if (registration.waiting) setWaiting(registration.waiting);
      registration.addEventListener("updatefound", onUpdateFound);
    });
    return () => registration?.removeEventListener("updatefound", onUpdateFound);
  }, []);

  const apply = useCallback(() => {
    if (!waiting) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    waiting.postMessage({ type: "SKIP_WAITING" });
  }, [waiting]);

  return { updateReady: Boolean(waiting), apply };
}
