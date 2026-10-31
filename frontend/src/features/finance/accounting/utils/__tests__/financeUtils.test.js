import { expect, it } from "vitest";
import { drCr, financialYearStart, voucherTotals } from "@/features/finance/accounting/utils/financeUtils";

it("reads a signed balance the way accountants do", () => {
  expect(drCr(1250)).toBe("1,250.00 Dr");
  expect(drCr(-300.5)).toBe("300.50 Cr");
  expect(drCr(0.001)).toBe("0.00");
});

it("starts the financial year on 1 April", () => {
  expect(financialYearStart(new Date(2026, 9, 31))).toBe("2026-04-01");
  expect(financialYearStart(new Date(2027, 1, 10))).toBe("2026-04-01");
  expect(financialYearStart(new Date(2027, 3, 1))).toBe("2027-04-01");
});

it("lets a voucher be saved only when its lines are complete and balance", () => {
  const rent = { ledger_account_id: "4", debit: "1000", credit: "" };
  const cash = { ledger_account_id: "1", debit: "", credit: "1000" };
  expect(voucherTotals([rent, cash])).toEqual({ debit: 1000, credit: 1000, difference: 0, ready: true });
  expect(voucherTotals([rent, { ...cash, credit: "900" }])).toMatchObject({ difference: 100, ready: false });
  expect(voucherTotals([rent, { ...cash, ledger_account_id: "" }]).ready).toBe(false); // An amount with no ledger.
  expect(voucherTotals([rent, cash, { ledger_account_id: "", debit: "", credit: "" }]).ready).toBe(true); // Blank spare line is ignored.
  expect(voucherTotals([{ ...rent, credit: "5" }, cash]).ready).toBe(false); // Both sides on one line.
});
