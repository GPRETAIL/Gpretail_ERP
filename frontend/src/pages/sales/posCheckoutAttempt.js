// A retry of the same basket uses its original key and timestamp. A new
// basket/payment gets a new key; a confirmed save clears the caller's ref.
function createCheckoutKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID requires HTTPS; on-premise LAN installations can use HTTP.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

export function prepareCheckoutAttempt(previous, payload, scope) {
  const stable = { ...payload };
  delete stable.saleAt;
  const fingerprint = JSON.stringify([scope, stable]);
  if (previous?.fingerprint === fingerprint) return previous;
  return { fingerprint, payload: { ...payload, checkoutKey: createCheckoutKey() }, target: null };
}
