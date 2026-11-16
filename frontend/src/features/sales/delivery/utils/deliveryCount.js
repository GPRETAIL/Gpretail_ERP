/**
 * Sales > Delivery counting, kept pure so it is easy to test.
 * counts = { lines: { [lineKey]: { qty, barcodes } }, extras: [{ id, barcode, name, reason }], nextId }
 */
const EPSILON = 0.0005;

export const emptyCounts = () => ({ lines: {}, extras: [], nextId: 1 });

const round3 = (value) => Math.round(Number(value || 0) * 1000) / 1000;
const label = (line) => `${line.name}${line.size ? ` (${line.size})` : ""}`;

const withExtra = (counts, barcode, name, reason) => ({
  ...counts,
  extras: [...counts.extras, { id: counts.nextId, barcode, name, reason }],
  nextId: counts.nextId + 1,
});

/** The bill line a scanned item belongs to: same product and size; a product-level barcode fills its sizes in turn. */
const lineFor = (lines, counts, found) => {
  const exact = lines.find((line) => line.product_id === found.product_id && (line.variant_id || null) === (found.variant_id || null));
  if (exact || found.variant_id) return exact || null;
  const sameProduct = lines.filter((line) => line.product_id === found.product_id);
  return sameProduct.find((line) => (counts.lines[line.key]?.qty || 0) < line.expected_qty - EPSILON) || sameProduct[0] || null;
};

/**
 * One scan. found = the server's answer for the barcode ({ product_id, variant_id, unique, name }) or null when the
 * barcode is unknown. Returns { counts, ok, duplicate, message }.
 */
export const countScan = (lines, counts, barcode, found) => {
  if (!found) {
    return { counts: withExtra(counts, barcode, null, "Unknown barcode"), ok: false, duplicate: false, message: `Unknown barcode ${barcode}: take it out.` };
  }
  // A one-per-piece sticker counts once: the same sticker scanned twice is the same piece.
  const seen = found.unique && (Object.values(counts.lines).some((entry) => entry.barcodes.includes(barcode)) || counts.extras.some((extra) => extra.barcode === barcode));
  if (seen) {
    return { counts, ok: false, duplicate: true, message: `${found.name || barcode} was already scanned.` };
  }
  const line = lineFor(lines, counts, found);
  if (!line) {
    return { counts: withExtra(counts, barcode, found.name, "Not on this bill"), ok: false, duplicate: false, message: `${found.name || barcode} is not on this bill: take it out.` };
  }
  const entry = counts.lines[line.key] || { qty: 0, barcodes: [] };
  if (entry.qty + 1 > line.expected_qty + EPSILON) {
    return { counts: withExtra(counts, barcode, label(line), "More than billed"), ok: false, duplicate: false,
      message: `${label(line)}: the bill has only ${line.expected_qty}. Take the extra out.` };
  }
  const qty = round3(entry.qty + 1);
  return {
    counts: { ...counts, lines: { ...counts.lines, [line.key]: { qty, barcodes: [...entry.barcodes, barcode] } } },
    ok: true, duplicate: false, message: `${label(line)}: ${qty} of ${line.expected_qty}${qty >= line.expected_qty - EPSILON ? " ✓" : ""}`,
  };
};

/** A count typed or set with +/- (unlabelled items, metres). Lowering it drops the last scanned stickers. */
export const setLineCount = (counts, key, value) => {
  const qty = Math.max(0, round3(value));
  const barcodes = (counts.lines[key]?.barcodes || []).slice(0, Math.floor(qty + EPSILON));
  return { ...counts, lines: { ...counts.lines, [key]: { qty, barcodes } } };
};

export const deliverySummary = (lines, counts) => lines.reduce((sum, line) => {
  const counted = counts.lines[line.key]?.qty || 0;
  return {
    expected: round3(sum.expected + line.expected_qty),
    counted: round3(sum.counted + counted),
    missing: round3(sum.missing + Math.max(0, line.expected_qty - counted)),
    extra: round3(sum.extra + Math.max(0, counted - line.expected_qty)),
  };
}, { expected: 0, counted: 0, missing: 0, extra: counts.extras.length });
