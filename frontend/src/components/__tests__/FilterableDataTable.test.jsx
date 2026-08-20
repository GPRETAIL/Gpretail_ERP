import { render, screen, fireEvent, within, act, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchTablePreference = vi.fn(() => Promise.resolve(null));
const mockSaveTablePreference = vi.fn(() => Promise.resolve(null));
vi.mock("../../utils/tablePreferences", () => ({
  fetchTablePreference: (...args) => mockFetchTablePreference(...args),
  saveTablePreference: (...args) => mockSaveTablePreference(...args),
}));

import FilterableDataTable from "../FilterableDataTable";

/**
 * Characterization suite for FilterableDataTable's CURRENT behavior — written before any markup
 * restyle, as the regression baseline for the MUI port. No test here should need editing once the
 * restyle lands; if one does, that's a signal behavior changed, not just markup.
 *
 * jsdom has no ResizeObserver (not polyfilled in src/test/setup.js), so the sticky-pinning offset
 * effect silently falls back to its resize-listener path and every offsetWidth read is 0 — assert
 * on state (pinnedColumnKeys membership, column order, element presence), never on computed pixel
 * offsets. Pixel-accurate sticky positioning is a live-browser concern, not a jsdom one.
 */

const bodyRowTexts = (container) =>
  Array.from(container.querySelectorAll("tbody tr")).map((tr) => tr.textContent);

const headerLabels = (container) =>
  // Skip the leading (checkbox/settings) <th>, which carries no column label.
  Array.from(container.querySelectorAll("thead th")).slice(1).map((th) => th.textContent.trim().replace(/^\W+/, ""));

// Column labels ("A", "B", ...) also appear as <option> text in the "All Fields" search select, so
// screen.getByText(label) collides. Scope the lookup to the actual header <th> instead.
const getHeaderCell = (container, label) =>
  Array.from(container.querySelectorAll("thead th")).find((th) => th.textContent.trim() === label);

beforeEach(() => {
  mockFetchTablePreference.mockClear();
  mockSaveTablePreference.mockClear();
});

describe("FilterableDataTable — sort (3-state toggle)", () => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "amount", label: "Amount" },
  ];
  const rows = [
    { id: 1, name: "Charlie", amount: 5 },
    { id: 2, name: "Alpha", amount: 10 },
    { id: 3, name: "Bravo", amount: 1 },
  ];

  it("cycles asc -> desc -> none (back to original order) on repeated clicks", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} />
    );

    const sortButton = screen.getByTitle("Sort Amount");

    fireEvent.click(sortButton);
    let texts = bodyRowTexts(container);
    expect(texts[0]).toContain("Bravo");
    expect(texts[1]).toContain("Charlie");
    expect(texts[2]).toContain("Alpha");

    fireEvent.click(sortButton);
    texts = bodyRowTexts(container);
    expect(texts[0]).toContain("Alpha");
    expect(texts[1]).toContain("Charlie");
    expect(texts[2]).toContain("Bravo");

    fireEvent.click(sortButton);
    texts = bodyRowTexts(container);
    expect(texts[0]).toContain("Charlie");
    expect(texts[1]).toContain("Alpha");
    expect(texts[2]).toContain("Bravo");
  });
});

describe("FilterableDataTable — per-column filter popup", () => {
  const columns = [{ key: "name", label: "Name" }];
  const rows = [
    { id: 1, name: "Apple" },
    { id: 2, name: "Banana" },
    { id: 3, name: "Apricot" },
  ];

  it("'equal' operator matches exactly (case-insensitive), 'Clear' restores all rows", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} />
    );

    fireEvent.click(screen.getByTitle("Filter Name"));
    fireEvent.change(screen.getByDisplayValue("Contain"), { target: { value: "equal" } });
    fireEvent.change(screen.getByPlaceholderText("Enter filter value"), {
      target: { value: "Apple" },
    });

    let texts = bodyRowTexts(container);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("Apple");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    texts = bodyRowTexts(container);
    expect(texts).toHaveLength(3);
  });

  it("hides the value input for 'blank'/'not_blank' operators", () => {
    render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);

    fireEvent.click(screen.getByTitle("Filter Name"));
    expect(screen.getByPlaceholderText("Enter filter value")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Contain"), { target: { value: "blank" } });
    expect(screen.queryByPlaceholderText("Enter filter value")).not.toBeInTheDocument();
  });
});

