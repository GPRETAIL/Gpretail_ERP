import api from "@/shared/api/apiClient";

// Sends front-end crashes to the server (POST /client-errors, written to the client_errors log) so they
// are seen before a user reports them. Never throws, never blocks the UI, and skips noise.
const SENT = new Map(); // message|where -> last sent time
const REPEAT_WINDOW_MS = 60 * 1000;
const MAX_STACK = 4000;

/** A short reference the user can quote to support, e.g. "E-7F3K2". */
export const errorReference = () => `E-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

/** Errors that are not crashes: cancelled requests, and API errors the screen already shows as a message. */
export const isExpectedError = (error) => {
  if (!error) return true;
  if (error.code === "ERR_CANCELED" || error.name === "CanceledError" || error.name === "AbortError") return true;
  const status = error.response?.status;
  return Boolean(status && status < 500);
};

const buildDate = () => {
  try {
    // eslint-disable-next-line no-undef
    return typeof __APP_BUILD__ === "string" ? __APP_BUILD__ : null;
  } catch {
    return null;
  }
};

export function reportClientError({ error, componentStack = "", where = "page", reference = errorReference() }) {
  try {
    if (isExpectedError(error)) return reference;
    const message = String(error?.message || error || "Unknown error").slice(0, 500);
    const key = `${message}|${where}`;
    const now = Date.now();
    if (now - (SENT.get(key) || 0) < REPEAT_WINDOW_MS) return reference;
    SENT.set(key, now);
    if (!localStorage.getItem("token") && !localStorage.getItem("vx_staff_token")) return reference; // the endpoint needs a signed-in user
    void api.post("/client-errors", {
      reference,
      message,
      name: String(error?.name || "Error").slice(0, 100),
      stack: String(error?.stack || "").slice(0, MAX_STACK),
      component_stack: String(componentStack || "").slice(0, MAX_STACK),
      where: String(where).slice(0, 120),
      path: window.location.pathname.slice(0, 300),
      build: buildDate(),
      user_agent: navigator.userAgent.slice(0, 300),
    }).catch(() => {});
  } catch {
    // Reporting must never break the page.
  }
  return reference;
}

let listening = false;
/** Errors no boundary sees (event handlers, timers, unhandled promise rejections). Registered once from main.jsx. */
export function listenForUncaughtErrors() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("error", (event) => {
    if (event?.error) reportClientError({ error: event.error, where: "window" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportClientError({ error: event?.reason, where: "promise" });
  });
}
