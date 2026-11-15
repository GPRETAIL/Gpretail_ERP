import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: api }));
import PurchaseInvoiceImport from "@/features/warehouse/purchase-invoice/PurchaseInvoiceImport";

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url === "/products") return { data: { data: [{ id: 7, name: "Linen Shirt", code: "LIN", selling_price: 300, mrp: 350 }] } };
    if (url === "/v1/invoice-ai/product-variants/7") return { data: { data: [{ id: 71, label: "M" }, { id: 72, label: "L" }] } };
    return { data: { data: [] } };
  });
  api.post.mockImplementation(async (url) => (url === "/v1/invoice-ai/extract"
    ? { data: { success: true, invoice: { supplier: { name: "Mill" }, invoice: { number: "M-1" }, items: [{ description: "Linen Shirt", quantity: 2, rate: 200 }] } } }
    : { data: { success: true, data: { transport_entry: { id: 1 }, purchase_invoice: {}, inventory_entry: {}, barcodes_count: 0, prices_updated: [] } } }));
});

it("asks for the size of an existing product that keeps stock per size and sends it", async () => {
  render(<MemoryRouter><PurchaseInvoiceImport /></MemoryRouter>);
  fireEvent.change(document.getElementById("invoice-upload-input"), { target: { files: [new File(["x"], "inv.pdf", { type: "application/pdf" })] } });
  fireEvent.click(screen.getAllByRole("button", { name: /extract invoice/i })[0]);
  await screen.findByText("Extracted & Ready for Review");
  fireEvent.click(screen.getByRole("tab", { name: /Line Items/ }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/v1/invoice-ai/product-variants/7"));

  // Without a size the purchase is not sent.
  fireEvent.click(screen.getByRole("button", { name: /Approve & Create Purchase Entry Flow/ }));
  expect(await screen.findByText(/choose its size/)).toBeTruthy();
  expect(api.post).not.toHaveBeenCalledWith("/v1/invoice-ai/process-flow", expect.anything());

  fireEvent.mouseDown(screen.getByRole("combobox", { name: /Size/ }));
  fireEvent.click(within(await screen.findByRole("listbox")).getByText("L"));
  fireEvent.click(screen.getByRole("tab", { name: /Line Items/ }));
  fireEvent.click(screen.getByRole("button", { name: /Approve & Create Purchase Entry Flow/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/v1/invoice-ai/process-flow", expect.objectContaining({
    items: [expect.objectContaining({ product_id: 7, variant_id: 72 })],
  })));
});
