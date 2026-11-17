export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const FORMAT_LABELS = { xlsx: "Excel", pdf: "PDF" };

export const STATUS_TONES = { sent: "success", partial: "warning", skipped: "slate", failed: "error", running: "info" };

export const ROLE_LABELS = {
  admin: "Admins", manager: "Managers", accountant: "Accountants", supervisor: "Supervisors", cashier: "Cashiers",
  warehouse_user: "Warehouse users", store_user: "Store users", staff: "Staff", user: "Users",
};

export const emptySchedule = () => ({
  name: "", report_key: "daily_summary", layout: "", period: "yesterday", frequency: "daily", send_time: "09:00",
  day_of_week: 1, day_of_month: 1, formats: ["xlsx", "pdf"], subject: "", message: "", skip_empty: false, is_active: true, recipients: [],
});

/** A saved schedule back into the form. */
export const scheduleToForm = (schedule) => ({
  ...emptySchedule(),
  ...schedule,
  layout: schedule.params?.layout || "",
  day_of_week: schedule.day_of_week || 1,
  day_of_month: schedule.day_of_month || 1,
  subject: schedule.subject || "",
  message: schedule.message || "",
});

/** The save body. */
export const schedulePayload = (form) => ({
  name: form.name.trim(),
  report_key: form.report_key,
  params: form.layout ? { layout: form.layout } : null,
  period: form.period,
  frequency: form.frequency,
  send_time: form.send_time,
  day_of_week: form.frequency === "weekly" ? Number(form.day_of_week) : null,
  day_of_month: form.frequency === "monthly" ? Number(form.day_of_month) : null,
  formats: form.formats,
  subject: form.subject.trim() || null,
  message: form.message.trim() || null,
  skip_empty: Boolean(form.skip_empty),
  is_active: Boolean(form.is_active),
  recipients: form.recipients.map(({ type, value }) => ({ type, value: String(value) })),
});

/** "Daily at 09:00", "Every Monday at 08:00", "Monthly on day 31 at 07:00". */
export const describeFrequency = ({ frequency, send_time, day_of_week, day_of_month }) => (frequency === "weekly"
  ? `Every ${DAYS[(Number(day_of_week) || 1) - 1]} at ${send_time}`
  : frequency === "monthly" ? `Monthly on day ${day_of_month || 1} at ${send_time}` : `Daily at ${send_time}`);

/** A recipient as a chip label, using the store's users and groups. */
export const recipientLabel = (recipient, { users = [], groups = [] } = {}) => {
  if (recipient.type === "role") return `All ${ROLE_LABELS[recipient.value] || recipient.value}`;
  if (recipient.type === "group") return `Group: ${groups.find((g) => String(g.id) === String(recipient.value))?.name || recipient.value}`;
  if (recipient.type === "user") return users.find((u) => String(u.id) === String(recipient.value))?.name || `User #${recipient.value}`;
  return recipient.value;
};

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

/** Adds a recipient once (same type and value). */
export const addRecipient = (list, recipient) => (list.some((r) => r.type === recipient.type && String(r.value).toLowerCase() === String(recipient.value).toLowerCase())
  ? list : [...list, { ...recipient, value: String(recipient.value).trim() }]);

/** Reports grouped by module for the picker. */
export const reportGroups = (reports = []) => reports.reduce((acc, report) => ({ ...acc, [report.module]: [...(acc[report.module] || []), report] }), {});

/**
 * The report library by menu module (Dashboard, Sales, Warehouse, Store, Finance, CRM, HR), only reports the user may
 * open, narrowed by a search; with how many schedules each report already has.
 */
export const libraryGroups = (reports = [], modules = [], schedules = [], query = "") => {
  const text = String(query || "").trim().toLowerCase();
  const counts = schedules.reduce((acc, s) => ({ ...acc, [s.report_key]: (acc[s.report_key] || 0) + 1 }), {});
  const order = [...modules, ...reports.map((r) => r.module).filter((m) => !modules.includes(m))];
  return [...new Set(order)].map((module) => ({
    module,
    reports: reports.filter((r) => r.allowed && r.module === module && (!text || `${r.label} ${module}`.toLowerCase().includes(text)))
      .map((r) => ({ ...r, scheduled: counts[r.key] || 0 })),
  })).filter((group) => group.reports.length > 0);
};

/** A new schedule for a report picked from the library. */
export const scheduleForReport = (report) => ({ ...emptySchedule(), report_key: report.key, name: report.label, layout: report.layouts?.[0]?.value || "" });