describe("FilterableDataTable — row grouping with aggregation", () => {
  const columns = [
    { key: "category", label: "Category" },
    { key: "amount", label: "Amount", aggregate: "sum" },
  ];
  const rows = [
    { id: 1, category: "A", amount: 10 },
    { id: 2, category: "A", amount: 20 },
    { id: 3, category: "B", amount: 5 },
  ];

  it("sums a group's aggregate column and locks the 2-decimal format", () => {
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        defaultGroupByColumn="category"
      />
    );

    expect(screen.getByText("Category: A")).toBeInTheDocument();
    expect(screen.getByText("2 rows")).toBeInTheDocument();
    expect(screen.getByText(/Amount: 30\.00/)).toBeInTheDocument();
  });

  it("renders a single-row group as a plain row, not a group header", () => {
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        defaultGroupByColumn="category"
      />
    );

    expect(screen.queryByText("Category: B")).not.toBeInTheDocument();
    expect(screen.queryByText("1 rows")).not.toBeInTheDocument();
    expect(screen.queryByText(/Amount: 5\.00/)).not.toBeInTheDocument();
    // The row itself still renders, plainly.
    const row = screen.getByText("B").closest("tr");
    expect(within(row).getByText("5")).toBeInTheDocument();
  });

  it("keeps child rows collapsed until the group is expanded", () => {
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        defaultGroupByColumn="category"
      />
    );

    expect(screen.queryByText("10")).not.toBeInTheDocument();
    expect(screen.queryByText("20")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Category: A").closest("tr").querySelector("button"));

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("supports a custom aggregate function, not just sum/avg", () => {
    const customColumns = [
      { key: "category", label: "Category" },
      {
        key: "amount",
        label: "Amount",
        aggregate: (groupRows) => Math.max(...groupRows.map((r) => r.amount)),
      },
    ];

    render(
      <FilterableDataTable
        rows={rows}
        columns={customColumns}
        showExport={false}
        defaultGroupByColumn="category"
      />
    );

    expect(screen.getByText(/Amount: 20\.00/)).toBeInTheDocument();
  });
});

describe("FilterableDataTable — selection + bulk delete", () => {
  const columns = [{ key: "name", label: "Name" }];
  const rows = [
    { id: 1, name: "Row One" },
    { id: 2, name: "Row Two" },
  ];

  it("checking a row calls onSelectionChange with that row's key", () => {
    const onSelectionChange = vi.fn();
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableSelection
        selectedRows={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]); // index 0 is the header "select all"

    expect(onSelectionChange).toHaveBeenCalledWith([1]);
  });

  it("bulk bar shows singular/plural text and wires Delete/Clear", () => {
    const onSelectionChange = vi.fn();
    const onBulkDelete = vi.fn();
    const { rerender } = render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableSelection
        selectedRows={[1]}
        onSelectionChange={onSelectionChange}
        onBulkDelete={onBulkDelete}
      />
    );
    expect(screen.getByText("1 row selected")).toBeInTheDocument();

    rerender(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableSelection
        selectedRows={[1, 2]}
        onSelectionChange={onSelectionChange}
        onBulkDelete={onBulkDelete}
      />
    );
    expect(screen.getByText("2 rows selected")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Delete Selected"));
    expect(onBulkDelete).toHaveBeenCalledWith([1, 2]);

    fireEvent.click(screen.getByText("Clear Selection"));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it("header 'select all' is indeterminate with a partial page selection, and merges/removes by key", () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableSelection
        selectedRows={[1]}
        onSelectionChange={onSelectionChange}
      />
    );

    const headerCheckbox = screen.getByTitle("Select all on this page");
    // "Partial selection" is observable via aria-checked="mixed", not a raw DOM .indeterminate
    // read -- MUI's Checkbox drives its indeterminate icon off the `indeterminate` prop directly
    // rather than the native boolean property, so this is the correct signal to assert on.
    expect(headerCheckbox).toHaveAttribute("aria-checked", "mixed");
    expect(headerCheckbox.checked).toBe(false);

    fireEvent.click(headerCheckbox);
    expect(onSelectionChange).toHaveBeenCalledWith([1, 2]);

    rerender(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableSelection
        selectedRows={[1, 2]}
        onSelectionChange={onSelectionChange}
      />
    );
    // A fully-checked (non-mixed) box relies on native `checked` semantics -- no explicit
    // aria-checked is rendered in that case, only for the mixed/indeterminate state above.
    expect(screen.getByTitle("Select all on this page")).not.toHaveAttribute("aria-checked", "mixed");
    expect(screen.getByTitle("Select all on this page").checked).toBe(true);

    fireEvent.click(screen.getByTitle("Select all on this page"));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it("unchecking 'select all' removes only the current page's keys, not unrelated selectedRows entries", () => {
    const manyRows = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
    const onSelectionChange = vi.fn();
    const onPageChange = vi.fn();
    const onLimitChange = vi.fn();

    render(
      <FilterableDataTable
        rows={manyRows}
        columns={columns}
        showExport={false}
        enableSelection
        selectedRows={[1, 2, 3]}
        onSelectionChange={onSelectionChange}
        paginationMode="client"
        page={1}
        limit={2}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    );

    // Page 1 holds ids 1 and 2; id 3 lives on page 2 and must survive the uncheck.
    fireEvent.click(screen.getByTitle("Select all on this page"));
    expect(onSelectionChange).toHaveBeenCalledWith([3]);
  });
});

describe("FilterableDataTable — pagination modes", () => {
  const columns = [{ key: "name", label: "Name" }];

  it("client mode slices exactly the requested page window", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
    const onPageChange = vi.fn();
    const onLimitChange = vi.fn();
    const { container, rerender } = render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        paginationMode="client"
        page={2}
        limit={10}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    );

    const texts = bodyRowTexts(container);
    expect(texts).toHaveLength(10);
    expect(texts[0]).toContain("Row 11");
    expect(texts[9]).toContain("Row 20");
    expect(screen.getByText("Total: 25")).toBeInTheDocument();

    fireEvent.click(screen.getByText(">"));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByText("<"));
    expect(onPageChange).toHaveBeenCalledWith(1);

    rerender(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        paginationMode="client"
        page={1}
        limit={10}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    );
    expect(screen.getByText("<")).toBeDisabled();

    rerender(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        paginationMode="client"
        page={3}
        limit={10}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    );
    expect(screen.getByText(">")).toBeDisabled();
  });

  it("server mode renders rows as-given (no client slicing) and trusts totals from props", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
    const { container } = render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        paginationMode="server"
        page={2}
        limit={20}
        totalPages={5}
        totalRows={97}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />
    );

    expect(bodyRowTexts(container)).toHaveLength(20);
    expect(screen.getByText("Total: 97")).toBeInTheDocument();
    expect(screen.getAllByText(/^Page \d$/)).toHaveLength(5);
  });
});

