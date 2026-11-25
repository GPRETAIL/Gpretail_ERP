import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import SalesScreen from "../SalesScreen";
import SaleDetailScreen from "../SaleDetailScreen";
import api from "@/shared/api/apiClient";

const mocks = vi.hoisted(() => ({ share: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));
vi.mock("@/mobile/hooks/useShareDocument", () => ({ default: () => ({ store: { name: "Coffee 1", upiId: "coffee@upi" }, share: mocks.share }) }));

const invoice = {
  id: 7, bill_no: "261024-0001", status: "PAID", payment_mode: "CASH", grand_total: 123.45, subtotal: 120, tax_amount: 3.45, discount_amount: 0, paid_amount: 150, change_amount: 26.55,
  sale_date: "2026-10-24T09:30:00Z", customer: { name: "Asha", phone: "9876543210" }, store: { name: "Coffee 1" },
  items: [{ id: 1, product: { name: "Coffee beans" }, quantity: 2, selling_price: 60, subtotal: 120, discount: 5, tax_rate: 5, tax_amount: 3.45 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.share.mockResolvedValue("shared");
  api.get.mockImplementation(async (url) => ({ data: { data: url === "/pos-sales/7" ? invoice : [invoice] } }));
});

it("tapping an invoice in the list opens it as a page, not a popup", async () => {
  const onOpenRecord = vi.fn();
  render(<SalesScreen onNavigate={vi.fn()} onOpenRecord={onOpenRecord} />);
  fireEvent.click(await screen.findByRole("button", { name: "View invoice 261024-0001" }));
  expect(onOpenRecord).toHaveBeenCalledWith("sale", 7);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("the invoice page shows the customer, each product with price, discount and tax, the totals and the balance", async () => {
  render(<SaleDetailScreen saleId={7} />);
  expect(await screen.findByText("261024-0001")).toBeVisible();
  expect(screen.getByText("Asha")).toBeVisible();
  expect(screen.getByText("Coffee beans")).toBeVisible();
  expect(screen.getByText(/2 × ₹60\.00/)).toBeVisible();
  expect(screen.getByText(/Discount ₹5\.00 · Tax 5% ₹3\.45/)).toBeVisible();
  expect(screen.getAllByText("₹123.45").length).toBeGreaterThan(0);
  expect(screen.getByText("Received")).toBeVisible();
  expect(screen.getByText("Change")).toBeVisible();
  expect(screen.getByText("Paid in full")).toBeVisible();
  expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:9876543210");
  expect(api.get).toHaveBeenCalledWith("/pos-sales/7", expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

it("Share makes the invoice PDF with a message and the customer's number", async () => {
  render(<SaleDetailScreen saleId={7} />);
  fireEvent.click(await screen.findByRole("button", { name: "Share" }));
  await vi.waitFor(() => expect(mocks.share).toHaveBeenCalledTimes(1));
  const { html, filename, text, phone } = mocks.share.mock.calls[0][0];
  expect(filename).toBe("Invoice-261024-0001.pdf");
  expect(phone).toBe("9876543210");
  expect(text).toContain("Invoice 261024-0001");
  expect(html).toContain("Coffee beans");
  expect(html).toContain("Coffee 1");
});

it("shows a loading error and retries", async () => {
  api.get.mockImplementation(async (url) => { if (url === "/pos-sales/7") throw new Error("Network"); return { data: { data: [invoice] } }; });
  render(<SaleDetailScreen saleId={7} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load this");
  api.get.mockResolvedValue({ data: { data: invoice } });
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Coffee beans")).toBeVisible();
});
