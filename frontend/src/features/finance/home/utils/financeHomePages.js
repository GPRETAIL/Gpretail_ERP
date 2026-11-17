/** Finance home: the Finance menu pages grouped the way accountants work (daily money, books, reports, GST and Tally). */
export const FINANCE_PAGE_GROUPS = [
  { title: "Money in and out", paths: ["/finance/voucher-entry", "/finance/supplier-payment", "/finance/credit-sale-collection", "/finance/transport-payment", "/finance/petty-cash", "/finance/cheque-book"] },
  { title: "Books", paths: ["/finance/manage-ledger", "/finance/opening-balance", "/finance/daybook", "/finance/loan-reconciliation"] },
  { title: "Reports", paths: ["/finance/dashboard", "/finance/receivable", "/finance/payable", "/finance/trial-balance", "/finance/trading-account", "/finance/p-l-account", "/finance/balance-sheet", "/finance/incentive-report"] },
  { title: "GST and Tally", paths: ["/finance/gst-inbox", "/finance/tally-configuration", "/finance/tally-integration"] },
];

/** Menu pages still being built; shown with a "Soon" tag. Remove a path here when its page goes live. */
export const FINANCE_PAGES_COMING = new Set([
  "/finance/credit-sale-collection", "/finance/transport-payment", "/finance/petty-cash", "/finance/cheque-book",
  "/finance/loan-reconciliation", "/finance/gst-inbox", "/finance/tally-configuration", "/finance/tally-integration",
]);

/**
 * The Finance menu items this user may open, grouped. Pages not in a group (added to the menu later) go under "More".
 * subItems: the Finance entry's subItems after permission filtering (getVisibleNavItems).
 */
export function groupFinancePages(subItems = []) {
  const byPath = new Map(subItems.map((item) => [item.path, item]));
  const used = new Set();
  const groups = FINANCE_PAGE_GROUPS.map((group) => ({
    title: group.title,
    items: group.paths.filter((path) => byPath.has(path)).map((path) => {
      used.add(path);
      return { ...byPath.get(path), soon: FINANCE_PAGES_COMING.has(path) };
    }),
  }));
  const rest = subItems.filter((item) => !used.has(item.path)).map((item) => ({ ...item, soon: FINANCE_PAGES_COMING.has(item.path) }));
  return [...groups, { title: "More", items: rest }].filter((group) => group.items.length > 0);
}
