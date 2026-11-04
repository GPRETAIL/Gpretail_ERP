import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import ShiftRoster from "@/features/hr/roster/ShiftRoster";
import OtApprovals from "@/features/hr/requests/OtApprovals";
import Movements from "@/features/hr/requests/Movements";
import { MyRequests, RequestApprovals } from "@/features/hr/requests/StaffRequests";
import MyRequestsCard from "@/mobile/components/MyRequestsCard";
import api from "@/shared/api/apiClient";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const mockUser = vi.hoisted(() => ({ current: { id: 3, store_id: 2, role: "manager" } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: mockUser.current } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => vi.fn() }));

const dates = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"];
const roster = {
  from: "2026-11-02", dates, shifts: [{ id: 5, name: "Evening", from_time: "14:00", to_time: "22:00" }],
  rows: [{ employee_id: 1, name: "Asha", usual_shift: "Day", week_off: "Sunday",
    days: Object.fromEntries(dates.map((d) => [d, { rostered: d === "2026-11-04", is_off: d === "2026-11-08", working_hour_id: d === "2026-11-04" ? 5 : null, shift: d === "2026-11-04" ? "Evening" : null }])) }],
};
const request = { id: 9, type: "ATTENDANCE", from_date: "2026-11-03", to_date: "2026-11-03", payload: { check_out: "18:30" }, reason: "Forgot", status: "PENDING", employee_name: "Asha" };
const wrap = (node) => render(<MemoryRouter><TransferActivityProvider>{node}</TransferActivityProvider></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.current = { id: 3, store_id: 2, role: "manager" };
  api.get.mockImplementation(async (url) => ({ data: {
    "/shift-roster": { data: roster },
    "/staff-requests/mine": { data: { employee: { id: 1, name: "Asha" }, shifts: [{ id: 5, name: "Evening" }], requests: [request] } },
    "/staff-requests": { data: [request] },
    "/overtime": { data: [{ id: 21, date: "2026-11-03", name: "Asha", check_in: "09:30:00", check_out: "20:30:00", worked_minutes: 660, ot_minutes: 120, ot_status: "PENDING" }] },
    "/employee-movements": { data: [], stores: [{ id: 2, name: "Main" }, { id: 4, name: "Branch" }] },
    "/employees": { data: [{ id: 1, name: "Asha", code: "E1" }] },
    "/hr-designations": { data: [{ id: 7, name: "Senior Cashier" }] },
    "/payroll/structures": { data: { structures: [] } },
  }[url] || { data: [] } }));
  api.post.mockResolvedValue({ data: { message: "Done" } });
  api.put.mockResolvedValue({ data: { message: "Done" } });
});

it("shows the week's roster and sets a day off from a cell", async () => {
  wrap(<ShiftRoster />);
  expect(await screen.findByText("Evening")).toBeInTheDocument();
  fireEvent.click(screen.getAllByText("Usual")[0].closest("td"));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Day off" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/shift-roster/cell", { employee_id: 1, date: "2026-11-02", is_off: true }));
});

it("asks to fix a missed check-out and lets a manager approve it", async () => {
  wrap(<MyRequests />);
  fireEvent.click(await screen.findByRole("button", { name: "Fix attendance" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Check-out"), { target: { value: "18:30" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Send for approval" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/staff-requests", expect.objectContaining({ type: "ATTENDANCE", check_out: "18:30" })));
});

it("approves a request from the approvals list", async () => {
  wrap(<RequestApprovals />);
  expect(await screen.findByText("Out 6:30 PM")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Approve" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/staff-requests/9/approve", { note: undefined }));
});

it("approves part of a day's overtime", async () => {
  wrap(<OtApprovals />);
  expect(await screen.findByText("2h 00m")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Part" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByRole("spinbutton"), { target: { value: "1.5" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/overtime/decide", { ids: [21], action: "approve", minutes: 90 }));
});

it("records a promotion with a pay rise", async () => {
  wrap(<Movements />);
  fireEvent.click(await screen.findByRole("button", { name: "New change" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.mouseDown(within(dialog).getByLabelText("Employee"));
  fireEvent.click(await screen.findByRole("option", { name: "Asha (E1)" }));
  fireEvent.mouseDown(within(dialog).getByLabelText("New designation"));
  fireEvent.click(await screen.findByRole("option", { name: "Senior Cashier" }));
  fireEvent.change(within(dialog).getByLabelText("New Gross Pay ₹"), { target: { value: "21000" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/employee-movements", expect.objectContaining({ employee_id: 1, type: "PROMOTION", values: { designation_id: "7", gross_pay: "21000" } })));
});

it("offers fix-attendance and change-shift on the phone", async () => {
  render(<MyRequestsCard />);
  fireEvent.click(await screen.findByRole("button", { name: "Change shift" }));
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/staff-requests", expect.objectContaining({ type: "SHIFT", working_hour_id: 5 })));
  expect(await screen.findByText("Request sent for approval.")).toBeInTheDocument();
});
