import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useErpFullscreen from "../useErpFullscreen";

describe("ERP fullscreen", () => {
  let fullscreen;
  let lock;
  let unlock;
  beforeEach(() => {
    fullscreen = null;
    lock = vi.fn().mockResolvedValue();
    unlock = vi.fn();
    vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { keyboard: { lock, unlock } }));
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreen });
    document.documentElement.requestFullscreen = vi.fn(async () => {
      fullscreen = document.documentElement;
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    document.exitFullscreen = vi.fn(async () => {
      fullscreen = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    });
  });
  afterEach(() => {
    delete document.fullscreenElement;
    delete document.documentElement.requestFullscreen;
    delete document.exitFullscreen;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("requests Escape-only lock and releases it after browser fullscreen exit", async () => {
    const { result } = renderHook(() => useErpFullscreen());
    await act(() => result.current.toggleFullscreen());
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledWith({ keyboardLock: "browser", navigationUI: "hide" });
    expect(lock).toHaveBeenCalledWith(["Escape"]);
    expect(result.current.escapeLocked).toBe(true);
    await act(() => document.exitFullscreen());
    await waitFor(() => expect(result.current.isFullscreen).toBe(false));
    expect(result.current.escapeLocked).toBe(false);
    expect(unlock).toHaveBeenCalled();
  });

  it("keeps normal fullscreen when keyboard permission is denied", async () => {
    lock.mockRejectedValueOnce(new Error("Denied"));
    const { result } = renderHook(() => useErpFullscreen());
    await act(() => result.current.toggleFullscreen());
    expect(result.current.isFullscreen).toBe(true);
    expect(result.current.escapeLocked).toBe(false);
    expect(result.current.lockMessage).toMatch(/Allow keyboard lock/);
    await act(() => result.current.enableEscapeLock());
    expect(result.current.escapeLocked).toBe(true);
    expect(result.current.lockMessage).toBe("");
    await act(() => result.current.toggleFullscreen());
    expect(result.current.isFullscreen).toBe(false);
  });
  it("explains the fallback when keyboard lock is unavailable", async () => {
    vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { keyboard: undefined }));
    const { result } = renderHook(() => useErpFullscreen());
    await act(() => result.current.toggleFullscreen());
    expect(result.current.lockMessage).toMatch(/browser does not expose/);
    expect(result.current.escapeLocked).toBe(false);
  });
});
