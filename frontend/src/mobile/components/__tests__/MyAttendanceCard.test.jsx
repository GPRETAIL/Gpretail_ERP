import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MyAttendanceCard from "@/mobile/components/MyAttendanceCard";
import api from "@/shared/api/apiClient";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/mobile/utils/shrinkPhoto", () => ({ default: vi.fn().mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" })) }));

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

it("when the store asks for a selfie: take a photo, check it, then check in with it", async () => {
  URL.createObjectURL = vi.fn(() => "blob:selfie");
  URL.revokeObjectURL = vi.fn();
  locate({ latitude: 13.0801, longitude: 80.2702 });
  api.get.mockResolvedValue(me({ selfie_required: true }));
  api.post.mockResolvedValue({ data: { message: "Checked in" } });
  render(<MyAttendanceCard />);

  const takePhoto = await screen.findByRole("button", { name: "Take a photo to check in" });
  expect(api.post).not.toHaveBeenCalled();
  const input = screen.getByLabelText("Take a selfie");
  expect(input).toHaveAttribute("capture", "user");
  fireEvent.change(input, { target: { files: [new File(["raw"], "camera.jpg", { type: "image/jpeg" })] } });

  expect(await screen.findByAltText("Your photo")).toBeInTheDocument();
  expect(takePhoto).toHaveTextContent("Use photo and check in");
  fireEvent.click(screen.getByRole("button", { name: "Use photo and check in" }));

  await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
  const [url, body, options] = api.post.mock.calls[0];
  expect(url).toBe("/attendance/self-punch");
  expect(body).toBeInstanceOf(FormData);
  expect(body.get("type")).toBe("IN");
  expect(body.get("lat")).toBe("13.0801");
  expect(body.get("photo")).toBeInstanceOf(Blob);
  expect(options.headers["Content-Type"]).toBe("multipart/form-data");
  await waitFor(() => expect(screen.queryByAltText("Your photo")).not.toBeInTheDocument());
});

it("Retake throws the photo away and asks for another before anything is sent", async () => {
  URL.createObjectURL = vi.fn(() => "blob:selfie");
  URL.revokeObjectURL = vi.fn();
  locate({ latitude: 13.0801, longitude: 80.2702 });
  api.get.mockResolvedValue(me({ selfie_required: true }));
  render(<MyAttendanceCard />);
  await screen.findByRole("button", { name: "Take a photo to check in" });
  fireEvent.change(screen.getByLabelText("Take a selfie"), { target: { files: [new File(["raw"], "camera.jpg", { type: "image/jpeg" })] } });
  await screen.findByAltText("Your photo");
  fireEvent.click(screen.getByRole("button", { name: "Retake" }));
  expect(screen.queryByAltText("Your photo")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Take a photo to check in" })).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

it("shows the server's reason when the photo is refused", async () => {
  URL.createObjectURL = vi.fn(() => "blob:selfie");
  URL.revokeObjectURL = vi.fn();
  locate({ latitude: 13.0801, longitude: 80.2702 });
  api.get.mockResolvedValue(me({ selfie_required: true }));
  api.post.mockRejectedValue({ response: { status: 422, data: { errors: { photo: ["The photo is too big. Take it again."] } } } });
  render(<MyAttendanceCard />);
  await screen.findByRole("button", { name: "Take a photo to check in" });
  fireEvent.change(screen.getByLabelText("Take a selfie"), { target: { files: [new File(["raw"], "camera.jpg", { type: "image/jpeg" })] } });
  fireEvent.click(await screen.findByRole("button", { name: "Use photo and check in" }));
  expect(await screen.findByText("The photo is too big. Take it again.")).toBeInTheDocument();
});
