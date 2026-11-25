import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), print: vi.fn(), toast: { success: vi.fn(), error: vi.fn() }, role: { value: "admin" } }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { store_id: 1, role: mocks.role.value } } }) }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: mocks.toast }));
vi.mock("@/features/printing/utils/posSaleReceiptPrinter", () => ({ browserPrintHtml: mocks.print }));
vi.mock("@/features/printing/utils/receiptCompanyInfo", () => ({ fetchReceiptCompanyInfo: vi.fn().mockResolvedValue({ storeName: "Coffee 1", storeAddress: "1 Main Road", storePhone: "9000000000" }) }));
import GiftCoupon from "@/features/crm/GiftCoupon";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";
import { buildCouponSlipHtml, issuePayload, issueProblem } from "@/features/crm/giftcoupon/utils/couponSlip";

const BILL = { id: 1, store_id: 1, display_number: "CP261125-0001", number: "CPN-C-20261125-0001", buyer_name: "Meena", buyer_phone: "9876500001", issued_on: "2026-11-25", expires_on: "2026-12-25",
  amount: 100, min_bill_amount: 500, state: "ACTIVE", source: "BILL", reason: null };
const HAND = { ...BILL, id: 2, display_number: "CP261125-0002", buyer_name: "Bala", source: "MANUAL", reason: "Late delivery", min_bill_amount: null };
const USED = { ...BILL, id: 3, display_number: "CP261125-0003", state: "USED" };

beforeEach(() => {
  [mocks.get, mocks.post, mocks.print, mocks.toast.success, mocks.toast.error].forEach((m) => m.mockReset());
  mocks.role.value = "admin";
  mocks.print.mockReturnValue(true);
  mocks.get.mockResolvedValue({ data: { data: [BILL, HAND, USED], outstanding: 200, total: 3 } });
});
afterEach(cleanup);

const renderPage = () => render(<MemoryRouter><TransferActivityProvider><GiftCoupon /></TransferActivityProvider></MemoryRouter>);

it("builds the request from the form and says what is missing", () => {
  expect(issuePayload({ amount: "250", reason: " Late delivery ", buyer_name: "", buyer_phone: "98", valid_days: "", min_bill_amount: "" })).toEqual({ amount: 250, reason: "Late delivery", buyer_phone: "98" });
  expect(issuePayload({ amount: "250", reason: "x", valid_days: "0", min_bill_amount: "0" })).toEqual({ amount: 250, reason: "x", valid_days: 0, min_bill_amount: 0 });
  expect(issueProblem({ amount: "", reason: "x" })).toBe("Enter the coupon value (at least ₹1).");
  expect(issueProblem({ amount: "100", reason: " " })).toBe("Say why the coupon is given.");
  expect(issueProblem({ amount: "100", reason: "Goodwill" })).toBeNull();
});

it("prints a slip with the number, value, last day and smallest bill", () => {
  const html = buildCouponSlipHtml(BILL, { storeName: "Coffee <1>" });
  expect(html).toContain("CP261125-0001");
  expect(html).toContain("100.00");
  expect(html).toContain("Valid until 25 Dec 2026");
  expect(html).toContain("Use on a bill of &#8377;500.00 or more.");
  expect(html).toContain("Coffee &lt;1&gt;");
  expect(buildCouponSlipHtml({ ...BILL, expires_on: null, min_bill_amount: null }, {})).not.toContain("Use on a bill");
});

it("lists the coupons with how each came about, and the value still to be used", async () => {
  renderPage();
  expect(await screen.findByText("CP261125-0001")).toBeInTheDocument();
  expect(screen.getAllByText("Earned on a bill")).toHaveLength(2);
  expect(screen.getByText("Given by hand: Late delivery")).toBeInTheDocument();
  expect(screen.getByText("₹200.00")).toBeInTheDocument();
});

it("gives a coupon by hand, prints it and reloads", async () => {
  mocks.post.mockResolvedValue({ data: { message: "Coupon CP261125-0004 issued.", data: { ...HAND, id: 4, display_number: "CP261125-0004" } } });
  renderPage();
  await screen.findByText("CP261125-0001");
  fireEvent.click(screen.getByRole("button", { name: /Give a coupon/ }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Give and print" }));
  expect(await within(dialog).findByText("Enter the coupon value (at least ₹1).")).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText(/Coupon value/), { target: { value: "250" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Give and print" }));
  expect(await within(dialog).findByText("Say why the coupon is given.")).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText(/Why is it given/), { target: { value: "Late delivery" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Give and print" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/gift-coupons", { amount: 250, reason: "Late delivery" }));
  await waitFor(() => expect(mocks.print).toHaveBeenCalled());
  expect(mocks.print.mock.calls[0][0]).toContain("CP261125-0004");
  expect(mocks.toast.success).toHaveBeenCalledWith("Coupon CP261125-0004 issued.");
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
});

it("cancels an unused coupon with a reason, and does not offer it for a used one", async () => {
  mocks.post.mockResolvedValue({ data: { message: "Coupon cancelled.", data: { ...BILL, state: "CANCELLED" } } });
  renderPage();
  await screen.findByText("CP261125-0001");
  const cancelButtons = screen.getAllByRole("button", { name: /^Cancel$/ });
  expect(cancelButtons).toHaveLength(2); // the used coupon has none
  fireEvent.click(cancelButtons[0]);
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel coupon" }));
  expect(await within(dialog).findByText("Say why the coupon is cancelled.")).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Wrong customer" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel coupon" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/gift-coupons/1/cancel", { reason: "Wrong customer" }));
});

it("a cashier can look and print, but not give or cancel", async () => {
  mocks.role.value = "cashier";
  renderPage();
  await screen.findByText("CP261125-0001");
  expect(screen.queryByRole("button", { name: /Give a coupon/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Cancel$/ })).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /Print/ }).length).toBeGreaterThan(0);
});