describe("FilterableDataTable — server search debounce", () => {
  const columns = [{ key: "name", label: "Name" }];
  const rows = [{ id: 1, name: "Row One" }];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not call onServerSearch on mount, even after the debounce window elapses", () => {
    const onServerSearch = vi.fn();
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableServerSearch
        onServerSearch={onServerSearch}
        serverSearchDebounceMs={200}
      />
    );

    act(() => vi.advanceTimersByTime(1000));
    expect(onServerSearch).not.toHaveBeenCalled();
  });

  it("fires once, after the debounce, with the final typed query", () => {
    const onServerSearch = vi.fn();
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableServerSearch
        onServerSearch={onServerSearch}
        serverSearchDebounceMs={200}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "ro" } });
    act(() => vi.advanceTimersByTime(100));
    expect(onServerSearch).not.toHaveBeenCalled();

    // Typing again mid-debounce resets the timer -- only the final value is ever sent.
    fireEvent.change(input, { target: { value: "row" } });
    act(() => vi.advanceTimersByTime(100));
    expect(onServerSearch).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(100));
    expect(onServerSearch).toHaveBeenCalledTimes(1);
    expect(onServerSearch).toHaveBeenCalledWith({
      query: "row",
      field: "all",
      immediate: false,
      fetchAll: false,
      columnFilters: {},
    });
  });

  it("clicking Search fires immediately, bypassing any pending debounce", () => {
    const onServerSearch = vi.fn();
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableServerSearch
        onServerSearch={onServerSearch}
        serverSearchDebounceMs={200}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "row" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    expect(onServerSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: "row", immediate: true })
    );
  });

  it("clicking the input's inline clear button fires an immediate empty search", () => {
    const onServerSearch = vi.fn();
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableServerSearch
        onServerSearch={onServerSearch}
        serverSearchDebounceMs={200}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "row" } });
    onServerSearch.mockClear();

    // The inline "x" clear button only renders once the search box has a value.
    fireEvent.click(input.parentElement.querySelector("button"));

    expect(onServerSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: "", immediate: true })
    );
  });
});

describe("FilterableDataTable — column drag-reorder persistence", () => {
  const columns = [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
    { key: "c", label: "C" },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const dragColumn = (fromTh, toTh) => {
    fireEvent.dragStart(fromTh, { dataTransfer: {} });
    fireEvent.dragEnter(toTh, { dataTransfer: {} });
    fireEvent.dragOver(toTh, { dataTransfer: {} });
    fireEvent.drop(toTh, { dataTransfer: {} });
    fireEvent.dragEnd(fromTh, { dataTransfer: {} });
  };

  it("reorders synchronously on drop, then persists after an 800ms debounce", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} tablePreferenceKey="test-table" />
    );

    const thA = getHeaderCell(container, "A");
    const thC = getHeaderCell(container, "C");
    dragColumn(thA, thC);

    expect(headerLabels(container)).toEqual(["B", "C", "A"]);
    expect(mockSaveTablePreference).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(800));
    expect(mockSaveTablePreference).toHaveBeenCalledWith(
      "test-table",
      ["a", "b", "c"],
      ["b", "c", "a"],
      []
    );
  });

  it("dropping a column onto itself is a no-op", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} tablePreferenceKey="test-table" />
    );

    const thA = getHeaderCell(container, "A");
    dragColumn(thA, thA);

    expect(headerLabels(container)).toEqual(["A", "B", "C"]);
    act(() => vi.advanceTimersByTime(800));
    expect(mockSaveTablePreference).not.toHaveBeenCalled();
  });
});

