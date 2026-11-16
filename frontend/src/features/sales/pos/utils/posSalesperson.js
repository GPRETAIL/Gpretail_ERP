/**
 * POS Salesperson field (Sales Customisation > "Scan salesperson for every item"): after each product scan the
 * cashier scans the salesperson's employee sticker, and the line is credited to that employee for incentives.
 * people: the store's active salespeople from GET /pos-sales/salespeople ({ id, code, name, sticker }).
 */
const CACHE_PREFIX = "pos.salespeople.";

/** The salesperson a scan or typed value means: their sticker (EMP-<id>), employee code or phone; null if none. */
export const findSalesperson = (people, value) => {
  const text = String(value || "").trim();
  if (!text) return null;
  const sticker = /^EMP-(\d+)$/i.exec(text);
  if (sticker) return people.find((person) => Number(person.id) === Number(sticker[1])) || null;
  const lower = text.toLowerCase();
  return people.find((person) => String(person.code || "").toLowerCase() === lower)
    || people.find((person) => person.phone && String(person.phone) === text)
    || null;
};

/**
 * Credits one cart line to a salesperson. When another line already has the same item, price and salesperson,
 * the two are merged (one row per item and salesperson). Returns the new cart.
 */
export const assignSalesperson = (cart, lineId, person) => {
  const line = cart.find((row) => row.lineId === lineId);
  if (!line) return cart;
  const credited = { ...line, salesManId: person.id, salesManName: person.name, salesManCode: person.code || "" };
  const twin = cart.find((row) => row.lineId !== lineId && row.stockId === line.stockId && Number(row.salesManId) === Number(person.id)
    && Number(row.price) === Number(line.price) && !Number(row.discount) && !Number(line.discount));
  if (!twin) return cart.map((row) => (row.lineId === lineId ? credited : row));
  return cart.filter((row) => row.lineId !== lineId)
    .map((row) => (row.lineId === twin.lineId ? { ...row, qty: Number(row.qty || 0) + Number(line.qty || 0) } : row));
};

/** Lines still waiting for their salesperson (Pay is blocked while there are any). */
export const linesWithoutSalesperson = (cart) => cart.filter((line) => !line.salesManId && !line.isReturnDisplayLine);

/** Kept per store so the field still works when the till is offline. */
export const cacheSalespeople = (storeId, people) => {
  try { localStorage.setItem(`${CACHE_PREFIX}${storeId || "default"}`, JSON.stringify(people)); } catch { /* storage unavailable */ }
};

export const cachedSalespeople = (storeId) => {
  try { return JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${storeId || "default"}`) || "[]"); } catch { return []; }
};
