import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import useAppInit from "./useAppInit";
import api from "../../api/axios";
vi.mock("../../api/axios", () => ({ default: { get: vi.fn() } }));
afterEach(() => { vi.useRealTimers(); localStorage.clear(); vi.clearAllMocks(); });

it("finishes the splash without repeating auth or notification requests", async () => {
  vi.useFakeTimers(); localStorage.setItem("token", "session");
  const { result, unmount } = renderHook(useAppInit);
  await act(async () => vi.advanceTimersByTimeAsync(1350));
  expect(result.current).toEqual({ ready: true, progress: 100, error: null });
  expect(api.get).not.toHaveBeenCalled(); unmount();
});

it("cleans up all initialization timers when leaving the mobile workspace", () => {
  vi.useFakeTimers();
  const { unmount } = renderHook(useAppInit);
  expect(vi.getTimerCount()).toBe(5); unmount();
  expect(vi.getTimerCount()).toBe(0);
});