describe("FilterableDataTable — column pinning", () => {
  const columns = [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
    { key: "c", label: "C" },
  ];

  it("persists immediately (no debounce) and re-sorts display order without mutating drag-reorder state", async () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} tablePreferenceKey="test-table-2" />
    );

    const thB = getHeaderCell(container, "B");
    fireEvent.contextMenu(thB);
    fireEvent.click(screen.getByText("Pin Column"));

    await waitFor(() =>
      expect(mockSaveTablePreference).toHaveBeenCalledWith(
        "test-table-2",
        ["a", "b", "c"],
        ["a", "b", "c"],
        ["b"]
      )
    );
    expect(headerLabels(container)).toEqual(["B", "A", "C"]);

    mockSaveTablePreference.mockClear();
    fireEvent.contextMenu(getHeaderCell(container, "B"));
    fireEvent.click(screen.getByText("Unpin Column"));

    await waitFor(() =>
      expect(mockSaveTablePreference).toHaveBeenCalledWith(
        "test-table-2",
        ["a", "b", "c"],
        ["a", "b", "c"],
        []
      )
    );
    // Unpinning reverts to columnOrder's own order -- proving pinning never touched it.
    expect(headerLabels(container)).toEqual(["A", "B", "C"]);
  });
});

describe("FilterableDataTable — header context menu coordinate fallback", () => {
  // Some browsers fail to dispatch (or mis-target) a native contextmenu on a sticky-positioned
  // header cell, bypassing the per-cell onContextMenu handler entirely -- the per-cell handler
  // never runs at all in that case, not just later/out-of-order. A document-level listener
  // matches the event's real screen coordinates against each header cell's live bounding rect
  // instead of relying on event.target, so it still opens the right column's menu. jsdom has no
  // real layout, so getBoundingClientRect is mocked per-node to exercise this deliberately.
  const columns = [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
  ];

  it("opens the correct column's menu from a contextmenu fired on document, not the cell itself", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} />
    );

    getHeaderCell(container, "A").getBoundingClientRect = () => (
      { left: 0, right: 100, top: 0, bottom: 30, width: 100, height: 30 }
    );
    getHeaderCell(container, "B").getBoundingClientRect = () => (
      { left: 100, right: 200, top: 0, bottom: 30, width: 100, height: 30 }
    );

    fireEvent.contextMenu(document.body, { clientX: 150, clientY: 15 });

    expect(screen.getByText("Pin Column")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Pin Column"));
    expect(headerLabels(container)).toEqual(["B", "A"]);
  });

  it("does not open any menu when the coordinates fall outside every header cell", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} />
    );

    getHeaderCell(container, "A").getBoundingClientRect = () => (
      { left: 0, right: 100, top: 0, bottom: 30, width: 100, height: 30 }
    );
    getHeaderCell(container, "B").getBoundingClientRect = () => (
      { left: 100, right: 200, top: 0, bottom: 30, width: 100, height: 30 }
    );

    fireEvent.contextMenu(document.body, { clientX: 500, clientY: 500 });

    expect(screen.queryByText("Pin Column")).not.toBeInTheDocument();
  });

  it("does not double-open when the per-cell handler already handled the click", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} />
    );

    const thA = getHeaderCell(container, "A");
    thA.getBoundingClientRect = () => (
      { left: 0, right: 100, top: 0, bottom: 30, width: 100, height: 30 }
    );

    // Fired directly on the cell (bubbles by default): the per-cell handler's stopPropagation()
    // stops this from ever reaching the document-level fallback listener too.
    fireEvent.contextMenu(thA, { clientX: 50, clientY: 15 });

    expect(screen.getAllByText("Pin Column")).toHaveLength(1);
  });
});

