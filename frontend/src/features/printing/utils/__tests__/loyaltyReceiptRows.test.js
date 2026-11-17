import { expect, it } from "vitest";
import { buildPosSaleReceiptHtml, loyaltyRowsHtml } from "@/features/printing/utils/posReceiptHtml";

it("prints points redeemed, earned and the balance; nothing for a bill without points", () => {
  const rows = loyaltyRowsHtml({ redeemed: 100, earned: 9, balance: 318 });
  expect(rows).toContain("Points Redeemed</span><span>100");
  expect(rows).toContain("Points Earned</span><span>9");
  expect(rows).toContain("Points Balance</span><span>318");
  expect(loyaltyRowsHtml({ redeemed: 0, earned: 5, balance: 5 })).not.toContain("Redeemed");
  expect(loyaltyRowsHtml(null)).toBe("");
});

it("shows on the thermal and the A4 bill", () => {
  const data = { storeName: "Coffee 1", billNo: "261118-0001", items: [], total: 1000, billAmount: 1000, loyalty: { redeemed: 100, earned: 9, balance: 318 } };
  expect(buildPosSaleReceiptHtml(data, {})).toContain("Points Balance");
  expect(buildPosSaleReceiptHtml({ ...data, paperSize: "A4" }, { receiptWidthInches: "A4" })).toContain("Points Balance");
});
