/**
 * Quantity shortcuts typed in the POS barcode box (the pattern most POS tools use):
 *   "10*SC00001"  scan or type the barcode after "10*": adds 10 pieces of that item, in one go
 *   "10*" + Enter  the next scan adds 10 pieces (the Qty box shows 10, then goes back to 1)
 *   "*10" + Enter  change the last scanned item to 10 pieces
 *   "*10+2", "*10,2" or "*10=2" + Enter  change the item on S.No 2 to 10 pieces (the number shown in the bill's S.No column)
 * Whole numbers from 1 to 99999 (S.No up to 999). Anything else is an ordinary barcode (or product code).
 *
 * @returns {{ kind: "scan", quantity: number, barcode: string } | { kind: "next", quantity: number } | { kind: "last", quantity: number } | { kind: "row", quantity: number, row: number } | null}
 */
export const parseQuantityShortcut = (raw) => {
  const text = String(raw ?? "").trim();
  const onRow = /^\*\s*(\d{1,5})\s*[+,=]\s*(\d{1,3})$/.exec(text);
  if (onRow) return { kind: "row", quantity: Number(onRow[1]), row: Number(onRow[2]) };
  const withBarcode = /^(\d{1,5})\s*\*\s*(\S.*)$/.exec(text);
  if (withBarcode) return { kind: "scan", quantity: Number(withBarcode[1]), barcode: withBarcode[2].trim() };
  const next = /^(\d{1,5})\s*\*$/.exec(text);
  if (next) return { kind: "next", quantity: Number(next[1]) };
  const last = /^\*\s*(\d{1,5})$/.exec(text);
  if (last) return { kind: "last", quantity: Number(last[1]) };
  return null;
};

/** The line the "*10" shortcut changes: the one scanned last if it is still in the bill, else the bottom line. */
export const lastScannedLineId = (cart, lastLineId) => {
  const lines = Array.isArray(cart) ? cart : [];
  return lines.some((line) => line.lineId === lastLineId) ? lastLineId : lines.at(-1)?.lineId ?? null;
};