describe("FilterableDataTable — row virtualization (opt-in)", () => {
  const columns = [{ key: "name", label: "Name" }];
  const smallRows = [
    { id: 1, name: "Row One" },
    { id: 2, name: "Row Two" },
  ];
  const manyRows = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));

  // @tanstack/virtual-core deliberately renders an empty range whenever the measured viewport is
  // 0x0 (see calculateRange in virtual-core: `if (measurements.length === 0 || outerSize === 0)
  // return null`) -- and jsdom's offsetWidth/offsetHeight are always 0 for every element, since it
  // has no real layout engine. A real TableContainer always has a genuine bounded height (the
  // `tableViewportStyle` maxHeight), so stub a nonzero viewport to get realistic windowing instead
  // of universally-empty output; the exact descriptor is restored afterward so it can't leak into
  // other test files. jsdom also has no Element.prototype.scrollTo; the library no-ops when it's
  // absent, so the scroll-reset tests below install a throwaway one to observe calls.
  let offsetHeightDescriptor;
  let offsetWidthDescriptor;

  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    offsetHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    offsetWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 400 });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  });

  afterEach(() => {
    delete Element.prototype.scrollTo;
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", offsetHeightDescriptor);
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidthDescriptor);
  });

  it("enableVirtualization=false (default): renders identically to a non-flagged case, no spacer rows", () => {
    const a = render(<FilterableDataTable rows={smallRows} columns={columns} showExport={false} />);
    const bodyTextsA = bodyRowTexts(a.container);
    const spacersA = a.container.querySelectorAll(".virtual-spacer-row");
    a.unmount();

    const b = render(
      <FilterableDataTable
        rows={smallRows}
        columns={columns}
        showExport={false}
        enableVirtualization={false}
      />
    );
    expect(bodyRowTexts(b.container)).toEqual(bodyTextsA);
    expect(spacersA).toHaveLength(0);
    expect(b.container.querySelectorAll(".virtual-spacer-row")).toHaveLength(0);
  });

  it("enableVirtualization=true with compact=false: warns in dev and renders the non-virtualized path", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <FilterableDataTable
        rows={smallRows}
        columns={columns}
        showExport={false}
        enableVirtualization
        compact={false}
      />
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("compact={false}"));
    expect(container.querySelectorAll(".virtual-spacer-row")).toHaveLength(0);
    expect(bodyRowTexts(container)).toHaveLength(smallRows.length);

    warnSpy.mockRestore();
  });

  it("enableVirtualization=true with compact=true and a large row set: windows the render, no crash", () => {
    const { container } = render(
      <FilterableDataTable
        rows={manyRows}
        columns={columns}
        showExport={false}
        enableVirtualization
      />
    );

    const renderedDataRows = Array.from(container.querySelectorAll("tbody tr")).filter(
      (tr) => !tr.classList.contains("virtual-spacer-row")
    );
    expect(renderedDataRows.length).toBeGreaterThan(0);
    expect(renderedDataRows.length).toBeLessThan(manyRows.length);

    const bottomSpacer = container.querySelector("tr.virtual-spacer-row");
    expect(bottomSpacer).toBeTruthy();
    expect(bottomSpacer.style.getPropertyValue("--vt-spacer-h")).toMatch(/^\d+px$/);
  });

  it("grouped case with a large expanded group: still branches correctly by item.type, no crash", () => {
    const groupedColumns = [
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount", aggregate: "sum" },
    ];
    const groupedRows = Array.from({ length: 150 }, (_, i) => ({
      id: i + 1,
      category: "A",
      amount: 1,
    }));

    render(
      <FilterableDataTable
        rows={groupedRows}
        columns={groupedColumns}
        showExport={false}
        enableVirtualization
        defaultGroupByColumn="category"
      />
    );

    expect(screen.getByText("Category: A")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Category: A").closest("tr").querySelector("button"));

    // The group header itself plus at least one windowed child row, and nowhere near all 150.
    const renderedRows = Array.from(document.querySelectorAll("tbody tr")).filter(
      (tr) => !tr.classList.contains("virtual-spacer-row")
    );
    expect(renderedRows.length).toBeGreaterThan(1);
    expect(renderedRows.length).toBeLessThan(groupedRows.length);
  });

  it("resets scroll on filter/sort/group changes but not on expandedGroups-only changes", () => {
    const groupedColumns = [
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount", aggregate: "sum" },
    ];
    const groupedRows = [
      { id: 1, category: "A", amount: 1 },
      { id: 2, category: "A", amount: 2 },
      { id: 3, category: "B", amount: 3 },
      { id: 4, category: "B", amount: 4 },
    ];

    render(
      <FilterableDataTable
        rows={groupedRows}
        columns={groupedColumns}
        showExport={false}
        enableVirtualization
        defaultGroupByColumn="category"
      />
    );

    // Mount itself triggers the reset effect once; only calls after this point are of interest.
    Element.prototype.scrollTo.mockClear();

    fireEvent.click(screen.getByText("Category: A").closest("tr").querySelector("button"));
    expect(Element.prototype.scrollTo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Sort Amount"));
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });

  it("keyboard nav (enableKeyboardNav) under virtualization: End requests a scroll to the last row", () => {
    const { container } = render(
      <FilterableDataTable
        rows={manyRows}
        columns={columns}
        showExport={false}
        enableVirtualization
        enableKeyboardNav
      />
    );

    const firstRow = container.querySelector("tbody tr:not(.virtual-spacer-row)");
    firstRow.focus();
    Element.prototype.scrollTo.mockClear();

    fireEvent.keyDown(firstRow, { key: "End" });

    // jsdom's Element.prototype.scrollTo stub never actually moves scrollTop, so virtual-core's
    // own reconciliation can never observe the scroll "completing" and re-mount row 200 for a
    // focus assertion here -- that's a live-browser-only concern (see this increment's
    // live-browser verification pass). What IS verifiable in jsdom is that moveActiveRowTo asked
    // the virtualizer to scroll there at all.
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });
});

