import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn(), put: vi.fn(), navigate: vi.fn() }));
vi.mock("react-router-dom", async original => ({ ...await original(), useNavigate: () => mocks.navigate }));
vi.mock("../../../api/axios", () => ({ default: { ...mocks, defaults: { baseURL: "/api" } } }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
import WarehouseDashboard from "../WarehouseDashboard";
import { TransferActivityProvider } from "../../../context/TransferActivityContext";

const renderDashboard = () => render(<MemoryRouter><TransferActivityProvider><WarehouseDashboard /></TransferActivityProvider></MemoryRouter>);

const transport = Array.from({ length: 21 }, (_, index) => ({
  id: index + 1, lr_entry_no: `LR-${index + 1}`, lr_no: `REF-${index + 1}`,
  status: index === 0 ? "completed" : "lr_entry", lr_mode: "Courier",
  company: { name: "Test Company" }, supplier: { name: "Test Supplier" },
  created_at: `2026-10-${String(22 - index).padStart(2, "0")}T10:00:00Z`,
}));

beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  mocks.get.mockImplementation(url => Promise.resolve({ data: { data:
    url === "/transport-entries" ? transport : url === "/direct-purchases" ? [{
      id: 1, invoice_no: "DIRECT-ONE", company_name: "Snapshot Company", supplier_name: "Snapshot Supplier",
      invoice_workflow_status: "temporary", created_at: "2026-10-22T11:00:00Z",
    }] : [],
  } }));
});

it("uses shared search, column controls and client pagination for both entry sources", async () => {
  renderDashboard();
  await screen.findByText("Snapshot Company");
  expect(screen.getByRole("region", { name: "Scrollable table results" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Select visible columns" })).toBeTruthy();
  expect(screen.getByText("Total: 22")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: ">", exact: true }));
  await screen.findByText("LR-21");
  expect(screen.queryByText("Snapshot Company")).toBeNull();
  fireEvent.change(screen.getByPlaceholderText("Search warehouse entries..."), { target: { value: "DIRECT-ONE" } });
  fireEvent.click(screen.getByRole("button", { name: "Search", exact: true }));
  await screen.findByText("Snapshot Company");
  expect(screen.getByText("Total: 1")).toBeTruthy();
});

it("keeps workflow selection distinct when transport and direct purchase IDs overlap", async () => {
  renderDashboard();
  await screen.findByText("Snapshot Company");
  fireEvent.click(screen.getByRole("checkbox", { name: "Select DP-1", exact: true }));
  expect(screen.getByRole("button", { name: "Barcode", exact: true }).disabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Barcode", exact: true }));
  expect(mocks.navigate).toHaveBeenCalledWith(expect.stringContaining("direct_purchase_id=1"));
  fireEvent.click(within(screen.getByRole("group", { name: "Workflow status filters" })).getByRole("button", { name: /^Completed/ }));
  await screen.findByText("LR-1");
  expect(screen.queryByText("Snapshot Company")).toBeNull();
  expect(screen.getByRole("button", { name: "Edit", exact: true }).disabled).toBe(true);
  expect(screen.getByRole("checkbox", { name: "Select LR-1", exact: true }).checked).toBe(false);
});

it("opens delete confirmation without deleting or changing workflow selection", async () => {
  renderDashboard();
  await screen.findByText("Snapshot Company");
  const row = screen.getByText("Snapshot Company").closest("tr");
  const selection = screen.getByRole("checkbox", { name: "Select DP-1", exact: true });
  fireEvent.click(within(row).getByRole("button", { name: "Delete", exact: true }));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  expect(mocks.delete).not.toHaveBeenCalled();
  expect(selection.checked).toBe(false);
});

it("closes the Barcode step for a completed entry and offers Reprint via Barcode Search instead", async () => {
  renderDashboard();
  await screen.findByText("LR-1");
  fireEvent.click(screen.getByRole("checkbox", { name: "Select LR-1", exact: true }));

  expect(screen.getByRole("button", { name: "Barcode" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Reprint barcodes" }));
  expect(mocks.navigate).toHaveBeenCalledWith("/warehouse/barcode/search?transport_entry_id=1&label=LR-1");
});
