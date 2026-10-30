import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SearchGridPanel from "../SearchGridPanel";
import MasterSearchPanel from "../MasterSearchPanel";

function listingFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listingFiles(path) : entry.name.endsWith(".jsx") && !path.includes("__tests__") ? [path] : [];
  });
}

describe("ERP listing integration contract", () => {
  it("keeps the Master panel as the exact shared panel implementation", () => {
    expect(MasterSearchPanel).toBe(SearchGridPanel);
    const { container } = render(<SearchGridPanel><h2>Product Search</h2><p>Results</p></SearchGridPanel>);
    expect(screen.getByText("Results")).toBeDefined();
    expect(container.querySelectorAll(".erp-search-grid-panel")).toHaveLength(1);
  });

  it("routes every ERP listing through common navigation and panel components", () => {
    const files = listingFiles(resolve("src/pages")).filter(path => readFileSync(path, "utf8").includes("<FilterableDataTable"));
    expect(files.length).toBe(44);
    expect(files.some(path => path.endsWith("WarehouseDashboard.jsx"))).toBe(true);
    for (const path of files) {
      const source = readFileSync(path, "utf8");
      expect(source, path).toContain("useSearchGrid");
      expect(source, path).toMatch(/<(?:MasterSearchPanel|SearchGridPanel)/);
      expect(source, path).not.toMatch(/<TablePagination\b|<Pagination\b|cursorLoadMode="append"/);
    }
  });
});
