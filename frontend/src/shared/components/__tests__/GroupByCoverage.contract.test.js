import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Every list offers Group By. Tables that hold all their rows group in the browser
// (FilterableDataTable does it itself); a server-paged table needs group fetchers
// (createGroupFetchers / onFetchGroupSummaries), or it silently has no Group By.
const pages = import.meta.glob("/src/features/**/*.jsx", { query: "?raw", import: "default", eager: true });

// Server-paged lists that can't be grouped in the database yet, and why.
const KNOWN_GAPS = {
  // Pending bills are merged from purchase invoices and direct purchases in PHP, not one query.
  "/src/features/finance/SupplierPayment.jsx": "computed list",
};

describe("Group By coverage", () => {
  it("every server-paged FilterableDataTable page wires group fetchers", () => {
    const serverPaged = Object.entries(pages)
      .filter(([, source]) => source.includes("<FilterableDataTable") && /paginationMode=(\{[^}]*"server"|"server")/.test(source));
    expect(serverPaged.length).toBeGreaterThan(20); // the scan really finds the server-paged pages
    const missing = serverPaged
      .filter(([path, source]) => !/onFetchGroupSummaries|createGroupFetchers/.test(source) && !KNOWN_GAPS[path])
      .map(([path]) => path);
    expect(missing).toEqual([]);
  });

  it("keeps the known-gap list honest", () => {
    Object.keys(KNOWN_GAPS).forEach((path) => {
      const source = pages[path] ?? readFileSync(`.${path}`, "utf8");
      expect(/onFetchGroupSummaries|createGroupFetchers/.test(source)).toBe(false);
    });
  });
});
