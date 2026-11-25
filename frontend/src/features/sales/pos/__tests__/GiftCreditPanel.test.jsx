import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get } }));
import GiftCreditPanel from "@/features/sales/pos/components/GiftCreditPanel";
import { computePaymentTotalsFromForm } from "@/features/sales/pos/utils/posSalesUtils";
import { checkoutPaymentProblem } from "@/features/sales/pos/utils/checkoutPayment";
import { giftCreditPayload, giftCreditTotal, paymentModeLabel } from "@/features/sales/pos/utils/giftCredit";

const NOTE = { number: "CRN-S-20261125-0001", display_number: "CN261125-0001", kind: "CREDIT_NOTE", kind_label: "credit note", balance: 210, expires_on: "2027-02-23", single_use: false, max_use: 150 };
const COUPON = { number: "CPN-S-20261125-0002", display_number: "CP261125-0002", kind: "COUPON", kind_label: "coupon", balance: 50, expires_on: null, single_use: true, max_use: 50 };

beforeEach(() => { mocks.get.mockReset(); });
afterEach(cleanup);

it("counts what vouchers pay as received, and sends the numbers and amounts with the checkout", () => {
  const totals = computePaymentTotalsFromForm({ cashAmount: "40", cardAmount: "0", upiAmount: "0" }, { amount: 100, billsAmount: 100 }, 60);
  expect(totals).toMatchObject({ receivedAmount: 100, balanceAmount: 0 });
  expect(checkoutPaymentProblem({}, { ...totals, netAmount: 100 })).toBeNull();
  const list = [{ number: "A", amount: 60 }, { number: "B", amount: 15.5 }];
  expect(giftCreditTotal(list)).toBe(75.5);
  expect(giftCreditPayload(list)).toEqual({ vouchers: [{ number: "A", amount: 60 }, { number: "B", amount: 15.5 }] });
  expect(giftCreditPayload([])).toEqual({});
  expect(paymentModeLabel("CREDIT_NOTE")).toBe("Credit note");
  expect(paymentModeLabel("GIFT_VOUCHER")).toBe("Gift voucher");
});

it("checks a number against the bill, then applies the part the cashier chooses", async () => {
  mocks.get.mockResolvedValue({ data: { data: NOTE } });
  const onChange = vi.fn();
  render(<GiftCreditPanel billAmount={150} otherPaid={0} value={[]} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Voucher, credit note or coupon number"), { target: { value: "CN261125-0001" } });
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/gift-credits/lookup", { params: { number: "CN261125-0001", bill_total: 150, due: 150 } }));
  expect(await screen.findByText(/credit note CN261125-0001: ₹210.00 left, valid until 2027-02-23/)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Amount to use"), { target: { value: "60" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(onChange).toHaveBeenCalledWith([{ number: NOTE.number, display_number: "CN261125-0001", kind_label: "credit note", amount: 60, balance: 210 }]);
});

it("will not apply more than the bill can take", async () => {
  mocks.get.mockResolvedValue({ data: { data: NOTE } });
  render(<GiftCreditPanel billAmount={150} otherPaid={0} value={[]} onChange={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Voucher, credit note or coupon number"), { target: { value: "CN261125-0001" } });
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  await screen.findByLabelText("Amount to use");
  fireEvent.change(screen.getByLabelText("Amount to use"), { target: { value: "151" } });
  expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Amount to use"), { target: { value: "150" } });
  expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
});

it("a coupon is used whole: no amount to type, it takes its value off the bill", async () => {
  mocks.get.mockResolvedValue({ data: { data: COUPON } });
  const onChange = vi.fn();
  render(<GiftCreditPanel billAmount={300} otherPaid={0} value={[]} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("Voucher, credit note or coupon number"), { target: { value: "CP261125-0002" } });
  fireEvent.keyDown(screen.getByLabelText("Voucher, credit note or coupon number"), { key: "Enter" });
  expect(await screen.findByText("Takes ₹50.00 off the bill")).toBeInTheDocument();
  expect(screen.queryByLabelText("Amount to use")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(onChange.mock.calls[0][0][0]).toMatchObject({ number: COUPON.number, amount: 50, kind_label: "coupon" });
});

it("shows the server's reason for a code that cannot be used, and lists what is applied with a way to remove it", async () => {
  mocks.get.mockRejectedValue({ response: { data: { errors: { number: ["This credit note expired on 12 Nov 2026."] } } } });
  const onChange = vi.fn();
  const applied = [{ number: "CRN-X", display_number: "CN261120-0003", kind_label: "credit note", amount: 60, balance: 210 }];
  render(<GiftCreditPanel billAmount={200} otherPaid={0} value={applied} onChange={onChange} />);

  expect(screen.getByText(/credit note CN261120-0003: ₹60.00 used, ₹150.00 left on it/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Voucher, credit note or coupon number"), { target: { value: "CN261112-0001" } });
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  expect(await screen.findByText("This credit note expired on 12 Nov 2026.")).toBeInTheDocument();
  // What is already applied shrinks what a new code can take.
  expect(mocks.get).toHaveBeenCalledWith("/gift-credits/lookup", { params: { number: "CN261112-0001", bill_total: 200, due: 140 } });

  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(onChange).toHaveBeenCalledWith([]);
});

it("refuses a code that is already on the bill without asking the server", async () => {
  const applied = [{ number: "CRN-X", display_number: "CN261120-0003", kind_label: "credit note", amount: 60, balance: 210 }];
  render(<GiftCreditPanel billAmount={200} otherPaid={0} value={applied} onChange={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Voucher, credit note or coupon number"), { target: { value: "cn261120-0003" } });
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  expect(await screen.findByText("This code is already on the bill.")).toBeInTheDocument();
  expect(mocks.get).not.toHaveBeenCalled();
});

it("shows nothing when the bill is empty, and starts again if the bill drops below what was applied", () => {
  const { container, rerender } = render(<GiftCreditPanel billAmount={0} otherPaid={0} value={[]} onChange={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
  const onChange = vi.fn();
  rerender(<GiftCreditPanel billAmount={50} otherPaid={0} value={[{ number: "A", display_number: "CN1", kind_label: "credit note", amount: 60, balance: 60 }]} onChange={onChange} />);
  expect(onChange).toHaveBeenCalledWith([]);
});
