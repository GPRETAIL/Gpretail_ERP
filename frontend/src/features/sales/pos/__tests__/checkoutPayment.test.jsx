import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), navigate: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get } }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => mocks.navigate }));
import { checkoutPaymentProblem } from "@/features/sales/pos/utils/checkoutPayment";
import { computePaymentTotalsFromForm } from "@/features/sales/pos/utils/posSalesUtils";
import { paymentDialogOn } from "@/features/sales/customisation/utils/salesReceiptCustomisation";
import useBillingGate from "@/features/sales/pos/hooks/useBillingGate";
import CashNotOpenedDialog from "@/features/sales/pos/components/CashNotOpenedDialog";
import DealerPaymentDialog from "@/features/sales/dealer/components/DealerPaymentDialog";

beforeEach(() => { mocks.get.mockReset(); mocks.navigate.mockReset(); });
afterEach(cleanup);

const totals = (form, loyalty = 0) => computePaymentTotalsFromForm({ cardAmount: "0", upiAmount: "0", ...form }, { amount: 1000, billsAmount: 1000 }, loyalty);

it("payment rules: card type needed, card+UPI within the balance, the bill covered", () => {
  expect(checkoutPaymentProblem({ cardTypeId: "" }, totals({ cashAmount: "400", cardAmount: "600" }))).toBe("Select the card type.");
  expect(checkoutPaymentProblem({ cardTypeId: "1" }, totals({ cashAmount: "400", cardAmount: "700" }))).toMatch(/cannot be more than the balance/);
  expect(checkoutPaymentProblem({}, totals({ cashAmount: "500" }))).toMatch(/less than the bill/);
  expect(checkoutPaymentProblem({ cardTypeId: "1" }, totals({ cashAmount: "300", cardAmount: "600" }, 100))).toBeNull(); // points count
});

it("which pages open the payment dialog", () => {
  expect(paymentDialogOn({}, "pos_sales")).toBe(true);
  expect(paymentDialogOn({ posPaymentDialogVisible: false }, "pos_sales")).toBe(false);
  expect(paymentDialogOn({ paymentDialogPages: ["pos_old"] }, "pos_old")).toBe(true);
  expect(paymentDialogOn({ paymentDialogPages: ["pos_old"] }, "touch_sales")).toBe(false);
  expect(paymentDialogOn({}, "dealer_invoice")).toBe(false);
});

function Gate() {
  const gate = useBillingGate({ onCounterRequired: vi.fn() });
  return <CashNotOpenedDialog block={gate.block} onClose={gate.close} />;
}

it("a POS page shows 'Cash not opened' on load and goes to Cash Opening", async () => {
  mocks.get.mockResolvedValue({ data: { data: { block: { code: "CASH_NOT_OPENED", message: "Open the cash for Till 1 (Sales > Cash Opening) before billing." } } } });
  render(<MemoryRouter><Gate /></MemoryRouter>);
  expect(await screen.findByText("Open the cash for Till 1 (Sales > Cash Opening) before billing.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open cash" }));
  expect(mocks.navigate).toHaveBeenCalledWith("/sales/cash-opening");
});

it("Dealer Invoice payment dialog: Credit or Paid now, with what stays on credit", async () => {
  mocks.get.mockResolvedValue({ data: { data: [] } });
  const onConfirm = vi.fn();
  const onChange = vi.fn();
  const { rerender } = render(<DealerPaymentDialog total={1000} payments={[]} onChange={onChange} saving={false} onConfirm={onConfirm} onClose={vi.fn()} />);
  expect(screen.getByText(/The whole invoice, ₹1,000.00, goes on the dealer's account as credit/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Paid now" }));
  expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ mode: "CASH", amount: "1000.00" })]);

  rerender(<DealerPaymentDialog total={1000} payments={[{ mode: "CASH", amount: "300" }]} onChange={onChange} saving={false} onConfirm={onConfirm} onClose={vi.fn()} />);
  expect(screen.getAllByText("₹700.00").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Credit" }));
  expect(onChange).toHaveBeenLastCalledWith([]);
  fireEvent.click(screen.getByRole("button", { name: "Save invoice" }));
  await waitFor(() => expect(onConfirm).toHaveBeenCalled());
});
