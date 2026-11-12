// Escape text before it goes into an HTML string (print windows, receipts), so a name such as
// `<img onerror=…>` prints as text instead of running.
export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
