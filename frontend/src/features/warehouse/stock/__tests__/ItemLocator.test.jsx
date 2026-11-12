import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import ItemLocator from "@/features/warehouse/stock/ItemLocator";
import api from "@/shared/api/apiClient";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));
vi.mock("@/shared/components/ExportBottomSheet", () => ({ default: () => null }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: () => Promise.resolve(null), saveTablePreference: () => Promise.resolve(null) }));

// Item Locator loads every in-stock barcode from one call (BarcodeController@itemLocator) and lists it.
it("loads the barcodes the server finds in one call", async () => {
  api.get.mockResolvedValue({ data: { data: [{
    id: 7, barcode: "SAREE-001", batch: "-", source: "LR Inward", company: "Silks", supplier: "Kanchi Weavers", product: "Silk Saree",
    brand: "-", colour: "Red", material: "-", pattern: "-", style: "-", sleeve: "-", fit: "-", type: "-", size: "Free", section: "Rack A-2",
    design: "D-12", hsn: "5007", invoiceNo: "PI-1", lrNo: "LR-9", qty: 4, stock: 4, cost: 1800, sale: 2500, net: 2250,
  }] } });
  render(<MemoryRouter><ItemLocator /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/barcodes/item-locator"));
  expect(api.get).toHaveBeenCalledTimes(1);
  // The table draws only visible rows (virtualised), which jsdom can't lay out, so check the row count.
  expect(await screen.findByText(/Total: 1/)).toBeInTheDocument();
});
