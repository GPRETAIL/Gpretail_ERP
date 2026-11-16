/** Incentive rule types and how a rule's pay is shown (Settings > Incentive Configuration). */
export const RULE_TYPES = {
  item: { title: "Item rule", help: "Paid on every item sold. When several rules match an item, the most specific wins: product, then brand, then category, then section, then store-wide. With no rule, the salesperson's own Incentive % (Employee record) applies." },
  scheme: { title: "Scheme", help: "An extra amount on chosen items for a period (e.g. push slow sellers or new arrivals). Paid on top of the item rule." },
  ageing: { title: "Old-stock bonus", help: "An extra amount when the piece sold had been in stock at least this many days (from the stock batch it came from). Paid on top of the item rule." },
  target: { title: "Monthly target", help: "Paid once a month on the achievement of the salesperson's target (or their section's, when they have none). Set the targets month by month below." },
};

const money = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const ruleValueText = (rule) => {
  if (rule.type === "target") {
    return (rule.slabs || []).map((s) => `${s.from}%${s.to !== null && s.to !== "" && s.to !== undefined ? `–${s.to}%` : "+"}: ${s.type === "amount" ? `₹${money(s.value)}` : `${s.value}%`}`).join(" · ");
  }
  return rule.basis === "per_piece" ? `₹${money(rule.value)} / piece` : `${Number(rule.value)}%`;
};
