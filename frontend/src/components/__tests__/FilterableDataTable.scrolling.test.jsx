import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import FilterableDataTable from "../FilterableDataTable";

const renderGrid = (props = {}) => render(
  <MemoryRouter>
    <FilterableDataTable rows={[{ id: 1, name: "First" }]} columns={[{ key: "name", label: "Name" }]} showExport={false} {...props} />
  </MemoryRouter>
);

describe("FilterableDataTable scrolling", () => {
  it("keeps ordinary column headers sticky in a fixed viewport", () => {
    renderGrid();
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(getComputedStyle(header).position).toBe("sticky");
    expect(getComputedStyle(header).top).toBe("0px");
    expect(getComputedStyle(header.closest("thead")).position).toBe("sticky");
    expect(getComputedStyle(header.closest("thead")).top).toBe("0px");
  });

  it("preserves non-sticky headers for tables without a fixed viewport", () => {
    renderGrid({ fixedHeight: false });
    expect(getComputedStyle(screen.getByRole("columnheader", { name: /Name/ })).position).toBe("relative");
  });

  it("reveals scrollbars on interaction, hides them after idle, and cleans up its timer", () => {
    vi.useFakeTimers();
    try {
      const { container, unmount } = renderGrid({ autoHideScrollbars: true });
      const viewport = container.querySelector(".MuiTableContainer-root");
      expect(viewport).toHaveAttribute("data-scrollbar-visible", "false");
      fireEvent.scroll(viewport);
      expect(viewport).toHaveAttribute("data-scrollbar-visible", "true");
      act(() => vi.advanceTimersByTime(1000));
      fireEvent.pointerMove(viewport);
      act(() => vi.advanceTimersByTime(1000));
      expect(viewport).toHaveAttribute("data-scrollbar-visible", "true");
      act(() => vi.advanceTimersByTime(200));
      expect(viewport).toHaveAttribute("data-scrollbar-visible", "false");
      fireEvent.focus(viewport);
      expect(viewport).toHaveAttribute("data-scrollbar-visible", "true");
      unmount();
      act(() => vi.runOnlyPendingTimers());
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });
});
