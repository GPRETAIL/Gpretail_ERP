import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/utils/tablePreferences", () => ({
  fetchTablePreference: () => Promise.resolve(null),
  saveTablePreference: () => Promise.resolve(null),
}));

import FilterableDataTable from "@/shared/components/FilterableDataTable";

// The table's right-click menus (TableContextMenus): keyboard use and the row value filters.

const columns = [{ key: "name", label: "Name" }, { key: "status", label: "Status" }];
const rows = [{ id: 1, name: "Anu", status: "Open" }, { id: 2, name: "Bala", status: "Closed" }, { id: 3, name: "Chitra", status: "Open" }];
const bodyTexts = (container) => Array.from(container.querySelectorAll("tbody tr")).map((tr) => tr.textContent);

describe("Table right-click menus", () => {
  it("opens the header menu with the first item focused, and → opens the pin choices", async () => {
    const { container } = render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);
    const header = Array.from(container.querySelectorAll("thead th")).find((th) => th.textContent.trim() === "Name");
    fireEvent.contextMenu(header);
    const pinColumn = screen.getByRole("menuitem", { name: /Pin column/ });
    await waitFor(() => expect(pinColumn).toHaveFocus());
    expect(pinColumn).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(pinColumn, { key: "ArrowRight" });
    expect(screen.getByRole("menuitemradio", { name: "Pin left" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Pin left" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Filter Out and Show Matching act on the right-clicked cell's value", () => {
    const { container } = render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);
    const openCell = Array.from(container.querySelectorAll("tbody td")).find((td) => td.textContent.trim() === "Open");
    fireEvent.contextMenu(openCell);
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Status")).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Show Matching" }));
    expect(bodyTexts(container).some((t) => t.includes("Bala"))).toBe(false);
    expect(bodyTexts(container).filter((t) => /Anu|Chitra/.test(t))).toHaveLength(2);

    const anuCell = Array.from(container.querySelectorAll("tbody td")).find((td) => td.textContent.trim() === "Anu");
    fireEvent.contextMenu(anuCell);
    fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Filter Out" }));
    expect(bodyTexts(container).some((t) => t.includes("Anu"))).toBe(false);
    expect(bodyTexts(container).some((t) => t.includes("Chitra"))).toBe(true);
  });
});
