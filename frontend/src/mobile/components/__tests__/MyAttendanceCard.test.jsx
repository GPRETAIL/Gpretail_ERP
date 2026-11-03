import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MyAttendanceCard from "@/mobile/components/MyAttendanceCard";
import api from "@/shared/api/apiClient";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const me = (overrides = {}) => ({ data: { data: {
  employee: { id: 1, name: "Asha" }, date: "2026-11-04", shift: { name: "Day shift", start: "09:30", end: "18:30" },
  attendance: null, punches: [], next: "IN", geofence: { lat: 13.08, lng: 80.27, radius_m: 100 }, ...overrides,
} } });
const original = navigator.geolocation;
const locate = (coords) => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (ok, fail) => (coords ? ok({ coords }) : fail(new Error("denied"))) } });
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => Object.defineProperty(navigator, "geolocation", { configurable: true, value: original }));

it("checks in with the phone's location", async () => {
  locate({ latitude: 13.0801, longitude: 80.2702 });
  api.get.mockResolvedValueOnce(me()).mockResolvedValueOnce(me({ attendance: { status: "PRESENT", check_in: "09:45:00" }, next: "OUT" }));
  api.post.mockResolvedValue({ data: { message: "Checked in" } });
  render(<MyAttendanceCard />);
  fireEvent.click(await screen.findByRole("button", { name: "Check in" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/attendance/self-punch", { type: "IN", lat: 13.0801, lng: 80.2702 }));
  expect(await screen.findByRole("button", { name: "Check out" })).toBeInTheDocument();
  expect(screen.getByText("In 9:45 AM")).toBeInTheDocument();
  expect(screen.getByText(/within 100 m of the store/)).toBeInTheDocument();
});

it("explains why a check-in was refused", async () => {
  locate({ latitude: 13.2, longitude: 80.27 });
  api.get.mockResolvedValue(me());
  api.post.mockRejectedValue({ response: { status: 422, data: { errors: { location: ["You are 1001 m from the store. Check-in is allowed within 100 m."] } } } });
  render(<MyAttendanceCard />);
  fireEvent.click(await screen.findByRole("button", { name: "Check in" }));
  expect(await screen.findByText("You are 1001 m from the store. Check-in is allowed within 100 m.")).toBeInTheDocument();

  locate(null); // Location refused while the store requires it: no request is sent.
  api.post.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Check in" }));
  expect(await screen.findByText("Allow location access to check in.")).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

it("shows nothing for a login that is not an employee", async () => {
  api.get.mockResolvedValue({ data: { data: { employee: null } } });
  const { container } = render(<MyAttendanceCard />);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
