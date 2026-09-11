import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterableDataTable from "../FilterableDataTable";

describe("FilterableDataTable — Multi-Column Filter, Sorting, and Grouping Features", () => {
  const sampleColumns = [
    { key: "id", label: "ID" },
    { key: "category", label: "Category" },
    { key: "region", label: "Region" },
    { key: "sales", label: "Sales", aggregate: "sum" },
    { key: "status", label: "Status" },
  ];

  const sampleRows = [
    { id: 1, category: "Hardware", region: "North", sales: 150, status: "Active" },
    { id: 2, category: "Hardware", region: "North", sales: 250, status: "Active" },
    { id: 3, category: "Hardware", region: "South", sales: 300, status: "Inactive" },
    { id: 4, category: "Software", region: "North", sales: 400, status: "Active" },
    { id: 5, category: "Software", region: "South", sales: 500, status: "Active" },
    { id: 6, category: "Services", region: "East", sales: 100, status: "Active" },
  ];

  const getBodyRows = (container) =>
    Array.from(container.querySelectorAll("tbody tr")).map((tr) => tr.textContent);

  it("applies multi-column filtering simultaneously across distinct columns", () => {
    const { container } = render(
      <FilterableDataTable
        rows={sampleRows}
        columns={sampleColumns}
        showExport={false}
      />
    );

    // Filter 1: Category = "Hardware"
    fireEvent.click(screen.getByTitle("Filter Category"));
    fireEvent.change(screen.getByDisplayValue("Contain"), { target: { value: "equal" } });
    fireEvent.change(screen.getByPlaceholderText("Enter filter value"), {
      target: { value: "Hardware" },
    });

    // After Category filter: 3 rows (ID 1, 2, 3)
    let rowsAfterCol1 = getBodyRows(container);
    expect(rowsAfterCol1).toHaveLength(3);

    // Filter 2: Status = "Active"
    fireEvent.click(screen.getByTitle("Filter Status"));
    fireEvent.change(screen.getByDisplayValue("Contain"), { target: { value: "equal" } });
    fireEvent.change(screen.getByPlaceholderText("Enter filter value"), {
      target: { value: "Active" },
    });

    // After both filters: only 2 rows (ID 1 and 2: Hardware + Active)
    let rowsAfterBoth = getBodyRows(container);
    expect(rowsAfterBoth).toHaveLength(2);
    expect(rowsAfterBoth[0]).toContain("North");
    expect(rowsAfterBoth[1]).toContain("North");
  });

  it("sorts rows ascending, descending, and restores order on 3-state toggle", () => {
    const { container } = render(
      <FilterableDataTable
        rows={sampleRows}
        columns={sampleColumns}
        showExport={false}
      />
    );

    const sortSalesBtn = screen.getByTitle("Sort Sales");

    // 1st click: Ascending (100, 150, 250, 300, 400, 500)
    fireEvent.click(sortSalesBtn);
    let rows = getBodyRows(container);
    expect(rows[0]).toContain("Services"); // 100
    expect(rows[5]).toContain("500");

    // 2nd click: Descending (500, 400, 300, 250, 150, 100)
    fireEvent.click(sortSalesBtn);
    rows = getBodyRows(container);
    expect(rows[0]).toContain("500");
    expect(rows[5]).toContain("Services");

    // 3rd click: Reset to original order
    fireEvent.click(sortSalesBtn);
    rows = getBodyRows(container);
    expect(rows[0]).toContain("Hardware");
    expect(rows[0]).toContain("150");
  });

  // Client-side row grouping (with per-column sum/avg aggregation) was removed in favor of
  // server-side Group By (GroupAggregationService) -- see FilterableDataTable.serverGroup.test.jsx
  // for the current grouping behavior. A capped, silently-sampled client computation was worse
  // than not offering grouping at all once tables reached real scale.
});
