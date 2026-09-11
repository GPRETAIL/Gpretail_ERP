import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FilterableDataTable from "../FilterableDataTable";

// Server-side Group By: grouping should reflect a real paginated summary from the backend
// (GroupAggregationService) instead of the client-side bulk-fetch-then-JS-group path, which is
// what silently truncated at 25k/2k rows before this existed.
describe("FilterableDataTable — Server-side Group By", () => {
  const sampleColumns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "active", label: "Active" },
  ];

  it("fetches group summaries from the server instead of grouping the rows prop client-side", async () => {
    const onFetchGroupSummaries = vi.fn().mockResolvedValue({
      success: true,
      data: [
        { group_value: "1", label: "Yes", row_count: 999000 },
        { group_value: "0", label: "No", row_count: 1000 },
      ],
      pagination: { page: 1, total: 2, total_pages: 1, has_next: false, has_previous: false },
      meta: { total_matching_rows: 1000000 },
    });

    render(
      <MemoryRouter>
        <FilterableDataTable
          rows={[{ id: 1, name: "Row A", active: true }]}
          columns={sampleColumns}
          showExport={false}
          paginationMode="server"
          defaultGroupByColumn="active"
          onFetchGroupSummaries={onFetchGroupSummaries}
          onExportRows={vi.fn()}
          page={1}
          limit={20}
          onPageChange={vi.fn()}
          onLimitChange={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => expect(onFetchGroupSummaries).toHaveBeenCalled());

    // The true 999,000-row group count shows up, not something derived from the 1-row `rows` prop.
    expect(await screen.findByText("999000 rows")).toBeDefined();
    expect(screen.getByText("1000 rows")).toBeDefined();
    // Locale-tolerant: toLocaleString()'s digit grouping varies by environment (e.g. "1,000,000" vs "10,00,000").
    expect(screen.getByText(/2 groups · [\d,]+ rows total/)).toBeDefined();
  });

  it("lazily fetches a group's rows only when it's expanded, and supports Load more", async () => {
    const onFetchGroupSummaries = vi.fn().mockResolvedValue({
      success: true,
      data: [{ group_value: "1", label: "Yes", row_count: 3 }],
      pagination: { page: 1, total: 1, total_pages: 1, has_next: false, has_previous: false },
      meta: { total_matching_rows: 3 },
    });
    const onFetchGroupRows = vi.fn().mockResolvedValueOnce({
      success: true,
      data: [{ id: 1, name: "First", active: true }],
      pagination: { has_next: true },
    }).mockResolvedValueOnce({
      success: true,
      data: [{ id: 2, name: "Second", active: true }],
      pagination: { has_next: false },
    });

    render(
      <MemoryRouter>
        <FilterableDataTable
          rows={[]}
          columns={sampleColumns}
          showExport={false}
          paginationMode="server"
          defaultGroupByColumn="active"
          onFetchGroupSummaries={onFetchGroupSummaries}
          onFetchGroupRows={onFetchGroupRows}
          onExportRows={vi.fn()}
          page={1}
          limit={20}
          onPageChange={vi.fn()}
          onLimitChange={vi.fn()}
        />
      </MemoryRouter>
    );

    await screen.findByText("3 rows");
    // Not fetched yet -- lazy on expand.
    expect(onFetchGroupRows).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    await waitFor(() => expect(onFetchGroupRows).toHaveBeenCalledWith(
      expect.objectContaining({ groupValue: "1", page: 1 })
    ));
    expect(await screen.findByText("First")).toBeDefined();

    const loadMore = await screen.findByText("Load more…");
    fireEvent.click(loadMore);
    await waitFor(() => expect(onFetchGroupRows).toHaveBeenCalledWith(
      expect.objectContaining({ groupValue: "1", page: 2 })
    ));
    expect(await screen.findByText("Second")).toBeDefined();
    // Both pages' rows stay visible -- append, not replace.
    expect(screen.getByText("First")).toBeDefined();
  });

  it("shows no groups (not a crash, not a client-side fallback) when the server rejects the group_by column", async () => {
    const onFetchGroupSummaries = vi.fn().mockResolvedValue({ success: false, message: "Unsupported column" });
    const onExportRows = vi.fn();

    render(
      <MemoryRouter>
        <FilterableDataTable
          rows={[{ id: 1, name: "Row A", active: true }]}
          columns={sampleColumns}
          showExport={false}
          paginationMode="server"
          defaultGroupByColumn="active"
          onFetchGroupSummaries={onFetchGroupSummaries}
          onExportRows={onExportRows}
          page={1}
          limit={20}
          onPageChange={vi.fn()}
          onLimitChange={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => expect(onFetchGroupSummaries).toHaveBeenCalled());
    // No client-side fallback anymore: an unsupported group_by just shows no groups, and never
    // triggers the old bulk-export-then-JS-group path.
    expect(onExportRows).not.toHaveBeenCalled();
  });
});
