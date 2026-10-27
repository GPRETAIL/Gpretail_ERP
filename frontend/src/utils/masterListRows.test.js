import { expect, it } from "vitest";
import { mapProductRow, recordBoolean, recordName } from "./masterListRows";

it("displays every configured product column from the real snake-case API contract", () => {
  const row = mapProductRow({
    id: 8, company_id: 2, code: "P-8", name: "Complete product", category: { name: "Apparel" },
    brand: { name: "Brand A" }, company_ref: { id: 2, name: "Coffee 1" }, hsn_code: "6109", type: "Textile",
    unit: "Piece", section: "Mens", selling_mode: "Piece", sales_tax: { name: "Sales GST", rate: 18 },
    purchase_tax: { name: "Purchase GST", rate: 5 }, size_group: { name: "Adult sizes" }, barcode_mode: "Unique",
    barcode_source: "PRODUCT CODE", barcode: "ABC8", discount_mode: "Fixed", discount_mode_value: 0,
    margin_min: 0, margin_max: 20, stock_holding_period: 0, purchase_plan_mode: "SIZE VS PRICE", expected_gender: "Male",
    dumping: true, dumping_value: 0, cess: false, cess_value: 0, daily_price: true, daily_price_value: 0,
    is_core: true, is_core_value: 0, exclude_reward: false, auto_po: true, auto_po_value: 0,
    created_by: "Owner", updated_by: "Manager", created_at: "2026-10-28T09:00:00Z", updated_at: "2026-10-28T10:00:00Z",
    purchase_entry_attributes: [{ name: "BRAND", show: true }, { name: "SIZE", man: false, show: false, rol: false }], is_active: false,
  });
  expect(row).toMatchObject({ productGroup: "Apparel", company: "Coffee 1", salesTax: "Sales GST (18%)",
    purchaseTax: "Purchase GST (5%)", sizeGroup: "Adult sizes", active: "No", purchaseEntryAttrs: "BRAND",
    discountModeValue: "0", marginMin: "0", stockHoldingPeriod: "0", dumpingValue: "0", dailyPriceValue: "0",
    isCoreValue: "0", autoPoValue: "0", createdBy: "Owner", updatedBy: "Manager" });
  for (const [column, value] of Object.entries(row)) expect(value, column).not.toBe("--");
});

it("retains legacy relation names while rendering false and zero accurately", () => {
  expect(mapProductRow({ sizeGroup: { group_name: "Legacy sizes" }, companyRef: { id: 2, name: "Legacy store" },
    purchaseTax: { name: "Zero GST", tax_percentage: 0 }, is_active: "0", dumping: "false", auto_po: "1" }))
    .toMatchObject({ sizeGroup: "Legacy sizes", company: "Legacy store", purchaseTax: "Zero GST (0%)", active: "No", dumping: "No", autoPo: "Yes" });
  expect(recordName({ name: "XL" })).toBe("XL");
  expect(recordName({ size_name: "L" })).toBe("L");
  expect(recordBoolean("0")).toBe(false);
});
