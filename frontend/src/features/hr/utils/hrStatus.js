// Attendance and leave statuses as the HR pages show them (web and mobile share these).
export const ATTENDANCE_STATUS = {
  PRESENT: { label: "Present", short: "P", color: "success" },
  HALF_DAY: { label: "Half day", short: "HD", color: "warning" },
  ABSENT: { label: "Absent", short: "A", color: "error" },
  LEAVE: { label: "On leave", short: "L", color: "secondary" },
  HOLIDAY: { label: "Holiday", short: "H", color: "info" },
  WEEK_OFF: { label: "Weekly off", short: "WO", color: "info" },
  NOT_MARKED: { label: "Not marked", short: "", color: "default" },
};

/** Roles that mark attendance, manage holidays and leave setup (the server checks this too). */
export const HR_MANAGER_ROLES = ["admin", "super_admin", "manager"];

export const MARKABLE_STATUSES = ["PRESENT", "HALF_DAY", "ABSENT", "LEAVE", "HOLIDAY", "WEEK_OFF"];

export const LEAVE_STATUS = {
  PENDING: { label: "Pending", color: "warning" },
  APPROVED: { label: "Approved", color: "success" },
  REJECTED: { label: "Rejected", color: "error" },
  CANCELLED: { label: "Cancelled", color: "default" },
};

export const statusLabel = (status) => ATTENDANCE_STATUS[status]?.label || status || "";

/** "09:45:00" as "9:45 AM". */
export const clockTime = (value) => {
  if (!value) return "";
  const [h, m] = String(value).split(":");
  const hour = Number(h);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

/** Minutes as "8h 05m" (blank for 0). */
export const duration = (minutes) => {
  const total = Number(minutes) || 0;
  if (total <= 0) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};

/** A number of days without a trailing ".0" (1, 0.5, 12). */
export const days = (value) => {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

export const errorMessage = (err, fallback) => {
  const errors = err?.response?.data?.errors;
  const first = errors && Object.values(errors).flat()[0];
  return first || err?.response?.data?.message || fallback;
};

/** The day statuses an employee can ask for when fixing attendance. */
export const REQUEST_STATUS_LABEL = { PRESENT: "Present", HALF_DAY: "Half day", ON_DUTY: "On duty (outside the store)" };

/** What a request asks for, in words. */
export const requestSummary = (r) => (r.type === "ATTENDANCE"
  ? [r.payload?.check_in && `In ${clockTime(`${r.payload.check_in}:00`)}`, r.payload?.check_out && `Out ${clockTime(`${r.payload.check_out}:00`)}`, r.payload?.status && REQUEST_STATUS_LABEL[r.payload.status]].filter(Boolean).join(" · ")
  : r.payload?.is_off ? "Day off" : `Shift: ${r.shift_name || "-"}`);

/** Advances, loans, expense claims and encashments: status as the pages show it. */
export const MONEY_STATUS = {
  REQUESTED: { label: "Requested", color: "warning" },
  PENDING: { label: "Pending", color: "warning" },
  APPROVED: { label: "Approved", color: "info" },
  ACTIVE: { label: "Recovering", color: "primary" },
  CLOSED: { label: "Repaid", color: "success" },
  PAID: { label: "Paid", color: "success" },
  REJECTED: { label: "Rejected", color: "error" },
  CANCELLED: { label: "Cancelled", color: "default" },
};

export const CLAIM_CATEGORY = { TRAVEL: "Travel", FUEL: "Fuel", FOOD: "Food", STORE_PURCHASE: "Store purchase", PHONE: "Phone", OTHER: "Other" };

export const LOAN_TYPE = { ADVANCE: "Salary advance", LOAN: "Loan" };

/** How an approved claim is paid back, in words. */
export const claimPayLabel = (c) => (c.status === "PAID" ? (c.pay_via === "DIRECT" ? `Paid ${c.paid_on || ""}`.trim() : "Paid with salary")
  : c.pay_via === "DIRECT" ? "To pay now" : c.pay_via === "SALARY" ? (c.payslip_id ? "In payroll" : "With next salary") : "");
