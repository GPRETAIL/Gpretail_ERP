import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import api from "../api/axios";
import useModuleDashboardSummary from "./useModuleDashboardSummary";
vi.mock("../api/axios", () => ({ default: { get: vi.fn() } }));
beforeEach(() => api.get.mockReset());
it("loads only active dashboards and keys results by the store and filters", async () => {
  api.get.mockResolvedValue({ data: { success: true, data: { count: 2 } } });
  const { result, rerender } = renderHook(options => useModuleDashboardSummary("/sales/dashboard", options), { initialProps: { active: false, params: { store_id: 1 } } });
  expect(api.get).not.toHaveBeenCalled();
  rerender({ active: true, params: { store_id: 1 } });
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.data).toEqual({ count: 2 }));
  rerender({ active: true, params: { store_id: 1 } });
  expect(api.get).toHaveBeenCalledTimes(1);
});
it("cancels outdated requests and ignores late responses from another store", async () => {
  let finishOld;
  api.get.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
    .mockResolvedValueOnce({ data: { success: true, data: { store: 2 } } });
  const { result, rerender } = renderHook(params => useModuleDashboardSummary("/sales/dashboard", { active: true, params }), { initialProps: { store_id: 1 } });
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  const signal = api.get.mock.calls[0][1].signal;
  rerender({ store_id: 2 });
  expect(signal.aborted).toBe(true);
  await waitFor(() => expect(result.current.data).toEqual({ store: 2 }));
  await act(async () => finishOld({ data: { success: true, data: { store: 1 } } }));
  expect(result.current.data).toEqual({ store: 2 });
});
it("clears failed results on retry and returns the refreshed response", async () => {
  api.get.mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ data: { success: true, data: { count: 4 } } });
  const { result } = renderHook(() => useModuleDashboardSummary("/sales/dashboard", { active: true }));
  await waitFor(() => expect(result.current.error).toBeTruthy());
  act(() => result.current.reload());
  expect(result.current.error).toBe(null);
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.data).toEqual({ count: 4 }));
});
