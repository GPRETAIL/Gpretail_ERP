import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ClientAccessDialog from "../ClientAccessDialog";
const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("../../../api/axios", () => ({ default: { get, put } }));
beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: { data: { user: { web_access: true, mobile_access: false },
    store: { name: "Branch", mobile_entitled: false, sections: { masters: "all" }, action_limits: { masters: { view: true, add: true } } },
    modules: ["masters", "finance"], actions: ["view", "add"] } } });
  put.mockResolvedValue({ data: {} });
});
it("disables unpurchased mobile and module access and saves only the chosen grants", async () => {
  const onSaved = vi.fn();
  render(<ClientAccessDialog user={{ id: 7, name: "Clerk" }} onClose={vi.fn()} onSaved={onSaved} />);
  await screen.findByText(/Mobile subscription:/);
  expect(screen.getByLabelText("Mobile access")).toBeDisabled();
  expect(screen.getByLabelText("finance view")).toBeDisabled();
  fireEvent.click(screen.getByLabelText("masters add"));
  fireEvent.click(screen.getByRole("button", { name: "Save access" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  expect(put).toHaveBeenCalledWith("/user-access/7/client-access", { web_access: true, mobile_access: false, module_permissions: { masters: { view: true, add: true } } });
});
