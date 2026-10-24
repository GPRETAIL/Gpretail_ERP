import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import checkAuth from "../utils/checkAuth";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import api from "../api/axios";
import StoreActivation from "./StoreActivation";

vi.mock("../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../utils/checkAuth", () => ({ default: vi.fn().mockResolvedValue(undefined) }));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("loads provisioned stores and refreshes them after activation succeeds", async () => {
  const store = { id: 1, name: "Test Store", code: "STR-1", activated_at: null };
  api.get.mockResolvedValueOnce({ data: { data: [store] } })
    .mockResolvedValueOnce({ data: { data: [{ ...store, activated_at: "2026-10-18", is_active: true }] } });
  api.post.mockResolvedValue({ data: { message: "Store activated" } });
  render(<Provider store={configureStore({ reducer: () => ({}) })}><StoreActivation /></Provider>);
  await screen.findByText("Pending activation");
  fireEvent.change(screen.getByLabelText("Store code", { exact: false }), { target: { value: "STR-1" } });
  fireEvent.change(screen.getByLabelText("Activation code or License Key", { exact: false }), { target: { value: "activation" } });
  fireEvent.click(screen.getByRole("button", { name: "Activate store", exact: true }));
  await screen.findByText("Store activated");
  expect(api.post).toHaveBeenCalledWith("/company-stores/activate", { store_code: "STR-1", activation_code: "activation" });
  await screen.findByText("Activated");
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(checkAuth).toHaveBeenCalledOnce();
});

it("shows the server error when initial store loading fails", async () => {
  api.get.mockRejectedValue({ response: { data: { message: "Company unavailable" } } });
  render(<Provider store={configureStore({ reducer: () => ({}) })}><StoreActivation /></Provider>);
  await waitFor(() => expect(screen.getByText("Company unavailable")).toBeTruthy());
  expect(screen.queryByText(/No stores have been provisioned/)).not.toBeInTheDocument();
});

it("accepts the complete welcome-email license key and fills the store code", async () => {
  api.get.mockResolvedValue({ data: { data: [] } });
  api.post.mockResolvedValue({ data: { message: "Store activated" } });
  render(<Provider store={configureStore({ reducer: () => ({}) })}><StoreActivation /></Provider>);
  await waitFor(() => expect(screen.getByRole("button", { name: "Activate store", exact: true })).toBeEnabled());
  const key = `GPR-${btoa(JSON.stringify({ s: "STR-KEY", o: "one-use" }))}`;
  fireEvent.change(screen.getByLabelText(/Activation code/), { target: { value: key } });
  expect(screen.getByLabelText(/Store code/)).toHaveValue("STR-KEY");
  fireEvent.click(screen.getByRole("button", { name: "Activate store", exact: true }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/company-stores/activate", { store_code: "STR-KEY", license_key: key }));
  await screen.findByText("Store activated");
  expect(screen.getByLabelText(/Activation code/)).toHaveValue("");
});

it("clears a consumed code even when the post-activation list refresh fails", async () => {
  api.get.mockResolvedValueOnce({ data: { data: [] } }).mockRejectedValueOnce(new Error("Offline"));
  api.post.mockResolvedValue({ data: { message: "Store activated" } });
  render(<Provider store={configureStore({ reducer: () => ({}) })}><StoreActivation /></Provider>);
  await waitFor(() => expect(screen.getByRole("button", { name: "Activate store", exact: true })).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/Store code/), { target: { value: "STR-1" } });
  fireEvent.change(screen.getByLabelText(/Activation code/), { target: { value: "one-use" } });
  fireEvent.click(screen.getByRole("button", { name: "Activate store", exact: true }));
  await screen.findByText(/Store activated, but the ERP list could not refresh/);
  expect(screen.getByLabelText(/Activation code/)).toHaveValue("");
});
