import { configureStore } from "@reduxjs/toolkit";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import authReducer from "@/features/auth/authSlice";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";
import SalesReports from "@/features/sales/reports/SalesReports";
import api from "@/shared/api/apiClient";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));
vi.mock("@/shared/components/FilterableDataTable", () => ({
  default: ({ rows, loading }) => <div>{loading ? "Loading probe" : <pre data-testid="report-rows">{JSON.stringify(rows)}</pre>}</div>,
}));

// Two live invoices and one cancelled one. Line tax is charged on qty x price, so 180 on 1000 is 18% and 50 on 1000 is 5%.
const invoices = [
  {
    id: 1, bill_no: "D261116-0001", invoice_no: "DINV-1", sale_at: "2026-11-16 10:00:00", customer_name: "Acme Traders", customer_gstin: "33ABCDE1234F1Z5",
    status: "ACTIVE", total_qty: 3, subtotal: 2000, discount_amount: 0, tax_amount: 230, other_charges: 0, grand_total: 2230, payment_status: "Credit",
    items: [
      { quantity: 1, price: 1000, discount: 0, tax_amount: 180, total: 1180, product_name: "Shirt", hsn_code: "6109" },
      { quantity: 2, price: 500, discount: 0, tax_amount: 50, total: 1050, product_name: "Vest", hsn_code: "6109" },
    ],
  },
  {
    id: 2, bill_no: "D261116-0002", invoice_no: "DINV-2", sale_at: "2026-11-16 11:00:00", customer_name: "Acme Traders", customer_gstin: null,
    status: "ACTIVE", total_qty: 1, subtotal: 1000, discount_amount: 0, tax_amount: 180, other_charges: 0, grand_total: 1180, payment_status: "Paid",
    items: [{ quantity: 1, price: 1000, discount: 0, tax_amount: 180, total: 1180, product_name: "Shirt", hsn_code: "6109" }],
  },
  { id: 3, bill_no: "D261116-0003", status: "CANCELLED", cancelled_at: "2026-11-16 12:00:00", items: [{ quantity: 9, price: 9, tax_amount: 9, total: 99, product_name: "Ghost", hsn_code: "0000" }] },
];

beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); api.get.mockResolvedValue({ data: { data: invoices } }); });
afterEach(cleanup);

async function open(report) {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user: { id: 1, role: "admin", company_id: 1 }, token: "test" } } });
  render(<Provider store={store}><MemoryRouter><TransferActivityProvider><SalesReports /></TransferActivityProvider></MemoryRouter></Provider>);
  fireEvent.click(screen.getByText(/^Reports - B2B Vertical \(/));
  fireEvent.click(await screen.findByText(report, { exact: true }));
  await waitFor(() => expect(screen.queryByText("Loading probe")).not.toBeInTheDocument());
  return JSON.parse(screen.getByTestId("report-rows").textContent);
}

it("the B2B reports are available and read dealer invoices", async () => {
  await open("Sales Report");
  expect(api.get).toHaveBeenCalledWith("/dealer-invoices", { params: { all: "true" } });
  expect(screen.queryByText(/Not available yet/)).not.toBeInTheDocument();
});

it("Sales Report lists live dealer invoices with their GSTIN and leaves out cancelled ones", async () => {
  const rows = await open("Sales Report");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ bill_no: "D261116-0001", customer_name: "Acme Traders", gstin: "33ABCDE1234F1Z5", qty: 3, taxable_amount: 2000, tax_amount: 230, total: 2230 });
  expect(rows[1]).toMatchObject({ gstin: "-", payment_status: "Paid" });
});

it("Tax Report (Column wise) has one row per invoice line with the tax % worked out from the amounts", async () => {
  const rows = await open("Sales Tax Report (Column wise)");
  expect(rows).toHaveLength(3);
  expect(rows.map((row) => row.tax_perc)).toEqual([18, 5, 18]);
  expect(rows[1]).toMatchObject({ product_name: "Vest", hsn: "6109", qty: 2, subtotal: 1000, tax_amount: 50, total: 1050 });
});

it("Tax Report (Row wise) totals each tax rate across invoices, highest rate first", async () => {
  const rows = await open("Sales Tax Report (Row wise)");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ tax_perc: 18, bill_count: 2, qty: 2, taxable_amount: 2000, tax_amount: 360, total: 2360 });
  expect(rows[1]).toMatchObject({ tax_perc: 5, bill_count: 1, taxable_amount: 1000, tax_amount: 50 });
});

it("HSN Report groups lines by HSN code and ignores the cancelled invoice", async () => {
  const rows = await open("Sales HSN Report");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ hsn: "6109", bill_count: 2, qty: 4, taxable_amount: 3000, tax_amount: 410, total: 3410 });
});

it("an empty dealer list gives empty reports without errors", async () => {
  api.get.mockResolvedValue({ data: { data: [] } });
  expect(await open("Sales HSN Report")).toEqual([]);
});
