/** How each attendance status looks on the calendar: a short label, a colour and a plain word for the legend. */
export const STATUS_META = {
  PRESENT: { label: "Present", short: "P", color: "#16a34a" },
  HALF_DAY: { label: "Half day", short: "HD", color: "#d97706" },
  ABSENT: { label: "Absent", short: "A", color: "#dc2626" },
  LEAVE: { label: "On leave", short: "L", color: "#4f46e5" },
  HOLIDAY: { label: "Holiday", short: "H", color: "#9333ea" },
  WEEK_OFF: { label: "Weekly off", short: "WO", color: "#6b7280" },
  NOT_MARKED: { label: "Not marked yet", short: "-", color: "#9ca3af" },
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "2026-11" moved by a number of months. */
export const shiftMonth = (month, by) => {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(year, number - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const monthTitle = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

/** The month's days laid out in weeks that start on Monday, with null where the week has days of another month. */
export const buildWeeks = (days) => {
  if (!days?.length) return [];
  const offset = (new Date(`${days[0].date}T00:00:00`).getDay() + 6) % 7; // Monday = 0
  const cells = [...Array(offset).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
};

/** 539 minutes as "8h 59m"; nothing for zero. */
export const minutesText = (minutes) => {
  const total = Math.round(Number(minutes) || 0);
  if (total <= 0) return "";
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`;
};

/** "09:31:00" as "9:31 AM". */
export const clock = (time) => {
  if (!time) return "";
  const [hours, minutes] = String(time).split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

export const longDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
