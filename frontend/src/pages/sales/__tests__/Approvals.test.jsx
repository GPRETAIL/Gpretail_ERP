import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), role: "manager" }));
vi.mock("../../../api/axios", () => ({ default: { get: mocks.get, post: mocks.post, put: mocks.put } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { role: mocks.role } } }) }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import Approvals from "../Approvals";
import { TransferActivityProvider } from "../../../context/TransferActivityContext";

const renderPage = () => render(<MemoryRouter><TransferActivityProvider><Approvals /></TransferActivityProvider></MemoryRouter>);

const pending = {
  id: 41, action: "pos_discount", status: "pending", channel: "remote", requested_percent: 15, approved_percent: null,
  reason_code: "loyal_customer", note: "Regular", requested_by: { id: 3, name: "Cashier One" }, can_decide: true,
  created_at: "2026-10-31T10:00:00Z", payload: { lines: [{ index: 0, product: "Latte Mug", reference_price: 250, unit_price: 212.5 }] },
};

beforeEach(() => {
  mocks.role = "manager";
  mocks.get.mockReset(); mocks.post.mockReset();
  mocks.get.mockResolvedValue({ data: { data: [pending] } });
  mocks.post.mockResolvedValue({ data: { data: { ...pending, status: "approved" } } });
});
afterEach(cleanup);

it("lists pending requests in the shared table and approves with a counter-offer", async () => {
  renderPage();
  expect(await screen.findByText("Discount 15%")).toBeInTheDocument();
  expect(screen.getByText(/Latte Mug/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Approve up to (%)"), { target: { value: "12" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/approvals/requests/41/approve", { approved_percent: 12 }));
});

it("explains that limits are per store when no single store is selected", async () => {
  mocks.role = "admin";
  mocks.get.mockImplementation((url) => (url === "/approvals/limits"
    ? Promise.reject({ response: { status: 422, data: { message: "Select a store first." } } })
    : Promise.resolve({ data: { data: [] } })));
  renderPage();
  fireEvent.click(screen.getByRole("tab", { name: "Limits" }));
  expect(await screen.findByText(/Limits are set per store/)).toBeInTheDocument();
});
