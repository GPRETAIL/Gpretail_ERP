/** The store's coupon rule (Sales Customisation). The server keeps the same ranges, so what is saved is what is used. */
export const COUPON_RULE_DEFAULT = { enabled: false, minBill: 1000, valueType: "amount", value: 100, maxValue: 0, validDays: 30, redeemMinBill: 0 };

const number = (raw, fallback, min, max) => {
  const value = Number(raw);
  return raw === "" || raw == null || !Number.isFinite(value) ? fallback : Math.min(max, Math.max(min, Math.round(value * 100) / 100));
};

export const normalizeCouponRule = (raw) => {
  const rule = raw && typeof raw === "object" ? raw : {};
  const valueType = rule.valueType === "percent" ? "percent" : "amount";
  return {
    enabled: rule.enabled === true || rule.enabled === "true" || rule.enabled === 1,
    minBill: number(rule.minBill, COUPON_RULE_DEFAULT.minBill, 1, 10000000),
    valueType,
    value: number(rule.value, COUPON_RULE_DEFAULT.value, 0.01, valueType === "percent" ? 100 : 1000000),
    maxValue: number(rule.maxValue, 0, 0, 1000000),
    validDays: Math.trunc(number(rule.validDays, COUPON_RULE_DEFAULT.validDays, 0, 3650)),
    redeemMinBill: number(rule.redeemMinBill, 0, 0, 10000000),
  };
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** The rule in one plain sentence, so the owner can read back what customers will get. */
export const couponRuleSummary = (rule) => {
  if (!rule?.enabled) return "No coupons are given. Customers are not offered a coupon when a bill is paid.";
  const worth = rule.valueType === "percent"
    ? `${rule.value}% of the bill${rule.maxValue > 0 ? `, up to ${money(rule.maxValue)}` : ""}`
    : money(rule.value);
  const lasts = rule.validDays > 0 ? `valid for ${rule.validDays} days` : "with no end date";
  const use = rule.redeemMinBill > 0 ? ` It can be used on a bill of ${money(rule.redeemMinBill)} or more.` : "";
  return `A bill of ${money(rule.minBill)} or more, paid in full, earns a coupon worth ${worth}, ${lasts}.${use}`;
};
