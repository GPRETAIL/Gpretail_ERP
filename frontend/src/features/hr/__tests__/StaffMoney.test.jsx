import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ExpenseClaims, LeaveEncashment, MyClaims, StaffLoans } from "@/features/hr/money/StaffMoney";
import ClaimsScreen from "@/mobile/screens/ClaimsScreen";
import LeaveScreen from "@/mobile/screens/LeaveScreen";
import api from "@/shared/api/apiClient";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const mockUser = vi.hoisted(() => ({ current: { id: 3, store_id: 2, role: "manager" } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: mockUser.current } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => vi.fn() }));

const claim = { id: 11, employee_id: 1, employee_name: "Asha", claim_date: "2026-10-10", category: "TRAVEL", amount: 500, description: "Bus fare", status: "PENDING", has_bill: true };
const loan = { id: 21, employee_id: 1, employee_name: "Asha", type: "LOAN", amount: 9000, instalments: 3, instalment_amount: 3000, first_month: "2026-11", status: "APPROVED", recovered: 0, balance: 9000 };
const running = { ...loan, id: 22, status: "ACTIVE", recovered: 3000, balance: 6000 };
const wrap = (node) => render(<MemoryRouter><TransferActivityProvider>{node}</TransferActivityProvider></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.current = { id: 3, store_id: 2, role: "manager" };
  api.get.mockImplementation(async (url, config) => ({ data: {
    "/staff-money/mine": { data: { employee: { id: 1, name: "Asha" }, claims: [claim], loans: [running] } },
    "/expense-claims": { data: [claim] },
    "/staff-loans": { data: config?.params?.status === "ACTIVE" ? [running] : [loan] },
    "/employees": { data: [{ id: 1, name: "Asha", code: "E1" }] },
    "/leave-encashments": { data: [] },
    "/leave/balances": { data: { year: 2026, types: [{ id: 3, code: "EL", name: "Earned Leave", is_paid: true }, { id: 4, code: "LOP", name: "Loss of Pay", is_paid: false }],
      rows: [{ employee_id: 1, name: "Asha", code: "E1", EL: { allocated: 12, balance: 8 }, LOP: { allocated: 0, balance: 0 } }] } },
    "/leave/mine": { data: { employee: { id: 9, name: "Boss" }, balances: [], applications: [] } },
    "/leave-applications": { data: [] },
    "/staff-requests": { data: [] },
  }[url] || { data: [] } }));
  api.post.mockResolvedValue({ data: { message: "Done" } });
});

it("sends an expense claim with the bill attached", async () => {
  wrap(<MyClaims />);
  expect(await screen.findByText("Bus fare")).toBeInTheDocument();
  expect(screen.getByText(/₹6,000.00 of advances and loans/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "New claim" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Amount (₹)"), { target: { value: "250" } });
  const bill = new File(["x"], "bill.jpg", { type: "image/jpeg" });
  fireEvent.change(dialog.querySelector('input[type="file"]'), { target: { files: [bill] } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Send for approval" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/expense-claims", expect.any(FormData), { headers: { "Content-Type": "multipart/form-data" } }));
  const body = api.post.mock.calls[0][1];
  expect(body.get("amount")).toBe("250");
  expect(body.get("category")).toBe("TRAVEL");
  expect(body.get("bill")).toBe(bill);
});

it("asks for a loan repaid over three salaries", async () => {
  wrap(<MyClaims />);
  fireEvent.click(await screen.findByRole("button", { name: "Ask for advance" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Loan" }));
  fireEvent.change(within(dialog).getByLabelText("Amount (₹)"), { target: { value: "9000" } });
  fireEvent.change(within(dialog).getByLabelText("Months to repay"), { target: { value: "3" } });
  expect(within(dialog).getByText(/₹3,000.00 will be taken from each of 3 salaries/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Send for approval" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/staff-loans", expect.objectContaining({ type: "LOAN", amount: 9000, instalments: 3 })));
});

it("approves a claim to be paid now", async () => {
  wrap(<ExpenseClaims />);
  expect(await screen.findByText("Bus fare")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Pay now" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/expense-claims/11/decide", { action: "approve", note: undefined, pay_via: "DIRECT" }));
});

it("pays out an approved loan and repays a running one", async () => {
  wrap(<StaffLoans />);
  fireEvent.click(await screen.findByRole("button", { name: "Pay out" }));
  let dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText("Paid by"));
  fireEvent.click(await screen.findByRole("option", { name: "Bank" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/staff-loans/21/disburse", expect.objectContaining({ pay_mode: "BANK", first_month: "2026-11" })));

  fireEvent.click(screen.getByRole("button", { name: "Recovering" }));
  fireEvent.click(await screen.findByRole("button", { name: "Repay" }));
  dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("Amount (₹)")).toHaveValue(6000);
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/staff-loans/22/repay", expect.objectContaining({ amount: 6000, pay_mode: "CASH" })));
});

it("encashes earned leave against the balance", async () => {
  wrap(<LeaveEncashment />);
  fireEvent.click(await screen.findByRole("button", { name: "Encash leave" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(await within(dialog).findByLabelText("Employee"));
  fireEvent.click(await screen.findByRole("option", { name: "Asha (E1)" }));
  fireEvent.mouseDown(within(dialog).getByLabelText("Leave type"));
  expect(screen.queryByRole("option", { name: /Loss of Pay/ })).not.toBeInTheDocument(); // Only paid leave.
  fireEvent.click(await screen.findByRole("option", { name: "Earned Leave · 8 left" }));
  fireEvent.change(within(dialog).getByLabelText("Days"), { target: { value: "2" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Encash" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/leave-encashments", expect.objectContaining({ employee_id: 1, leave_type_id: 3, days: 2 })));
});

it("claims on the phone with a bill photo", async () => {
  render(<ClaimsScreen />);
  expect(await screen.findByText(/₹6,000 still to be recovered/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "New claim" }));
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "120" } });
  const photo = new File(["x"], "photo.jpg", { type: "image/jpeg" });
  fireEvent.change(document.querySelector('input[capture="environment"]'), { target: { files: [photo] } });
  expect(screen.getByText("Attached: photo.jpg")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/expense-claims", expect.any(FormData), { headers: { "Content-Type": "multipart/form-data" } }));
  expect(api.post.mock.calls[0][1].get("bill")).toBe(photo);
  expect(await screen.findByText("Claim sent for approval.")).toBeInTheDocument();
});

it("lets a manager approve claims on the phone's Leave screen", async () => {
  render(<LeaveScreen />);
  expect(await screen.findByText(/Claims and advances \(2\)/)).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]);
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/expense-claims/11/decide", { action: "approve" }));
});
