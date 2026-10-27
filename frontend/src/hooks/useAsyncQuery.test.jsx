import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import useAsyncQuery from "./useAsyncQuery";

it("supports local edits to the current result", async () => {
  const loader = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
  const { result } = renderHook(() => useAsyncQuery(loader));
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.data).toHaveLength(2));
  act(() => result.current.setData(rows => rows.filter(row => row.id !== 1)));
  expect(result.current.data).toEqual([{ id: 2 }]);
});

it("ignores cancelled responses and callbacks after changing queries", async () => {
  let finishOld;
  const first = vi.fn(() => new Promise(resolve => { finishOld = resolve; }));
  const second = vi.fn().mockResolvedValue("current");
  const onSuccess = vi.fn();
  const { result, rerender } = renderHook(loader => useAsyncQuery(loader, { onSuccess }), { initialProps: first });
  await waitFor(() => expect(first).toHaveBeenCalled());
  const signal = first.mock.calls[0][0].signal;
  rerender(second);
  expect(signal.aborted).toBe(true);
  await waitFor(() => expect(result.current.data).toBe("current"));
  await act(async () => finishOld("outdated"));
  expect(result.current.data).toBe("current");
  expect(onSuccess).toHaveBeenCalledTimes(1);
  expect(onSuccess).toHaveBeenCalledWith("current", { silent: false });
});

it("retains content for silent refresh and clears it for a different query", async () => {
  let finishRefresh;
  const loader = vi.fn().mockResolvedValueOnce("initial")
    .mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve; }));
  const { result, rerender } = renderHook(value => useAsyncQuery(value), { initialProps: loader });
  await waitFor(() => expect(result.current.data).toBe("initial"));
  act(() => result.current.reload({ silent: true }));
  expect(result.current.data).toBe("initial");
  expect(result.current.loading).toBe(false);
  await waitFor(() => expect(loader).toHaveBeenCalledTimes(2));
  await act(async () => finishRefresh("refreshed"));
  expect(result.current.data).toBe("refreshed");
  rerender(vi.fn().mockResolvedValue("other store"));
  expect(result.current.data).toBe(null);
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.data).toBe("other store"));
});

it("does not run disabled queries and aborts on unmount", async () => {
  const loader = vi.fn().mockResolvedValue("done");
  const { rerender, unmount } = renderHook(enabled => useAsyncQuery(loader, { enabled }), { initialProps: false });
  expect(loader).not.toHaveBeenCalled();
  rerender(true);
  await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
  const signal = loader.mock.calls[0][0].signal;
  unmount();
  expect(signal.aborted).toBe(true);
});

it("allows retry after failure without retaining the error", async () => {
  const loader = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("retried");
  const { result } = renderHook(() => useAsyncQuery(loader));
  await waitFor(() => expect(result.current.error?.message).toBe("offline"));
  act(() => result.current.reload());
  expect(result.current.error).toBe(null);
  await waitFor(() => expect(result.current.data).toBe("retried"));
});

it("queues one silent refresh instead of aborting or overlapping a pending query", async () => {
  let finish;
  const loader = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue("fresh");
  const { result } = renderHook(() => useAsyncQuery(loader));
  await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
  const signal = loader.mock.calls[0][0].signal;
  act(() => { result.current.reload({ silent: true }); result.current.reload({ silent: true }); result.current.reload({ silent: true }); });
  expect(signal.aborted).toBe(false);
  expect(loader).toHaveBeenCalledTimes(1);
  await act(async () => finish("initial"));
  await waitFor(() => expect(result.current.data).toBe("fresh"));
  expect(loader).toHaveBeenCalledTimes(2);
});
