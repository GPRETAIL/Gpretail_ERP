import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import api from "../../../api/axios";
import InvoiceSearchPage from "../InvoiceSearchPage";
import TransportEntrySearchPage from "../TransportEntrySearchPage";

vi.mock("../../../api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../../../components/UploadImportButton", () => ({ default: () => null }));
vi.mock("../../../components/ExportBottomSheet", () => ({ default: () => null }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue({}), saveTablePreference: vi.fn() }));
vi.mock("../../../hooks/useRowVirtualization", () => ({ default: ({ count }) => ({
  virtualItems: Array.from({ length: count }, (_, index) => ({ index, start: index * 42, end: (index + 1) * 42 })),
  totalSize: count * 42, scrollToOffset: vi.fn(), scrollToIndex: vi.fn(),
}) }));
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

it("renders commercial invoice totals, store, supplier and dates in the shared list", async () => {
  api.get.mockResolvedValue({ data: { success: true, data: [{ id: 1, invoice_no: "COMMERCIAL-1", invoice_date: "2026-10-28",
    entry_date: "2026-10-28", company: { name: "Coffee 1" }, supplier: { name: "Warehouse supplier" },
    bundles: 3, tax_charges: 18, net_amount: 118 }], total: 1 } });
  render(<MemoryRouter><InvoiceSearchPage /></MemoryRouter>);
  expect(await screen.findByText("COMMERCIAL-1", { exact: true })).toBeInTheDocument();
  for (const value of ["Coffee 1", "Warehouse supplier", "18.00", "118.00"]) expect(screen.getByText(value, { exact: true })).toBeInTheDocument();
});

it("renders the saved LR mode, supplier, carrier and both city names", async () => {
  api.get.mockResolvedValue({ data: { success: true, data: [{ id: 1, lr_no: "ENTERED-LR", lr_mode: "Courier", lr_date: "2026-10-28",
    supplier: { name: "Warehouse supplier" }, transport: { name: "Warehouse carrier" },
    fromCity: { name: "Chennai" }, receivingCity: { name: "Madurai" } }], total: 1 } });
  render(<MemoryRouter><TransportEntrySearchPage /></MemoryRouter>);
  expect(await screen.findByText("ENTERED-LR", { exact: true })).toBeInTheDocument();
  for (const value of ["Courier", "Warehouse supplier", "Warehouse carrier", "Chennai", "Madurai"]) expect(screen.getByText(value, { exact: true })).toBeInTheDocument();
});
