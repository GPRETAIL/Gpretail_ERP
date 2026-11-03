import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import EmployeeInOut from "@/features/hr/attendance/EmployeeInOut";
import api from "@/shared/api/apiClient";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const mockUser = vi.hoisted(() => ({ current: { id: 3, store_id: 2, role: "manager" } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: mockUser.current } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => vi.fn() }));

const today = {
  date: "2026-11-04", today: "2026-11-04", settings: {},
  summary: { total: 2, present: 1, late: 1, half_day: 0, absent: 0, leave: 0, off: 0, not_marked: 1 },
  rows: [
    { employee_id: 1, name: "Asha", code: "E1", status: "PRESENT", check_in: "10:20:00", check_out: null, late_minutes: 50, worked_minutes: 0, source: "AUTO" },
    { employee_id: 2, name: "Ravi", code: "E2", status: "NOT_MARKED", check_in: null, check_out: null, late_minutes: 0, worked_minutes: 0, source: null },
  ],
};
const monthly = { month: "2026-11", days_in_month: 30, rows: [{ employee_id: 1, name: "Asha", code: "E1", days: { 1: "WO", 2: "P", 3: "HD", 4: "L" }, present: 1, half_day: 1, absent: 0, leave: 1, off: 1, late: 0, payable_days: 3.5 }] };
const wrap = () => render(<MemoryRouter><TransferActivityProvider><EmployeeInOut /></TransferActivityProvider></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.current = { id: 3, store_id: 2, role: "manager" };
  api.get.mockImplementation(async (url) => ({ data: { data: url === "/attendance/monthly" ? monthly : url === "/attendance/punches" ? [] : today } }));
  api.post.mockResolvedValue({ data: { message: "1 employee(s) updated" } });
});

it("shows the day board, filters late comers, and marks an employee", async () => {
  wrap();
  expect(await screen.findByText("Asha")).toBeInTheDocument();
  expect(screen.getByText("50m")).toBeInTheDocument(); // Late.
  expect(screen.getByText("10:20 AM")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Late 1" }));
  await waitFor(() => expect(screen.queryByText("Ravi")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "All 2" }));

  const ravi = (await screen.findByText("Ravi")).closest("tr");
  fireEvent.click(within(ravi).getByRole("button", { name: "In" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/attendance/punch", { employee_ids: [2], type: "IN", date: "2026-11-04" }));

  fireEvent.click(within(ravi).getByRole("button", { name: "Mark" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Remarks"), { target: { value: "Doctor visit" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/attendance/mark", { employee_ids: [2], date: "2026-11-04", status: "PRESENT", remarks: "Doctor visit" }));
});

it("shows the monthly register with day codes and payable days", async () => {
  wrap();
  await screen.findByText("Asha");
  fireEvent.click(screen.getByRole("tab", { name: "Monthly register" }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/attendance/monthly", { params: { month: expect.stringMatching(/^\d{4}-\d{2}$/) } }));
  expect(await screen.findByText("3.5")).toBeInTheDocument();
  expect(screen.getAllByText("HD").length).toBeGreaterThan(1); // The column and Asha's 3rd.
});

it("hides punching and marking from staff", async () => {
  mockUser.current = { id: 9, store_id: 2, role: "cashier" };
  wrap();
  await screen.findByText("Asha");
  expect(screen.queryByRole("button", { name: "Mark" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
});
