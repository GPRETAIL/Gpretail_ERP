import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import CouponRuleEditor from "@/features/sales/customisation/components/CouponRuleEditor";
import { COUPON_RULE_DEFAULT, couponRuleSummary, normalizeCouponRule } from "@/features/sales/customisation/utils/couponRule";
import { buildPosSaleReceiptHtml, couponIssuedHtml } from "@/features/printing/utils/posReceiptHtml";

afterEach(cleanup);

it("keeps every number inside the same ranges as the server and falls back to the defaults", () => {
  expect(normalizeCouponRule(undefined)).toEqual(COUPON_RULE_DEFAULT);
  expect(normalizeCouponRule({ enabled: true, minBill: 0, valueType: "percent", value: 500, maxValue: -1, validDays: 99999.9, redeemMinBill: "x" }))
    .toEqual({ enabled: true, minBill: 1, valueType: "percent", value: 100, maxValue: 0, validDays: 3650, redeemMinBill: 0 });
  expect(normalizeCouponRule({ valueType: "bogus", enabled: "false" })).toMatchObject({ valueType: "amount", enabled: false });
});

it("reads the rule back in plain words", () => {
  expect(couponRuleSummary({ ...COUPON_RULE_DEFAULT })).toBe("No coupons are given. Customers are not offered a coupon when a bill is paid.");
  expect(couponRuleSummary({ ...COUPON_RULE_DEFAULT, enabled: true })).toBe("A bill of ₹1,000 or more, paid in full, earns a coupon worth ₹100, valid for 30 days.");
  expect(couponRuleSummary({ ...COUPON_RULE_DEFAULT, enabled: true, valueType: "percent", value: 10, maxValue: 150, validDays: 0, redeemMinBill: 500 }))
    .toBe("A bill of ₹1,000 or more, paid in full, earns a coupon worth 10% of the bill, up to ₹150, with no end date. It can be used on a bill of ₹500 or more.");
});

function Harness({ start }) {
  const [rule, setRule] = useState(start);
  return <><CouponRuleEditor value={rule} onChange={setRule} fieldLabelSx={{}} helpSx={{}} /><output data-testid="saved">{JSON.stringify(normalizeCouponRule(rule))}</output></>;
}

it("switching it on enables the fields, and the sentence follows what is typed", () => {
  render(<Harness start={{ ...COUPON_RULE_DEFAULT }} />);
  expect(screen.getByLabelText("Bill amount needed")).toBeDisabled();
  fireEvent.click(screen.getByLabelText("Give a coupon"));
  expect(screen.getByLabelText("Bill amount needed")).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Bill amount needed"), { target: { value: "2500" } });
  fireEvent.change(screen.getByLabelText("Coupon amount"), { target: { value: "200" } });
  expect(screen.getByText(/^A bill of/)).toHaveTextContent("A bill of ₹2,500 or more, paid in full, earns a coupon worth ₹200, valid for 30 days.");
  expect(JSON.parse(screen.getByTestId("saved").textContent)).toMatchObject({ enabled: true, minBill: 2500, value: 200 });
});

const COUPON = { display_number: "CP261125-0007", amount: 100, expires_on: "2026-12-25", min_bill_amount: 500 };

it("prints the coupon a bill earned on the thermal and the A4 receipt, and nothing when there is none", () => {
  const html = couponIssuedHtml([COUPON]);
  expect(html).toContain("Your Coupon");
  expect(html).toContain("Number</span><span>CP261125-0007");
  expect(html).toContain("Value</span><span>100.00");
  expect(html).toContain("Valid Until</span><span>2026-12-25");
  expect(html).toContain("Use On A Bill Of</span><span>500.00 Or More");
  expect(couponIssuedHtml([])).toBe("");
  expect(couponIssuedHtml(undefined)).toBe("");
  const data = { storeName: "Coffee 1", billNo: "261125-0001", items: [], total: 1500, billAmount: 1500, couponsIssued: [COUPON] };
  expect(buildPosSaleReceiptHtml(data, {})).toContain("CP261125-0007");
  expect(buildPosSaleReceiptHtml({ ...data, paperSize: "A4" }, { receiptWidthInches: "A4" })).toContain("CP261125-0007");
  expect(buildPosSaleReceiptHtml({ ...data, couponsIssued: [] }, {})).not.toContain("Your Coupon");
});
