import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/utils/tablePreferences", () => ({
  fetchTablePreference: () => Promise.resolve(null),
  saveTablePreference: () => Promise.resolve(null),
}));

import FilterableDataTable from "@/shared/components/FilterableDataTable";

// "Personalize List Columns" (ColumnPersonalizerDialog, opened from the table toolbar): choose and order columns.

const columns = [
  { key: "name", label: "Name" },
  { key: "city", label: "City" },
  { key: "status", label: "Status" },
];
const rows = [{ id: 1, name: "Anu", city: "Chennai", status: "Open" }];
const headers = (container) => Array.from(container.querySelectorAll("thead th")).map((th) => th.textContent.trim()).filter(Boolean);
const openDialog = () => {
  fireEvent.click(screen.getByTitle("Select visible columns"));
  return screen.getByRole("dialog");
};

describe("ColumnPersonalizerDialog", () => {
  it("reorders and hides columns, and nothing changes until OK", () => {
    const { container } = render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);
    expect(headers(container)).toEqual(["Name", "City", "Status"]);

    let dialog = openDialog();
    fireEvent.click(within(dialog).getByText("Status"));
    fireEvent.click(within(dialog).getByTitle("Move up"));
    fireEvent.click(within(dialog).getByTitle("Move up"));
    fireEvent.click(within(dialog).getByText("City"));
    fireEvent.click(within(dialog).getByTitle("Move to available"));
    expect(headers(container)).toEqual(["Name", "City", "Status"]);
    fireEvent.click(within(dialog).getByRole("button", { name: "OK" }));
    expect(headers(container)).toEqual(["Status", "Name"]);

    // Cancel throws the draft away, and the next open starts from the table's columns again.
    dialog = openDialog();
    fireEvent.click(within(dialog).getByTitle("Move all to selected"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(headers(container)).toEqual(["Status", "Name"]);
    dialog = openDialog();
    expect(within(dialog).getByText("City")).toBeInTheDocument();
    expect(within(dialog).getByTitle("Move all to selected")).toBeEnabled();
  });

  it("always keeps one column selected", () => {
    const { container } = render(<FilterableDataTable rows={rows} columns={columns} showExport={false} />);
    const dialog = openDialog();
    fireEvent.click(within(dialog).getByTitle("Move all to available"));
    expect(within(dialog).getByTitle("Move all to available")).toBeDisabled();
    fireEvent.click(within(dialog).getByText("Name"));
    expect(within(dialog).getByTitle("Move to available")).toBeDisabled();
    fireEvent.doubleClick(within(dialog).getByText("Name"));
    fireEvent.click(within(dialog).getByRole("button", { name: "OK" }));
    expect(headers(container)).toEqual(["Name"]);
  });
});
