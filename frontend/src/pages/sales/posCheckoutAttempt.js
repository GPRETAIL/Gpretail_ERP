// A retry of the same basket uses its original key and timestamp. A new
// basket/payment gets a new key; a confirmed save clears the caller's ref.
// UUID version 7 (RFC 9562): a 48-bit millisecond timestamp, then random bits. Keys sort by time,
// so the database indexes that store them stay compact, and any device can mint one offline.
// Built from getRandomValues, which also works on plain-HTTP LAN installs (randomUUID does not).
export function createCheckoutKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let time = Date.now();
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes[6] = (bytes[6] & 15) | 112;
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
