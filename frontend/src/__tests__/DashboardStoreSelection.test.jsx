import { configureStore } from "@reduxjs/toolkit";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import authReducer from "../features/authSlice";
import Dashboard from "../pages/Dashboard";
import api from "../api/axios";
vi.mock("../api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../components/dashboard/DashboardGrid", () => ({ default: () => null }));
vi.mock("react-toastify", () => ({ toast: { warn: vi.fn(), error: vi.fn() } }));
beforeEach(() => {
  cleanup(); vi.clearAllMocks(); sessionStorage.clear(); localStorage.clear();
  api.get.mockImplementation(async (url) => ({ data: { success: true, data: url === "/companies" ? [{ id: 2, name: "Coffee 1" }, { id: 3, name: "Coffee 2" }] : {} } }));
});
const showDashboard = (user) => render(<Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user, token: "test" } } })}><MemoryRouter><Dashboard /></MemoryRouter></Provider>);
it("allows a Tenant Administrator with role admin to open the store picker and honors the shared selection", async () => {
  sessionStorage.setItem("activeStoreId", "3");
  showDashboard({ id: 1, role: "admin", is_tenant_admin: true, company_id: 2, store_ids: [2, 3] });
  const picker = screen.getByRole("combobox", { name: "Company" });
  await waitFor(() => expect(picker).toHaveTextContent("Coffee 2"));
  expect(api.get).toHaveBeenCalledWith("/dashboard", expect.objectContaining({ params: expect.objectContaining({ company_id: "3" }) }));
  fireEvent.mouseDown(picker);
  expect(await screen.findByRole("option", { name: "Coffee 1" })).toBeEnabled();
  expect(screen.getByRole("option", { name: "Coffee 2" })).toBeEnabled();
  expect(screen.getByRole("option", { name: "All Stores" })).toBeInTheDocument();
});
it("keeps a store-bound administrator locked to their assigned store", async () => {
  showDashboard({ id: 2, role: "admin", is_tenant_admin: false, company_id: 2, store_ids: [2] });
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Company" })).toHaveValue("Coffee 1"));
  expect(screen.queryByRole("combobox", { name: "Company" })).not.toBeInTheDocument();
});

it("labels the combined scope All Stores instead of leaving the selector blank", async () => {
  showDashboard({ id: 1, role: "admin", is_tenant_admin: true, store_ids: [2, 3] });
  expect(screen.getByRole("combobox", { name: "Company" })).toHaveTextContent("All Stores");
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/dashboard", expect.objectContaining({ params: expect.objectContaining({ allStores: "true" }) })));
});
