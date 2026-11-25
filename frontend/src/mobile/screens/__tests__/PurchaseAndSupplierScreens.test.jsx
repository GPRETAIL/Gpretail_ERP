import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PurchaseScreen from "../PurchaseScreen";
import PurchaseDetailScreen from "../PurchaseDetailScreen";
import SuppliersScreen from "../SuppliersScreen";
import SupplierDetailScreen from "../SupplierDetailScreen";
import CustomersScreen from "../CustomersScreen";
import CustomerDetailScreen from "../CustomerDetailScreen";
import ReturnsScreen from "../ReturnsScreen";
import ReturnDetailScreen from "../ReturnDetailScreen";
import api from "@/shared/api/apiClient";
import { normalizePurchase, supplierStatementHtml } from "@/mobile/utils/recordDocuments";

const mocks = vi.hoisted(() => ({ share: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));
vi.mock("@/mobile/hooks/useShareDocument", () => ({ default: () => ({ store: { name: "Coffee 1", upiId: "" }, share: mocks.share }) }));

const SUPPLIER = { id: 4, name: "Alpha Traders", company_name: "Alpha Traders Pvt", code: "S-4", phone: "9000011111", email: "alpha@example.test", gstin: "33ABCDE1234F1Z5", city: "Erode", current_balance: 5000 };
const DIRECT = {
  id: 11, purchase_no: "DP-0011", invoice_no: "AT/221", purchase_date: "2026-11-10", supplier: SUPPLIER, total_amount: 3150, paid_amount: 1000, payment_status: "PARTIAL", subtotal: 3000, tax_amount: 150, discount_amount: 0,
  items: [{ id: 1, product: { name: "Cotton Shirt" }, brand: { name: "Raymond" }, quantity: 10, cost_price: 300, tax_amount: 150, discount: 0, total_price: 3150 }],
};
const INVOICE = { id: 21, invoice_no: "PI-0021", supplier_invoice_no: "AT/300", invoice_date: "2026-11-12", supplier: SUPPLIER, grand_total: 2000, paid_amount: 2000, payment_status: "PAID", subtotal: 2000, tax_amount: 0, discount_amount: 0,
  items: [{ id: 2, product: { name: "Denim Jeans" }, quantity: 4, rate: 500, tax_amount: 0, discount: 0, total: 2000 }] };
const CUSTOMER = { id: 9, name: "Meena", code: "C-9", phone: "9123456780", city: "Salem", current_balance: 250, loyalty_points: 40, credit_limit: 1000 };
const SALE = { id: 7, bill_no: "261110-0007", status: "UNSETTLED", grand_total: 450, sale_date: "2026-11-10T10:00:00Z" };
const RETURN = { id: 3, return_no: "RR/3", display_return_no: "RR/3", return_date: "2026-11-11", total_refund: 300, refund_mode: "CASH", customer: { name: "Meena", phone: "9123456780" }, pos_sale: { invoice_no: "261110-0007" },
  items: [{ id: 1, product: { name: "Cotton Shirt" }, quantity: 1, refund_price: 300, subtotal: 300 }] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.share.mockResolvedValue("shared");
  api.get.mockImplementation(async (url, options = {}) => {
    const supplierBills = options.params?.supplier_id === 4;
    const data = {
      "/direct-purchases": supplierBills ? [DIRECT] : [DIRECT],
      "/invoices": [INVOICE],
      "/direct-purchases/11": DIRECT,
      "/invoices/21": INVOICE,
      "/suppliers": [SUPPLIER],
      "/suppliers/4": SUPPLIER,
      "/customers": [CUSTOMER],
      "/customers/9": CUSTOMER,
      "/pos-sales": [SALE],
      "/pos-returns": [RETURN],
      "/pos-returns/3": RETURN,
    }[url];
    return { data: { data } };
  });
});
afterEach(cleanup);

it("tapping a purchase bill opens it, whichever kind it is", async () => {
  const onOpenRecord = vi.fn();
  render(<PurchaseScreen onNavigate={vi.fn()} onOpenRecord={onOpenRecord} />);
  fireEvent.click(await screen.findByRole("button", { name: "Open bill AT/221" }));
  expect(onOpenRecord).toHaveBeenCalledWith("purchase", 11, "direct");
  fireEvent.click(screen.getByRole("button", { name: "Open bill PI-0021" }));
  expect(onOpenRecord).toHaveBeenCalledWith("purchase", 21, "invoice");
});

it("the purchase page lists each product with quantity, cost, tax and amount, the totals and what is still to pay", async () => {
  render(<PurchaseDetailScreen id={11} kind="direct" onOpenSupplier={vi.fn()} />);
  expect(await screen.findByText("DP-0011")).toBeVisible();
  expect(screen.getByText("Cotton Shirt")).toBeVisible();
  expect(screen.getByText("Raymond")).toBeVisible();
  expect(screen.getByText(/10 × ₹300\.00 cost/)).toBeVisible();
  expect(screen.getByText(/Tax ₹150\.00/)).toBeVisible();
  expect(screen.getByText("Their bill no")).toBeVisible();
  expect(screen.getByText("₹2,150.00 still to pay")).toBeVisible();
  expect(api.get).toHaveBeenCalledWith("/direct-purchases/11", expect.anything());
});

