import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Daybook from "@/features/finance/accounting/Daybook";
import api from "@/shared/api/apiClient";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));
vi.mock("@/shared/components/FilterableDataTable", () => ({
  default: ({ rows }) => <pre data-testid="summary-rows">{JSON.stringify(rows)}</pre>,
}));

const responses = {
  "/accounting/daybook": [],
  "/accounting/summary-layouts": { voucher_lines: { dated: true, layouts: [{ value: "voucher_type", label: "Voucher type" }, { value: "ledger", label: "Ledger" }] } },
  "/accounting/summary/voucher_lines": { layout_label: "Voucher type", group_header: "Voucher type", columns: [{ key: "debit", label: "Debit", type: "money" }],
    rows: [{ s_no: 1, label: "Sales", debit: 500 }], totals: { debit: 500 } },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((url) => Promise.resolve({ data: { data: responses[url] ?? [] } }));
});
afterEach(cleanup);

it("Daybook summarises the period on the page by voucher type, then goes back to the vouchers", async () => {
  render(<MemoryRouter><Daybook /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Summary layouts" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply breakdown" }));

  await waitFor(() => expect(JSON.parse(screen.getByTestId("summary-rows").textContent).map((row) => row.label)).toEqual(["Sales", "Total"]));
  expect(api.get).toHaveBeenCalledWith("/accounting/summary/voucher_lines", { params: expect.objectContaining({ layout: "voucher_type", from: expect.any(String), to: expect.any(String) }) });

  fireEvent.click(screen.getByRole("button", { name: "Standard view" }));
  expect(screen.queryByTestId("summary-rows")).not.toBeInTheDocument();
  expect(screen.getByText(/No vouchers in this period/)).toBeInTheDocument();
});
