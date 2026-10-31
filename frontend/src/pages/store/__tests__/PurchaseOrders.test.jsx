import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import PurchaseOrders from "../PurchaseOrders";
import ReorderStatus from "../../analytical/ReorderStatus";
import api from "../../../api/axios";
import { TransferActivityProvider } from "../../../context/TransferActivityContext";

vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { id: 3, store_id: 2, company_name: "Branch" } } }) }));
vi.mock("../../../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../sales/posSalesUtils", () => ({ browserPrintHtml: vi.fn() }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => mockNavigate }));

const draft = { id: 4, uuid: "0192e3f0-0000-7000-8000-000000000004", po_no: "PO-1", po_date: "2026-10-31", status: "DRAFT", source: "AUTO", supplier_id: 9,
  supplier: { id: 9, name: "Cotton Mill" }, items_count: 1, total_qty: "1000.000", total_amount: "50000.00", notes: "Drafted",
  items: [{ id: 40, product_id: 1, variant_id: 10, quantity: "1000.000", unit_cost: "50.00", stock_at_order: "200.000", product: { name: "Cotton Shirt", code: "SHIRT" } }] };
const wrap = (node) => render(<MemoryRouter><TransferActivityProvider>{node}</TransferActivityProvider></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (url) => ({ data: { data:
    url === "/purchase-orders" ? [draft] : url === "/suppliers" ? [{ id: 9, name: "Cotton Mill" }]
      : url === "/purchase-orders/suggestions" ? [{ product_id: 1, variant_id: 10, product_name: "Cotton Shirt", size: "M", available: 200, reorder_min: 300, reorder_max: 1200, on_order: 0, suggested: 1000, supplier_name: "Cotton Mill" }]
        : draft } }));
  api.post.mockResolvedValue({ data: { message: "1 draft purchase order(s) prepared.", data: [draft] } });
  api.put.mockResolvedValue({ data: { data: draft } });
});

it("generates drafts, then saves the reviewed quantity before approving", async () => {
  wrap(<PurchaseOrders />);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/purchase-orders", { params: { status: "DRAFT" } }));
  fireEvent.click(screen.getByRole("button", { name: "Generate now" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/purchase-orders/generate"));

  fireEvent.click(await screen.findByRole("button", { name: "Review" }));
  const dialog = await screen.findByRole("dialog");
  const quantity = await within(dialog).findByLabelText("Quantity Cotton Shirt");
  fireEvent.change(quantity, { target: { value: "800" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/purchase-orders/${draft.uuid}/approve`));
  expect(api.put).toHaveBeenCalledWith(`/purchase-orders/${draft.uuid}`, expect.objectContaining({ supplier_id: 9, items: [{ product_id: 1, variant_id: 10, quantity: 800, unit_cost: 50 }] }));
  expect(api.put.mock.invocationCallOrder[0]).toBeLessThan(api.post.mock.invocationCallOrder.at(-1));
});

it("shows what is below its reorder level and drafts orders from it", async () => {
  wrap(<ReorderStatus />);
  expect(await screen.findByText("Cotton Shirt · Size M")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Generate draft POs" }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/store/purchase-order"));
});
