import { configureStore } from "@reduxjs/toolkit";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import authReducer from "@/features/auth/authSlice";
import WarehouseReports from "@/features/warehouse/WarehouseReports";
import api from "@/shared/api/apiClient";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));
vi.mock("@/shared/components/FilterableDataTable", () => ({
  default: ({ rows, loading, emptyText }) => <div>{loading ? "Loading probe" : <pre data-testid="report-rows">{JSON.stringify(rows)}</pre>}{!loading && !rows.length && emptyText}</div>,
}));

const poLine = { po_no: "PO-1", po_date: "2026-10-30", supplier: "Mill", status: "Part received", product: "Shirt", code: "SH", size: "-", ordered: 10, received: 4, pending: 6 };
const responses = {
  "/warehouse-reports/summary-layouts": { po_lines: { dated: true, layouts: [{ value: "supplier", label: "Supplier" }, { value: "status", label: "Status" }] } },
  "/warehouse-reports/data/po_lines": [poLine, { ...poLine, po_no: "PO-2", status: "Closed", received: 10, pending: 0 }],
  "/warehouse-reports/summary/po_lines": { layout_label: "Supplier", group_header: "Supplier", from: "2026-10-01", to: "2026-10-31",
    columns: [{ key: "pending", label: "Pending", type: "qty" }], rows: [{ s_no: 1, label: "Mill", pending: 6 }], totals: { pending: 6 } },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((url) => Promise.resolve({ data: { data: responses[url] ?? [] } }));
});
afterEach(cleanup);

async function open(group, report) {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user: { id: 1, role: "admin", store_id: 2 }, token: "t" } } });
  render(<Provider store={store}><MemoryRouter><WarehouseReports /></MemoryRouter></Provider>);
  fireEvent.click(screen.getByText((text) => text === group || text.startsWith(`${group} (`)));
  fireEvent.click(await screen.findByText(report, { exact: true }));
  await waitFor(() => expect(screen.queryByText("Loading probe")).not.toBeInTheDocument());
  return JSON.parse(screen.getByTestId("report-rows").textContent);
}

it("Purchase Order - Item wise Pending lists only lines still to come", async () => {
  const rows = await open("Purchase Order Reports", "Purchase Order - Item wise Pending");
  expect(rows.map((row) => row.po_no)).toEqual(["PO-1"]);
});

it("Summary layouts run the tab's breakdown on the server and Standard view goes back", async () => {
  await open("Purchase Order Reports", "Purchase Order - Detail Report");
  fireEvent.click(await screen.findByRole("button", { name: "Summary layouts" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply breakdown" }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/warehouse-reports/summary/po_lines", { params: expect.objectContaining({ layout: "supplier" }) }));
  await waitFor(() => expect(JSON.parse(screen.getByTestId("report-rows").textContent).map((row) => row.label)).toEqual(["Mill", "Total"]));
  expect(screen.getByText(/for 2026-10-01 → 2026-10-31/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Standard view" }));
  expect(JSON.parse(screen.getByTestId("report-rows").textContent)).toHaveLength(2);
});
