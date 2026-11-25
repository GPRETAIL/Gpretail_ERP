import { expect, it } from "vitest";
import { buildPosReturnReceiptHtml, buildPosSaleReceiptHtml, voucherRowsHtml } from "@/features/printing/utils/posReceiptHtml";

const USED = [
  { kind: "CREDIT_NOTE", display_number: "CN261125-0001", amount: 60, balance_after: 150 },
  { kind: "COUPON", display_number: "CP261125-0002", amount: 50, balance_after: 0 },
];

it("prints what the bill took from each voucher and what is left, but no balance for a coupon", () => {
  const rows = voucherRowsHtml(USED);
  expect(rows).toContain("Credit Note CN261125-0001</span><span>60.00");
  expect(rows).toContain("Balance Left On It</span><span>150.00");
  expect(rows).toContain("Coupon CP261125-0002</span><span>50.00");
  expect(rows.match(/Balance Left On It/g)).toHaveLength(1);
  expect(voucherRowsHtml([])).toBe("");
  expect(voucherRowsHtml(undefined)).toBe("");
});

it("shows on the thermal and the A4 bill", () => {
  const data = { storeName: "Coffee 1", billNo: "261125-0001", items: [], total: 100, billAmount: 100, vouchers: USED };
  expect(buildPosSaleReceiptHtml(data, {})).toContain("Credit Note CN261125-0001");
  expect(buildPosSaleReceiptHtml({ ...data, paperSize: "A4" }, { receiptWidthInches: "A4" })).toContain("Credit Note CN261125-0001");
  expect(buildPosSaleReceiptHtml({ ...data, vouchers: [] }, {})).not.toContain("Credit Note");
});

it("the return slip gives the new credit note's number, value and expiry", () => {
  const data = { storeName: "Coffee 1", billNo: "RR/12", items: [], total: -210, billAmount: -210, creditNote: { display_number: "CN261125-0001", amount: 210, expires_on: "2027-02-23" } };
  const html = buildPosReturnReceiptHtml(data, {});
  expect(html).toContain("Credit Note</div>");
  expect(html).toContain("Number</span><span>CN261125-0001");
  expect(html).toContain("Value</span><span>210.00");
  expect(html).toContain("Valid Until</span><span>2027-02-23");
  expect(buildPosReturnReceiptHtml({ ...data, creditNote: null }, {})).not.toContain("Valid Until");
});
