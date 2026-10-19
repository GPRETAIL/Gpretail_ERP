import api from "../api/axios";

const deviceKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id
      ? `vx-push-device:${user.platform_company_code || "local"}:${user.id}`
      : null;
  } catch {
    return null;
  }
};
const changed = () =>
  window.dispatchEvent(new Event("vx-notifications-updated"));
export async function pushDeviceState() {
  if (
    !window.isSecureContext ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    return { supported: false, registered: false };
  const registration = await navigator.serviceWorker.getRegistration("/");
  return {
    supported: true,
    registered:
      Boolean(await registration?.pushManager?.getSubscription()) &&
      Boolean(deviceKey() && localStorage.getItem(deviceKey())),
  };
}
export async function enableWebPush() {
  if (
    !window.isSecureContext ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    throw new Error(
      "Push requires a supported browser and trusted HTTPS. On iPhone/iPad, open the installed Home Screen app.",
    );
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error(
      "Notification permission was not granted. Your ERP inbox remains available.",
    );
  const config = (await api.get("/notifications/push/config")).data.data;
  if (!config.enabled || !config.public_key)
    throw new Error("Push signing is not configured by your administrator.");
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;
  const base64 = config.public_key.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(
    atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)),
    (character) => character.charCodeAt(0),
  );
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    }));
  const key = deviceKey();
  if (!key) throw new Error("Sign in before registering notifications.");
  const device = localStorage.getItem(key) || crypto.randomUUID();
  try {
    await api.post("/notifications/push/subscription", {
      device_id: device,
      endpoint: subscription.endpoint,
    });
  } catch (error) {
    await subscription.unsubscribe();
    throw error;
  }
  localStorage.setItem(key, device);
  changed();
}
export async function disableWebPush() {
  if (!("serviceWorker" in navigator)) return;
  const key = deviceKey();
  const device = key ? localStorage.getItem(key) : null;
  try {
    if (device)
      await api.delete("/notifications/push/subscription", {
        data: { device_id: device },
        timeout: 5000,
      });
  } finally {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager?.getSubscription();
    if (subscription) await subscription.unsubscribe();
    if (key) localStorage.removeItem(key);
    changed();
  }
}
