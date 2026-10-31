const PRINT_DEVICE_ID_KEY = "erp_print_device_id_v1";

const makeFallbackId = () =>
  `pd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const getPrintDeviceId = () => {
  if (typeof window === "undefined") return "server";

  try {
    const existing = String(window.localStorage.getItem(PRINT_DEVICE_ID_KEY) || "").trim();
    if (existing) return existing;

    const next =
      typeof window.crypto?.randomUUID === "function"
        ? `pd-${window.crypto.randomUUID()}`
        : makeFallbackId();

    window.localStorage.setItem(PRINT_DEVICE_ID_KEY, next);
    return next;
  } catch {
    return makeFallbackId();
  }
};
