// One check for server addresses saved in Configure Local Server and read back by runtime routing.
// The backend validates the same rules on save (AuthController::localServerConfigUpdate).
export const FRONTEND_PREVIEW_PORTS = ["5173", "5174", "4173", "4174"];

const isLoopback = (hostname) => hostname === "localhost" || hostname.startsWith("127.") || ["::1", "[::1]"].includes(hostname);

/**
 * Why a server address cannot be used, or "" when it can. `local` adds the rule that a store-wide
 * failover server must be reachable from other devices (not a loopback address).
 */
export function serverUrlProblem(value, { local = false } = {}) {
  const text = String(value || "").trim();
  if (!text) return "";
  let url;
  try {
    url = new URL(text);
  } catch {
    return "Enter a valid server address, for example http://192.168.1.25:8000.";
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    return "Use an HTTP or HTTPS server address without credentials, query or fragment.";
  }
  if (FRONTEND_PREVIEW_PORTS.includes(url.port)) {
    return "This is a frontend preview port. Enter the ERP backend LAN address, e.g. http://192.168.1.25:8000, not the browser app URL.";
  }
  if (local && isLoopback(url.hostname)) {
    return "Use the backend's LAN address. Loopback addresses only reach this PC and cannot provide store-wide failover.";
  }
  if (!["/", "/api", "/api/"].includes(url.pathname)) return "Use the server address only, without /login, /dashboard or another page path.";
  return "";
}
