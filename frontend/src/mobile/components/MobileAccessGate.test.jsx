import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, expect, it, vi } from "vitest";
import MobileAccessGate from "./MobileAccessGate";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../api/axios", () => ({ default: { get } }));
const show = () => render(<Provider store={configureStore({ reducer: { auth: () => ({}) } })}><MobileAccessGate><div>Licensed workspace</div></MobileAccessGate></Provider>);
const response = (stores, tenantAdmin = true) => ({ data: { data: { mobile_session: true, tenant_admin: tenantAdmin, stores, portal_url: "https://company.gpsoftware.in/login" } } });
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });

it("does not mount business screens when subscription access is unavailable", async () => {
  get.mockResolvedValue(response([{ id: 4, name: "Branch", allowed: false, reason: "MOBILE_SUBSCRIPTION_REQUIRED" }]));
  show();
  expect(await screen.findByText(/does not include mobile access/)).toBeInTheDocument();
  expect(screen.queryByText("Licensed workspace")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Purchase or manage subscription" })).toHaveAttribute("href", "https://company.gpsoftware.in/login");
});

it("directs store users to their administrator without showing a purchase link", async () => {
  get.mockResolvedValue(response([{ id: 4, allowed: false, reason: "MOBILE_USER_ACCESS_DENIED" }], false));
  show();
  expect(await screen.findByText(/Contact your Tenant Administrator/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Purchase or manage subscription" })).not.toBeInTheDocument();
});

it("requires selecting one store and never treats a licensed sibling as an expired store's licence", async () => {
  get.mockResolvedValue(response([{ id: 4, name: "Expired", allowed: false }, { id: 5, name: "Licensed", allowed: true, screens: ["inventory"] }]));
  show();
  await screen.findByText(/Choose one store/);
  fireEvent.mouseDown(screen.getByRole("combobox"));
  fireEvent.click(await screen.findByRole("option", { name: /Licensed/ }));
  expect(await screen.findByText("Licensed workspace")).toBeInTheDocument();
  expect(sessionStorage.getItem("activeStoreId")).toBe("5");
});

it("removes workspace access after a subscription downgrade is refreshed", async () => {
  get.mockResolvedValueOnce(response([{ id: 4, allowed: true, screens: ["inventory"] }]))
    .mockResolvedValue(response([{ id: 4, allowed: false, reason: "MOBILE_SUBSCRIPTION_REQUIRED" }]));
  show();
  await screen.findByText("Licensed workspace");
  act(() => window.dispatchEvent(new CustomEvent("vx:mobile-access-denied")));
  await waitFor(() => expect(screen.queryByText("Licensed workspace")).not.toBeInTheDocument());
  expect(await screen.findByText(/does not include mobile access/)).toBeInTheDocument();
});