it("a purchase invoice reads its items by rate and opens the supplier", async () => {
  const onOpenSupplier = vi.fn();
  render(<PurchaseDetailScreen id={21} kind="invoice" onOpenSupplier={onOpenSupplier} />);
  expect(await screen.findByText("Denim Jeans")).toBeVisible();
  expect(screen.getByText(/4 × ₹500\.00 cost/)).toBeVisible();
  expect(screen.getByText("Paid in full")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Open supplier" }));
  expect(onOpenSupplier).toHaveBeenCalledWith(4);
});

it("Share on a purchase bill makes a PDF with the products and costs", async () => {
  render(<PurchaseDetailScreen id={11} kind="direct" />);
  fireEvent.click(await screen.findByRole("button", { name: "Share" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledTimes(1));
  const { html, filename, phone } = mocks.share.mock.calls[0][0];
  expect(filename).toBe("Purchase-DP-0011.pdf");
  expect(phone).toBe("9000011111");
  expect(html).toContain("Cotton Shirt");
  expect(html).toContain("₹300.00");
});

it("tapping a supplier opens it, and the supplier page shows details, dues and the bills that open", async () => {
  const onOpenRecord = vi.fn();
  const view = render(<SuppliersScreen onNavigate={vi.fn()} onOpenRecord={onOpenRecord} />);
  fireEvent.click(await screen.findByRole("button", { name: "Open supplier Alpha Traders" }));
  expect(onOpenRecord).toHaveBeenCalledWith("supplier", 4);
  view.unmount();

  const onOpenBill = vi.fn();
  render(<SupplierDetailScreen supplierId={4} onOpenBill={onOpenBill} />);
  expect(await screen.findByText("Alpha Traders")).toBeVisible();
  expect(screen.getByText("₹5,000.00")).toBeVisible();
  expect(screen.getByText("We owe this supplier")).toBeVisible();
  expect(screen.getByText("33ABCDE1234F1Z5")).toBeVisible();
  expect(api.get).toHaveBeenCalledWith("/direct-purchases", expect.objectContaining({ params: { supplier_id: 4, limit: 30 } }));
  expect(api.get).toHaveBeenCalledWith("/invoices", expect.objectContaining({ params: { supplier_id: 4, limit: 30 } }));
  fireEvent.click(screen.getByRole("button", { name: "Open bill PI-0021" }));
  expect(onOpenBill).toHaveBeenCalledWith("invoice", 21);
  expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:9000011111");
});

it("the supplier statement lists only the bills still to be paid", async () => {
  render(<SupplierDetailScreen supplierId={4} />);
  fireEvent.click(await screen.findByRole("button", { name: "Statement" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledTimes(1));
  const { html, text } = mocks.share.mock.calls[0][0];
  expect(html).toContain("DP-0011");
  expect(html).not.toContain("PI-0021"); // paid in full
  expect(text).toContain("₹2,150.00 is to be paid on 1 bill");
  const bills = [normalizePurchase(DIRECT, "direct")];
  expect(supplierStatementHtml({ store: { name: "Coffee 1" }, supplier: SUPPLIER, bills })).toContain("Total to pay");
});

it("the Customers tile now opens a list, each customer opens a page with its bills, and a bill opens", async () => {
  const onOpenCustomer = vi.fn();
  const list = render(<CustomersScreen onOpenCustomer={onOpenCustomer} />);
  fireEvent.click(await screen.findByRole("button", { name: "Open customer Meena" }));
  expect(onOpenCustomer).toHaveBeenCalledWith(9);
  list.unmount();

  const onOpenSale = vi.fn();
  render(<CustomerDetailScreen customerId={9} onOpenSale={onOpenSale} />);
  expect(await screen.findByText("Meena")).toBeVisible();
  expect(screen.getByText("Owes us")).toBeVisible();
  expect(screen.getByText("₹1,000.00")).toBeVisible();
  expect(api.get).toHaveBeenCalledWith("/pos-sales", expect.objectContaining({ params: { customer_id: 9, limit: 20 } }));
  fireEvent.click(screen.getByRole("button", { name: "Open invoice 261110-0007" }));
  expect(onOpenSale).toHaveBeenCalledWith(7);
});

it("a return opens with its items and refund, and can be shared", async () => {
  const onOpenRecord = vi.fn();
  const list = render(<ReturnsScreen onOpenRecord={onOpenRecord} />);
  fireEvent.click(await screen.findByRole("button", { name: "Open return RR/3" }));
  expect(onOpenRecord).toHaveBeenCalledWith("return", 3);
  list.unmount();

  render(<ReturnDetailScreen returnId={3} />);
  expect(await screen.findByText("Cotton Shirt")).toBeVisible();
  expect(screen.getByText("Total refund")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledTimes(1));
  expect(mocks.share.mock.calls[0][0].filename).toBe("Return-RR-3.pdf");
});
