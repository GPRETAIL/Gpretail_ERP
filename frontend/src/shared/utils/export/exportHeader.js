import { parseDateTime } from "./cellTypes";
import { splitPageAndPeriod } from "./exportFileName";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GENERIC_TITLE = /^(export|table[\s_-]*data)?$/i;
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const pad = (n) => String(n).padStart(2, "0");

/** A parsed date as 25-Nov-2026, or 25-Nov-2026 10:09 pm when it carries a time. */
export const formatParsed = ({ date, time }) => {
  const day = `${pad(date.getUTCDate())}-${MONTHS[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
  if (!time) return day;
  const hour = date.getUTCHours();
  return `${day} ${hour % 12 || 12}:${pad(date.getUTCMinutes())} ${hour < 12 ? "am" : "pm"}`;
};

export const displayDate = (value) => {
  const raw = clean(value);
  if (!raw) return "";
  const parsed = parseDateTime(raw);
  if (parsed) return formatParsed(parsed);
  const month = /^(\d{4})-(\d{2})$/.exec(raw);
  if (month && Number(month[2]) >= 1 && Number(month[2]) <= 12) return `${MONTHS[Number(month[2]) - 1]} ${month[1]}`;
  return raw;
};

/** "01-Nov-2026 to 25-Nov-2026" from { from, to }, a string the screen wrote, or the dates in its file name. "" when the screen has no period. */
export const periodText = ({ period, fileName }) => {
  if (period && typeof period === "object") {
    const from = displayDate(period.from);
    const to = displayDate(period.to);
    if (from && to) return from === to ? from : `${from} to ${to}`;
    return from || to || "";
  }
  if (clean(period)) return clean(period);
  const dates = splitPageAndPeriod(fileName).period.map(displayDate).filter(Boolean);
  if (dates.length === 0) return "";
  return dates.length === 1 ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`;
};

export const generatedStamp = (now = new Date()) => {
  const day = displayDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
  return `${day} ${time}`;
};

const pageName = (fileName, pathname) => {
  const fromName = splitPageAndPeriod(fileName).page;
  const generic = !fromName || /^table-data$/i.test(fromName);
  const raw = generic ? splitPageAndPeriod(String(pathname || "").split("/").filter(Boolean).pop() || "").page : fromName;
  return raw.replace(/-/g, " ");
};

/**
 * The lines at the top of every PDF and Excel export, the same on every screen:
 * store name, what the report is, the period it covers (when the screen has one), any extra detail lines the screen
 * supplies, and when it was generated and by whom. A screen that names no report gets its page name, never "Export".
 */
export default function buildHeaderLines({ storeName = "", title = "", subtitle = "", headingLines = [], period, fileName = "", pathname = "", userName = "", now = new Date() }) {
  const store = clean(storeName);
  const given = clean(title);
  const titleIsStore = !given || GENERIC_TITLE.test(given) || (store && given.toLowerCase() === store.toLowerCase());
  const report = clean(subtitle) || (titleIsStore ? "" : given) || pageName(fileName, pathname) || "Report";
  const extra = (Array.isArray(headingLines) ? headingLines : []).map(clean).filter(Boolean);
  const storeLine = store || (!GENERIC_TITLE.test(given) && clean(subtitle) ? given : "");
  const stamp = `Generated on ${generatedStamp(now)}${clean(userName) ? ` by ${clean(userName)}` : ""}`;
  const periodLine = periodText({ period, fileName });

  const lines = [];
  const seen = new Set();
  const add = (text, style) => {
    const value = clean(text);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return;
    seen.add(key);
    lines.push({ text: value, style });
  };
  add(storeLine, "store");
  add(report, "title");
  if (periodLine) add(/^(period|from|as on)\b/i.test(periodLine) ? periodLine : `Period: ${periodLine}`, "text");
  if (!storeLine && given && !titleIsStore && clean(subtitle)) add(given, "text");
  extra.forEach((line) => add(line, "text"));
  add(stamp, "muted");
  return lines;
}
