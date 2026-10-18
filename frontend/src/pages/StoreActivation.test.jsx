import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import api from "../api/axios";
import StoreActivation from "./StoreActivation";

vi.mock("../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("loads provisioned stores and refreshes them after activation succeeds", async () => {
  const store = { id: 1, name: "Test Store", code: "STR-1", activated_at: null };
  api.get.mockResolvedValueOnce({ data: { data: [store] } })
    .mockResolvedValueOnce({ data: { data: [{ ...store, activated_at: "2026-10-18", is_active: true }] } });
  api.post.mockResolvedValue({ data: { message: "Store activated" } });
  render(<StoreActivation />);
  await screen.findByText("Pending activation");
  fireEvent.change(screen.getByLabelText("Store code", { exact: false }), { target: { value: "STR-1" } });
  fireEvent.change(screen.getByLabelText("Activation code or License Key", { exact: false }), { target: { value: "activation" } });
  fireEvent.click(screen.getByRole("button", { name: "Activate store", exact: true }));
  await screen.findByText("Store activated");
  expect(api.post).toHaveBeenCalledWith("/company-stores/activate", { store_code: "STR-1", activation_code: "activation" });
  await screen.findByText("Activated");
  expect(api.get).toHaveBeenCalledTimes(2);
});

it("shows the server error when initial store loading fails", async () => {
  api.get.mockRejectedValue({ response: { data: { message: "Company unavailable" } } });
  render(<StoreActivation />);
  await waitFor(() => expect(screen.getByText("Company unavailable")).toBeTruthy());
});
