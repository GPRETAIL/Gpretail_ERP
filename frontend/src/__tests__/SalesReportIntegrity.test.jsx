import { configureStore } from "@reduxjs/toolkit";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import authReducer from "../features/authSlice";
import { TransferActivityProvider } from "../context/TransferActivityContext";
import SalesReports from "../pages/sales/SalesReports";
import api from "../api/axios";

vi.mock("../api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../components/FilterableDataTable", () => ({ default: ({ rows, columns, loading, emptyText }) => <div>{loading ? "Loading probe" : <><pre data-testid="report-rows">{JSON.stringify(rows)}</pre><pre data-testid="report-values">{JSON.stringify(rows.map(row => Object.fromEntries(columns.map(column => [column.key, column.valueGetter ? column.valueGetter(row) : row[column.key]]))))}</pre></>}{!loading && !rows.length && emptyText}</div> }));
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); api.get.mockResolvedValue({ data: { data: [] } }); });
afterEach(cleanup);

async function open(group, report) {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user: { id: 1, role: "admin", company_id: 1 }, token: "test" } } });
  render(<Provider store={store}><MemoryRouter><TransferActivityProvider><SalesReports /></TransferActivityProvider></MemoryRouter></Provider>);
  fireEvent.click(screen.getByText(new RegExp(`^${group} \\(`)));
  fireEvent.click(await screen.findByText(report, { exact: true }));
  await waitFor(() => expect(screen.queryByText("Loading probe")).not.toBeInTheDocument());
  return JSON.parse(screen.getByTestId("report-rows").textContent);
}

it.each([
  ["Sales Reports", "Unsettled Bill Report", "open"],
  ["Sales Reports", "Sales Report - Cancelled Sales Report", "canceled"],
  ["Settlement Reports", "Credit Sale Collection Report", "credit"],
  ["Customer Reports", "Credit Customer Outstanding Report", "credit"],
])("%s / %s requests the correct status", async (group, report, status) => {
  await open(group, report);
  expect(api.get).toHaveBeenCalledWith("/settlements/unpaid-bills", { params: { status, all: "true" } });
});

const sale = (id, status) => ({ id, status, invoice_no: `BILL-${id}`, sale_date: "2026-09-01T12:00:00Z", created_at: "2026-10-01T12:00:00Z", grand_total: 100, paid_amount: 100, subtotal: 90, tax_amount: 10, items: [{ quantity: 1, selling_price: 90, cost_price: 50, subtotal: 100, tax_rate: 10, tax_amount: 10, product: { name: "Same product", hsn_code: "1234" } }] });

it("margin excludes collected tax rather than presenting it as profit", async () => {
  api.get.mockResolvedValue({ data: { data: [sale(1, "PAID")] } });
  await open("Sales Reports", "Sales Report - Margin");
  expect(JSON.parse(screen.getByTestId("report-values").textContent)[0]).toMatchObject({ margin: 40 });
});

it("a bill without payment metadata is not labelled paid when its status is unsettled", async () => {
  api.get.mockResolvedValue({ data: { data: [{ ...sale(1, "UNSETTLED"), paid_amount: 0 }] } });
  await open("Sales Reports", "Sales Report - Invoice wise");
  expect(JSON.parse(screen.getByTestId("report-values").textContent)[0]).toMatchObject({ payment_mode: "unsettled", bill_no: "BILL-1" });
});

it("day summary uses the sale date and excludes cancelled/returned revenue", async () => {
  api.get.mockResolvedValue({ data: { data: [sale(1, "PAID"), sale(2, "CANCELLED"), sale(3, "RETURNED")] } });
  const rows = await open("Sales Reports", "Day Summary");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ day_key: "2026-09-01", bill_count: 1, net: 100, tax_amount: 10 });
});

it("HSN report uses the invoice product relation and excludes cancelled tax", async () => {
  api.get.mockResolvedValue({ data: { data: [sale(1, "PAID"), sale(2, "CANCELLED")] } });
  const rows = await open("Tax Reports", "Sales HSN Report");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ hsn: "1234", bill_count: 1, total: 100, tax_amount: 10 });
  expect(api.get).not.toHaveBeenCalledWith("/products", expect.anything());
});

