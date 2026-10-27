import { act, renderHook, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { expect, it, vi } from "vitest";
import api from "../api/axios";
import useStoreNameMap from "./useStoreNameMap";

vi.mock("../api/axios", () => ({ default: { get: vi.fn() } }));

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
