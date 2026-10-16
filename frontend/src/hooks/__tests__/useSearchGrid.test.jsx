import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useSearchGrid from "../useSearchGrid";

const result = (ids, pagination = { mode: "offset", total: 60, total_pages: 3 }) => ({ rows: ids.map(id => ({ id })), pagination });

describe("shared listing navigation", () => {
  it("can repeat a search or page request while an older identical request is pending", async () => {
    let finishOld;
    const adapter = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
      .mockResolvedValue(result([2]));
    const { result: hook } = renderHook(() => useSearchGrid({ adapter }));
    await waitFor(() => expect(finishOld).toBeDefined());
    act(() => hook.current.setPage(1));
    await waitFor(() => expect(hook.current.rows).toEqual([{ id: 2 }]));
    act(() => hook.current.onServerSearch({ query: "" }));
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(3));
    act(() => hook.current.onServerSearch({ query: "" }));
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(4));
    await act(async () => finishOld(result([99])));
    expect(hook.current.rows).toEqual([{ id: 2 }]);
    expect(hook.current.loading).toBe(false);
  });

  it("pages aggregate results locally without refetching or cancelling their totals", async () => {
    const adapter = vi.fn().mockResolvedValue({ ...result([1, 2, 3]), metadata: { totals: { qty: 42 } } });
    const { result: hook, rerender } = renderHook(({ scopeKey }) => useSearchGrid({ adapter, paginationMode: "client", scopeKey }), { initialProps: { scopeKey: "brand" } });
    await waitFor(() => expect(hook.current.metadata?.totals.qty).toBe(42));
    act(() => hook.current.setPage(2));
    act(() => hook.current.setLimit(50));
    expect(adapter).toHaveBeenCalledOnce();
    expect(hook.current.metadata.totals.qty).toBe(42);
    rerender({ scopeKey: "product" });
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(2));
    expect(hook.current.page).toBe(1);
  });

  it("replaces cursor rows, resets on search/limit/sort/scope, and never requests all records", async () => {
    const adapter = vi.fn().mockResolvedValue(result([1], { mode: "cursor", next_cursor: "next", estimated_total: 1000000 }));
    const { result: hook, rerender } = renderHook(({ scopeKey }) => useSearchGrid({ adapter, scopeKey }), { initialProps: { scopeKey: "store-1" } });
    await waitFor(() => expect(hook.current.rows).toEqual([{ id: 1 }]));
    adapter.mockResolvedValue(result([2], { mode: "cursor", previous_cursor: "back" }));
    act(() => hook.current.navigateCursor("next"));
    await waitFor(() => expect(hook.current.rows).toEqual([{ id: 2 }]));
    expect(adapter.mock.calls.at(-1)[0].params).toMatchObject({ cursor: "next", limit: 20 });
    expect(adapter.mock.calls.at(-1)[0].params).not.toHaveProperty("page");
    act(() => hook.current.onServerSearch({ query: "shirt", field: "name", fetchAll: true, columnFilters: { code: { operator: "blank" } } }));
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params).toMatchObject({ page: 1, search: "shirt", field: "name" }));
    expect(adapter.mock.calls.at(-1)[0].params).not.toHaveProperty("all");
    expect(JSON.parse(adapter.mock.calls.at(-1)[0].params.column_filters)).toEqual([{ field: "code", operator: "blank", value: "" }]);
    act(() => hook.current.setLimit(50));
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params).toMatchObject({ page: 1, limit: 50 }));
    act(() => hook.current.onSortChange("name", "desc"));
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params).toMatchObject({ page: 1, sort: "name", order: "desc" }));
    act(() => hook.current.navigateCursor("next-store-1"));
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params.cursor).toBe("next-store-1"));
    rerender({ scopeKey: "store-2" });
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params).toMatchObject({ page: 1 }));
    expect(adapter.mock.calls.at(-1)[0].params).not.toHaveProperty("cursor");
  });

  it("keeps numbered jumps for offset responses and ignores stale successes and errors", async () => {
    let oldResolve;
    let oldReject;
    const onError = vi.fn();
    const adapter = vi.fn().mockResolvedValue(result([1]));
    const { result: hook, unmount } = renderHook(() => useSearchGrid({ adapter, onError }));
    await waitFor(() => expect(hook.current.pagination.totalPages).toBe(3));
    adapter.mockImplementationOnce(() => new Promise(resolve => { oldResolve = resolve; }));
    act(() => hook.current.setPage(3));
    await waitFor(() => expect(oldResolve).toBeDefined());
    const oldSignal = adapter.mock.calls.at(-1)[0].signal;
    act(() => hook.current.onServerSearch({ query: "new" }));
    await waitFor(() => expect(hook.current.loading).toBe(false));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => oldResolve(result([99])));
    expect(hook.current.rows).toEqual([{ id: 1 }]);
    adapter.mockImplementationOnce(() => new Promise((_resolve, reject) => { oldReject = reject; }));
    act(() => hook.current.refresh());
    await waitFor(() => expect(oldReject).toBeDefined());
    unmount();
    await act(async () => oldReject(new Error("late failure")));
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not load disabled lists and clears metadata on a current request failure", async () => {
    const adapter = vi.fn().mockRejectedValue(new Error("offline"));
    const onError = vi.fn();
    const { result: hook, rerender } = renderHook(({ enabled }) => useSearchGrid({ adapter, enabled, onError }), { initialProps: { enabled: false } });
    expect(adapter).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(hook.current.error.message).toBe("offline");
    expect(hook.current.rawPagination).toBeNull();
    expect(hook.current.loading).toBe(false);
  });
});
