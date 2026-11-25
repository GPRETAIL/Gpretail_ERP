const DATE_TOKEN = /^\d{4}(-\d{2}){0,2}$/;
const LOWER_WORDS = new Set(["of", "and", "vs", "by", "to", "in", "for"]);
const FALLBACK_PAGE = "Export";

const titleCase = (word) => (LOWER_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1));

/** Characters Windows, macOS and Android refuse in a file name, plus runs of spaces. */
const cleanPart = (text) =>
  String(text ?? "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\p{Cc}/gu, " ")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

export const todayStamp = (now = new Date()) => {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Splits a screen's `fileName` ("punch_log_2026-11-01_2026-11-25", "sales_report_daily_summary") into the page words
 * and any trailing dates the screen already put there (its period).
 */
export const splitPageAndPeriod = (raw) => {
  const tokens = String(raw ?? "").split(/[\s_]+/).filter(Boolean);
  const period = [];
  while (tokens.length > 1 && DATE_TOKEN.test(tokens[tokens.length - 1])) period.unshift(tokens.pop());
  const words = tokens.flatMap((token) => token.split("-")).filter(Boolean);
  return { page: words.map(titleCase).join("-"), period };
};

const pageFromPath = (pathname) => {
  const last = String(pathname || "").split("/").filter(Boolean).pop() || "";
  return splitPageAndPeriod(last).page;
};

/**
 * The name every export of a screen gets, the same for PDF, Excel and CSV: Page_Store_Date.
 * `Sales-Report_Coffee-1_2026-11-25`. The date is the screen's own period when it has one, else the day of the export.
 * A screen that gives no usable name (the old "table_data" default) is named after its page address.
 */
export default function buildExportFileName({ fileName = "", pathname = "", storeName = "", period = "", now = new Date() } = {}) {
  const split = splitPageAndPeriod(fileName);
  const generic = !split.page || /^table-data$/i.test(split.page);
  const page = cleanPart(generic ? pageFromPath(pathname) || FALLBACK_PAGE : split.page) || FALLBACK_PAGE;
  const store = cleanPart(storeName);
  const given = cleanPart(period) || split.period.map(cleanPart).filter(Boolean).join("_to_");
  return [page, store, given || todayStamp(now)].filter(Boolean).join("_");
}
