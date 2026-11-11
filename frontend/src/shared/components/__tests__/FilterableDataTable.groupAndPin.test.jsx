import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/utils/tablePreferences", () => ({
  fetchTablePreference: () => Promise.resolve(null),
  saveTablePreference: () => Promise.resolve(null),
}));

import FilterableDataTable from "@/shared/components/FilterableDataTable";

// Group By in the browser (tables that hold every row) and row pinning No pin / top / bottom.

const columns = [
  { key: "name", label: "Name" },
  { key: "status", label: "Status" },
];
const rows = [
  { id: 1, name: "Anu", status: "Open" },
  { id: 2, name: "Bala", status: "Closed" },
  { id: 3, name: "Chitra", status: "Open" },
  { id: 4, name: "Dev", status: "" },
  { id: 5, name: "Esha", status: "Closed" },
];

const headerCell = (container, label) =>
  Array.from(container.querySelectorAll("thead th")).find((th) => th.textContent.trim() === label);
const bodyTexts = (container) => Array.from(container.querySelectorAll("tbody tr")).map((tr) => tr.textContent);
const cell = (container, text) =>
  Array.from(container.querySelectorAll("tbody td")).find((td) => td.textContent.trim() === text);

const groupBy = (container, label) => {
  fireEvent.contextMenu(headerCell(container, label));
  fireEvent.click(screen.getByText("Group By"));
};

const pinRow = (container, text, choice) => {
  fireEvent.contextMenu(cell(container, text));
  fireEvent.click(screen.getByRole("menuitem", { name: /Pin row/ }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: choice }));
};

describe("FilterableDataTable — Group By for tables that hold every row", () => {
  it("groups the full row set in the browser, including a (Blank) group, and expands a group", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} paginationMode="client"
        page={1} limit={20} onPageChange={vi.fn()} onLimitChange={vi.fn()} />
    );
    groupBy(container, "Status");
    const texts = bodyTexts(container);
    expect(texts.some((t) => t.includes("Status: Open"))).toBe(true);
    expect(texts.some((t) => t.includes("Status: Closed"))).toBe(true);
    expect(texts.some((t) => t.includes("Status: (Blank)"))).toBe(true);
    expect(texts.some((t) => t.includes("Anu"))).toBe(false);
    expect(screen.getByText(/3 groups · 5 rows total/)).toBeInTheDocument();

    fireEvent.click(within(screen.getByText(/Status: Open/).closest("tr")).getByRole("button", { expanded: false }));
    const expanded = bodyTexts(container);
    expect(expanded.some((t) => t.includes("Anu"))).toBe(true);
    expect(expanded.some((t) => t.includes("Chitra"))).toBe(true);
    expect(expanded.some((t) => t.includes("Bala"))).toBe(false);

    fireEvent.contextMenu(headerCell(container, "Status"));
    fireEvent.click(screen.getByText("Ungroup"));
    expect(bodyTexts(container).filter((t) => /Anu|Bala|Chitra|Dev|Esha/.test(t))).toHaveLength(5);
  });

  it("offers Group By on a table with no paging and no server fetchers", () => {
    const { container } = render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);
    fireEvent.contextMenu(headerCell(container, "Status"));
    expect(screen.getByText("Group By")).toBeInTheDocument();
  });

  it("does not offer Group By on a server-paged table without a grouped endpoint", () => {
    const { container } = render(
      <FilterableDataTable rows={rows} columns={columns} showExport={false} paginationMode="server"
        page={1} limit={20} totalRows={500} totalPages={25} onPageChange={vi.fn()} onLimitChange={vi.fn()} />
    );
    fireEvent.contextMenu(headerCell(container, "Status"));
    expect(screen.queryByText("Group By")).toBeNull();
  });
});

describe("FilterableDataTable — row pinning (No pin / Pin to top / Pin to bottom)", () => {
  it("pins one row to the top and another to the bottom, and No pin returns it to the body", () => {
    const { container } = render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);
    pinRow(container, "Chitra", "Pin to top");
    pinRow(container, "Bala", "Pin to bottom");

    const top = container.querySelectorAll('tbody tr[data-pinned-row="top"]');
    const bottom = container.querySelectorAll('tbody tr[data-pinned-row="bottom"]');
    expect(top).toHaveLength(1);
    expect(top[0].textContent).toContain("Chitra");
    expect(bottom).toHaveLength(1);
    expect(bottom[0].textContent).toContain("Bala");
    const texts = bodyTexts(container);
    expect(texts[0]).toContain("Chitra");
    expect(texts[texts.length - 1]).toContain("Bala");
    expect(texts.filter((t) => t.includes("Chitra"))).toHaveLength(1);

    // The menu ticks the current side, and a row moves between sides rather than being in both.
    fireEvent.contextMenu(cell(container, "Bala"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Pin row/ }));
    expect(screen.getByRole("menuitemradio", { name: "Pin to bottom" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Pin to top" }));
    expect(container.querySelectorAll('tbody tr[data-pinned-row="top"]')).toHaveLength(2);
    expect(container.querySelectorAll('tbody tr[data-pinned-row="bottom"]')).toHaveLength(0);

    pinRow(container, "Chitra", "No pin");
    const topAfter = container.querySelectorAll('tbody tr[data-pinned-row="top"]');
    expect(topAfter).toHaveLength(1);
    expect(topAfter[0].textContent).toContain("Bala");
    expect(bodyTexts(container).filter((t) => t.includes("Chitra"))).toHaveLength(1);

    // The pin icon on a pinned row unpins it.
    fireEvent.click(within(topAfter[0]).getByRole("button", { name: "Unpin row" }));
    expect(container.querySelectorAll('tbody tr[data-pinned-row]')).toHaveLength(0);
  });

  it("keeps a pinned row in view after the page changes", () => {
    const pageOne = rows.slice(0, 3);
    const pageTwo = rows.slice(3);
    const props = { columns, showExport: false, paginationMode: "server", limit: 3, totalRows: 5, totalPages: 2, onPageChange: vi.fn(), onLimitChange: vi.fn() };
    const { container, rerender } = render(<FilterableDataTable {...props} rows={pageOne} page={1} />);
    pinRow(container, "Anu", "Pin to bottom");
    rerender(<FilterableDataTable {...props} rows={pageTwo} page={2} />);
    const bottom = container.querySelectorAll('tbody tr[data-pinned-row="bottom"]');
    expect(bottom).toHaveLength(1);
    expect(bottom[0].textContent).toContain("Anu");
    expect(bodyTexts(container).some((t) => t.includes("Dev"))).toBe(true);
  });

  it("keeps pinned rows while grouped", () => {
    const { container } = render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);
    pinRow(container, "Esha", "Pin to top");
    groupBy(container, "Status");
    const top = container.querySelectorAll('tbody tr[data-pinned-row="top"]');
    expect(top).toHaveLength(1);
    expect(top[0].textContent).toContain("Esha");
  });
});
