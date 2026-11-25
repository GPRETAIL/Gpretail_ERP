import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), print: vi.fn(), toast: { success: vi.fn(), error: vi.fn() }, role: { value: "admin" } }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { store_id: 1, role: mocks.role.value } } }) }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: mocks.toast }));
vi.mock("@/features/printing/utils/posSaleReceiptPrinter", () => ({ browserPrintHtml: mocks.print }));
vi.mock("@/features/printing/utils/receiptCompanyInfo", () => ({ fetchReceiptCompanyInfo: vi.fn().mockResolvedValue({ storeName: "Coffee 1", storeAddress: "1 Main Road", storePhone: "9000000000", storeGstNo: "" }) }));
import GiftVoucher from "@/features/crm/GiftVoucher";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";
import { buildVoucherSlipHtml, sellPayload, sellProblem, voucherErrorMessage } from "@/features/crm/giftvoucher/utils/voucherSlip";

const LIVE = { id: 1, store_id: 1, display_number: "GV261125-0001", number: "GVC-C-20261125-0001", buyer_name: "Meena", buyer_phone: "9876500001", issued_on: "2026-11-25", expires_on: "2027-11-25",
  original_amount: 500, balance: 500, state: "ACTIVE", payment_mode: "CASH", payment_reference: null };
const PART = { ...LIVE, id: 2, display_number: "GV261125-0002", buyer_name: "Bala", balance: 300 };

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset?.());
  mocks.toast.success.mockReset();
  mocks.toast.error.mockReset();
  mocks.role.value = "admin";
  mocks.print.mockReturnValue(true);
  mocks.get.mockResolvedValue({ data: { data: [LIVE, PART], outstanding: 800, total: 2 } });
});
afterEach(cleanup);

const renderPage = () => render(<MemoryRouter><TransferActivityProvider><GiftVoucher /></TransferActivityProvider></MemoryRouter>);

it("builds the sell request from the form, leaving blank fields to the server's defaults", () => {
  expect(sellPayload({ amount: "500", payment_mode: "CASH", payment_reference: "ignored", buyer_name: " Meena ", buyer_phone: "", valid_days: "" }))
    .toEqual({ amount: 500, payment_mode: "CASH", buyer_name: "Meena" });
  expect(sellPayload({ amount: "250", payment_mode: "UPI", payment_reference: " TXN-9 ", buyer_name: "", buyer_phone: "98", valid_days: "0" }))
    .toEqual({ amount: 250, payment_mode: "UPI", payment_reference: "TXN-9", buyer_phone: "98", valid_days: 0 });
  expect(sellProblem({ amount: "", payment_mode: "CASH" })).toBe("Enter the voucher amount (at least ₹1).");
  expect(sellProblem({ amount: "0.5", payment_mode: "CASH" })).toBe("Enter the voucher amount (at least ₹1).");
  expect(sellProblem({ amount: "100", payment_mode: "CASH" })).toBeNull();
  expect(voucherErrorMessage({ response: { data: { errors: { amount: ["Enter the voucher amount."] } } } }, "x")).toBe("Enter the voucher amount.");
  expect(voucherErrorMessage({ response: { data: { message: "No." } } }, "x")).toBe("No.");
  expect(voucherErrorMessage({}, "Try again")).toBe("Try again");
});

it("prints a slip with the number to quote, the amount and the last day", () => {
  const html = buildVoucherSlipHtml(LIVE, { storeName: "Coffee <1>", storeAddress: "1 Main Road", storePhone: "9000000000" });
  expect(html).toContain("GV261125-0001");
  expect(html).toContain("500.00");
  expect(html).toContain("Valid until 25 Nov 2027");
  expect(html).toContain("Coffee &lt;1&gt;");
  expect(buildVoucherSlipHtml({ ...LIVE, expires_on: null }, {})).toContain("No expiry date");
});

it("lists the vouchers with what is left on each and the total still to be used", async () => {
  renderPage();
  expect(await screen.findByText("GV261125-0001")).toBeInTheDocument();
  expect(screen.getByText("GV261125-0002")).toBeInTheDocument();
  expect(screen.getByText("₹800.00")).toBeInTheDocument();
  expect(mocks.get).toHaveBeenCalledWith("/gift-vouchers", { params: { status: "ALL" } });
});

it("sells a voucher, prints its slip and reloads the list", async () => {
  mocks.post.mockResolvedValue({ data: { message: "Gift voucher GV261125-0003 sold.", data: { ...LIVE, id: 3, display_number: "GV261125-0003" } } });
  renderPage();
  await screen.findByText("GV261125-0001");
  fireEvent.click(screen.getByRole("button", { name: /Sell gift voucher/ }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/Voucher amount/), { target: { value: "500" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Sell and print" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/gift-vouchers", { amount: 500, payment_mode: "CASH" }));
  await waitFor(() => expect(mocks.print).toHaveBeenCalled());
  expect(mocks.print.mock.calls[0][0]).toContain("GV261125-0003");
  expect(mocks.toast.success).toHaveBeenCalledWith("Gift voucher GV261125-0003 sold.");
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
});

it("shows what is wrong in the sell form and the server's reason, and does not print", async () => {
  mocks.post.mockRejectedValue({ response: { data: { errors: { payment_mode: ["Choose cash, card or UPI."] } } } });
  renderPage();
  await screen.findByText("GV261125-0001");
  fireEvent.click(screen.getByRole("button", { name: /Sell gift voucher/ }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Sell and print" }));
  expect(await within(dialog).findByText("Enter the voucher amount (at least ₹1).")).toBeInTheDocument();
  expect(mocks.post).not.toHaveBeenCalled();

  fireEvent.change(within(dialog).getByLabelText(/Voucher amount/), { target: { value: "500" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Sell and print" }));
  expect(await within(dialog).findByText("Choose cash, card or UPI.")).toBeInTheDocument();
  expect(mocks.print).not.toHaveBeenCalled();
});

it("a supervisor or above can cancel only a voucher nobody has used, and must give a reason", async () => {
  mocks.post.mockResolvedValue({ data: { message: "Gift voucher cancelled.", data: { ...LIVE, state: "CANCELLED" } } });
  renderPage();
  await screen.findByText("GV261125-0001");
  const cancelButtons = screen.getAllByRole("button", { name: /^Cancel$/ });
  expect(cancelButtons).toHaveLength(1);
  fireEvent.click(cancelButtons[0]);
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel voucher" }));
  expect(await within(dialog).findByText("Say why the voucher is cancelled.")).toBeInTheDocument();
  expect(mocks.post).not.toHaveBeenCalled();

  fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Customer changed their mind" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel voucher" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/gift-vouchers/1/cancel", { reason: "Customer changed their mind" }));
  expect(mocks.toast.success).toHaveBeenCalledWith("Gift voucher cancelled.");
});

it("a cashier is not offered the cancel button", async () => {
  mocks.role.value = "cashier";
  renderPage();
  await screen.findByText("GV261125-0001");
  expect(screen.queryByRole("button", { name: /^Cancel$/ })).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /Print/ }).length).toBeGreaterThan(0);
});