it("settlement detail reads settlement records, not cash register closings", async () => {
  api.get.mockImplementation(url => Promise.resolve({ data: { data: url === "/settlements" ? [{ id: 1, batch_no: "SET-1", total_sales: 80 }] : [] } }));
  expect(await open("Settlement Reports", "Settlement Detail Report")).toEqual([{ id: 1, batch_no: "SET-1", total_sales: 80 }]);
  expect(api.get).not.toHaveBeenCalledWith("/cash-closings", expect.anything());
});

it("advance collection includes only orders with actual advances", async () => {
  api.get.mockResolvedValue({ data: { data: [{ id: 1, advance_paid: 0 }, { id: 2, advance_paid: 25 }] } });
  expect(await open("Settlement Reports", "Customer Advance Collection Report")).toEqual([{ id: 2, advance_paid: 25 }]);
});

it("opening/closing does not overwrite different cashiers on the same day", async () => {
  const rows = [{ id: 1, store_id: 1, opening_cash: 10, closing_cash: 20, opened_at: "2026-10-01", closed_at: "2026-10-01", user: { name: "One" } }, { id: 2, store_id: 1, opening_cash: 30, closing_cash: 40, opened_at: "2026-10-01", closed_at: "2026-10-01", user: { name: "Two" } }];
  api.get.mockResolvedValue({ data: { data: rows } });
  const report = await open("Settlement Reports", "Daywise Settlement Opening/Closing Report");
  expect(report).toHaveLength(2);
  expect(report.map(row => row.opening_amount).sort((a, b) => a - b)).toEqual([10, 30]);
});

it.each([
  ["Sales Reports", "Sales Report"], ["Sales Reports", "Sales Report - Salesman Wise"],
  ["Sales Reports", "Sales Report - Salesman Wise Detail"], ["Sales Reports", "Sales Report - Margin"],
  ["Sales Reports", "Sales Report - Invoice wise"], ["Sales Reports", "Sales Report - Barcode wise"],
  ["Sales Reports", "Day Summary (Without OffSet Bill Configuration)"], ["Sales Reports", "Approved Bill Report"],
  ["Sales Reports", "Delivery Report"], ["Sales Reports", "Sales Snapshot Text"],
  ["Settlement Reports", "Day End Settlement Summary"], ["Settlement Reports", "Cashier Wise Settlement Summary"],
  ["Settlement Reports", "Company wise Sale Collection Report"], ["Settlement Reports", "Settlement Reconcilation"],
  ["Tax Reports", "Sales Tax Report (Summary)"], ["Tax Reports", "Sales Tax Report (Column wise)"],
  ["Tax Reports", "Sales Tax Report (Row wise)"], ["Tax Reports", "Sales Tax Splitup with Collection Report"],
  ["Customer Reports", "My Customers Report"], ["Customer Reports", "Inactive Customer Report"],
  ["Analysis Reports", "Sales Analysis Report"], ["Analysis Reports", "Sales Vs Settlement Report"],
  ["Analysis Reports", "Sales Vs Stock Report"], ["Analysis Reports", "Sales Vs Purchase Vs Stock"],
  ["Stock Reports", "Stock Detail Report"], ["Stock Reports", "Direct Stock Report"],
  ["Discount Reports", "Biller Wise Report"], ["Discount Reports", "Cashier Wise Report"],
  ["HR Reports", "Employee Detail Report"],
])("%s / %s handles an empty response without errors", async (group, report) => {
  expect(await open(group, report)).toEqual([]);
  expect(screen.queryByText(/Failed to load/)).not.toBeInTheDocument();
});

it.each([["Customer Reports", "Customer Gift Voucher/Credit Note Report"], ["HR Reports", "Incentive Report - Employees"], ["Stock Reports", "Price Changer Report"]])("%s / %s does not present unrelated records as a report", async (group, title) => {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user: { id: 1, role: "admin", company_id: 1 } } } });
  render(<Provider store={store}><MemoryRouter><TransferActivityProvider><SalesReports /></TransferActivityProvider></MemoryRouter></Provider>);
  fireEvent.click(screen.getByText(new RegExp(`^${group} \\(`)));
  const option = await screen.findByText(`${title} (Not available yet)`);
  expect(option.closest("button")).toBeDisabled();
});
