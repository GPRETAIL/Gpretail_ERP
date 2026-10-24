import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import CounterAssignmentDialog from "../CounterAssignmentDialog";
import api from "../../api/axios";
const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), user: { id: 1, role: "admin", store_selection_required: true, company_id: 9 } }));
vi.mock("react-redux", () => ({ useSelector: selector => selector({ auth: { user: mocks.user, token: "test" } }), useDispatch: () => mocks.dispatch }));
vi.mock("../../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); api.get.mockResolvedValue({ data: { data: [{ id: 14, name: "COUNTER" }] } }); api.post.mockResolvedValue({ data: { data: { user: { id: 1, counter_id: 14 } } } }); });
it("requires one store and opens the shared store switcher instead of sending an invalid counter save", async () => {
  const close = vi.fn(); const switchStore = vi.fn();
  window.addEventListener("vx:open-store-switch", switchStore);
  render(<CounterAssignmentDialog open onClose={close} />);
  expect(screen.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  expect(api.get).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Choose store" }));
  expect(switchStore).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce();
  window.removeEventListener("vx:open-store-switch", switchStore);
});
it("loads and assigns counters in the active store scope", async () => {
  sessionStorage.setItem("activeStoreId", "3");
  render(<CounterAssignmentDialog open onClose={vi.fn()} />);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/configurations/counter", expect.objectContaining({ storeScopeId: "3" })));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Counter" }));
  fireEvent.click(await screen.findByRole("option", { name: "COUNTER" }));
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/auth/counter", { counterId: "14" }, { storeScopeId: "3" }));
  expect(mocks.dispatch).toHaveBeenCalledOnce();
});
