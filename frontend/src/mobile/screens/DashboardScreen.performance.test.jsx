import { render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import api from "../../api/axios";
import { setCachedData } from "../offline/db";
import DashboardScreen from "./DashboardScreen";

vi.mock("../../api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../offline/db", () => ({
  setCachedData: vi.fn().mockResolvedValue(true), getCachedData: vi.fn().mockResolvedValue(null),
  getSyncQueue: vi.fn().mockResolvedValue([]),
}));
vi.mock("../../hooks/useStoreDisplayName", () => ({ default: () => "Coffee 1" }));
vi.mock("../../hooks/useDashboardRealtime", () => ({ default: vi.fn() }));
vi.mock("../components/BranchSelectorModal", () => ({ default: () => null }));
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  api.get.mockResolvedValue({ data: { success: true, data: {} } });
});

it("loads only the three payloads actually displayed, without unused summary/purchase reads", async () => {
  render(<DashboardScreen authUser={{ id: 1, role: "cashier", company_id: 2 }} />);
  await waitFor(() => expect(setCachedData).toHaveBeenCalledTimes(1));
  expect(api.get.mock.calls.map(([url]) => url).sort()).toEqual([
    "/dashboard/attention-summary", "/dashboard/overview", "/supplier-payments/pending",
  ]);
});

it("cancels every dashboard request when leaving the screen", async () => {
  api.get.mockImplementation(() => new Promise(() => {}));
  const view = render(<DashboardScreen authUser={{ id: 1, role: "cashier", company_id: 2 }} />);
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
  const signals = api.get.mock.calls.map(([, options]) => options.signal);
  expect(signals.every(signal => signal && !signal.aborted)).toBe(true);
  view.unmount();
  expect(signals.every(signal => signal.aborted)).toBe(true);
  expect(setCachedData).not.toHaveBeenCalled();
});