describe("FilterableDataTable — row context menu (Filter Out / Show Matching)", () => {
  const columns = [{ key: "name", label: "Name" }];
  const rows = [
    { id: 1, name: "Apple" },
    { id: 2, name: "Banana" },
    { id: 3, name: "Apricot" },
  ];

  it("opens on a body cell's contextmenu; 'Filter Out' hides matching rows and closes the menu", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} />
    );

    fireEvent.contextMenu(screen.getByText("Apple").closest("td"));
    expect(screen.getByText("Filter Out")).toBeInTheDocument();
    expect(screen.getByText("Show Matching")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Filter Out"));

    expect(screen.queryByText("Filter Out")).not.toBeInTheDocument();
    const texts = bodyRowTexts(container);
    expect(texts.some((t) => t.includes("Apple"))).toBe(false);
    expect(texts.some((t) => t.includes("Banana"))).toBe(true);
  });

  it("'Show Matching' keeps only rows matching the clicked value", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} />
    );

    fireEvent.contextMenu(screen.getByText("Apple").closest("td"));
    fireEvent.click(screen.getByText("Show Matching"));

    const texts = bodyRowTexts(container);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("Apple");
  });
});

describe("FilterableDataTable — floating surfaces close on Escape (new with the MUI Popover/Menu adoption)", () => {
  const columns = [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
  ];
  const rows = [{ id: 1, a: "x", b: "y" }];

  it("closes the column filter popup (Popover) on Escape", () => {
    render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);

    fireEvent.click(screen.getByTitle("Filter A"));
    const input = screen.getByPlaceholderText("Enter filter value");
    expect(input).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });
    expect(screen.queryByPlaceholderText("Enter filter value")).not.toBeInTheDocument();
  });

  it("closes the header context menu (Menu) on Escape", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} />
    );

    fireEvent.contextMenu(getHeaderCell(container, "A"));
    const pinItem = screen.getByText("Pin Column");
    expect(pinItem).toBeInTheDocument();

    fireEvent.keyDown(pinItem, { key: "Escape", code: "Escape" });
    expect(screen.queryByText("Pin Column")).not.toBeInTheDocument();
  });

  it("closes the row context menu (Menu) on Escape", () => {
    render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);

    fireEvent.contextMenu(screen.getByText("x").closest("td"));
    const filterOutItem = screen.getByText("Filter Out");
    expect(filterOutItem).toBeInTheDocument();

    fireEvent.keyDown(filterOutItem, { key: "Escape", code: "Escape" });
    expect(screen.queryByText("Filter Out")).not.toBeInTheDocument();
  });
});

describe("FilterableDataTable — filter panel drawer", () => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "extra", label: "Extra" },
  ];
  const rows = [
    { id: 1, name: "Apple", extra: "x" },
    { id: 2, name: "Banana", extra: "y" },
  ];

  const getDrawerRoot = () => screen.getByText("Filter Panel").closest(".flex.h-full.flex-col");

  it("renders a filter card per column; Apply commits the draft and filters rows", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    const drawerRoot = getDrawerRoot();

    // A card exists for every column, not just currently-visible ones.
    const nameCard = within(drawerRoot).getByText("Name").closest("div.rounded-md");
    expect(within(drawerRoot).getByText("Extra")).toBeInTheDocument();

    fireEvent.change(within(nameCard).getByDisplayValue("Contain"), { target: { value: "equal" } });
    fireEvent.change(within(nameCard).getByPlaceholderText("Filter Name"), {
      target: { value: "Apple" },
    });
    fireEvent.click(within(drawerRoot).getByRole("button", { name: "Apply" }));

    const texts = bodyRowTexts(container);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("Apple");
  });

  it("Cancel discards an in-progress draft without committing it", async () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    let drawerRoot = getDrawerRoot();
    const nameCard = within(drawerRoot).getByText("Name").closest("div.rounded-md");
    fireEvent.change(within(nameCard).getByPlaceholderText("Filter Name"), {
      target: { value: "Apple" },
    });

    fireEvent.click(within(drawerRoot).getByRole("button", { name: "Cancel" }));
    // MUI Drawer runs a real (non-fake-timer) exit transition before unmounting -- wait for it to
    // fully close before touching background content again, or the still-mounted modal root can
    // leave the rest of the page aria-hidden and background queries fail spuriously.
    await waitFor(() => expect(screen.queryByText("Filter Panel")).not.toBeInTheDocument());
    expect(bodyRowTexts(container)).toHaveLength(rows.length);

    // Reopening re-seeds the draft from committed state -- "Apple" should not have leaked through.
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    drawerRoot = getDrawerRoot();
    const reopenedNameCard = within(drawerRoot).getByText("Name").closest("div.rounded-md");
    expect(within(reopenedNameCard).getByPlaceholderText("Filter Name")).toHaveValue("");
  });

  it("closes on Escape (new with the MUI Drawer adoption)", async () => {
    render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    const title = screen.getByText("Filter Panel");
    expect(title).toBeInTheDocument();

    fireEvent.keyDown(title, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByText("Filter Panel")).not.toBeInTheDocument());
  });
});

