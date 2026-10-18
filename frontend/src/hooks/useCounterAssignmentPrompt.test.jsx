import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import useCounterAssignmentPrompt from "./useCounterAssignmentPrompt";

it("prompts once per account and supports dismissal and explicit reopening", () => {
  const { result, rerender } = renderHook(user => useCounterAssignmentPrompt(user), { initialProps: { id: 1, counter_id: null } });
  expect(result.current[0]).toBe(true);
  act(() => result.current[1](false));
  rerender({ id: 1, counter_id: null });
  expect(result.current[0]).toBe(false);
  act(() => result.current[1](true));
  expect(result.current[0]).toBe(true);
  act(() => result.current[1](false));
  rerender({ id: 2, counter_id: null });
  expect(result.current[0]).toBe(true);
});

it("does not automatically prompt accounts that already have a counter", () => {
  const { result } = renderHook(() => useCounterAssignmentPrompt({ id: 1, counter_id: 3 }));
  expect(result.current[0]).toBe(false);
});
