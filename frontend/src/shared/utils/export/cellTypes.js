/**
 * Decides, column by column, whether an exported column is really numbers, money or dates, so Excel gets real values
 * (sortable, summable, right aligned) instead of text. Anything doubtful stays text, because a wrong guess changes data
 * (a phone number turned into 9.12E+09, a code "007" turned into 7).
 */

const TEXT_ONLY_LABEL = /phone|mobile|contact|whatsapp|pin\s?code|pincode|zip|gstin|\bpan\b|aadhaar|barcode|\bsku\b|\bhsn\b|\bcode\b|\bid\b|\bno\b|\bno\.|number|invoice|bill|voucher|reference|\bref\b|account|ifsc|otp|batch|serial|\butr\b|cheque/i;
const MONEY = /^[-+]?\(?\s*(?:₹|Rs\.?|INR)?\s*-?\d{1,3}(?:,\d{2,3})*(?:\.\d+)?\s*\)?\s*(?:Dr|Cr)?$/i;
const PLAIN = /^[-+]?\d+(?:\.\d+)?$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?$/;
const DMY_DATE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
const MAX_SAFE_DIGITS = 15;

const text = (value) => (value === null || value === undefined ? "" : String(value).trim());

export const parseNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = text(value);
  if (!raw) return null;
  const negative = /^\(.*\)$/.test(raw) || /^-/.test(raw.replace(/^(?:₹|Rs\.?|INR)\s*/i, "")) || /^-/.test(raw);
  const digits = raw.replace(/₹|Rs\.?|INR|Dr|Cr|[(),\s+]/gi, "").replace(/^-/, "");
  if (!/^\d+(?:\.\d+)?$/.test(digits) || digits.replace(".", "").length > MAX_SAFE_DIGITS) return null;
  const parsed = Number(digits);
  return negative ? -parsed : parsed;
};

export const parseDate = (value) => {
  const raw = text(value);
  let year;
  let month;
  let day;
  let match = ISO_DATE.exec(raw);
  if (match) [, year, month, day] = match;
  else if ((match = DMY_DATE.exec(raw))) [, day, month, year] = match;
  else return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid = date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
  return valid ? date : null;
};

const hasLeadingZero = (raw) => /^[-+]?0\d/.test(raw);
const decimalsOf = (raw) => (raw.includes(".") ? raw.split(".")[1].replace(/\D/g, "").length : 0);

/** One of: { kind: "text" } | { kind: "number", decimals } | { kind: "money", decimals } | { kind: "date" } */
export function inferColumnKind(label, values) {
  const filled = values.filter((value) => text(value) !== "");
  if (filled.length === 0) return { kind: "text" };

  if (filled.every((value) => typeof value === "string" && parseDate(value))) return { kind: "date" };
  if (TEXT_ONLY_LABEL.test(String(label ?? ""))) return { kind: "text" };

  const nativeNumbers = filled.every((value) => typeof value === "number" && Number.isFinite(value));
  const strings = filled.every((value) => typeof value === "string");
  if (!nativeNumbers && !strings) return { kind: "text" };

  if (strings) {
    const raws = filled.map(text);
    if (raws.some(hasLeadingZero)) return { kind: "text" };
    const allNumeric = raws.every((raw) => MONEY.test(raw) && parseNumber(raw) !== null);
    if (!allNumeric) return { kind: "text" };
    // A column of plain whole numbers such as years or codes without a label hint is still safer as numbers only when not
    // 10+ digits long (phone numbers, account numbers).
    if (raws.every((raw) => PLAIN.test(raw)) && raws.some((raw) => raw.replace(/\D/g, "").length >= 10)) return { kind: "text" };
    const money = raws.some((raw) => /₹|Rs\.?|INR/i.test(raw));
    const decimals = Math.min(4, Math.max(...raws.map(decimalsOf)));
    return { kind: money ? "money" : "number", decimals: money ? Math.max(2, decimals) : decimals };
  }

  if (filled.some((value) => Math.abs(value) >= 1e10 && Number.isInteger(value))) return { kind: "text" };
  const decimals = Math.min(4, Math.max(...filled.map((value) => decimalsOf(String(value)))));
  return { kind: "number", decimals };
}

/** Number format string for a column kind, or undefined for text. */
export function numberFormatFor(kind) {
  if (kind.kind === "date") return "dd-mmm-yyyy";
  if (kind.kind === "money") return `"₹"#,##0${kind.decimals ? `.${"0".repeat(kind.decimals)}` : ""};[Red]-"₹"#,##0${kind.decimals ? `.${"0".repeat(kind.decimals)}` : ""}`;
  if (kind.kind === "number") return `#,##0${kind.decimals ? `.${"0".repeat(kind.decimals)}` : ""}`;
  return undefined;
}

/** The value to put in the cell for a column kind (a number, a Date, or the text as it was). */
export function coerceCell(value, kind) {
  if (value === null || value === undefined || text(value) === "") return null;
  if (kind.kind === "date") return parseDate(value) ?? text(value);
  if (kind.kind === "number" || kind.kind === "money") {
    const parsed = parseNumber(value);
    return parsed === null ? text(value) : parsed;
  }
  return typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : text(value);
}
