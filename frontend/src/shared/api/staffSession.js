// The staff app (/hr): its own token and store, kept apart from the ERP session in the same browser.
export const STAFF_TOKEN_KEY = "vx_staff_token";
export const STAFF_STORE_KEY = "vx_staff_store";
export const STAFF_SESSION_KEY = "vx_staff_session";

/** True on /hr and /hr/... (not /hrms, the ERP's HR pages). */
export const isStaffAppPath = (pathname = typeof window === "undefined" ? "" : window.location.pathname) => /^\/hr(?:\/|$)/i.test(pathname);

export function readStaffSession() {
  try {
    const token = localStorage.getItem(STAFF_TOKEN_KEY);
    const session = JSON.parse(localStorage.getItem(STAFF_SESSION_KEY) || "null");
    return token && session ? session : null;
  } catch {
    return null;
  }
}

export function saveStaffSession(data) {
  localStorage.setItem(STAFF_TOKEN_KEY, data.token);
  localStorage.setItem(STAFF_STORE_KEY, String(data.store.id));
  const session = { store: data.store, employee: data.employee, user: data.user, must_change_pin: Boolean(data.must_change_pin) };
  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function updateStaffSession(changes) {
  const session = { ...(readStaffSession() || {}), ...changes };
  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearStaffSession() {
  localStorage.removeItem(STAFF_TOKEN_KEY);
  localStorage.removeItem(STAFF_SESSION_KEY);
}
