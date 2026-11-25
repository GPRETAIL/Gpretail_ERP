import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AttendanceSettingsDialog from "@/features/hr/attendance/AttendanceSettingsDialog";
import PunchLog from "@/features/hr/attendance/PunchLog";
import api from "@/shared/api/apiClient";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { id: 3, store_id: 2, role: "manager" } } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

it("HR turns on the selfie rule for the store and saves it with the other attendance settings", async () => {
  api.get.mockImplementation(async (url) => ({ data: { data: url === "/attendance/settings" ? { shift_start: "09:30", late_cutoff: "10:00", lat: null, lng: null, radius_m: 100, selfie_required: false } : [] } }));
  api.put.mockResolvedValue({ data: {} });
  const onClose = vi.fn();
  render(<AttendanceSettingsDialog onClose={onClose} />);
  const toggle = await screen.findByLabelText("Ask for a photo with every check in and check out");
  expect(toggle).not.toBeChecked();
  fireEvent.click(toggle);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/attendance/settings", expect.objectContaining({ selfie_required: true })));
  expect(onClose).toHaveBeenCalledWith(true);
});

it("the punch log offers a photo only where there is one, and shows it from the private link", async () => {
  api.get.mockImplementation(async (url) => (url === "/attendance/punches"
    ? { data: { data: [
      { id: 7, employee: "Asha", code: "E1", date: "2026-11-04", time: "09:31:00", type: "IN", source: "SELF", distance_m: 40, has_photo: true },
      { id: 8, employee: "Ravi", code: "E2", date: "2026-11-04", time: "09:40:00", type: "IN", source: "MANAGER", distance_m: null, has_photo: false },
    ] } }
    : { data: new Blob(["jpeg"], { type: "image/jpeg" }) }));
  render(<MemoryRouter><TransferActivityProvider><PunchLog from="2026-11-04" to="2026-11-04" onRangeChange={vi.fn()} /></TransferActivityProvider></MemoryRouter>);
  await screen.findByText("Asha");
  expect(screen.getAllByRole("button", { name: "View photo" })).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "View photo" }));
  expect(await screen.findByAltText(/Check-in photo, Asha 2026-11-04/)).toHaveAttribute("src", "blob:photo");
  expect(api.get).toHaveBeenCalledWith("/attendance/punches/7/photo", { responseType: "blob" });
});
