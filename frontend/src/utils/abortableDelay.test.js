import { afterEach, expect, it, vi } from "vitest";
import abortableDelay from "./abortableDelay";

afterEach(() => vi.useRealTimers());

it("cancels pending debounces without running the next request", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const request = vi.fn();
  const pending = abortableDelay(300, controller.signal).then(request);
  const rejected = expect(pending).rejects.toBeDefined();
  controller.abort();
  await rejected;
  await vi.runAllTimersAsync();
  expect(request).not.toHaveBeenCalled();
});

it("resolves after the delay and handles an already aborted signal", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const pending = abortableDelay(300, controller.signal);
  await vi.advanceTimersByTimeAsync(300);
  await expect(pending).resolves.toBeUndefined();
  controller.abort();
  await expect(abortableDelay(300, controller.signal)).rejects.toBeDefined();
});
