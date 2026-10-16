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
      const { container, unmount } = renderGrid();
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

  it("allows screens to keep always-visible scrollbars explicitly", () => {
    const { container } = renderGrid({ autoHideScrollbars: false });
    expect(container.querySelector(".MuiTableContainer-root")).not.toHaveAttribute("data-scrollbar-visible");
  });

  it("uses matching search and filter heights and the shared compact column popup", () => {
    const { container } = renderGrid();
    const search = screen.getByRole("button", { name: /^Search$/ });
    const filter = screen.getByRole("button", { name: /^Filter$/ });
    expect(getComputedStyle(search).height).toBe("28px");
    expect(getComputedStyle(filter).height).toBe("28px");
    expect(getComputedStyle(container.querySelector(".MuiOutlinedInput-root")).borderRadius).toBe("0.5rem");
    fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    expect(getComputedStyle(screen.getByPlaceholderText("Enter filter value").closest(".MuiPopover-paper")).width).toBe("190px");
  });
});
