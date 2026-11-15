import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const api = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: api }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";
import LoginSessions from "@/features/settings/users/LoginSessions";

const rows = [
  { id: 1, user_id: 1, user_name: "Owner", username: "owner", role: "admin", store_name: "All stores", client: "web", device: "Chrome on Windows",
    ip_address: "10.0.0.2", signed_in_at: "2026-11-15T10:00:00Z", last_active_at: "2026-11-15T10:05:00Z", active_now: true, is_current: true },
  { id: 2, user_id: 7, user_name: "Ravi", username: "till1", role: "cashier", store_name: "Main Branch", client: "staff", device: "Chrome on Android",
    ip_address: "10.0.0.9", signed_in_at: "2026-11-15T09:00:00Z", last_active_at: "2026-11-15T09:10:00Z", active_now: false, is_current: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { data: rows } });
  api.delete.mockResolvedValue({ data: { message: "Session ended." } });
});

it("lists who is signed in, marks the admin's own session, and ends another after confirming", async () => {
  render(<MemoryRouter><TransferActivityProvider><LoginSessions /></TransferActivityProvider></MemoryRouter>);
  expect(await screen.findByText("Ravi")).toBeTruthy();
  expect(screen.getByText("Staff app (HR)")).toBeTruthy();
  expect(screen.getByText("This session")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "End session of Owner" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "End session of Ravi" }));
  fireEvent.click(await screen.findByRole("button", { name: "End session" }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/login-sessions/2"));

  fireEvent.click(await screen.findByRole("button", { name: "End all sessions of Ravi" }));
  fireEvent.click(await screen.findByRole("button", { name: "End session" }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/login-sessions/user/7"));
});
