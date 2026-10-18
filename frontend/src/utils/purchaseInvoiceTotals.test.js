import { expect, it } from "vitest";
import { calculatePurchaseInvoiceTotals } from "./purchaseInvoiceTotals";
it("recalculates tax, item discounts, invoice discount and rounding from the same snapshot", () => {
  expect(calculatePurchaseInvoiceTotals([{ amountOn: "100", discount: "10", taxPerc: "5" }, { amountOn: 50, discount: 0, taxPerc: 10 }], 5, 0.5))
    .toEqual({ baseAmount: 150, discount: 10, pcsDiscount: 5, taxCharges: 9.5, grossAmount: 144.5, rounding: 0.5, netAmount: 145 });
});
it("handles empty invoices and blank numeric inputs", () => {
  expect(calculatePurchaseInvoiceTotals([], "", "").netAmount).toBe(0);
  expect(calculatePurchaseInvoiceTotals([{ amountOn: "", discount: "", taxPerc: "" }], 0, 0).taxCharges).toBe(0);
});
