import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import LeavePage from "@/features/hr/leave/LeavePage";
import { LeaveApprovalsPage } from "@/features/hr/HrSectionPages";
import api from "@/shared/api/apiClient";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const mockUser = vi.hoisted(() => ({ current: { id: 3, store_id: 2, role: "supervisor" } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: mockUser.current } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => vi.fn() }));

const mine = {
  employee: { id: 1, name: "Lead" }, year: 2026,
  balances: [
    { leave_type_id: 11, code: "CL", name: "Casual Leave", is_paid: true, allow_half_day: true, allocated: 12, used: 2, balance: 10, pending: 1, available: 9 },
    { leave_type_id: 14, code: "LOP", name: "Loss of Pay", is_paid: false, allow_half_day: true, allocated: 0, used: 0, balance: 0, pending: 0, available: null },
  ],
  applications: [{ id: 5, leave_type_name: "Casual Leave", from_date: "2026-11-20", to_date: "2026-11-20", days: 1, status: "PENDING" }],
};
const pending = [{ id: 7, employee_name: "Asha", leave_type_name: "Casual Leave", from_date: "2026-11-05", to_date: "2026-11-06", days: 2, status: "PENDING", reason: "Family" }];

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.current = { id: 3, store_id: 2, role: "supervisor" };
  api.get.mockImplementation(async (url) => ({ data: { data: url === "/leave/mine" ? mine : url === "/leave-applications" ? pending : [] } }));
  api.post.mockResolvedValue({ data: { message: "Done" } });
});

const wrap = (node = <LeavePage />) => render(<MemoryRouter><TransferActivityProvider>{node}</TransferActivityProvider></MemoryRouter>);

it("shows what is left and applies for a half day", async () => {
  wrap();
  expect(await screen.findByText("Casual Leave", { selector: "span" })).toBeInTheDocument();
  expect(screen.getByText("9")).toBeInTheDocument();
  expect(screen.getByText("of 12 · used 2 · 1 pending")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/leave-applications/5/cancel"));

  fireEvent.click(screen.getByRole("button", { name: "Apply for leave" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("9 day(s) available")).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText("From"), { target: { value: "2026-12-01" } });
  fireEvent.click(within(dialog).getByLabelText("Half day"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/leave-applications", expect.objectContaining({ leave_type_id: 11, from_date: "2026-12-01", to_date: "2026-12-01", half_day: true })));
});

it("lets a manager approve from the inbox with a note", async () => {
  wrap(<LeaveApprovalsPage />);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/leave-applications", { params: { status: "PENDING", inbox: 1, year: undefined } }));
  fireEvent.click((await screen.findByRole("button", { name: "Approve" })));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Note to the employee"), { target: { value: "Enjoy" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/leave-applications/7/approve", { note: "Enjoy" }));
});

it("lets staff apply only for themselves", async () => {
  mockUser.current = { id: 9, store_id: 2, role: "cashier" };
  wrap();
  await screen.findByText("Casual Leave", { selector: "span" });
  fireEvent.click(screen.getByRole("button", { name: "Apply for leave" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).queryByLabelText("Employee")).not.toBeInTheDocument(); // No "on behalf of" for staff.
  expect(api.get).not.toHaveBeenCalledWith("/employees", expect.anything());
});
