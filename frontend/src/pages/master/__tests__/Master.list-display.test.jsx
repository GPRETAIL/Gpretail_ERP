import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import api from "../../../api/axios";
import Product from "../Product";
import ProductAttributes from "../ProductAttributes";

vi.mock("../../../api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../../../hooks/useStoreNameMap", () => ({ default: () => ({ 2: "Coffee 1" }) }));
// jsdom has no measured viewport. Keep the actual shared table and expose its
// single fixture row through the virtualization boundary.
vi.mock("../../../hooks/useRowVirtualization", () => ({ default: ({ count }) => ({
  virtualItems: Array.from({ length: count }, (_, index) => ({ index, start: index * 42, end: (index + 1) * 42 })),
  totalSize: count * 42, scrollToOffset: vi.fn(), scrollToIndex: vi.fn(),
}) }));
vi.mock("../../../components/UploadImportButton", () => ({ default: () => null }));
vi.mock("../../../components/ExportBottomSheet", () => ({ default: () => null }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue({}), saveTablePreference: vi.fn() }));
vi.mock("../../../components/SearchableSelect", () => ({ default: ({ label, name, value, options, onChange }) => <label>{label}<select name={name} value={value} onChange={onChange}><option value="" />{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }));
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

it("renders saved product tax, size group and store names through the shared table", async () => {
  api.get.mockResolvedValue({ data: { success: true, data: [{ id: 1, company_id: 2, code: "P-1", name: "Saved product",
    sales_tax: { name: "Sales GST", rate: 18 }, purchase_tax: { name: "Purchase GST", rate: 5 },
    size_group: { name: "Adult sizes" }, company_ref: { id: 2, name: "Coffee 1" }, is_active: true }], total: 1 } });
  render(<MemoryRouter><Product /></MemoryRouter>);
  expect(await screen.findByText("Saved product", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Sales GST (18%)", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Purchase GST (5%)", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Adult sizes", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Coffee 1", { exact: true })).toBeInTheDocument();
});

it("shows a size group's real code and its member sizes in separate columns", async () => {
  api.get.mockResolvedValue({ data: { success: true, data: [{ id: 1, company_id: 2, code: "ADULT-CODE", name: "Adult sizes",
    sizes: [{ name: "XL" }, { size_name: "L" }], is_active: false, created_by: "Actual owner" }], total: 1 } });
  render(<MemoryRouter><ProductAttributes /></MemoryRouter>);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "SIZEGROUP" } });
  expect(await screen.findByText("ADULT-CODE", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("XL, L", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Actual owner", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Coffee 1", { exact: true })).toBeInTheDocument();
  expect(screen.queryByText("Superadmin", { exact: true })).not.toBeInTheDocument();
});
