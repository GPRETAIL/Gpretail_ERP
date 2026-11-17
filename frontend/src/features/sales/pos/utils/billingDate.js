/** "18 Nov" for a Y-m-d business date. */
export const dayLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * The date a POS screen shows for the bill being made: the business date once the counter bills on a later day
 * (after cash closing), otherwise the device's today. Same format as the device date (toLocaleDateString).
 */
export const billDateText = (state, now = new Date()) => (state?.shifted && state.date
  ? new Date(`${state.date}T00:00:00`).toLocaleDateString()
  : now.toLocaleDateString());

/** Announced on window whenever a counter's billing date is changed, with the new state as event.detail. */
export const BILLING_DATE_EVENT = "gp:billing-date";
