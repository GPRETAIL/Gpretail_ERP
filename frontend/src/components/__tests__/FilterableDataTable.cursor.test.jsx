import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FilterableDataTable from "../FilterableDataTable";

describe("FilterableDataTable — Adaptive Cursor & Offset Pagination", () => {
  const sampleColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
  ];

  const sampleRows = [
    { id: 1, name: "Alpha" },
    { id: 2, name: "Beta" },
  ];

  it("renders offset pagination with page selector and total count", () => {
    const onPageChange = vi.fn();
    const onLimitChange = vi.fn();

    render(
      <MemoryRouter>
        <FilterableDataTable
          rows={sampleRows}
          columns={sampleColumns}
          showExport={false}
          pagination={{
            mode: "offset",
            page: 1,
            total_pages: 5,
            total: 50,
            has_next: true,
            has_previous: false,
          }}
          page={1}
          limit={10}
          totalPages={5}
          totalRows={50}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Total: 50")).toBeDefined();
    expect(screen.getByText("Page 1")).toBeDefined();
  });

  it("renders cursor pagination with Continuous indicator and triggers cursor callbacks", () => {
    const onNextCursor = vi.fn();
    const onLimitChange = vi.fn();

    render(
      <MemoryRouter>
        <FilterableDataTable
          rows={sampleRows}
          columns={sampleColumns}
          showExport={false}
          pagination={{
            mode: "cursor",
            limit: 10,
            next_cursor: "eyJpZCI6Mn0",
            previous_cursor: null,
            has_more: true,
            has_next: true,
            has_previous: false,
          }}
          limit={10}
          onNextCursor={onNextCursor}
          onLimitChange={onLimitChange}
        />
      </MemoryRouter>
    );

    // Shows row count without full-table total
    expect(screen.getByText("Showing 2 rows")).toBeDefined();
    expect(screen.getByText("Continuous")).toBeDefined();

    // Previous is disabled since previous_cursor is null
    const prevBtn = screen.getByTitle("Previous");
    expect(prevBtn.hasAttribute("disabled")).toBe(true);

    // Next is enabled
    const nextBtn = screen.getByTitle("Next");
    expect(nextBtn.hasAttribute("disabled")).toBe(false);

    // Clicking next fires onNextCursor with the cursor string
    fireEvent.click(nextBtn);
    expect(onNextCursor).toHaveBeenCalledWith("eyJpZCI6Mn0");
  });

  it("shows the cheap information_schema estimate as an approximate total when the backend provides one", () => {
    render(
      <MemoryRouter>
        <FilterableDataTable
          rows={sampleRows}
          columns={sampleColumns}
          showExport={false}
          pagination={{
            mode: "cursor",
            limit: 10,
            next_cursor: "eyJpZCI6Mn0",
            previous_cursor: null,
            has_more: true,
            has_next: true,
            has_previous: false,
            estimated_total: 1000002,
          }}
          limit={10}
          onNextCursor={vi.fn()}
          onLimitChange={vi.fn()}
        />
      </MemoryRouter>
    );

    // The real total (however approximate), not just the current page's row count. Locale-tolerant
    // digit grouping, same reasoning as the server-group total test above.
    expect(screen.getByText(/^Total: ~[\d,]+$/)).toBeDefined();
    expect(screen.queryByText("Showing 2 rows")).not.toBeInTheDocument();
  });
});
