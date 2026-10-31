import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useDashboardRealtime from "./useDashboardRealtime";

const client = vi.hoisted(() => ({
  channels: new Map(), subscribe: vi.fn(), unsubscribe: vi.fn(), disconnect: vi.fn(),
}));
vi.mock("pusher-js", () => ({ default: class {
  constructor() { return client; }
} }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  client.channels.clear();
  client.subscribe.mockImplementation(name => {
    if (!client.channels.has(name)) {
      const listeners = new Set();
      client.channels.set(name, {
        bind: (_, fn) => listeners.add(fn), unbind: (_, fn) => listeners.delete(fn),
        emit: () => [...listeners].forEach(fn => fn()),
      });
    }
    return client.channels.get(name);
  });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  localStorage.setItem("user", JSON.stringify({ id: 1, realtime: { key: "server-key", cluster: "ap2" } }));
});

it("polls every 30 seconds when the server has no push service configured", () => {
  localStorage.setItem("user", JSON.stringify({ id: 1 }));
  const onUpdate = vi.fn();
  const view = renderHook(() => useDashboardRealtime({ companyId: "4", onUpdate }));
  expect(client.subscribe).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(30000));
  expect(onUpdate).toHaveBeenCalledTimes(1);
  view.unmount();
});
afterEach(() => vi.useRealTimers());

it("coalesces a bulk update burst and cancels pending work on unmount", () => {
  const onUpdate = vi.fn();
  const view = renderHook(() => useDashboardRealtime({ companyId: "1", onUpdate }));
  act(() => {
    for (let i = 0; i < 100; i++) client.channels.get("private-store-1").emit();
    vi.advanceTimersByTime(250);
  });
  expect(onUpdate).toHaveBeenCalledExactlyOnceWith({ silent: true });
  act(() => client.channels.get("private-store-1").emit());
  view.unmount();
  act(() => vi.advanceTimersByTime(180000));
  expect(onUpdate).toHaveBeenCalledTimes(1);
  expect(client.disconnect).toHaveBeenCalledTimes(1);
});

it("keeps a shared channel until its final dashboard consumer leaves", () => {
  const firstUpdate = vi.fn(), secondUpdate = vi.fn();
  const first = renderHook(() => useDashboardRealtime({ companyId: "7", onUpdate: firstUpdate }));
  const second = renderHook(() => useDashboardRealtime({ companyId: "7", onUpdate: secondUpdate }));
  first.unmount();
  expect(client.unsubscribe).not.toHaveBeenCalled();
  expect(client.disconnect).not.toHaveBeenCalled();
  act(() => { client.channels.get("private-store-7").emit(); vi.advanceTimersByTime(250); });
  expect(secondUpdate).toHaveBeenCalledTimes(1);
  expect(firstUpdate).not.toHaveBeenCalled();
  second.unmount();
  expect(client.unsubscribe).toHaveBeenCalledExactlyOnceWith("private-store-7");
  expect(client.disconnect).toHaveBeenCalledTimes(1);
});

it("does no hidden-tab work and catches up once when visible", () => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  const onUpdate = vi.fn();
  const view = renderHook(() => useDashboardRealtime({ companyId: "3", onUpdate }));
  act(() => { client.channels.get("private-store-3").emit(); vi.advanceTimersByTime(360000); });
  expect(onUpdate).not.toHaveBeenCalled();
  act(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(onUpdate).toHaveBeenCalledTimes(1);
  view.unmount();
});
