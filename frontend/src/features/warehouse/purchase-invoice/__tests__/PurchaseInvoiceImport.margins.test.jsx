import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: api }));
import PurchaseInvoiceImport from "@/features/warehouse/purchase-invoice/PurchaseInvoiceImport";

const extraction = {
  success: true,
  invoice: {
    supplier: { name: "Fresh Textiles" },
    invoice: { number: "FT-9", date: "2026-11-14" },
    totals: { subtotal: 300 },
    items: [
      { description: "Cotton Shirt", quantity: 1, rate: 200 }, // no printed prices: margin
      { description: "Linen Shirt", quantity: 1, rate: 100, selling_price: 175, mrp: 199 }, // printed prices win
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url === "/v1/invoice-ai/margins") return { data: { success: true, data: { selling_percent: 40, mrp_percent: 60 } } };
    if (url === "/products") return { data: { data: [] } };
    return { data: { data: [] } };
  });
  api.post.mockImplementation(async (url) => (url === "/v1/invoice-ai/extract"
    ? { data: extraction }
    : { data: { success: true, data: { transport_entry: { id: 5, lr_no: "LR-1" }, purchase_invoice: {}, inventory_entry: {}, barcodes_count: 0, prices_updated: [] } } }));
});

const extract = async () => {
  render(<MemoryRouter><PurchaseInvoiceImport /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/v1/invoice-ai/margins"));
  fireEvent.change(document.getElementById("invoice-upload-input"), { target: { files: [new File(["x"], "inv.pdf", { type: "application/pdf" })] } });
  fireEvent.click(screen.getAllByRole("button", { name: /extract invoice/i })[0]);
  await screen.findByText("Extracted & Ready for Review");
  fireEvent.click(screen.getByRole("tab", { name: /Line Items/ }));
};

it("prices lines without printed prices from the store's margins and keeps printed ones", async () => {
  await extract();
  expect(screen.getByLabelText("Line 1 Selling price").value).toBe("280");
  expect(screen.getByLabelText("Line 1 MRP").value).toBe("320");
  expect(screen.getByLabelText("Line 2 Selling price").value).toBe("175");

  // A margin-priced line follows its rate; Apply to all lines reprices every line.
  fireEvent.change(screen.getByLabelText("Line 1 Rate"), { target: { value: "100" } });
  expect(screen.getByLabelText("Line 1 Selling price").value).toBe("140");
  fireEvent.change(screen.getByLabelText("Selling margin %"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply to all lines" }));
  expect(screen.getByLabelText("Line 2 Selling price").value).toBe("150");
});

it("sends the margins with the purchase so they become the store's default", async () => {
  await extract();
  fireEvent.click(screen.getByRole("button", { name: /Approve & Create Purchase Entry Flow/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/v1/invoice-ai/process-flow", expect.objectContaining({
    margins: { selling_percent: 40, mrp_percent: 60 },
  })));
});
