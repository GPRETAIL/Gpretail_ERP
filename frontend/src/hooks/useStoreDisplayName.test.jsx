import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import api from "../api/axios";
import useStoreDisplayName from "./useStoreDisplayName";
vi.mock("../api/axios", () => ({ default: { get: vi.fn() } }));
beforeEach(() => api.get.mockReset());
it("uses the current account store name without requesting it again", () => {
  const { result, rerender } = renderHook(user => useStoreDisplayName(user), { initialProps: { company_id: 1, company_name: "One" } });
  expect(result.current).toBe("One");
  rerender({ company_id: 2, company_name: "Two" });
  expect(result.current).toBe("Two");
  expect(api.get).not.toHaveBeenCalled();
});
it("never displays another store's name when an old request finishes late", async () => {
  let finishOne;
  api.get.mockImplementationOnce(() => new Promise(resolve => { finishOne = resolve; }))
    .mockResolvedValueOnce({ data: { data: { name: "Two" } } });
  const { result, rerender } = renderHook(user => useStoreDisplayName(user), { initialProps: { company_id: 1 } });
  const firstSignal = api.get.mock.calls[0][1].signal;
  rerender({ company_id: 2 });
  expect(firstSignal.aborted).toBe(true);
  expect(result.current).toBe("");
  await waitFor(() => expect(result.current).toBe("Two"));
  await act(async () => finishOne({ data: { data: { name: "One" } } }));
  expect(result.current).toBe("Two");
});
it("clears the derived name immediately when store context is removed", async () => {
  api.get.mockResolvedValue({ data: { name: "One" } });
  const { result, rerender } = renderHook(user => useStoreDisplayName(user), { initialProps: { company_id: 1 } });
  await waitFor(() => expect(result.current).toBe("One"));
  rerender({ company_id: null });
  expect(result.current).toBe("");
});