describe("FilterableDataTable — column personalizer modal", () => {
  const columns = [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
    { key: "c", label: "C" },
  ];

  it("moves a column from Selected to Available via double-click, and OK applies + persists it", async () => {
    render(
      <FilterableDataTable
        rows={[]}
        columns={columns}
        showExport={false}
        tablePreferenceKey="personalizer-test"
      />
    );

    fireEvent.click(screen.getByTitle("Select visible columns"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Personalize List Columns")).toBeInTheDocument();
    expect(within(dialog).getByText("All columns selected")).toBeInTheDocument();

    fireEvent.doubleClick(within(dialog).getByText("B"));
    expect(within(dialog).queryByText("All columns selected")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "OK" }));

    await waitFor(() =>
      expect(mockSaveTablePreference).toHaveBeenCalledWith(
        "personalizer-test",
        ["a", "c"],
        ["a", "c"],
        []
      )
    );
    // MUI Dialog also runs a real exit transition -- the saveTablePreference wait above can
    // resolve well before that transition finishes, so it needs its own wait.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes on Escape (new with the MUI Dialog adoption)", async () => {
    render(<FilterableDataTable rows={[]} columns={columns} showExport={false} />);

    fireEvent.click(screen.getByTitle("Select visible columns"));
    const dialog = screen.getByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("FilterableDataTable — row-level keyboard navigation (opt-in)", () => {
  const columns = [{ key: "name", label: "Name" }];
  const rows = [
    { id: 1, name: "Alpha" },
    { id: 2, name: "Beta" },
    { id: 3, name: "Gamma" },
  ];

  const dataRows = (container) =>
    Array.from(container.querySelectorAll("tbody tr")).filter(
      (tr) => !tr.classList.contains("virtual-spacer-row")
    );

  it("enableKeyboardNav=false (default): no tabIndex on any row", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} />
    );
    dataRows(container).forEach((tr) => expect(tr).not.toHaveAttribute("tabindex"));
  });

  it("ArrowDown moves the roving tabIndex from row 0 to row 1", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} enableKeyboardNav />
    );
    const [row0, row1] = dataRows(container);
    expect(row0).toHaveAttribute("tabindex", "0");
    expect(row1).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(row0, { key: "ArrowDown" });

    expect(row0).toHaveAttribute("tabindex", "-1");
    expect(row1).toHaveAttribute("tabindex", "0");
  });

  it("clamps at both boundaries instead of wrapping", () => {
    // Unlike SearchableSelect.jsx's bounded dropdown (wraps via modulo, a harmless combobox
    // convention for tens of options), this table can hold thousands of virtualized rows --
    // wrapping from the last row back to row 0 would be disorienting and force an expensive
    // scroll jump. Diverging from that precedent is intentional.
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} enableKeyboardNav />
    );
    const trs = dataRows(container);

    fireEvent.keyDown(trs[0], { key: "ArrowUp" });
    expect(trs[0]).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(trs[0], { key: "ArrowDown" });
    fireEvent.keyDown(trs[1], { key: "ArrowDown" });
    expect(trs[2]).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(trs[2], { key: "ArrowDown" });
    expect(trs[2]).toHaveAttribute("tabindex", "0");
  });

  it("Home/End jump to the first/last row", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} enableKeyboardNav />
    );
    const trs = dataRows(container);

    fireEvent.keyDown(trs[0], { key: "End" });
    expect(trs[2]).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(trs[2], { key: "Home" });
    expect(trs[0]).toHaveAttribute("tabindex", "0");
  });

  it("Enter on a data row calls onRowClick with that row", () => {
    const onRowClick = vi.fn();
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableKeyboardNav
        onRowClick={onRowClick}
      />
    );

    fireEvent.keyDown(screen.getByText("Beta").closest("tr"), { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it("Space toggles selection; firing the same key directly on the row's own checkbox does not double-fire", () => {
    const onSelectionChange = vi.fn();
    render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableKeyboardNav
        enableSelection
        selectedRows={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    const betaRow = screen.getByText("Beta").closest("tr");
    fireEvent.keyDown(betaRow, { key: " " });
    expect(onSelectionChange).toHaveBeenCalledWith([2]);

    onSelectionChange.mockClear();
    fireEvent.keyDown(betaRow.querySelector('input[type="checkbox"]'), { key: " " });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  describe("group rows", () => {
    const groupedColumns = [
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount", aggregate: "sum" },
    ];
    const groupedRows = [
      { id: 1, category: "A", amount: 10 },
      { id: 2, category: "A", amount: 20 },
      { id: 3, category: "B", amount: 5 },
      { id: 4, category: "B", amount: 7 },
    ];

    it("Enter toggles expand/collapse", () => {
      render(
        <FilterableDataTable
          rows={groupedRows}
          columns={groupedColumns}
          showExport={false}
          enableKeyboardNav
          defaultGroupByColumn="category"
        />
      );

      const groupRow = screen.getByText("Category: A").closest("tr");
      expect(screen.queryByText("10")).not.toBeInTheDocument();

      fireEvent.keyDown(groupRow, { key: "Enter" });
      expect(screen.getByText("10")).toBeInTheDocument();

      fireEvent.keyDown(groupRow, { key: "Enter" });
      expect(screen.queryByText("10")).not.toBeInTheDocument();
    });

    it("Space is a no-op", () => {
      const onSelectionChange = vi.fn();
      render(
        <FilterableDataTable
          rows={groupedRows}
          columns={groupedColumns}
          showExport={false}
          enableKeyboardNav
          enableSelection
          selectedRows={[]}
          onSelectionChange={onSelectionChange}
          defaultGroupByColumn="category"
        />
      );

      const groupRow = screen.getByText("Category: A").closest("tr");
      fireEvent.keyDown(groupRow, { key: " " });

      expect(onSelectionChange).not.toHaveBeenCalled();
      expect(screen.queryByText("10")).not.toBeInTheDocument();
    });
  });

  it("Tab still reaches each row's own checkbox/action button in order -- roving tabIndex adds no stop beyond the active row", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <FilterableDataTable
        rows={rows}
        columns={columns}
        showExport={false}
        enableKeyboardNav
        enableSelection
        selectedRows={[]}
        onSelectionChange={vi.fn()}
        renderActions={(row) => <button type="button">Edit {row.name}</button>}
      />
    );

    const trs = dataRows(container);
    trs[0].focus();
    expect(document.activeElement).toBe(trs[0]);

    await user.tab();
    expect(document.activeElement).toBe(trs[0].querySelector('input[type="checkbox"]'));

    await user.tab();
    expect(document.activeElement).toBe(within(trs[0]).getByText("Edit Alpha"));

    await user.tab();
    // Row 1 itself is tabIndex=-1 (not the roving target) -- Tab skips straight to its checkbox,
    // proving this feature prepends exactly one stop and doesn't add a stop per row.
    expect(document.activeElement).toBe(trs[1].querySelector('input[type="checkbox"]'));
  });
});

describe("FilterableDataTable — column resize (opt-in, widen-only)", () => {
  const columns = [
    { key: "a", label: "A" },
    { key: "b", label: "B" },
  ];

  const getHandle = (container, label) => {
    const th = getHeaderCell(container, label);
    return th.querySelector('[role="separator"]');
  };

  const resizeColumn = (handle, deltaX) => {
    fireEvent.mouseDown(handle, { button: 0, clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 100 + deltaX });
    fireEvent.mouseUp(window);
  };

  it("enableColumnResize=false (default): no resize handle renders anywhere", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} />
    );

    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(0);
  });

  it("no resize handle renders on the leading checkbox/settings column", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} enableColumnResize />
    );

    const leadingTh = container.querySelectorAll("thead th")[0];
    expect(leadingTh.querySelector('[role="separator"]')).toBeNull();
  });

  it("dragging the handle widens the column, both mid-drag and after mouseup", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} enableColumnResize />
    );

    const thA = getHeaderCell(container, "A");
    const handle = getHandle(container, "A");

    // jsdom always reports offsetWidth=0 (no real layout), so the drag's starting width is 0 --
    // delta alone determines the result here. Using a delta comfortably clear of the default
    // 64px floor (see the clamping test below) keeps this test about widening, not clamping.
    fireEvent.mouseDown(handle, { button: 0, clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 250 });
    // Mid-drag: direct DOM mutation, no React re-render needed to observe it.
    expect(thA.style.width).toBe("150px");

    fireEvent.mouseUp(window);
    // Post-drop: committed to columnWidths state, still reflected in the rendered style.
    expect(thA.style.width).toBe("150px");
  });

  it("clamps to minColumnWidthPx/maxColumnWidthPx rather than the raw drag delta", () => {
    const { container } = render(
      <FilterableDataTable
        rows={[]}
        columns={columns}
        showExport={false}
        enableColumnResize
        minColumnWidthPx={80}
        maxColumnWidthPx={200}
      />
    );

    const thA = getHeaderCell(container, "A");
    resizeColumn(getHandle(container, "A"), -500);
    expect(thA.style.width).toBe("80px");

    resizeColumn(getHandle(container, "A"), 5000);
    expect(thA.style.width).toBe("200px");
  });

  it("double-click resets that column's width", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} enableColumnResize />
    );

    const thA = getHeaderCell(container, "A");
    resizeColumn(getHandle(container, "A"), 100);
    expect(thA.style.width).toBe("100px");

    fireEvent.doubleClick(getHandle(container, "A"));
    expect(thA.style.width).toBe("");
  });

  it("resizing one column does not affect another column's width", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} enableColumnResize />
    );

    resizeColumn(getHandle(container, "A"), 60);
    expect(getHeaderCell(container, "B").style.width).toBe("");
  });

  it("'Reset to column defaults' also clears all resized widths", () => {
    const { container } = render(
      <FilterableDataTable rows={[]} columns={columns} showExport={false} enableColumnResize />
    );

    resizeColumn(getHandle(container, "A"), 100);
    expect(getHeaderCell(container, "A").style.width).toBe("100px");

    fireEvent.click(screen.getByTitle("Select visible columns"));
    fireEvent.click(screen.getByText("Reset to column defaults"));

    expect(getHeaderCell(container, "A").style.width).toBe("");
  });
});
