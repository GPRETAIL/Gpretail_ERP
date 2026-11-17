import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
import LoyaltyRedeemPanel from "@/features/sales/pos/components/LoyaltyRedeemPanel";
import { computePaymentTotalsFromForm } from "@/features/sales/pos/utils/posSalesUtils";
import { loyaltyRedeemPayload } from "@/features/sales/pos/utils/loyaltyRedeem";
import { withApprovalTokens } from "@/features/sales/approvals/utils/approvals";

const QUOTE = { enabled: true, balance: 120, point_value: 1, min_points: 10, max_percent: 50, max_points: 100, otp_required: true, verify: true,
  channels: [{ channel: "sms", sent_to: "******3210" }], expiring: [] };

beforeEach(() => { mocks.get.mockReset(); mocks.post.mockReset(); });
afterEach(cleanup);

it("counts redeemed points as received and sends them with the checkout", () => {
  const totals = computePaymentTotalsFromForm({ cashAmount: "150", cardAmount: "0", upiAmount: "0" }, { amount: 200, billsAmount: 200 }, 50);
  expect(totals).toMatchObject({ receivedAmount: 200, balanceAmount: 0, loyaltyAmount: 50 });
  expect(loyaltyRedeemPayload({ points: 50, amount: 50, otpToken: "tok" })).toEqual({ loyaltyRedeem: { points: 50, otpToken: "tok" } });
  expect(loyaltyRedeemPayload(null)).toEqual({});
  expect(withApprovalTokens({ loyaltyRedeem: { points: 50 } }, { loyalty_redeem: "appr" }).loyaltyRedeem).toEqual({ points: 50, approvalToken: "appr" });
});

it("cashier: sends the customer an OTP by SMS, verifies it and applies the points", async () => {
  mocks.get.mockResolvedValue({ data: { data: QUOTE } });
  mocks.post.mockImplementation(async (url) => ({ data: { data: url.endsWith("/verify") ? { token: "otp-token", points: 50, amount: 50 } : { otp_id: 7, channel: "sms", sent_to: "******3210" } } }));
  const onChange = vi.fn();
  render(<LoyaltyRedeemPanel customerId={9} billAmount={200} value={null} onChange={onChange} />);

  expect(await screen.findByText(/Balance 120 pts/)).toHaveTextContent("up to 100 pts on this bill");
  fireEvent.change(screen.getByLabelText("Points to redeem"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "OTP by SMS" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/loyalty-redeem/otp", { customer_id: 9, points: 50, amount: 200, channel: "sms" }));
  expect(await screen.findByText("OTP sent by SMS to ******3210.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Customer OTP"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify" }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith({ points: 50, amount: 50, otpToken: "otp-token" }));
});

it("no channel for this customer: the points are applied and a supervisor approves at Save", async () => {
  mocks.get.mockResolvedValue({ data: { data: { ...QUOTE, channels: [] } } });
  const onChange = vi.fn();
  render(<LoyaltyRedeemPanel customerId={9} billAmount={200} value={null} onChange={onChange} />);
  fireEvent.click(await screen.findByRole("button", { name: "Use max" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply (supervisor approves)" }));
  expect(onChange).toHaveBeenCalledWith({ points: 100, amount: 100 });
});

it("shows nothing for a customer without points, and why points cannot be used on a small bill", async () => {
  mocks.get.mockResolvedValue({ data: { data: { ...QUOTE, balance: 0 } } });
  const { container } = render(<LoyaltyRedeemPanel customerId={9} billAmount={200} value={null} onChange={vi.fn()} />);
  await waitFor(() => expect(mocks.get).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
  cleanup();
  mocks.get.mockResolvedValue({ data: { data: { ...QUOTE, balance: 5, max_points: 0 } } });
  render(<LoyaltyRedeemPanel customerId={9} billAmount={200} value={null} onChange={vi.fn()} />);
  expect(await screen.findByText("At least 10 points are needed to redeem.")).toBeInTheDocument();
});
