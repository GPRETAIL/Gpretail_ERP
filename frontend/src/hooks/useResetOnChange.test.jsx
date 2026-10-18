import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import useResetOnChange from "./useResetOnChange";

it("preserves edits until the record changes and resets before rendering the new record", () => {
  const { result, rerender } = renderHook(({ id, initial }) => {
    const [draft, setDraft] = useState(initial);
    useResetOnChange([id], () => setDraft(initial));
    return { draft, setDraft };
  }, { initialProps: { id: 1, initial: "first" } });
  act(() => result.current.setDraft("edited"));
  rerender({ id: 1, initial: "server refreshed" });
  expect(result.current.draft).toBe("edited");
  rerender({ id: 2, initial: "second" });
  expect(result.current.draft).toBe("second");
});

it("resets a reopened dialog while preserving edits during its current session", () => {
  const { result, rerender } = renderHook(open => {
    const [draft, setDraft] = useState("");
    useResetOnChange([open], () => { if (open) setDraft(""); });
    return { draft, setDraft };
  }, { initialProps: true });
  act(() => result.current.setDraft("unsaved"));
  rerender(false);
  expect(result.current.draft).toBe("unsaved");
  rerender(true);
  expect(result.current.draft).toBe("");
});
