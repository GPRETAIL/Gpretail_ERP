import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import SalesScreen from "../SalesScreen";
import api from "../../../api/axios";
vi.mock("../../../api/axios", () => ({ default: { get: vi.fn() } }));
const invoice = { id: 7, bill_no: "261024-0001", status: "PAID", payment_mode: "CASH", grand_total: 123.45, subtotal: 120, tax_amount: 3.45, discount_amount: 0, paid_amount: 150, change_amount: 26.55, remaining_amount: 0, sale_date: "2026-10-24T10:00:00Z", customer: { name: "Coffee customer" }, items: [{ id: 1, product: { name: "Coffee beans" }, quantity: 2, selling_price: 60, subtotal: 123.45, tax_amount: 3.45 }] };
beforeEach(() => { vi.clearAllMocks(); api.get.mockImplementation(async url => ({ data: { data: url === "/pos-sales/7" ? invoice : [invoice] } })); });
it("opens a selected invoice with product prices, precise totals and payment details", async () => {
  render(<SalesScreen onNavigate={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "View invoice 261024-0001" }));
  const dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByText("Coffee beans")).toBeVisible();
  expect(within(dialog).getByText(/2 ×/)).toBeVisible();
  expect(within(dialog).getByText("Balance due")).toBeVisible();
  expect(within(dialog).getAllByText(/123\.45/).length).toBeGreaterThan(0);
  expect(api.get).toHaveBeenCalledWith("/pos-sales/7", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Close invoice details" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("shows an invoice loading error and retries", async () => {
  api.get.mockImplementation(async url => { if (url === "/pos-sales/7") throw new Error("Network"); return { data: { data: [invoice] } }; });
  render(<SalesScreen onNavigate={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "View invoice 261024-0001" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load this invoice");
  api.get.mockResolvedValue({ data: { data: invoice } });
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Coffee beans")).toBeVisible();
});
