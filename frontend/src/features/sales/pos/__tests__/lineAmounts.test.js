import { expect, it } from "vitest";
import { lineAmounts } from "@/features/sales/pos/utils/posSalesUtils";

// The POS screens and the server work out a bill line the same way: discount first, then tax on what is left, each to the paisa.

it("takes the discount off the price before working out the tax (100, 10 off, 18% is 106.20, not 108)", () => {
  expect(lineAmounts({ qty: 1, price: 100, discount: 10, tax: 18 })).toEqual({ gross: 100, discount: 10, taxable: 90, taxAmount: 16.2, total: 106.2 });
});

it.each([[0, 100], [0.25, 100.25], [3, 103], [5, 105], [12, 112], [14.5, 114.5], [18, 118], [28, 128]])("one item at %s%% tax", (rate, total) => {
  expect(lineAmounts({ qty: 1, price: 100, tax: rate }).total).toBe(total);
});

it("rounds the tax of each line to the paisa", () => {
  expect(lineAmounts({ qty: 1, price: 10.03, tax: 18 }).taxAmount).toBe(1.81);
  expect(lineAmounts({ qty: 3, price: 499.99, discount: 50, tax: 12 })).toEqual({ gross: 1499.97, discount: 50, taxable: 1449.97, taxAmount: 174, total: 1623.97 });
});

it("never lets the discount be more than the price, or the numbers go negative", () => {
  expect(lineAmounts({ qty: 2, price: 50, discount: 500, tax: 18 })).toEqual({ gross: 100, discount: 100, taxable: 0, taxAmount: 0, total: 0 });
  expect(lineAmounts({ qty: -1, price: 50, tax: 5 }).total).toBe(0);
});
