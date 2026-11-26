import { describe, expect, it } from "vitest";
import productTaxRate from "@/features/sales/pos/utils/productTaxRate";

describe("productTaxRate", () => {
  it("reads the sales tax the products API sends", () => {
    expect(productTaxRate({ sales_tax: { id: 6, name: "GST 18%", rate: "18.00" } })).toBe(18);
  });

  it("uses the general tax when there is no sales tax", () => {
    expect(productTaxRate({ sales_tax: null, tax: { rate: "5.00" } })).toBe(5);
  });

  it("keeps a decimal rate", () => {
    expect(productTaxRate({ sales_tax: { rate: "14.50" } })).toBe(14.5);
  });

  it("still reads the older shape", () => {
    expect(productTaxRate({ salesTax: { tax_percentage: 12 } })).toBe(12);
  });

  it("is 0 for a product with no tax, a blank rate or nothing at all", () => {
    expect(productTaxRate({ sales_tax: null, tax: null })).toBe(0);
    expect(productTaxRate({ sales_tax: { rate: "" } })).toBe(0);
    expect(productTaxRate({ sales_tax: { rate: "abc" } })).toBe(0);
    expect(productTaxRate(undefined)).toBe(0);
  });
});
