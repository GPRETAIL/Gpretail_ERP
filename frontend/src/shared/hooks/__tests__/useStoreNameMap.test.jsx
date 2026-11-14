import { act, renderHook, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { expect, it, vi } from "vitest";
import api from "@/shared/api/apiClient";
import useStoreNameMap from "@/shared/hooks/useStoreNameMap";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));

it("shares store-name reads and discards the previous login's names immediately", async () => {
  localStorage.setItem("token", "map-login-one");
  const store = configureStore({ reducer: { auth: (state = { token: "map-login-one" }, action) => action.type === "change" ? { token: action.payload } : state } });
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  api.get.mockResolvedValueOnce({ data: { data: [{ id: 1, name: "First Store" }] } });
  const { result, rerender } = renderHook(() => [useStoreNameMap(), useStoreNameMap()], { wrapper });
  await waitFor(() => expect(result.current[0][1]).toBe("First Store"));
  expect(result.current[1][1]).toBe("First Store");
  expect(api.get).toHaveBeenCalledTimes(1);
  let finish;
  api.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  act(() => { localStorage.setItem("token", "map-login-two"); store.dispatch({ type: "change", payload: "map-login-two" }); rerender(); });
  expect(result.current[0]).toEqual({});
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  await act(async () => finish({ data: { data: [{ id: 2, name: "Second Store" }] } }));
  expect(result.current[0]).toEqual({ 2: "Second Store" });
  expect(result.current[1]).toEqual({ 2: "Second Store" });
  localStorage.removeItem("token");
});

it("keeps the store names on screen while the server in use changes, and reads again if that read fails", async () => {
  vi.useFakeTimers();
  localStorage.setItem("token", "map-login-three");
  const store = configureStore({ reducer: { auth: (state = { token: "map-login-three" }) => state } });
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  api.get.mockReset();
  api.get.mockResolvedValueOnce({ data: { data: [{ id: 2, name: "Coffee 1" }] } });
  const { result, rerender } = renderHook(() => useStoreNameMap(), { wrapper });
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(result.current[2]).toBe("Coffee 1");

  // The counter moves to another server (same sign-in): the list is read again, and that read fails once.
  api.get.mockRejectedValueOnce(new Error("Network Error")).mockResolvedValueOnce({ data: { data: [{ id: 2, name: "Coffee 1 renamed" }] } });
  act(() => { sessionStorage.setItem("activeStoreId", "2"); rerender(); });
  expect(result.current[2]).toBe("Coffee 1");
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(result.current[2]).toBe("Coffee 1");
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(result.current[2]).toBe("Coffee 1 renamed");
  expect(api.get).toHaveBeenCalledTimes(3);

  vi.useRealTimers();
  localStorage.removeItem("token");
  sessionStorage.removeItem("activeStoreId");
});
