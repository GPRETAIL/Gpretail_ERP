import { describe, expect, it, vi } from "vitest";
import api from "@/shared/api/apiClient";
import { buildSummaryColumns, buildSummaryRows, fetchSummary } from "@/shared/utils/reportSummary";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));

const summary = {
  layout_label: "Supplier", group_header: "Supplier", from: "2026-10-01", to: "2026-10-31", capped: false,
  columns: [{ key: "bill_date", label: "Date", type: "text" }, { key: "bills", label: "Bills", type: "count" }, { key: "amount", label: "Amount", type: "money" }],
  rows: [{ s_no: 1, label: "Cotton Mill", bill_date: "2026-10-02 00:00:00", bills: 2, amount: 1500.5 }],
  totals: { bills: 2, amount: 1500.5 },
};

describe("report summaries", () => {
  it("builds S.No, group, details and totals columns, with a Total row from the server totals", () => {
    const columns = buildSummaryColumns(summary);
    expect(columns.map((column) => column.label)).toEqual(["S.No", "Supplier", "Date", "Bills", "Amount"]);
    const rows = buildSummaryRows(summary);
    expect(rows.map((row) => row.id)).toEqual(["g_1", "__total__"]);
    expect(rows[1]).toMatchObject({ label: "Total", bills: 2, amount: 1500.5 });
    expect(columns[1].valueGetter(rows[1])).toBe("Total");
    expect(columns[0].valueGetter(rows[1])).toBe("");
  });

  it("leaves out the Total row when nothing matched", () => {
    expect(buildSummaryRows({ ...summary, rows: [] })).toEqual([]);
  });

  it("asks the page's summary endpoint for the dataset, layout and period", async () => {
    api.get.mockResolvedValue({ data: { data: summary } });
    const result = await fetchSummary("/warehouse-reports/summary", "direct_purchase_lines", { layout: "supplier", from: "2026-10-01", to: "2026-10-31" });
    expect(api.get).toHaveBeenCalledWith("/warehouse-reports/summary/direct_purchase_lines", { params: { layout: "supplier", from: "2026-10-01", to: "2026-10-31" } });
    expect(result).toMatchObject({ label: "Supplier", from: "2026-10-01", to: "2026-10-31", capped: false });
    expect(result.rows).toHaveLength(2);
  });
});
